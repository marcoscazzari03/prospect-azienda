// Richieste ad Adzuna: una per figura del catalogo (JOB_FAMILIES, titoli italiani e
// inglesi), in tutta Italia, cercata SOLO nel titolo dell'annuncio (title_only: tutte le
// parole nel titolo). Le ricerche libere (what/what_or) di Adzuna sono troppo larghe:
// con «sistemista» uscivano anche i corrieri. Si saltano i titoli già coperti da uno
// più corto («web developer» è dentro «developer»).
// Ogni giorno bastano gli annunci degli ultimi 2 giorni; il primo riempimento,
// avviato a mano, va indietro di 30. Pagine da 50, al massimo 5 per ricerca.
// Limiti del piano Adzuna: 50 chiamate al minuto, 500 al giorno, 5.000 al mese.
const FAMIGLIE = __FAMIGLIE__;

const parole = (t) => t.split(/\s+/).filter(w => w && !['di', 'de', 'del'].includes(w));
const titoli = [...new Set(FAMIGLIE.flatMap(f => f.titles))];
const ricerche = titoli.filter(t => !titoli.some(a => a !== t && parole(a).every(w => parole(t).includes(w))));

// Avvio a mano = primo riempimento. ($execution.mode non basta: vale «test» anche per
// le prove dall'editor.)
let programmato = false;
try { programmato = $('Ogni mattina').isExecuted; } catch { programmato = false; }
const giorni = programmato ? 2 : 30;

// Tutta Italia: la regione di ogni annuncio arriva da Adzuna (location.area).
return ricerche.map(titolo => ({ json: { term: titolo, region: '', max_days_old: giorni } }));
