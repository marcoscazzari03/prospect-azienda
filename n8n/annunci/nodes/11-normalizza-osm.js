// Dalle attività di OpenStreetMap alle aziende del database: dominio dal sito web, nome,
// città, settore in italiano (dalla categoria OSM) e parole chiave. Scarta enti pubblici,
// associazioni, luoghi non commerciali, siti che non sono dell'azienda (social, portali) e
// catene (lo stesso dominio su 3 o più punti: sono filiali o negozi in franchising).
// Le categorie senza traduzione restano senza settore: lo assegna poi Claude Haiku.
const richieste = $('Prepara richieste OSM').all().map(i => i.json);

__LIB_OSM__

const dominio = (url) => String(url || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\d?\./, '').split(/[/?#:\s]/)[0];
const pulisci = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const trovate = [];
const stats = { provinces: [...new Set(richieste.map(r => r.provincia))], elements: 0, no_name: 0, excluded_category: 0, not_company_site: 0, foreign: 0, chains: 0, duplicates: 0, saved: 0, unmapped: 0, errors: 0, failed_provinces: [], retried: [...new Set(richieste.filter(r => r.riprova).map(r => r.provincia))] };
const fallite = [];
const elementiVisti = new Set();
// Sigla della provincia scritta nell'indirizzo (addr:province = «BO»): se c'è, vale quella.
const PROVINCE = Object.fromEntries((__PROVINCE__).map(([sigla, nome, regione]) => [sigla, [nome, regione]]));
$input.all().forEach((item, i) => {
  const { regione, provincia, sigla } = richieste[item.pairedItem?.item ?? i] || {};
  const elementi = item.json?.elements;
  if (!Array.isArray(elementi)) { stats.errors++; stats.failed_provinces.push(provincia); fallite.push(sigla); return; }
  // Risposta interrotta dal server (timeout a metà): si salva quello che c'è e si riprova.
  if (/runtime error|timed? ?out|too busy/i.test(String(item.json?.remark ?? ''))) { stats.errors++; stats.failed_provinces.push(provincia); fallite.push(sigla); }
  for (const el of elementi) {
    // Con più richieste per provincia (una per tipo, 22/10) un'attività con più tipi (forno-bar: shop e amenity) torna più
    // volte: contata una sola, altrimenti sembrerebbe una catena (Code Reviewer).
    const chiaveEl = `${el.type}/${el.id}`;
    if (el.id !== undefined && elementiVisti.has(chiaveEl)) continue;
    elementiVisti.add(chiaveEl);
    stats.elements++;
    const t = el.tags || {};
    const { tipo, valore, esclusa } = categoriaOsm(t);
    if (esclusa) { stats.excluded_category++; continue; }
    // Porti turistici: non sono clienti (18/10).
    if (t.leisure === 'marina') { stats.excluded_category++; continue; }
    // Marchi nazionali con scheda Wikidata (Piaggio, Sisal...): grandi gruppi, non le PMI locali
    // che cerchiamo (18/10). Le catene locali restano escluse dalla regola sui domini ripetuti.
    if (t['brand:wikidata'] || t['operator:wikidata']) { stats.chains++; continue; }
    const nome = pulisci(t.name || t['name:it'] || t.operator, 200);
    if (!nome) { stats.no_name++; continue; }
    const sito = String(t.website || t['contact:website'] || '').split(/[;\s]/)[0];
    const dom = dominio(sito);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(dom) || NON_AZIENDALI.test(dom)) { stats.not_company_site++; continue; }
    // Niente attività estere (paese o dominio straniero).
    if ((t['addr:country'] && t['addr:country'].toUpperCase() !== 'IT') || /\.(ch|fr|at|si|de|hr|sm|va|mt|li|mc)$/.test(dom)) { stats.foreign++; continue; }
    const mappa = SETTORI[tipo]?.[valore];
    if (!mappa) stats.unmapped++;
    trovate.push({
      domain: dom, name: nome, website: /^https?:\/\//i.test(sito) ? sito.slice(0, 300) : `https://${dom}`,
      ...(() => {
        const dichiarata = PROVINCE[String(t['addr:province'] || '').trim().toUpperCase()];
        return { city: pulisci(t['addr:city'], 80), province: dichiarata ? dichiarata[0] : provincia, region: dichiarata ? dichiarata[1] : regione };
      })(),
      industry: mappa ? mappa[0] : '', keywords: mappa ? mappa[1] : [], brand: Boolean(t.brand || t['brand:wikidata'])
    });
  }
});

// Catene: stesso dominio su 3 o più punti (o marchio noto su 2 o più).
const conta = {};
for (const a of trovate) conta[a.domain] = (conta[a.domain] || 0) + 1;
const viste = new Set();
const companies = [];
for (const a of trovate) {
  if (conta[a.domain] >= 3 || (a.brand && conta[a.domain] >= 2)) { stats.chains++; continue; }
  if (viste.has(a.domain)) { stats.duplicates++; continue; }
  viste.add(a.domain);
  const { brand, ...azienda } = a;
  companies.push(azienda);
}
stats.saved = companies.length;

// Province da riprovare nel giro di domani (al massimo 3 tentativi per provincia):
// lo stato resta nei dati del workflow, salvati solo dalle esecuzioni programmate.
try {
  const statico = $getWorkflowStaticData('global');
  const prima = Object.fromEntries((statico.osm_tentativi || []).map(([s, n]) => [s, n]));
  const tentativi = [...new Set(fallite.filter(Boolean))].map(s => [s, (prima[s] || 0) + 1]).filter(([, n]) => n <= 3);
  statico.osm_tentativi = tentativi;
  statico.osm_riprova = tentativi.map(([s]) => s);
  stats.retry_tomorrow = statico.osm_riprova;
} catch { stats.retry_tomorrow = []; }

// Blocchi da 2.000 aziende per il salvataggio.
const blocchi = [];
for (let k = 0; k < companies.length; k += 2000) blocchi.push(companies.slice(k, k + 2000));
if (!blocchi.length) blocchi.push([]);
stats.failed_provinces = [...new Set(stats.failed_provinces)];
return blocchi.map((b, k) => ({ json: { source: 'osm', companies: b, ...(k === 0 ? { stats } : {}) } }));
