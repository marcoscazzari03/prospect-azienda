// Worker del controllo siti sul VPS (punto 49, 22/10): fa il lavoro del workflow n8n «Aziende | Controllo siti» con le
// stesse regole (n8n/engine/nodes/lib-controlli-sito.js e lib-email-azienda.js, caricati da qui senza copiarli) e la stessa
// valutazione di n8n/annunci/nodes/09-valuta-siti.js, ma con più siti in parallelo e più siti per giro.
//   GET  {APP}/api/engine/site-checks?limit=N   aziende da controllare (coda con priorità, migrazione 064)
//   POST {APP}/api/engine/site-checks           esiti, salvati da store_company_checks
// Configurazione (variabili d'ambiente, sul server in /etc/webora/site-checks.env, mai nel repository):
//   SITE_CHECKS_SECRET  obbligatorio, segreto che apre solo questa route
//   APP_URL             predefinito https://leads.weborastudio.it
//   LIMIT               aziende per giro, predefinito 300 (massimo dell'app)
//   CONCURRENCY         siti aperti insieme, predefinito 8
//   DRY_RUN=1           controlla e stampa, senza salvare
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { richiesta, comeErroreN8n } from './http.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Le regole condivise con n8n: stesse sostituzioni di n8n/annunci/build.mjs.
export function caricaRegole() {
  const rilasci = JSON.stringify(JSON.parse(readFileSync(join(root, 'src', 'lib', 'domain', 'cms-releases.json'), 'utf8')));
  const controlli = readFileSync(join(root, 'n8n', 'engine', 'nodes', 'lib-controlli-sito.js'), 'utf8').split('__CMS_RELEASES__').join(rilasci);
  const email = readFileSync(join(root, 'n8n', 'engine', 'nodes', 'lib-email-azienda.js'), 'utf8');
  const ctx = vm.createContext({});
  vm.runInContext(`${controlli}\n${email}\nthis.controlliSito = controlliSito; this.emailAziendale = emailAziendale;`, ctx);
  return { controlliSito: ctx.controlliSito, emailAziendale: ctx.emailAziendale };
}

const CODICI = ['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright', 'under_construction', 'no_booking_engine', 'no_privacy'];
const www = (a) => (String(a.website || '').toLowerCase().includes('://www.') ? 'www.' : '');

// Come «Controllo HTTPS» di n8n: HEAD sull'host vero del sito, certificato verificato, 3 redirect, 8 secondi.
// Una risposta qualsiasi (anche 4xx) vuol dire HTTPS funzionante; l'errore va a controlliSito così com'è.
export async function controlloHttps(a, req = richiesta) {
  try {
    const r = await req(`https://${www(a)}${a.domain}/`, { method: 'HEAD', redirect: 3, timeout: 8_000 });
    return { eseguito: true, ...(r?.cert ? { cert: r.cert } : {}) };
  } catch (e) {
    return { eseguito: true, ...comeErroreN8n(e) };
  }
}

// Come «Apri sito» di n8n: il protocollo del sito salvato, certificato non verificato, 5 redirect, 10 secondi.
// `misura` riceve il tempo di risposta (ms) per il segnale «sito lento» del VPS.
export async function apriSito(a, req = richiesta, misura = {}) {
  const protocollo = String(a.website || '').toLowerCase().startsWith('http://') ? 'http://' : 'https://';
  try {
    const r = await req(`${protocollo}${www(a)}${a.domain}/`, { insicuro: true, redirect: 5, timeout: 10_000 });
    misura.ms = r.ms;
    return r.body;
  } catch {
    return '';
  }
}

