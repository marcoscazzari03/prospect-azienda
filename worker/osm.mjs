// Popolamento da OpenStreetMap sul VPS (punto 87, 22/10): tutta Italia dal file Geofabrik invece delle query Overpass
// per provincia (timeout, province perse, due settimane per un giro). scripts/vps/osm.sh scarica il file, lo filtra con
// osmium e lo converte in GeoJSON; qui ogni attività prende la provincia dai confini ufficiali (ISO3166-2 «IT-MO») e passa
// dalle stesse regole del nodo n8n «Normalizza OSM» (n8n/annunci/nodes/11-normalizza-osm.js con lib-osm.js, eseguito così
// com'è). Le aziende con un sito vanno al database come prima (POST /api/engine/companies-import, blocchi da 2.000).
//   node worker/osm.mjs filtri                          espressioni per «osmium tags-filter»
//   node worker/osm.mjs attivita.geojsonseq confini.geojsonseq
// Configurazione come worker/site-checks.mjs: SITE_CHECKS_SECRET, APP_URL, DRY_RUN (conta e stampa, senza salvare).
import { createReadStream, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nodi = join(root, 'n8n', 'annunci', 'nodes');
export const PROVINCE = JSON.parse(readFileSync(join(root, 'n8n', 'annunci', 'province.json'), 'utf8'));

// Regole condivise: lib-osm.js da solo (categorie per il filtro) e il nodo 11 intero, come lo costruisce build.mjs.
export function caricaOsm() {
  const lib = readFileSync(join(nodi, 'lib-osm.js'), 'utf8');
  const ctx = vm.createContext({});
  vm.runInContext(`${lib}\nthis.SETTORI = SETTORI; this.SOLO_ELENCO = SOLO_ELENCO; this.TIPI_OSM = TIPI_OSM; this.categoriaOsm = categoriaOsm;`, ctx);
  const nodo = readFileSync(join(nodi, '11-normalizza-osm.js'), 'utf8').split('__LIB_OSM__').join(lib).split('__PROVINCE__').join(JSON.stringify(PROVINCE));
  return { SETTORI: ctx.SETTORI, SOLO_ELENCO: ctx.SOLO_ELENCO, TIPI: ctx.TIPI_OSM, categoriaOsm: ctx.categoriaOsm, nodo };
}

// Filtro di osmium: tutte le attività dei tipi aperti, solo le categorie note degli altri (niente panchine e parcheggi).
export function filtri(osm) {
  return osm.TIPI.map(t => osm.SOLO_ELENCO.has(t) ? `nwr/${t}=${Object.keys(osm.SETTORI[t]).join(',')}` : `nwr/${t}`);
}

// Douglas-Peucker: confini di 100 m di precisione bastano per la provincia e il controllo è molto più veloce.
export function semplifica(anello, tolleranza = 0.0005) {
  if (anello.length < 5) return anello;
  const tieni = new Uint8Array(anello.length);
  tieni[0] = tieni[anello.length - 1] = 1;
  const pila = [[0, anello.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop();
    const [x1, y1] = anello[a], [x2, y2] = anello[b];
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy);
    let max = 0, k = -1;
    for (let i = a + 1; i < b; i++) {
      // Anello chiuso (primo e ultimo punto uguali): distanza dal punto, non dalla retta.
      const d = l < 1e-12 ? Math.hypot(anello[i][0] - x1, anello[i][1] - y1) : Math.abs(dy * anello[i][0] - dx * anello[i][1] + x2 * y1 - y2 * x1) / l;
      if (d > max) { max = d; k = i; }
    }
    if (k >= 0 && max > tolleranza) { tieni[k] = 1; pila.push([a, k], [k, b]); }
  }
  return anello.filter((_, i) => tieni[i]);
}

// Confini delle province dal GeoJSON di osmium: solo «IT-XX» delle province note, anelli semplificati e riquadro.
export async function caricaProvince(righe) {
  const note = new Map(PROVINCE.map(([sigla, provincia, regione]) => [sigla, { sigla, provincia, regione }]));
  const trovate = new Map();
  for await (const riga of righe) {
    if (!riga.trim()) continue;
    let f;
    try { f = JSON.parse(riga.replace(/^\x1e/, '')); } catch { continue; }
    // La Valle d'Aosta in OSM è solo regione (IT-23, nessuna provincia «IT-AO»): il suo confine vale per Aosta (22/10).
    const iso = String(f?.properties?.['ISO3166-2'] || '');
    const sigla = iso === 'IT-23' ? 'AO' : (iso.match(/^IT-([A-Z]{2})$/) || [])[1];
    if (!sigla || !note.has(sigla) || !f.geometry) continue;
    const poligoni = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
    const anelli = poligoni.flat().map(a => semplifica(a)).filter(a => a.length >= 4);
    if (!anelli.length) continue;
    const p = trovate.get(sigla) || { ...note.get(sigla), anelli: [], bbox: [Infinity, Infinity, -Infinity, -Infinity] };
    p.anelli.push(...anelli);
    for (const a of anelli) for (const [x, y] of a) {
      p.bbox = [Math.min(p.bbox[0], x), Math.min(p.bbox[1], y), Math.max(p.bbox[2], x), Math.max(p.bbox[3], y)];
    }
    trovate.set(sigla, p);
  }
  return [...trovate.values()];
}

// Punto dentro la provincia: regola pari-dispari su tutti gli anelli (i buchi si sottraggono da soli).
export function dentro(p, [x, y]) {
  if (x < p.bbox[0] || x > p.bbox[2] || y < p.bbox[1] || y > p.bbox[3]) return false;
  let c = false;
  for (const a of p.anelli) {
    for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
      const [xi, yi] = a[i], [xj, yj] = a[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
  }
  return c;
}

// Un punto per ogni attività: il nodo, o il centro del riquadro del primo anello (edifici e aree).
export function puntoDi(g) {
  if (!g) return null;
  if (g.type === 'Point') return g.coordinates;
  const anello = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0]?.[0] : g.type === 'LineString' ? g.coordinates : null;
  if (!anello?.length) return null;
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of anello) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

// Dalle righe del GeoJSON alle attività per provincia. La provincia scritta nell'indirizzo vale più dei confini (come in
// n8n); senza nessuna delle due l'attività è fuori Italia (San Marino, Svizzera di confine) o in mare, e si scarta.
export async function leggiAttivita(righe, osm, province, { senzaSito = null, soloSenzaSito = false } = {}) {
  const perSigla = new Map(province.map(p => [p.sigla, p]));
  const sigle = new Set(PROVINCE.map(([s]) => s));
  const gruppi = new Map();
  const stats = { righe: 0, attivita: 0, con_sito: 0, senza_sito_con_nome: 0, fuori: 0, stesso_posto: 0, illeggibili: 0 };
  const posti = new Map(); // dominio -> punti già visti
  let ultima = null; // la provincia dell'attività precedente: quelle vicine nel file stanno spesso nella stessa
  const provinciaDi = (t, f) => {
    const scritta = String(t['addr:province'] || '').trim().toUpperCase();
    if (sigle.has(scritta)) return perSigla.get(scritta) || { sigla: scritta };
    const punto = puntoDi(f.geometry);
    const p = punto && ((ultima && dentro(ultima, punto) && ultima) || province.find(q => q !== ultima && dentro(q, punto)));
    if (p) ultima = p;
    return p || null;
  };
  for await (const riga of righe) {
    if (!riga.trim()) continue;
    stats.righe++;
    let f;
    try { f = JSON.parse(riga.replace(/^\x1e/, '')); } catch { stats.illeggibili++; continue; }
    const t = f?.properties || {};
    const categoria = osm.categoriaOsm(t);
    if (categoria.esclusa) continue;
    stats.attivita++;
    if (!(t.website || t['contact:website'])) {
      if (!t.name) continue;
      stats.senza_sito_con_nome++;
      // Per la ricerca del sito (punto 88): solo i dati che servono, senza marchi nazionali né attività estere.
      if (senzaSito && !t['brand:wikidata'] && !t['operator:wikidata'] && !t.brand && !(t['addr:country'] && t['addr:country'].toUpperCase() !== 'IT')) {
        const p = provinciaDi(t, f);
        if (p) senzaSito.push({ chiave: `${t['@type']}/${t['@id']}`, nome: String(t.name).slice(0, 200), citta: String(t['addr:city'] || '').slice(0, 80), sigla: p.sigla, tipo: categoria.tipo, valore: categoria.valore });
      }
      continue;
    }
    stats.con_sito++;
    if (soloSenzaSito) continue; // la ricerca dei siti non tiene in memoria le attività che ce l'hanno
    const p = provinciaDi(t, f);
    if (!p) { stats.fuori++; continue; }
    // Stessa azienda segnata più volte nello stesso posto (area industriale, edificio e ufficio, ognuno con il sito): un
    // solo punto, altrimenti tre oggetti sembrerebbero una catena (Code Reviewer). Entro circa 500 m.
    const dom = String(t.website || t['contact:website']).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\d?\./, '').split(/[/?#:\s;]/)[0];
    // Contano solo gli oggetti che il nodo può tenere (con nome, senza scheda Wikidata): un ufficio senza nome non deve
    // far scartare l'area con il nome vero (QA).
    const qui = (t.name || t['name:it'] || t.operator) && !t['brand:wikidata'] && !t['operator:wikidata'] ? puntoDi(f.geometry) : null;
    if (qui) {
      const visti = posti.get(dom) || [];
      if (visti.some(([x, y]) => Math.abs(x - qui[0]) < 0.006 && Math.abs(y - qui[1]) < 0.0045)) { stats.stesso_posto++; continue; }
      visti.push(qui);
      posti.set(dom, visti);
    }
    const tags = Object.fromEntries(Object.entries(t).filter(([k]) => !k.startsWith('@')));
    if (!gruppi.has(p.sigla)) gruppi.set(p.sigla, []);
    gruppi.get(p.sigla).push({ type: t['@type'], id: t['@id'], tags });
  }
  return { gruppi, stats };
}

// Il nodo n8n «Normalizza OSM» eseguito così com'è: una «richiesta» per provincia, con le sue attività.
export function normalizza(osm, gruppi) {
  const nomi = new Map(PROVINCE.map(([sigla, provincia, regione]) => [sigla, { sigla, provincia, regione }]));
  const sigle = [...gruppi.keys()].sort();
  const richieste = sigle.map(s => nomi.get(s));
  const input = sigle.map(s => ({ elements: gruppi.get(s) }));
  const $ = (nome) => {
    if (nome !== 'Prepara richieste OSM') throw new Error(`nodo mancante: ${nome}`);
    return { all: () => richieste.map(json => ({ json })) };
  };
  const $input = { all: () => input.map((json, i) => ({ json, pairedItem: { item: i } })) };
  return new Function('$', '$input', '$getWorkflowStaticData', osm.nodo)($, $input, () => ({})).map(i => i.json);
}

const righeDi = (file) => createInterface({ input: createReadStream(file), crlfDelay: Infinity });

async function main() {
  const osm = caricaOsm();
  if (process.argv[2] === 'filtri') { console.log(filtri(osm).join(' ')); return; }
  const [fileAttivita, fileConfini] = process.argv.slice(2);
  if (!fileAttivita || !fileConfini) throw new Error('uso: node worker/osm.mjs attivita.geojsonseq confini.geojsonseq');
  const prova = ['1', 'true', 'si', 'sì', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());
  const segreto = process.env.SITE_CHECKS_SECRET || '';
  if (!prova && segreto.length < 32) throw new Error('SITE_CHECKS_SECRET mancante o troppo corto');
  const app = (process.env.APP_URL || 'https://avvisto.it').replace(/\/+$/, '');
  const inizio = Date.now();

  const province = await caricaProvince(righeDi(fileConfini));
  // Senza i confini di quasi tutte le province il file è rotto: meglio fermarsi che salvare mezza Italia (o niente).
  if (province.length < 100) throw new Error(`confini di sole ${province.length} province su ${PROVINCE.length}: file incompleto`);
  const { gruppi, stats } = await leggiAttivita(righeDi(fileAttivita), osm, province);
  const blocchi = normalizza(osm, gruppi);
  const n8n = blocchi[0]?.stats || {};
  const riepilogo = {
    secondi: Math.round((Date.now() - inizio) / 1000), province: province.length, ...stats,
    aziende: blocchi.reduce((s, b) => s + b.companies.length, 0),
    scartate: { categoria: n8n.excluded_category, senza_nome: n8n.no_name, sito_non_aziendale: n8n.not_company_site, estere: n8n.foreign, catene: n8n.chains, doppioni: n8n.duplicates },
    // Province senza confine in OSM (sigla cambiata, confine rotto): le loro attività senza indirizzo finiscono tra le «fuori».
    senza_confine: PROVINCE.map(([s]) => s).filter(s => !province.some(p => p.sigla === s)),
    per_provincia_poche: [...gruppi].filter(([, v]) => v.length < 30).map(([s, v]) => `${s}:${v.length}`),
  };
  if (prova) { console.log(JSON.stringify({ prova: true, ...riepilogo }, null, 2)); return; }

  const totali = { received: 0, new: 0, updated: 0, skipped: 0 };
  for (const [k, b] of blocchi.entries()) {
    if (!b.companies.length) continue;
    let r;
    for (let tentativo = 1; ; tentativo++) {
      r = await fetch(`${app}/api/engine/companies-import`, {
        method: 'POST', headers: { 'x-engine-secret': segreto, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'osm', companies: b.companies }), signal: AbortSignal.timeout(150_000),
      }).catch((e) => ({ ok: false, status: e?.name || 'rete' }));
      if (r.ok || tentativo === 3) break;
      await new Promise((ok) => setTimeout(ok, 10_000 * tentativo));
    }
    if (!r.ok) throw new Error(`salvataggio del blocco ${k + 1} di ${blocchi.length}: HTTP ${r.status} (salvati prima: ${JSON.stringify(totali)})`);
    const parte = await r.json();
    for (const c of Object.keys(totali)) totali[c] += Number(parte[c]) || 0;
  }
  console.log(JSON.stringify({ ...totali, ...riepilogo, secondi: Math.round((Date.now() - inizio) / 1000) }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(`Popolamento OSM fallito: ${e?.message || e}`); process.exit(1); });
}
