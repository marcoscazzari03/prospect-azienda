// Richieste ad Adzuna: una per famiglia di figure (catalogo JOB_FAMILIES) e regione,
// ordinate dalla più recente. Ogni giorno bastano gli annunci degli ultimi 3 giorni
// (2 pagine da 50); il primo riempimento, avviato a mano, va indietro di 30 giorni.
// Limiti del piano Adzuna: 50 chiamate al minuto, 500 al giorno, 5.000 al mese.
const REGIONI = ['Emilia-Romagna'];

// Parole cercate da Adzuna (basta una, nel titolo o nel testo): la scelta finale la fa
// «Normalizza annunci» confrontando il titolo con le figure del catalogo.
const PAROLE = {
  it_systems: 'sistemista sysadmin helpdesk informatico',
  software_dev: 'programmatore sviluppatore developer frontend backend fullstack',
  cybersecurity: 'cybersecurity security sicurezza',
  digital_marketing: 'marketing seo social',
  sales: 'commerciale venditore sales account',
  hr: 'hr recruiter risorse paghe payroll',
  accounting: 'contabile amministrativo amministrativa controller contabilita',
  design: 'grafico grafica designer'
};

const manuale = $execution.mode === 'manual';
const giorni = manuale ? 30 : 3;
const pagine = manuale ? 4 : 2;

const out = [];
for (const regione of REGIONI) {
  for (const [famiglia, parole] of Object.entries(PAROLE)) {
    for (let pagina = 1; pagina <= pagine; pagina++) {
      out.push({ json: { family: famiglia, region: regione, page: pagina, what_or: parole, max_days_old: giorni } });
    }
  }
}
return out;
