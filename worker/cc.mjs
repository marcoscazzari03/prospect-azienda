// Aziende italiane da Common Crawl (punto 92, 23/10): le aziende che non sono in nessun elenco (OSM, annunci). Common
// Crawl pubblica ogni trimestre il grafo dei domini che visita (circa 1,5 milioni di .it, misurato il 23/10): si scarica
// l'elenco una volta, poi a ogni giro il VPS apre la homepage di LIMIT domini (predefinito 3000) e tiene solo i siti con
// una partita IVA valida (cifra di controllo): per legge le attività la mostrano sul sito, quindi è la prova che dietro
// c'è un'impresa o un professionista e non un blog o un dominio parcheggiato. Dalla stessa pagina: nome, città e
// provincia. Il settore lo chiede l'app a Claude Haiku (/api/engine/companies-classify, chiave solo su Vercel); se non
// risponde, store_imported_companies lo prende dal nome quando è evidente. Niente elenchi di terzi: solo i siti delle
// aziende (docs/16-common-crawl.md).
// Origine «cc» nel database, per misurarle o toglierle. Domini provati in cc-provati.tsv (riprovati dopo 365 giorni).
// Configurazione come worker/siti-osm.mjs: SITE_CHECKS_SECRET, APP_URL, LIMIT, CONCURRENCY, DRY_RUN, STATE_DIRECTORY;
// CC_RELEASE per scegliere il grafo (predefinito RELEASE qui sotto).
import { appendFileSync, createReadStream, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { richiesta } from './http.mjs';
import { inParallelo } from './site-checks.mjs';
import { PROVINCE } from './osm.mjs';
import { pivaValida, testoDi, togliBlocchi, trovaPiva } from './piva.mjs';

export { pivaValida, trovaPiva };

export const RELEASE = 'cc-main-2026-aug-sep-oct';
const RIPROVA_GIORNI = 365;
const urlElenco = (r) => `https://data.commoncrawl.org/projects/hyperlinkgraph/${r}/domain/${r}-domain-vertices.txt.gz`;

// Riga del grafo: «id <tab> dominio rovesciato <tab> numero di host». Solo i .it di secondo livello (example.it): i
// domini geografici e degli enti (comune.modena.mo.it, regione.abruzzo.it) non sono aziende.
export function dominioDaRiga(riga) {
  const rov = riga.split('\t')[1] || '';
  if (!rov.startsWith('it.')) return '';
  const parti = rov.split('.');
  if (parti.length !== 2 || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(parti[1]) || parti[1].startsWith('xn--')) return '';
  return `${parti[1]}.it`;
}

// Ordine mescolato ma sempre uguale (hash del dominio): ogni lotto è un campione di tutta l'Italia, non solo dei
// domini che iniziano per «a».
const chiave = (d) => createHash('sha1').update(d).digest('hex');

async function scaricaElenco(cartella, release) {
  const file = join(cartella, 'domini-it.txt');
  const versione = join(cartella, 'domini-it.release');
  if (existsSync(file) && existsSync(versione) && readFileSync(versione, 'utf8').trim() === release) return file;
  console.log(`Scarico l'elenco dei domini di Common Crawl (${release}, circa 1 GB, qualche minuto)…`);
  const r = await fetch(urlElenco(release), { signal: AbortSignal.timeout(60 * 60_000) });
  if (!r.ok || !r.body) throw new Error(`elenco di Common Crawl: HTTP ${r.status}`);
  const righe = createInterface({ input: Readable.fromWeb(r.body).pipe(createGunzip()), crlfDelay: Infinity });
  const domini = [];
  let finiti = false; // il file è ordinato per dominio rovesciato: finiti i .it si smette di leggere
  for await (const riga of righe) {
    const d = dominioDaRiga(riga);
    if (d) domini.push(d);
    else if (domini.length && !riga.split('\t')[1]?.startsWith('it.')) { finiti = true; break; }
  }
  if (!finiti && domini.length < 100_000) throw new Error(`elenco troncato: ${domini.length} domini`);
  const ordinati = domini.map(d => [chiave(d), d]).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(x => x[1]);
  // Prima un file temporaneo: un elenco troncato a metà non deve sembrare completo.
  writeFileSync(`${file}.tmp`, ordinati.join('\n') + '\n');
  renameSync(`${file}.tmp`, file);
  writeFileSync(versione, release);
  console.log(`Elenco pronto: ${domini.length} domini .it.`);
  return file;
}

// Dominio parcheggiato, in vendita o sito in costruzione: la partita IVA lì è del fornitore, non di un'azienda.
const PARCHEGGIATO = /dominio (?:è )?(?:in vendita|registrato|parcheggiato|acquistato)|domain (?:is )?(?:for sale|parked)|this domain (?:has been|is) registered|sito (?:in costruzione|in allestimento)|under construction|coming soon|questo dominio è stato/i;
const SIGLE = new Map(PROVINCE.map(([sigla, provincia, regione]) => [sigla, { provincia, regione }]));
const CAPOLUOGHI = new Map(PROVINCE.flatMap(([sigla, provincia]) => provincia.split('-').map(p => [p.toLowerCase(), sigla])));
const pulisciCitta = (c) => c.replace(/^[\s,.\-–·]+|[\s,.\-–·]+$/g, '').replace(/\s+/g, ' ');

// Indirizzo italiano: «41121 Modena (MO)», «20121 MILANO MI», «80077 Ischia (Na)», «Acireale 95024 (CT)», «Ceprano ( Fr )»,
// «00187 Roma». Si sceglie quello più vicino alla partita IVA (la sede dell'azienda, non le filiali o i clienti in pagina).
// Al massimo 4 parole: senza limite, da ogni parola maiuscola la regex provava tutte quelle dopo (tempo quadratico,
// Code Reviewer 23/10).
// Trattino dentro la parola («Bolzano-Bozen», «Forlì-Cesena»); «nell'Emilia», «dell'Adda» (QA).
const PAROLA = String.raw`[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.\-]{0,30}`;
const CITTA = String.raw`${PAROLA}(?:\s+(?:${PAROLA}|(?:nell|dell|sull|all)['’]${PAROLA}|di|del|della|dei|degli|dello|de'|d'|sul|sulla|sui|sopra|sotto|in|nel|nella|nelle|al|alla|le|la)){0,3}?`;
const SEP = String.raw`[\s·,\-–]*`;
const LUOGHI = [
  // CAP, città, sigla tra parentesi (anche minuscola) o staccata da uno spazio: «MILANO MI», non «MILA» + «NO».
  new RegExp(String.raw`\b(\d{5})${SEP}(${CITTA})(?:\s*[([]\s*([A-Za-z]{2})\s*[)\]]|\s+([A-Z]{2}))(?=[\s,.;:\-–|·)]|$)`, 'g'),
  // Città, CAP facoltativo, sigla tra parentesi.
  new RegExp(String.raw`(?:^|[\s·,\-–])(${CITTA})${SEP}(?:\d{5}${SEP})?[([]\s*([A-Za-z]{2})\s*[)\]]`, 'g'),
];
const NON_CITTA = /^(?:tel|fax|cap|via|viale|piazza|corso|p\.?|c\.?f\.?|partita|codice|sede|cell|email|mail)\b|\biva\b|\d/i;
const maiuscole = (c) => (c.length > 3 && c === c.toUpperCase()
  ? c.toLowerCase().replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_, p, l) => p + l.toUpperCase()).replace(/\b(Di|Del|Della|Dei|Sul|Sulla|Sopra|Sotto|In|Al|Alla)\b/g, w => w.toLowerCase())
  : c);
