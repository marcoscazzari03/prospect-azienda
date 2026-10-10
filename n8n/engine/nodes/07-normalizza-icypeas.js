// Risultato Icypeas -> campi email_enrichment_*.
// Teniamo SOLO email del dominio aziendale con certezza alta (ultra_sure,
// very_sure): le altre non vengono mai presentate come verificate.
// Icypeas scala un credito solo quando trova (stato DEBITED).
const prospect = $('Arricchimento necessario?').item.json;
const r = $json.items?.[0] ?? {};
const statoIcy = String(r.status ?? '').toUpperCase();

const CERTE = ['ultra_sure', 'very_sure'];
const emails = Array.isArray(r.results?.emails) ? r.results.emails : [];
const dominio = String(prospect.domain || '').toLowerCase();
const delDominio = (e) => {
  const x = String(e || '').toLowerCase();
  return dominio && (x.endsWith('@' + dominio) || x.endsWith('.' + dominio));
};
const certa = emails.find(e => e?.email && CERTE.includes(String(e.certainty)) && delDominio(e.email));

let stato;
if (certa) stato = 'VALIDATED';
else if (emails.some(e => e?.email && delDominio(e.email))) stato = 'LOW_CERTAINTY';
else if (emails.length) stato = 'OTHER_DOMAIN';
else if (['NONE', 'SCHEDULED', 'IN_PROGRESS'].includes(statoIcy)) stato = 'PENDING';
else if (statoIcy === 'INSUFFICIENT_FUNDS' || $json.statusCode === 429) stato = 'RATE_LIMIT';
else stato = 'NOT_FOUND';

return {
  json: {
    ...prospect,
    email_enrichment: certa ? String(certa.email).toLowerCase() : '',
    email_enrichment_status: stato,
    email_enrichment_certainty: certa ? certa.certainty : '',
    enrichment_lookups: statoIcy === 'DEBITED' ? 1 : 0
  }
};
