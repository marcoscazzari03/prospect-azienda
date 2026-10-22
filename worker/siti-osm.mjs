// Sito delle attività di OpenStreetMap che non ce l'hanno (punto 88, 22/10): circa 400.000 attività con un nome ma senza
// sito. Per ognuna i domini probabili dal nome e la verifica sulla homepage, con le stesse regole che il motore usa per le
// aziende degli annunci (n8n/annunci/nodes/03-domini-candidati.js e 04-scegli-sito.js, eseguiti così come sono), più una
// conferma del luogo: la città o la provincia scritte sulla pagina (in Italia ci sono cento «Bar Centrale»). Gratis, senza
// AI. Le aziende trovate vanno al database come le altre di OSM (origine «osm_sito», per misurarle o toglierle).
// Lavora a lotti (LIMIT attività per giro, predefinito 3000) e si ricorda le attività provate in siti-provati.tsv
// (si riprovano dopo 180 giorni). Legge i file di scripts/vps/osm.sh dalla stessa cartella ($STATE_DIRECTORY).
// Configurazione come worker/site-checks.mjs: SITE_CHECKS_SECRET, APP_URL, LIMIT, CONCURRENCY, DRY_RUN.
import { appendFileSync, createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { richiesta } from './http.mjs';
import { inParallelo } from './site-checks.mjs';
import { caricaOsm, caricaProvince, leggiAttivita, PROVINCE } from './osm.mjs';

const nodi = join(dirname(fileURLToPath(import.meta.url)), '..', 'n8n', 'annunci', 'nodes');
const RIPROVA_GIORNI = 180;
// Prima i settori più deboli del database (uffici, manifattura, artigiani), poi gli altri.
const PRIORITA = ['office', 'industrial', 'man_made', 'craft', 'healthcare', 'shop', 'tourism', 'amenity'];

// I due nodi n8n del livello 2 (domini indovinati), con le sostituzioni di n8n/annunci/build.mjs.
export function caricaRegoleSiti() {
  const candidati = new Function('$input', readFileSync(join(nodi, '03-domini-candidati.js'), 'utf8'));
  const scegli = new Function('$', '$input', readFileSync(join(nodi, '04-scegli-sito.js'), 'utf8')
    .split('__METODO__').join('guess').split('__CANDIDATI__').join('Domini candidati').split('__ELENCO__').join('[]'));
  return {
    domini: (a) => candidati({ first: () => ({ json: { companies: [a] } }) }).map(i => i.json),
    valido: (c, html) => {
      const [{ json }] = scegli(() => ({ all: () => [{ json: c }] }), { all: () => [{ json: { html } }] });
      return Boolean(json.results[0]?.domain);
    },
  };
}

const norm = (v) => ` ${String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const testo = (h) => String(h ?? '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');

// Il luogo sulla pagina: la città dell'indirizzo OSM o la provincia (anche una sola parte: «Forlì», «Monza»).
export function luogoSullaPagina(html, citta, provincia) {
  const pagina = norm(testo(html).slice(0, 300_000));
  const luoghi = [citta, provincia, ...String(provincia || '').split(/-| e /)].map(l => norm(l).trim()).filter(l => l.length >= 4);
  return luoghi.some(l => pagina.includes(` ${l} `));
}

// Un'attività: i domini nell'ordine del nodo 03, il primo che passa il nodo 04 e mostra il luogo.
export async function cercaSito(regole, a, provincia, req = richiesta) {
  for (const c of regole.domini({ company_key: a.chiave, company_name: a.nome, city: a.citta || provincia })) {
    let html = '';
    try {
      const r = await req(c.url, { insicuro: true, redirect: 5, timeout: 8_000, maxBytes: 1_500_000 });
      if (r.status >= 200 && r.status < 300) html = r.body;
    } catch { /* dominio inesistente o spento: si passa al prossimo */ }
    if (html.length >= 500 && regole.valido(c, html) && luogoSullaPagina(html, a.citta, provincia)) return c.domain;
  }
  return '';
}

// Le attività senza sito, rilette dal file di OSM solo quando cambia (una volta a settimana).
async function attivitaSenzaSito(cartella) {
  const cache = join(cartella, 'senza-sito.json');
  const fonte = join(cartella, 'attivita.geojsonseq');
  if (existsSync(cache) && statSync(cache).mtimeMs > statSync(fonte).mtimeMs) return JSON.parse(readFileSync(cache, 'utf8'));
  const righe = (f) => createInterface({ input: createReadStream(join(cartella, f)), crlfDelay: Infinity });
  const osm = caricaOsm();
  const province = await caricaProvince(righe('confini.geojsonseq'));
  const elenco = [];
  await leggiAttivita(righe('attivita.geojsonseq'), osm, province, { senzaSito: elenco });
  writeFileSync(cache, JSON.stringify(elenco));
  return elenco;
}

// Quali provare in questo giro: non provate negli ultimi 180 giorni, nomi non comuni (lo stesso nome in 4 o più posti è
// una catena senza marchio o un nome generico: «Tabaccheria», «Bar Sport»), prima i settori deboli.
export function daProvare(elenco, provate, limite, oggi = Date.now()) {
  const conta = new Map();
  for (const a of elenco) conta.set(norm(a.nome), (conta.get(norm(a.nome)) || 0) + 1);
  const limiteData = oggi - RIPROVA_GIORNI * 86_400_000;
  return elenco
    .filter(a => conta.get(norm(a.nome)) < 4 && !(provate.get(a.chiave) > limiteData))
    .sort((x, y) => PRIORITA.indexOf(x.tipo) - PRIORITA.indexOf(y.tipo))
    .slice(0, limite);
}

function leggiProvate(file) {
  const provate = new Map();
  if (!existsSync(file)) return provate;
  for (const riga of readFileSync(file, 'utf8').split('\n')) {
    const [chiave, data] = riga.split('\t');
    if (chiave && data) provate.set(chiave, Date.parse(data));
  }
  return provate;
}

async function main() {
  const cartella = process.env.STATE_DIRECTORY || '/var/lib/webora-osm';
  if (!existsSync(join(cartella, 'attivita.geojsonseq'))) { console.log('Manca il file di OSM: prima «bash worker.sh osm».'); return; }
  const prova = ['1', 'true', 'si', 'sì', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());
  const segreto = process.env.SITE_CHECKS_SECRET || '';
  if (!prova && segreto.length < 32) throw new Error('SITE_CHECKS_SECRET mancante o troppo corto');
  const app = (process.env.APP_URL || 'https://leads.weborastudio.it').replace(/\/+$/, '');
  const limite = Math.min(Math.max(Number(process.env.LIMIT) || 3000, 1), 10_000);
  const parallelo = Math.min(Math.max(Number(process.env.CONCURRENCY) || 16, 1), 32);
  const inizio = Date.now();
  const scadenza = inizio + 40 * 60_000; // il servizio ha 50 minuti, il giro dopo parte all'ora seguente

  const elenco = await attivitaSenzaSito(cartella);
  const fileProvate = join(cartella, 'siti-provati.tsv');
  const provate = leggiProvate(fileProvate);
  const scelte = daProvare(elenco, provate, limite);
  const osm = caricaOsm();
  const regole = caricaRegoleSiti();
  const nomi = new Map(PROVINCE.map(([sigla, provincia, regione]) => [sigla, { provincia, regione }]));

  const esiti = await inParallelo(scelte, parallelo, async (a) => {
    if (Date.now() > scadenza) return null;
    const { provincia } = nomi.get(a.sigla) || {};
    const dominio = await Promise.race([
      cercaSito(regole, a, provincia).catch(() => ''),
      new Promise((r) => setTimeout(() => r(''), 60_000).unref()),
    ]);
    return { a, dominio };
  });
  const fatti = esiti.filter(Boolean);
  const trovate = fatti.filter(e => e.dominio).map(({ a, dominio }) => {
    const { provincia, regione } = nomi.get(a.sigla) || {};
    const [industry, keywords] = osm.SETTORI[a.tipo]?.[a.valore] || ['', []];
    return { domain: dominio, name: a.nome, website: `https://${dominio}`, city: a.citta, province: provincia, region: regione, industry, keywords };
  });
  const riepilogo = {
    secondi: Math.round((Date.now() - inizio) / 1000), senza_sito: elenco.length, gia_provate: provate.size,
    provate: fatti.length, trovate: trovate.length, esempi: trovate.slice(0, 15).map(t => `${t.name} (${t.city || t.province}) -> ${t.domain}`),
  };
  if (prova) { console.log(JSON.stringify({ prova: true, ...riepilogo }, null, 2)); return; }

  const totali = { received: 0, new: 0, updated: 0, skipped: 0 };
  for (let k = 0; k < trovate.length; k += 2000) {
    const r = await fetch(`${app}/api/engine/companies-import`, {
      method: 'POST', headers: { 'x-engine-secret': segreto, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'osm_sito', companies: trovate.slice(k, k + 2000) }), signal: AbortSignal.timeout(150_000),
    });
    if (!r.ok) throw new Error(`salvataggio: HTTP ${r.status} (salvati prima: ${JSON.stringify(totali)})`);
    const parte = await r.json();
    for (const c of Object.keys(totali)) totali[c] += Number(parte[c]) || 0;
  }
  // Solo dopo il salvataggio: se fallisce, il giro dopo riprova le stesse attività.
  const oggi = new Date().toISOString().slice(0, 10);
  appendFileSync(fileProvate, fatti.map(({ a, dominio }) => `${a.chiave}\t${oggi}\t${dominio || '-'}\n`).join(''));
  console.log(JSON.stringify({ ...totali, ...riepilogo, esempi: undefined, secondi: Math.round((Date.now() - inizio) / 1000) }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(`Ricerca dei siti fallita: ${e?.message || e}`); process.exit(1); });
}
