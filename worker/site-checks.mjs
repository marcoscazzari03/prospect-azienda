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
    await req(`https://${www(a)}${a.domain}/`, { method: 'HEAD', redirect: 3, timeout: 8_000 });
    return { eseguito: true };
  } catch (e) {
    return { eseguito: true, ...comeErroreN8n(e) };
  }
}

// Come «Apri sito» di n8n: il protocollo del sito salvato, certificato non verificato, 5 redirect, 10 secondi.
export async function apriSito(a, req = richiesta) {
  const protocollo = String(a.website || '').toLowerCase().startsWith('http://') ? 'http://' : 'https://';
  try {
    return (await req(`${protocollo}${www(a)}${a.domain}/`, { insicuro: true, redirect: 5, timeout: 10_000 })).body;
  } catch {
    return '';
  }
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
  const prova = process.env.DRY_RUN === '1';
  const intestazioni = { 'x-engine-secret': segreto, 'Content-Type': 'application/json' };
  const inizio = Date.now();

  const r = await fetch(`${app}/api/engine/site-checks?limit=${limite}`, { headers: intestazioni, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`lettura della coda: HTTP ${r.status}`);
  const aziende = (await r.json()).companies || [];
  if (!aziende.length) { console.log('Coda vuota.'); return; }

  const regole = caricaRegole();
  const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
  const items = await inParallelo(aziende, parallelo, async (a) => {
    const [https, html] = await Promise.all([controlloHttps(a), apriSito(a)]);
    try {
      return valuta(regole, a, html, https, oggi);
    } catch (e) {
      // Un sito strano non ferma il giro: tutto «non determinabile», si riprova al prossimo controllo.
      console.error(`valutazione non riuscita per ${a.domain}: ${e?.message || e}`);
      return { company: { domain: a.domain, name: a.name, website: a.website }, checks: CODICI.map(code => ({ code, status: 'undetermined', evidence: { detail: '' } })), letto: false };
    }
  });

  const stats = { aziende: items.length, illeggibili: items.filter(i => !i.letto).length, email: items.filter(i => i.company.email).length, segnali: {} };
  for (const i of items) for (const c of i.checks) if (c.status === 'pass') stats.segnali[c.code] = (stats.segnali[c.code] || 0) + 1;
  const corpo = items.map((i) => ({ company: i.company, checks: i.checks }));

  if (prova) {
    console.log(JSON.stringify({ prova: true, secondi: Math.round((Date.now() - inizio) / 1000), stats }, null, 2));
    return;
  }
  const s = await fetch(`${app}/api/engine/site-checks`, { method: 'POST', headers: intestazioni, body: JSON.stringify({ items: corpo }), signal: AbortSignal.timeout(60_000) });
  if (!s.ok) throw new Error(`salvataggio: HTTP ${s.status}`);
  const salvate = (await s.json()).saved;
  console.log(JSON.stringify({ salvate, secondi: Math.round((Date.now() - inizio) / 1000), stats }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(`Controllo siti fallito: ${e?.message || e}`); process.exit(1); });
}
