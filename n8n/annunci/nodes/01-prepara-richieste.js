// Richieste ad Adzuna: una per famiglia di figure (catalogo JOB_FAMILIES) e regione,
// ordinate dalla più recente. Le pagine da 50 vanno avanti finché ci sono annunci
// (al massimo 6 al giorno, 10 nel primo riempimento). Ogni giorno bastano gli annunci
// degli ultimi 2 giorni; il primo riempimento, avviato a mano, va indietro di 30.
// Limiti del piano Adzuna: 50 chiamate al minuto, 500 al giorno, 5.000 al mese.
const REGIONI = ['Emilia-Romagna'];

// Parole cercate da Adzuna (basta una, nel titolo o nel testo): la scelta finale la fa
// «Normalizza annunci» confrontando il titolo con le figure del catalogo. Niente parole
// generiche (sicurezza, account, risorse...): riempirebbero le pagine di annunci fuori tema.
const PAROLE = {
  it_systems: 'sistemista sysadmin helpdesk sistemisti',
  software_dev: 'programmatore sviluppatore developer frontend backend fullstack',
  cybersecurity: 'cybersecurity soc pentester',
  digital_marketing: 'marketing seo',
  sales: 'commerciale venditore',
  hr: 'recruiter payroll paghe',
  accounting: 'contabile controller accountant',
  design: 'grafico designer'
};

// Avvio a mano = primo riempimento. ($execution.mode non basta: vale «test» anche per
// le prove dall'editor.)
let programmato = false;
try { programmato = $('Ogni mattina').isExecuted; } catch { programmato = false; }
const giorni = programmato ? 2 : 30;
const pagine = programmato ? 6 : 10;

const out = [];
for (const regione of REGIONI) {
  for (const [famiglia, parole] of Object.entries(PAROLE)) {
    out.push({ json: { family: famiglia, region: regione, what_or: parole, max_days_old: giorni, max_pages: pagine } });
  }
}
return out;
