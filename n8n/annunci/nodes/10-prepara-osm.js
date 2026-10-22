// Popolamento da OpenStreetMap per provincia: una query Overpass sull'area ufficiale della
// provincia (codice ISO «IT-MO»; le query su un'intera regione vanno in timeout sui server
// pubblici). Ogni giorno PER_GIORNO province a rotazione (tutta Italia in circa due settimane),
// a mano Modena. Le province fallite si riprovano il giorno dopo.
// Dal 20/10 la rotazione riparte dal Nord: il primo giro (dal 13/10) aveva coperto il Sud, e il
// Nord, dove ci sono più agenzie e aziende, aveva poche opportunità nel database (19/10:
// «Rifacimento del sito» 48 in Lombardia, 14 in Veneto, 461 in Puglia).
const PRIMA = ['Lombardia', 'Veneto', 'Emilia-Romagna', 'Piemonte', 'Lazio', 'Toscana', 'Liguria', 'Friuli-Venezia Giulia',
  'Trentino-Alto Adige', 'Marche', 'Umbria', "Valle d'Aosta"];
const ordine = (r) => (PRIMA.indexOf(r) + PRIMA.length + 1) % (PRIMA.length + 1);
const PROVINCE = __PROVINCE__ // [sigla, nome, regione]
  .map((p, i) => [p, i]).sort(([a, i], [b, j]) => ordine(a[2]) - ordine(b[2]) || i - j).map(([p]) => p);
const PER_GIORNO = 8;
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
const giorno = Math.max(0, Math.floor((oggi - new Date(2026, 9, 20)) / 86400000));
const rotazione = Array.from({ length: PER_GIORNO }, (_, k) => PROVINCE[(giorno * PER_GIORNO + k) % PROVINCE.length]);
// Al massimo 4 riprove al giorno (divise in 3 parti ognuna): con 8 province nuove la notte resta breve.
const daRiprovare = PROVINCE.filter(([s]) => riprova.includes(s)).slice(0, 4);
// Recupero una tantum (21/10): province perse nella notte del 21/10 (errore 500 al salvataggio, blocco da
// 2.000 aziende troppo grande, corretto nell'app) o uscite dalle riprove (al massimo 4 al giorno: Varese).
// Non dipende dalla lista delle riprove, che dopo un'esecuzione in errore potrebbe non essere salvata.
// Notti leggere quando le riprove sono già tante; dal 25/10 più niente.
const RECUPERO = [['SO', 'BL'], ['RO', 'CO', 'TV', 'VA'], ['PD', 'MB', 'PV']];
const notteRecupero = Math.floor((oggi - new Date(2026, 9, 22)) / 86400000);
const recupero = RECUPERO[notteRecupero] || [];
const daRecuperare = PROVINCE.filter(([s]) => recupero.includes(s) && !daRiprovare.some(([r]) => r === s));
const gia = (s) => daRiprovare.some(([r]) => r === s) || daRecuperare.some(([r]) => r === s);
const scelte = programmato
  ? [...daRiprovare, ...daRecuperare, ...rotazione.filter(([s]) => !gia(s))]
  : PROVINCE.filter(([s]) => s === 'MO');

const TIPI = ['office', 'craft', 'shop', 'amenity', 'tourism', 'healthcare', 'industrial'];
// Province grandi o già fallite: la query intera va in timeout (Napoli e Bari, 16/10), quindi
// si divide in 3 parti più leggere per tipo di attività.
const GRANDI = ['RM', 'MI', 'NA', 'TO', 'BA', 'PA', 'CT', 'FI', 'BO', 'GE', 'VE', 'VR', 'VI', 'PD', 'BS', 'BG', 'SA', 'MB', 'VA'];
const PARTI = [['office', 'craft', 'industrial', 'healthcare'], ['shop'], ['amenity', 'tourism']];
// Province che vanno in timeout anche divise in 3 (notte del 22/10: Brescia, Milano, Bologna, Venezia, Verona, Vicenza):
// una richiesta per ogni tipo di attività, sette in tutto, più leggere.
const ENORMI = ['MI', 'RM', 'NA', 'TO', 'BS', 'BO', 'VE', 'VR', 'VI'];
const PARTI_PICCOLE = TIPI.map(t => [t]);
const query = (sigla, tipi) => `[out:json][timeout:250];area["ISO3166-2"="IT-${sigla}"]->.a;(${tipi.map(t => `nwr(area.a)["website"]["${t}"];nwr(area.a)["contact:website"]["${t}"];`).join('')});out tags;`;
return scelte.flatMap(([sigla, provincia, regione]) => {
  const base = { sigla, provincia, regione, url: SERVER, riprova: riprova.includes(sigla) };
  const parti = ENORMI.includes(sigla) ? PARTI_PICCOLE : base.riprova || GRANDI.includes(sigla) ? PARTI : [TIPI];
  return parti.map((tipi, k) => ({ json: { ...base, parte: parti.length > 1 ? `${k + 1}/${parti.length}` : '', data: query(sigla, tipi) } }));
});
