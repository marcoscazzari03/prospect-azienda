// Popolamento da OpenStreetMap per provincia: una query Overpass sull'area ufficiale della
// provincia (codice ISO «IT-MO»; le query su un'intera regione vanno in timeout sui server
// pubblici). Ogni giorno PER_GIORNO province a rotazione (tutta Italia in circa un mese),
// a mano Modena.
const PROVINCE = __PROVINCE__; // [sigla, nome, regione]
const PER_GIORNO = 4;
const SERVER = 'https://overpass.private.coffee/api/interpreter';

let programmato = false;
try { programmato = $('Ogni giorno').isExecuted; } catch { programmato = false; }
const oggi = new Date();
const giorno = Math.floor((oggi - new Date(2026, 0, 1)) / 86400000);
const scelte = programmato
  ? Array.from({ length: PER_GIORNO }, (_, k) => PROVINCE[(giorno * PER_GIORNO + k) % PROVINCE.length])
  : PROVINCE.filter(([s]) => s === 'MO');

const TIPI = ['office', 'craft', 'shop', 'amenity', 'tourism', 'healthcare', 'industrial'];
return scelte.map(([sigla, provincia, regione]) => ({ json: {
  sigla, provincia, regione, url: SERVER,
  data: `[out:json][timeout:250];area["ISO3166-2"="IT-${sigla}"]->.a;(${TIPI.map(t => `nwr(area.a)["website"]["${t}"];nwr(area.a)["contact:website"]["${t}"];`).join('')});out tags;`
} }));