export function trovaLuogo(testo, vicinoA = 0) {
  const candidati = [];
  const aggiungi = (dove, c, sigla) => {
    const citta = pulisciCitta(c);
    const s = SIGLE.get(String(sigla || '').toUpperCase());
    if (s && citta.length >= 2 && citta.split(' ').length <= 4 && !NON_CITTA.test(citta)) candidati.push({ dove, citta: maiuscole(citta), sigla: sigla.toUpperCase(), ...s });
  };
  for (const m of testo.matchAll(LUOGHI[0])) aggiungi(m.index, m[2], m[3] || m[4]);
  for (const m of testo.matchAll(LUOGHI[1])) aggiungi(m.index, m[1], m[2]);
  // Senza sigla: solo se la città è un capoluogo (così la provincia è certa).
  for (const m of testo.matchAll(/\b(\d{5})[\s·,\-–]*([A-Za-zÀ-ÿ']{3,30})\b/g)) {
    const sigla = CAPOLUOGHI.get(m[2].toLowerCase());
    if (sigla) aggiungi(m.index, m[2], sigla);
  }
  if (!candidati.length) return null;
  candidati.sort((a, b) => Math.abs(a.dove - vicinoA) - Math.abs(b.dove - vicinoA));
  const { citta, sigla, provincia, regione } = candidati[0];
  return { citta, sigla, provincia, regione };
}

const norm = (v) => String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const GENERICI = /^(home|homepage|home page|benvenuti|benvenuto|welcome|index|sito ufficiale|official site|chi siamo|pagina iniziale)$|wordpress|il mio blog|my blog|just another|untitled|senza titolo/i;
// Pezzi di un titolo: «Hotel Pierre | Riccione», «CTA Kennedy: Home», «Home::Studio Rossi», «Gli Ori ► Gli Ori».
const pezziDi = (t) => t.split(/\s*(?:\||:{1,3}|►|»|•)\s*|\s+[–—\-·~]\s+/)
  .map(s => s.replace(/^(?:benvenuti|benvenuto|welcome)\s+(?:su|in|da|al|nel|nella|to|on)?\s*/i, '').replace(/[!.\s]+$/, '').trim())
  .filter(s => s.length >= 2 && !GENERICI.test(s));
const attributo = (html, re) => (html.match(re)?.[1] || '').trim();
const decodifica = (s) => testoDi(s).replace(/ · /g, ' ').trim();

// Nome dell'azienda: og:site_name, poi il pezzo del titolo che somiglia al dominio, poi la ragione sociale vicino alla
// partita IVA, infine il dominio.
export function trovaNome(html, testo, dominio, dovePiva = -1) {
  const base = norm(dominio.replace(/\.it$/, ''));
  const somiglia = (s) => { const n = norm(s); return n.length >= 3 && (n.includes(base) || base.includes(n)); };
  const testa = html.slice(0, 200_000);
  const sito = decodifica(attributo(testa, /<meta[^<>]+property=["']og:site_name["'][^<>]*content=["']([^"'<>]{2,120})/i)
    || attributo(testa, /<meta[^<>]+content=["']([^"'<>]{2,120})["'][^<>]*property=["']og:site_name/i));
  const primo = pezziDi(sito)[0];
  if (primo && primo.length <= 60) return primo;
  const titolo = decodifica(attributo(testa, /<title[^<>]*>([\s\S]{1,300}?)<\/title>/i));
  const pezzi = pezziDi(titolo);
  const simile = pezzi.find(somiglia);
  if (simile && simile.length <= 60) return simile;
  if (dovePiva >= 0) {
    const prima = testo.slice(Math.max(0, dovePiva - 120), dovePiva + 1);
    const m = [...prima.matchAll(/([A-Z0-9][\w&'’.\- ]{1,70}?\s(?:s\.?\s?r\.?\s?l\.?s?|s\.?\s?p\.?\s?a\.?|s\.?\s?n\.?\s?c\.?|s\.?\s?a\.?\s?s\.?|soc(?:ietà)?\.?\s?coop(?:erativa)?)(?![a-z]))/gi)].pop();
    if (m) return m[1].replace(/^(?:[\s©·,\-–]|copyright\b|\(c\)|\d{4}\b)+/i, '').trim().slice(0, 120);
  }
  if (primo) return primo.slice(0, 60).replace(/\s+\S*$/, '');
  if (pezzi.length && pezzi[0].length <= 60) return pezzi[0];
  // «rossi--mobili.it»: senza filter un pezzo vuoto faceva fallire tutto il giro (QA).
  return dominio.replace(/\.it$/, '').split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// La scheda per il settore, come il nodo 07 di «Aziende | Settore»: titolo, descrizione, intestazioni e inizio del testo
// (senza menu e piè di pagina).
const pulisci = (v) => decodifica(v).replace(/[\u0000-\u001f]/g, ' ');
// Regex con «[^<>]» e lunghezze limitate: lineari anche sulle pagine costruite apposta (Code Reviewer).
export function schedaDi(html0) {
  const html = html0.slice(0, 500_000);
  const testa = html.slice(0, 200_000);
  const meta = (nome) => pulisci(attributo(testa, new RegExp(`<meta[^<>]+(?:name|property)=["']${nome}["'][^<>]+content=["']([^"'<>]{0,1000})`, 'i'))
    || attributo(testa, new RegExp(`<meta[^<>]+content=["']([^"'<>]{0,1000})["'][^<>]+(?:name|property)=["']${nome}["']`, 'i')));
  const titolo = pulisci(attributo(testa, /<title[^<>]*>([\s\S]{1,300}?)<\/title>/i));
  const descrizione = meta('description') || meta('og:description');
  const intestazioni = [...html.matchAll(/<h[1-3][^<>]{0,500}>([\s\S]{0,500}?)<\/h[1-3]>/gi)].map(m => pulisci(m[1])).filter(t => t.length > 2).slice(0, 6);
  const corpo = pulisci(togliBlocchi(togliBlocchi(html, ['script', 'style', 'noscript']), ['nav', 'header', 'footer'])).slice(0, 700);
  return [titolo && `Titolo: ${titolo.slice(0, 150)}`, descrizione && `Descrizione: ${descrizione.slice(0, 300)}`,
    intestazioni.length && `Intestazioni: ${intestazioni.join(' | ').slice(0, 300)}`, corpo && `Testo: ${corpo}`]
    .filter(Boolean).join('\n').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '').slice(0, 1600);
}

// Tutto quello che serve da una homepage, o null se non è il sito di un'attività italiana.
export function analizzaPagina(html, dominio) {
  if (!html || html.length < 500) return null;
  const testo = testoDi(html.slice(0, 1_500_000));
  if (PARCHEGGIATO.test(testo.slice(0, 5_000))) return null;
  const p = trovaPiva(testo);
  if (!p) return null;
  // Solo vicino alla partita IVA: la sede è lì, e il testo da leggere resta piccolo anche su pagine enormi.
  const da = Math.max(0, p.dove - 6_000);
  const luogo = trovaLuogo(testo.slice(da, p.dove + 6_000), p.dove - da);
  return { piva: p.piva, nome: trovaNome(html, testo, dominio, p.dove), scheda: schedaDi(html), ...(luogo || {}) };
}

const host = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };

// La homepage del dominio, con e senza www; deve restare sullo stesso dominio (un rimando a un altro sito non è quello).
export async function apriHomepage(dominio, req = richiesta) {
  for (const url of [`https://${dominio}/`, `https://www.${dominio}/`, `http://${dominio}/`]) {
    try {
      const r = await req(url, { insicuro: true, redirect: 5, timeout: 8_000, maxBytes: 1_500_000 });
      if (r.status >= 200 && r.status < 300 && host(r.url || url) === dominio) return { html: r.body, url: r.url || url };
      if (r.status) return null; // il sito risponde ma non con una pagina buona: inutile riprovare
    } catch { /* dominio spento o senza www: si prova il prossimo indirizzo */ }
  }
  return null;
}

function leggiProvati(file) {
  const provati = new Map();
  const pive = new Map(); // partita IVA -> primo dominio che l'ha mostrata
  if (!existsSync(file)) return { provati, pive };
  for (const riga of readFileSync(file, 'utf8').split('\n')) {
    const [dominio, data, piva] = riga.split('\t');
    if (!dominio || !data) continue;
    // Sito non aperto («x»: spento, rete, tempo scaduto): si riprova dopo 30 giorni invece che dopo un anno (QA).
    provati.set(dominio, Date.parse(data) - (piva === 'x' ? (RIPROVA_GIORNI - 30) * 86_400_000 : 0));
    if (piva && piva.length === 11 && !pive.has(piva)) pive.set(piva, dominio);
  }
  return { provati, pive };
}

// I domini del giro: nell'ordine dell'elenco, non provati nell'ultimo anno.
export async function daProvare(righe, provati, limite, oggi = Date.now()) {
  const limiteData = oggi - RIPROVA_GIORNI * 86_400_000;
  const scelti = [];
  for await (const d of righe) {
    if (d && !(provati.get(d) > limiteData)) scelti.push(d);
    if (scelti.length >= limite) break;
  }
  return scelti;
}

// Stessa partita IVA su più domini: si tiene il primo (stessa azienda con più siti, o il fornitore); gli altri no.
export function senzaDoppioni(trovate, pive) {
  const visti = new Map(pive);
  return trovate.filter(t => {
    const primo = visti.get(t.piva);
    if (primo && primo !== t.dominio) return false;
    visti.set(t.piva, t.dominio);
    return true;
  });
}

// Settore e parole chiave dall'app (Haiku, /api/engine/companies-classify) a lotti di 20; un lotto fallito resta senza
// settore (store_imported_companies prova comunque dal nome). Restituisce quante aziende hanno avuto il settore.
export async function classifica(trovate, app, segreto, post = fetch, scadenza = Infinity) {
  let classificate = 0;
  const lotti = [];
  for (let k = 0; k < trovate.length; k += 20) lotti.push(trovate.slice(k, k + 20));
  await inParallelo(lotti, 4, async (lotto) => {
    if (Date.now() > scadenza) return; // tempo finito: queste aziende entrano senza settore
    try {
      const r = await post(`${app}/api/engine/companies-classify`, {
        method: 'POST', headers: { 'x-engine-secret': segreto, 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: lotto.map(t => ({ name: t.nome.slice(0, 200), card: t.scheda || t.nome })) }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!r.ok) return;
      const { results } = await r.json();
      lotto.forEach((t, i) => {
        const e = Array.isArray(results) ? results[i] : null;
        if (e?.industry) { t.settore = String(e.industry).slice(0, 120); t.parole = (e.keywords || []).slice(0, 10).map(w => String(w).slice(0, 80)); classificate++; }
      });
    } catch { /* lotto senza settore: si va avanti */ }
  });
  return classificate;
}

async function main() {
  const cartella = process.env.STATE_DIRECTORY || '/var/lib/webora-cc';
  const prova = ['1', 'true', 'si', 'sì', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());
  const segreto = process.env.SITE_CHECKS_SECRET || '';
  if (!prova && segreto.length < 32) throw new Error('SITE_CHECKS_SECRET mancante o troppo corto');
  const app = (process.env.APP_URL || 'https://leads.weborastudio.it').replace(/\/+$/, '');
  const limite = Math.min(Math.max(Number(process.env.LIMIT) || 3000, 1), 10_000);
  const parallelo = Math.min(Math.max(Number(process.env.CONCURRENCY) || 16, 1), 32);
  const release = /^cc-main-\d{4}-[a-z-]+$/.test(process.env.CC_RELEASE || '') ? process.env.CC_RELEASE : RELEASE;
  const inizio = Date.now();
  // Il servizio ha 50 minuti, compreso l'eventuale scaricamento dell'elenco: pagine fino a 30 minuti (più 40 s per quelle
  // già aperte), settore fino a 40 (più 60 s per i lotti in corso), poi l'import (al massimo 150 s) (Code Reviewer).
  const scadenza = inizio + 30 * 60_000;
  const scadenzaSettore = inizio + 40 * 60_000;

  const fileElenco = await scaricaElenco(cartella, release);
  const fileProvati = join(cartella, 'cc-provati.tsv');
  const { provati, pive } = leggiProvati(fileProvati);
  const scelti = await daProvare(createInterface({ input: createReadStream(fileElenco), crlfDelay: Infinity }), provati, limite);

  const esiti = await inParallelo(scelti, parallelo, async (dominio) => {
    if (Date.now() > scadenza) return null;
    const pagina = await Promise.race([
      apriHomepage(dominio).catch(() => null),
      new Promise((r) => setTimeout(() => r(null), 40_000).unref()),
    ]);
    let dati = null;
    try { dati = pagina ? analizzaPagina(pagina.html, dominio) : null; } catch { /* una pagina strana non ferma il giro (QA) */ }
    return { dominio, aperto: Boolean(pagina), url: pagina?.url, ...(dati || {}) };
  });
  const fatti = esiti.filter(Boolean);
  const conPiva = fatti.filter(e => e.piva);
  const trovate = senzaDoppioni(conPiva, pive);
  // In prova solo il primo lotto, per vedere i settori negli esempi (con il segreto, cioè sul VPS).
  const classificate = segreto.length >= 32 ? await classifica(prova ? trovate.slice(0, 20) : trovate, app, segreto, fetch, scadenzaSettore) : 0;
  const aziende = trovate.map(t => ({
    domain: t.dominio, name: t.nome, website: host(t.url) === t.dominio ? t.url : `https://${t.dominio}`,
    city: t.citta || '', province: t.provincia || '', region: t.regione || '', vat: t.piva,
    ...(t.settore ? { industry: t.settore, keywords: t.parole } : {}),
  }));
  const riepilogo = {
    secondi: Math.round((Date.now() - inizio) / 1000), release, gia_provati: provati.size, provati: fatti.length,
    aperti: fatti.filter(e => e.aperto).length, con_piva: conPiva.length, doppioni: conPiva.length - trovate.length,
    con_citta: trovate.filter(t => t.citta).length, con_settore: classificate, trovate: aziende.length,
    esempi: trovate.slice(0, 20).map(t => `${t.nome} (${t.citta || '?'} ${t.sigla || ''}) -> ${t.dominio}${t.settore ? ` · ${t.settore}` : ''}`),
  };
  if (prova) { console.log(JSON.stringify({ prova: true, ...riepilogo }, null, 2)); return; }

  const totali = { received: 0, new: 0, updated: 0, skipped: 0 };
  for (let k = 0; k < aziende.length; k += 2000) {
    const r = await fetch(`${app}/api/engine/companies-import`, {
      method: 'POST', headers: { 'x-engine-secret': segreto, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'cc', companies: aziende.slice(k, k + 2000) }), signal: AbortSignal.timeout(150_000),
    });
    if (!r.ok) throw new Error(`salvataggio: HTTP ${r.status} (salvati prima: ${JSON.stringify(totali)})`);
    const parte = await r.json();
    for (const c of Object.keys(totali)) totali[c] += Number(parte[c]) || 0;
  }
  // Solo dopo il salvataggio: se fallisce, il giro dopo riprova gli stessi domini.
  const oggi = new Date().toISOString().slice(0, 10);
  appendFileSync(fileProvati, fatti.map(e => `${e.dominio}\t${oggi}\t${e.piva || (e.aperto ? '-' : 'x')}\n`).join(''));
  console.log(JSON.stringify({ ...totali, ...riepilogo, esempi: undefined, secondi: Math.round((Date.now() - inizio) / 1000) }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(`Aziende da Common Crawl: giro fallito: ${e?.message || e}`); process.exit(1); });
}
