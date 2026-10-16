// Popolamento da OpenStreetMap per provincia: una query Overpass sull'area ufficiale della
// provincia (codice ISO «IT-MO»; le query su un'intera regione vanno in timeout sui server
// pubblici). Ogni giorno PER_GIORNO province a rotazione (tutta Italia in circa un mese),
// a mano Modena. Le province fallite si riprovano il giorno dopo.
const PROVINCE = __PROVINCE__; // [sigla, nome, regione]
const PER_GIORNO = 4;
// Server principale: è l'unico che regge le query per area (private.coffee va in timeout).
const SERVER = 'https://overpass-api.de/api/interpreter';

let programmato = false;
try { programmato = $('Ogni giorno').isExecuted; } catch { programmato = false; }
// Province fallite nel giro precedente (server sovraccarico): si riprovano per prime, senza
// aspettare il prossimo giro della rotazione. L'elenco lo scrive «Normalizza OSM».
// Primo giro dopo l'introduzione della riprova: Napoli e Bari, fallite il 15/10.
let riprova = [];
try {
  const statico = $getWorkflowStaticData('global');
  riprova = (statico.osm_tentativi === undefined ? ['NA', 'BA'] : statico.osm_riprova || []).map(String);
} catch { riprova = []; }
const oggi = new Date();
const giorno = Math.floor((oggi - new Date(2026, 0, 1)) / 86400000);
const rotazione = Array.from({ length: PER_GIORNO }, (_, k) => PROVINCE[(giorno * PER_GIORNO + k) % PROVINCE.length]);
const daRiprovare = PROVINCE.filter(([s]) => riprova.includes(s)).slice(0, PER_GIORNO);
const scelte = programmato
  ? [...daRiprovare, ...rotazione.filter(([s]) => !daRiprovare.some(([r]) => r === s))]
  : PROVINCE.filter(([s]) => s === 'MO');

const TIPI = ['office', 'craft', 'shop', 'amenity', 'tourism', 'healthcare', 'industrial'];
// Province grandi o già fallite: la query intera va in timeout (Napoli e Bari, 16/10), quindi
// si divide in 3 parti più leggere per tipo di attività.
const GRANDI = ['RM', 'MI', 'NA', 'TO', 'BA', 'PA', 'CT', 'FI', 'BO', 'GE', 'VE', 'VR', 'PD', 'BS', 'BG', 'SA', 'MB', 'VA'];
const PARTI = [['office', 'craft', 'industrial', 'healthcare'], ['shop'], ['amenity', 'tourism']];
const query = (sigla, tipi) => `[out:json][timeout:250];area["ISO3166-2"="IT-${sigla}"]->.a;(${tipi.map(t => `nwr(area.a)["website"]["${t}"];nwr(area.a)["contact:website"]["${t}"];`).join('')});out tags;`;
return scelte.flatMap(([sigla, provincia, regione]) => {
  const base = { sigla, provincia, regione, url: SERVER, riprova: riprova.includes(sigla) };
  const dividi = base.riprova || GRANDI.includes(sigla);
  return (dividi ? PARTI : [TIPI]).map((tipi, k) => ({ json: { ...base, parte: dividi ? `${k + 1}/${PARTI.length}` : '', data: query(sigla, tipi) } }));
});
