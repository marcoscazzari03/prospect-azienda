// Controllo dei siti del database: stesse regole del motore (controlliSito, condiviso con
// «Valuta segnali sito»), su tutti i controlli. Gli esiti vanno in company_checks e le prove
// (pass) in company_signals, pronte per le ricerche opportunità senza AI.
// Ogni azienda viene salvata come controllata, anche con il sito irraggiungibile
// (tutti «non determinabile»): si riprova tra 25 giorni.
const aziende = $('Siti da controllare').all().map(i => i.json);
const https = $('Controllo HTTPS').all().map(i => i.json);
const pagine = $input.all().map(i => i.json);
const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }); // AAAA-MM-GG
const CODICI = ['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright', 'under_construction', 'no_booking_engine'];

const items = [];
const stats = { companies: 0, unreachable: 0, signals: {} };
aziende.forEach((a, i) => {
  const html = String(pagine[i]?.html ?? '');
  const { esiti, tecnologie } = controlliSito({ html, website: a.website, oggi, richiesti: CODICI, https: https[i] || {} });
  const checks = Object.values(esiti);
  if (html.length < 500) stats.unreachable++;
  for (const c of checks) if (c.status === 'pass') stats.signals[c.code] = (stats.signals[c.code] || 0) + 1;
  items.push({ company: { domain: a.domain, name: a.name, website: a.website, technologies: tecnologie }, checks });
});
stats.companies = items.length;
return [{ json: { items, stats } }];

__CONTROLLI_SITO__
