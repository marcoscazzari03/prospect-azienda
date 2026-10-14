// Popolamento da OpenStreetMap: una regione al giorno (a rotazione, ogni regione circa ogni
// 20 giorni), a mano l'Emilia-Romagna. Una query Overpass per tipo di attività, solo gli
// elementi con un sito web; si scaricano solo le etichette (niente geometrie).
const REGIONI = [
  ['IT-21', 'Piemonte'], ['IT-23', "Valle d'Aosta"], ['IT-25', 'Lombardia'], ['IT-32', 'Trentino-Alto Adige'],
  ['IT-34', 'Veneto'], ['IT-36', 'Friuli-Venezia Giulia'], ['IT-42', 'Liguria'], ['IT-45', 'Emilia-Romagna'],
  ['IT-52', 'Toscana'], ['IT-55', 'Umbria'], ['IT-57', 'Marche'], ['IT-62', 'Lazio'], ['IT-65', 'Abruzzo'],
  ['IT-67', 'Molise'], ['IT-72', 'Campania'], ['IT-75', 'Puglia'], ['IT-77', 'Basilicata'], ['IT-78', 'Calabria'],
  ['IT-82', 'Sicilia'], ['IT-88', 'Sardegna']
];
const TIPI = ['office', 'craft', 'shop', 'amenity', 'tourism', 'healthcare', 'industrial'];

let programmato = false;
try { programmato = $('Ogni giorno').isExecuted; } catch { programmato = false; }
const oggi = new Date();
const giorno = Math.floor((oggi - new Date(oggi.getFullYear(), 0, 0)) / 86400000);
const [codice, regione] = programmato ? REGIONI[giorno % REGIONI.length] : REGIONI.find(([c]) => c === 'IT-45');

return TIPI.map(tipo => ({ json: {
  regione, tipo,
  data: `[out:json][timeout:240];area["ISO3166-2"="${codice}"]->.r;(nwr(area.r)["${tipo}"]["website"];nwr(area.r)["${tipo}"]["contact:website"];);out tags;`
} }));
