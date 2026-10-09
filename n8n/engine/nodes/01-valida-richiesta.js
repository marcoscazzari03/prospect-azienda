// Valida e normalizza la richiesta arrivata dal backend (contratto v1).
// Il backend ha già controllato piano e crediti: qui ci limitiamo a
// rifiutare payload incompleti e a preparare il brief per l'AI.
// URL di callback ammessi: SOLO il backend della piattaforma (anti-SSRF).
// Dominio della piattaforma (anche sottodomini, es. leads.weborastudio.it).
const DOMINIO_PIATTAFORMA = 'weborastudio.it';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CALLBACK_AMMESSI = [
  new RegExp(`^https://([a-z0-9-]+\\.)?${esc(DOMINIO_PIATTAFORMA)}/api/engine/callback$`, 'i')
];

const raw = $input.first().json;
const b = raw.body && typeof raw.body === 'object' ? raw.body : raw;

const str = (v, max = 300) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const list = (v, max = 30) => (Array.isArray(v) ? v : (v ? [v] : []))
  .map(x => str(x, 120)).filter(Boolean).slice(0, max);
const clamp = (n, min, max, def) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : def;
};

const errori = [];
const t = b.target || {};

const job = {
  contract_version: Number(b.contract_version) || 1,
  job_id: str(b.job_id, 64),
  run_id: str(b.run_id, 64),
  run_token: str(b.run_token, 128),
  callback_url: str(b.callback_url, 300),
  email_mode: ['generic_ok', 'personal_only', 'mixed'].includes(b.email_mode) ? b.email_mode : 'mixed',
  quantity: clamp(b.quantity, 1, 500, 25),
  contacts_per_company: clamp(b.contacts_per_company, 1, 3, 1),
  language: str(b.language, 5) || 'it',
  target: {
    countries: list(t.countries),
    country_names: list(t.country_names),
    regions: list(t.regions),
    industry: str(t.industry, 200),
    industry_keywords: list(t.industry_keywords),
    company_size: list(t.company_size, 6),
    revenue_range: str(t.revenue_range, 60),
    roles: list(t.roles, 12),
    keywords: list(t.keywords, 15),
    exclude_keywords: list(t.exclude_keywords, 15),
    notes: str(t.notes, 600)
  },
  exclusions: {
    domains: list((b.exclusions || {}).domains, 20000),
    person_keys: list((b.exclusions || {}).person_keys, 20000)
  },
  limits: {
    max_lots: clamp((b.limits || {}).max_lots, 1, 20, 6),
    candidates_per_lot: clamp((b.limits || {}).candidates_per_lot, 5, 30, 20),
    enrichment_cap: clamp((b.limits || {}).enrichment_cap, 0, 500, 0)
  }
};

if (!/^[0-9a-f-]{8,64}$/i.test(job.job_id)) errori.push('job_id mancante o non valido');
if (!job.run_id) errori.push('run_id mancante');
if (job.run_token.length < 24) errori.push('run_token mancante');
if (!CALLBACK_AMMESSI.some(r => r.test(job.callback_url))) errori.push('callback_url non ammesso');
if (!job.target.industry && !job.target.industry_keywords.length) errori.push('settore mancante');
if (!job.target.countries.length && !job.target.country_names.length) errori.push('paese mancante');

// Lotti: sovracampioniamo (deduplica, siti senza email, ruoli non coerenti
// fanno perdere in media 40-60% dei candidati), entro il limite del backend.
const SOVRACAMPIONAMENTO = job.email_mode === 'personal_only' ? 2.6 : 1.8;
const lotti = Math.min(
  job.limits.max_lots,
  Math.max(1, Math.ceil(job.quantity * SOVRACAMPIONAMENTO / job.limits.candidates_per_lot))
);

const paesi = job.target.country_names.length ? job.target.country_names : job.target.countries;
const brief = [
  `Settore: ${job.target.industry || job.target.industry_keywords.join(', ')}`,
  job.target.industry_keywords.length ? `Parole chiave del settore: ${job.target.industry_keywords.join(', ')}` : '',
  `Paesi: ${paesi.join(', ')}`,
  job.target.regions.length ? `Aree / città: ${job.target.regions.join(', ')}` : '',
  job.target.company_size.length ? `Dimensione azienda (dipendenti): ${job.target.company_size.join(', ')}` : '',
  job.target.revenue_range ? `Fatturato indicativo: ${job.target.revenue_range}` : '',
  `Ruoli da contattare: ${job.target.roles.length ? job.target.roles.join(', ') : 'titolare / CEO / fondatore'}`,
  job.target.keywords.length ? `Parole chiave aggiuntive: ${job.target.keywords.join(', ')}` : '',
  job.target.exclude_keywords.length ? `Da escludere: ${job.target.exclude_keywords.join(', ')}` : '',
  job.target.notes ? `Note del cliente: ${job.target.notes}` : ''
].filter(Boolean).join('\n');

const planner_prompt = [
  'Sei un analista di lead generation B2B. Dividi la ricerca qui sotto in',
  `${lotti} LOTTI DI RICERCA DIVERSI, che non si sovrappongano (aree geografiche,`,
  'città, sotto-nicchie o tipologie di azienda diverse), in modo che ricerche web',
  'separate trovino aziende diverse.',
  '',
  'RICERCA',
  brief,
  '',
  'Per ogni lotto indica il paese, il focus (in italiano) e 3-5 query di ricerca',
  'nella LINGUA LOCALE del paese, come le scriverebbe una persona del posto.',
  '',
  'Restituisci ESCLUSIVAMENTE JSON valido:',
  '{"lotti":[{"paese":"","focus":"","query":["",""]}]}'
].join('\n');

return [{
  json: {
    ...job,
    valida: errori.length === 0,
    errori,
    lotti_previsti: lotti,
    brief,
    planner_prompt
  }
}];