// Segnali misurati solo dal VPS (punto 91, fase 1: si salvano ma non si vendono finché Data Quality non li ha controllati).
//   cert_expiring: certificato HTTPS valido che scade entro 14 giorni (Let's Encrypt si rinnova a 30: sotto 14 il rinnovo è
//                  fallito da più di due settimane); oltre 14 giorni «fail»; senza certificato letto «non determinabile».
//   slow_site:     homepage letta, prima risposta in 4 s o più «pass», entro 1,5 s «fail», in mezzo «non determinabile»
//                  (una misura sola: niente prova su un caso dubbio).
export const SOGLIE_VPS = { certGiorni: 14, lentoMs: 4_000, veloceMs: 1_500 };
export function segnaliVps({ https, ms, letto, adesso = Date.now() }) {
  const giorni = https?.cert && !https.error ? Math.floor((Date.parse(https.cert.scade) - adesso) / 86_400_000) : NaN;
  const data = Number.isFinite(giorni) ? new Date(https.cert.scade).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }) : '';
  const cert = !Number.isFinite(giorni) || giorni < 0
    ? { code: 'cert_expiring', status: 'undetermined', evidence: { detail: '' } }
    : giorni <= SOGLIE_VPS.certGiorni
      ? { code: 'cert_expiring', status: 'pass', evidence: { detail: `Il certificato HTTPS scade il ${data} (fra ${giorni} giorni)`, expires_at: https.cert.scade, issuer: https.cert.emittente || '', days_left: giorni } }
      : { code: 'cert_expiring', status: 'fail', evidence: { detail: `Certificato valido fino al ${data}`, expires_at: https.cert.scade } };
  const secondi = Math.round((ms || 0) / 100) / 10;
  const lento = !letto || !Number.isFinite(ms)
    ? { code: 'slow_site', status: 'undetermined', evidence: { detail: '' } }
    : ms >= SOGLIE_VPS.lentoMs
      ? { code: 'slow_site', status: 'pass', evidence: { detail: `La homepage ha risposto in ${String(secondi).replace('.', ',')} secondi`, seconds: secondi } }
      : ms <= SOGLIE_VPS.veloceMs
        ? { code: 'slow_site', status: 'fail', evidence: { detail: `La homepage ha risposto in ${String(secondi).replace('.', ',')} secondi`, seconds: secondi } }
        : { code: 'slow_site', status: 'undetermined', evidence: { detail: `Risposta in ${String(secondi).replace('.', ',')} secondi: né lenta né veloce`, seconds: secondi } };
  return [cert, lento];
}

// Come «Valuta siti» di n8n (09-valuta-siti.js), per una sola azienda.
export function valuta(regole, a, html0, https, oggi) {
  const html = html0.length > 2e6 ? html0.slice(0, 1e6) + html0.slice(-1e6) : html0;
  const { esiti, tecnologie } = regole.controlliSito({ html, website: a.website, oggi, richiesti: CODICI, https: https || {} });
  const email = html.length >= 500 ? regole.emailAziendale(html, a.website) : '';
  return {
    company: { domain: a.domain, name: a.name, website: a.website, technologies: tecnologie, ...(email ? { email } : {}) },
    checks: Object.values(esiti),
    letto: html.length >= 500,
  };
}

// Esegue fn su tutti gli elementi con al massimo n in parallelo, nell'ordine di partenza.
export async function inParallelo(elenco, n, fn) {
  const out = new Array(elenco.length);
  let i = 0;
  const corsie = Array.from({ length: Math.min(n, elenco.length) }, async () => {
    while (i < elenco.length) {
      const k = i++;
      out[k] = await fn(elenco[k], k);
    }
  });
  await Promise.all(corsie);
  return out;
}

