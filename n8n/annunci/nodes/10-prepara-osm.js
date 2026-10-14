// Popolamento da OpenStreetMap per provincia: una query Overpass per riquadro di provincia
// (le query su un'intera regione vanno in timeout sui server pubblici). Ogni giorno
// PER_GIORNO province a rotazione (tutta Italia in circa un mese), a mano Modena.
// Il riquadro prende anche un po' delle province vicine: provincia e regione si assegnano
// comunque a quella del riquadro (i doppioni si uniscono per dominio nel database).
const PROVINCE = __PROVINCE__; // [sigla, nome, regione, 'sud,ovest,nord,est']
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
return scelte.map(([sigla, provincia, regione, bbox]) => ({ json: {
  sigla, provincia, regione, url: SERVER,
  data: `[out:json][timeout:250][bbox:${bbox}];(${TIPI.map(t => `nwr["website"]["${t}"];nwr["contact:website"]["${t}"];`).join('')});out tags;`
} }));
