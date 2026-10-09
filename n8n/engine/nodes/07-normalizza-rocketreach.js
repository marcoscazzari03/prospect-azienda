// Risultato RocketReach -> campi email_enrichment_*.
// Teniamo SOLO email professionali con verifica SMTP "valid": le altre non
// vengono mai presentate come verificate.
const prospect = $('Arricchimento necessario?').item.json;
const rr = $json;

const testoErrore = String(rr.response ?? rr.detail ?? rr.message ?? '');
const rateLimit = /rate limit|too many/i.test(testoErrore);
const inCorso = ['progress', 'searching', 'waiting', 'queued', 'not queued']
  .includes(String(rr.status ?? '').toLowerCase());

const emails = Array.isArray(rr.emails) ? rr.emails : [];
const valide = emails.filter(e => e && e.email && e.type === 'professional' && e.smtp_valid === 'valid');

let email = '';
if (rr.recommended_professional_email && valide.some(e => e.email === rr.recommended_professional_email)) {
  email = rr.recommended_professional_email;
} else if (valide.length) {
  email = valide[0].email;
}

// L'email deve appartenere al dominio dell'azienda (evita omonimi altrove).
const dominio = String(prospect.domain || '').toLowerCase();
const delDominio = email && dominio && (email.toLowerCase().endsWith('@' + dominio) || email.toLowerCase().endsWith('.' + dominio));

let stato;
if (email && delDominio) stato = 'VALIDATED';
else if (email) stato = 'OTHER_DOMAIN';
else if (rateLimit) stato = 'RATE_LIMIT';
else if (inCorso) stato = 'PENDING';
else if (rr.detail || !rr.id) stato = 'NOT_FOUND';
else stato = 'NO_VALID_EMAIL';

return {
  json: {
    ...prospect,
    email_enrichment: stato === 'VALIDATED' ? email : '',
    email_enrichment_status: stato,
    linkedin_url: prospect.linkedin_url || (/linkedin\.com\/in\//i.test(String(rr.linkedin_url ?? '')) ? rr.linkedin_url : ''),
    enrichment_lookups: 1
  }
};