async function main() {
  const segreto = process.env.SITE_CHECKS_SECRET || '';
  if (segreto.length < 32) throw new Error('SITE_CHECKS_SECRET mancante o troppo corto');
  const app = (process.env.APP_URL || 'https://leads.weborastudio.it').replace(/\/+$/, '');
  const limite = Math.min(Math.max(Number(process.env.LIMIT) || 300, 1), 300);
  const parallelo = Math.min(Math.max(Number(process.env.CONCURRENCY) || 8, 1), 32);
  const prova = ['1', 'true', 'si', 'sì', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());
  const intestazioni = { 'x-engine-secret': segreto, 'Content-Type': 'application/json' };
  const inizio = Date.now();

  const r = await fetch(`${app}/api/engine/site-checks?limit=${limite}`, { headers: intestazioni, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`lettura della coda: HTTP ${r.status}`);
  const aziende = (await r.json()).companies || [];
  if (!aziende.length) { console.log('Coda vuota.'); return; }

  const regole = caricaRegole();
  const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
  const controlla = async (a) => {
    // Al massimo 30 s per azienda (le richieste hanno già un tempo massimo; questo copre qualsiasi altro intoppo).
    const misura = {};
    const [https, html] = await Promise.race([
      Promise.all([controlloHttps(a), apriSito(a, richiesta, misura)]),
      new Promise((r) => setTimeout(() => r([{}, '']), 30_000).unref()),
    ]);
    try {
      // Pagina ridotta a 500 KB (inizio e fine) prima delle regole: una pagina enorme con un'espressione regolare che va in
      // backtracking bloccherebbe Node e con lui il tempo massimo per azienda e quello del giro (Code Reviewer, 23/10).
      const t0 = Date.now();
      const pagina = html.length > 500_000 ? html.slice(0, 400_000) + html.slice(-100_000) : html;
      const esito = valuta(regole, a, pagina, https, oggi);
      esito.checks.push(...segnaliVps({ https, ms: misura.ms, letto: esito.letto }));
      if (Date.now() - t0 > 3_000) console.error(`valutazione lenta per ${a.domain}: ${Date.now() - t0} ms, ${html.length} caratteri`);
      return esito;
    } catch (e) {
      // Un sito strano non ferma il giro: tutto «non determinabile», si riprova al prossimo controllo.
      console.error(`valutazione non riuscita per ${a.domain}: ${e?.message || e}`);
      return { company: { domain: a.domain, name: a.name, website: a.website }, checks: [...CODICI, 'cert_expiring', 'slow_site'].map(code => ({ code, status: 'undetermined', evidence: { detail: '' } })), letto: false };
    }
  };
  // Nome e sito entro i 300 caratteri dello schema della route: un valore troppo lungo farebbe rifiutare tutto il lotto (QA).
  const corto = (v) => String(v ?? '').slice(0, 300);

  // A blocchi da 100, ognuno salvato subito, e niente blocchi nuovi dopo 12 minuti: con le aziende nuove di OSM (molti
  // siti morti o lentissimi) un giro intero poteva arrivare ai 20 minuti di systemd ed essere interrotto prima di salvare
  // (23/10: worker fermo dalle 15:35 UTC del 22/10, mentre n8n con 150 aziende andava).
  const scadenza = inizio + 12 * 60_000;
  const stats = { aziende: 0, salvate: 0, illeggibili: 0, email: 0, segnali: {}, blocchi_saltati: 0 };
  for (let k = 0; k < aziende.length; k += 100) {
    if (Date.now() > scadenza) { stats.blocchi_saltati++; continue; }
    const items = await inParallelo(aziende.slice(k, k + 100), parallelo, controlla);
    stats.aziende += items.length;
    stats.illeggibili += items.filter(i => !i.letto).length;
    stats.email += items.filter(i => i.company.email).length;
    for (const i of items) for (const c of i.checks) if (c.status === 'pass') stats.segnali[c.code] = (stats.segnali[c.code] || 0) + 1;
    if (prova) continue;
    const corpo = items.map((i) => ({ company: { ...i.company, name: corto(i.company.name), website: corto(i.company.website) }, checks: i.checks }));
    const s = await fetch(`${app}/api/engine/site-checks`, { method: 'POST', headers: intestazioni, body: JSON.stringify({ items: corpo }), signal: AbortSignal.timeout(60_000) });
    if (!s.ok) throw new Error(`salvataggio del blocco ${k / 100 + 1}: HTTP ${s.status} ${(await s.text().catch(() => '')).slice(0, 200)} (salvate prima: ${stats.salvate})`);
    stats.salvate += Number((await s.json()).saved) || 0;
  }
  console.log(JSON.stringify({ ...(prova ? { prova: true } : {}), secondi: Math.round((Date.now() - inizio) / 1000), ...stats }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(`Controllo siti fallito: ${e?.message || e}`); process.exit(1); });
}
