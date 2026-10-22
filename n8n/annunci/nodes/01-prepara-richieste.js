// Richieste ad Adzuna: una per figura del catalogo (JOB_FAMILIES, titoli italiani e
// inglesi), in tutta Italia, cercata SOLO nel titolo dell'annuncio (title_only: tutte le
// parole nel titolo). Le ricerche libere (what/what_or) di Adzuna sono troppo larghe:
// con «sistemista» uscivano anche i corrieri. Si saltano i titoli già coperti da uno
// più corto («web developer» è dentro «developer»).
// Ogni 2 giorni bastano gli annunci degli ultimi 3 (uno di sovrapposizione); il primo
// riempimento, avviato a mano, va indietro di 30. Pagine da 50, al massimo 5 per ricerca.
// Limiti di base dell'API Adzuna: 25 chiamate al minuto, 250 al giorno, 2.500 al mese.
// Ogni giro fa circa 70 chiamate (67 titoli + qualche pagina in più): ogni giorno erano
// ~2.100 al mese, troppo vicino al tetto; ogni 2 giorni ~1.100. Dal 22/10 (punto 89, manifattura) circa 25 titoli in
// più, con annunci numerosi (più pagine): stima ~1.800 al mese, da controllare nel riquadro delle chiamate Adzuna.
const FAMIGLIE = __FAMIGLIE__;

const parole = (t) => t.split(/\s+/).filter(w => w && !['di', 'de', 'del'].includes(w));
const titoli = [...new Set(FAMIGLIE.flatMap(f => f.cerca || f.titles))];
const ricerche = titoli.filter(t => !titoli.some(a => a !== t && parole(a).every(w => parole(t).includes(w))));

// Avvio a mano = primo riempimento. ($execution.mode non basta: vale «test» anche per
// le prove dall'editor.)
let programmato = false;
try { programmato = $('Ogni mattina').isExecuted; } catch { programmato = false; }
const giorni = programmato ? 3 : 30;

// Tutta Italia: la regione di ogni annuncio arriva da Adzuna (location.area).
return ricerche.map(titolo => ({ json: { term: titolo, region: '', max_days_old: giorni } }));
