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

// Modello AI del motore: per cambiare basta questa riga (es. 'claude-opus-5-5').
// Il ritorno a OpenAI si fa ricollegando i nodi OpenAI rimasti nel workflow.
// Referente via web con Claude Haiku: prova del 14/10 sulle 7 aziende del collaudo,
// 5 referenti come Sonnet (4 identici) a 0,023 $ invece di 0,061 $ a chiamata.
const AI = { provider: 'anthropic', model: 'claude-sonnet-5-5', ref_model: 'claude-haiku-5-5', effort: 'medium', max_searches: 12, max_ref_searches: 2 };

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

// Segnali (opzionali): oggi il motore gestisce "job_ad". I titoli degli annunci
// arrivano dal backend (catalogo in src/lib/domain/signals.ts), già normalizzati.
const sg = t.signals && typeof t.signals === 'object' ? t.signals : {};
const CODICI_SEGNALI = ['job_ad', 'no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright', 'under_construction', 'no_booking_engine'];
const famiglie = (Array.isArray(sg.job_families) ? sg.job_families : []).slice(0, 3).map(f => ({
  code: str(f?.code, 40),
  label: str(f?.label, 80),
  titles: list(f?.titles, 80).map(x => x.toLowerCase())
})).filter(f => f.code && f.titles.length);
const signals = {
  codes: list(sg.codes, 3).filter(c => CODICI_SEGNALI.includes(c)),
  match: sg.match === 'all' ? 'all' : 'any',
  job_families: famiglie,
  max_age_days: clamp(sg.max_age_days, 7, 120, 60)
};
if (signals.codes.includes('job_ad') && !famiglie.length) signals.codes = signals.codes.filter(c => c !== 'job_ad');

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
  ai: AI,
  // Data di riferimento per gli annunci (il backend può fissarla; utile nei test).
  today: /^\d{4}-\d{2}-\d{2}$/.test(String(b.today ?? '')) ? String(b.today) : new Date().toISOString().slice(0, 10),
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
    notes: str(t.notes, 600),
    signals
  },
  exclusions: {
    domains: list((b.exclusions || {}).domains, 20000),
    person_keys: list((b.exclusions || {}).person_keys, 20000)
  },
  limits: {
    max_lots: clamp((b.limits || {}).max_lots, 1, 20, 6),
    candidates_per_lot: clamp((b.limits || {}).candidates_per_lot, 5, 30, 20),
    enrichment_cap: clamp((b.limits || {}).enrichment_cap, 0, 500, 0)
  },
  // Aziende con segnale già verificato nei giri precedenti (gli URL li ricontrolla la deduplica).
  reserve: (Array.isArray(b.reserve) ? b.reserve : []).slice(0, 40).map(r => ({
    company_name: str(r?.company_name, 200), website: str(r?.website, 300), country: str(r?.country, 80),
    city: str(r?.city, 80), industry: str(r?.industry, 120), size_hint: str(r?.size_hint, 60),
    technologies: list(r?.technologies, 10), source_url: str(r?.source_url, 500), contact_page: str(r?.contact_page, 500),
    signals: (Array.isArray(r?.signals) ? r.signals : []).slice(0, 5)
      .filter(x => CODICI_SEGNALI.includes(x?.code))
      .map(x => ({ code: x.code, status: 'pass', evidence: x.evidence && typeof x.evidence === 'object' ? x.evidence : {} }))
  })).filter(r => r.company_name && r.website && r.signals.length)
};

if (!/^[0-9a-f-]{8,64}$/i.test(job.job_id)) errori.push('job_id mancante o non valido');
if (!job.run_id) errori.push('run_id mancante');
if (job.run_token.length < 24) errori.push('run_token mancante');
if (!CALLBACK_AMMESSI.some(r => r.test(job.callback_url))) errori.push('callback_url non ammesso');
// Ricerca opportunità «tutti i settori»: senza settore, ma con almeno un segnale.
const tuttiISettori = !job.target.industry && !job.target.industry_keywords.length;
if (tuttiISettori && !job.target.signals.codes.length) errori.push('settore mancante');
if (!job.target.countries.length && !job.target.country_names.length) errori.push('paese mancante');

// Lotti: sovracampioniamo (deduplica, siti senza email, ruoli non coerenti
// fanno perdere in media 40-60% dei candidati), entro il limite del backend.
// Con gli annunci si parte da chi assume: una parte degli annunci viene
// scartata in verifica (agenzie, scaduti, pagine illeggibili).
const conAnnunci = job.target.signals.codes.includes('job_ad');
// Con i segnali dal sito una parte dei candidati non ha il segnale richiesto.
const conSegnaliSito = job.target.signals.codes.some(c => c !== 'job_ad');
const SEGNALI_SITO = {
  no_https: 'sito senza HTTPS', no_mobile: 'sito non adatto ai cellulari', outdated_cms: 'WordPress/Joomla non aggiornato',
  single_language: 'sito in una sola lingua', stale_copyright: 'sito fermo da anni', under_construction: 'sito in costruzione',
  no_booking_engine: 'nessun sistema di prenotazione online'
};
let lotti;
if (job.target.signals.codes.length) {
  // Due passaggi: l'AI cerca solo aziende (molte per lotto, costano poco), il motore
  // controlla i segnali gratis e cerca il referente solo per chi li ha, fino a un tetto:
  // i lead richiesti più un margine per referenti ed email non trovati.
  job.limits.referenti_max = Math.ceil(job.quantity * (job.email_mode === 'personal_only' ? 2.2 : 1.5)) + 1;
  job.limits.candidates_per_lot = 30;
  // Quota attesa di aziende con il segnale (collaudo del 14/10: CMS vecchio ~20%,
  // una sola lingua ~55%, annunci verificati ~60%).
  const QUOTA = { job_ad: 0.6, no_https: 0.1, no_mobile: 0.15, outdated_cms: 0.25, single_language: 0.5 };
  const quote = job.target.signals.codes.map(c => QUOTA[c] ?? 0.3);
  const quota = job.target.signals.match === 'all'
    ? quote.reduce((a, q) => a * q, 1)
    : Math.min(0.8, 1 - quote.reduce((a, q) => a * (1 - q), 1));
  // Riserva sufficiente (dal database o dai giri precedenti): nessuna ricerca AI in questo
  // giro. Collaudo del 14/10: 7 aziende in riserva -> 5 lead su 5; la ricerca AI partita
  // per 2 aziende mancanti è costata 0,37 $ e non ha dato lead. Se mancano lead, il giro
  // successivo la usa comunque.
  const bastaRiserva = job.reserve.length >= Math.ceil(job.quantity * (job.email_mode === 'personal_only' ? 2 : 1.4));
  // Annuncio di lavoro decisivo: solo aziende del database (collaudi del 14/10: la ricerca
  // AI di aziende con annunci, 3 tentativi per ~0,9 $, non ha dato un solo lead).
  const soloDatabase = conAnnunci && (job.target.signals.codes.length === 1 || job.target.signals.match === 'all');
  const daCercare = bastaRiserva || soloDatabase ? 0 : Math.max(0, job.limits.referenti_max - job.reserve.length);
  lotti = daCercare === 0 ? 0 : Math.min(job.limits.max_lots, Math.max(1, Math.ceil(daCercare / Math.max(quota, 0.1) / job.limits.candidates_per_lot)));
  job.ai = { ...AI, max_searches: 8 };
} else {
  const SOVRACAMPIONAMENTO = job.email_mode === 'personal_only' ? 2.6 : 1.8;
  lotti = Math.min(
    job.limits.max_lots,
    Math.max(1, Math.ceil(job.quantity * SOVRACAMPIONAMENTO / job.limits.candidates_per_lot))
  );
}

const paesi = job.target.country_names.length ? job.target.country_names : job.target.countries;
const brief = [
  `Settore: ${job.target.industry || job.target.industry_keywords.join(', ') || 'qualsiasi: piccole e medie imprese di ogni settore (indica il settore reale di ognuna in "industry")'}`,
  job.target.industry_keywords.length ? `Parole chiave del settore: ${job.target.industry_keywords.join(', ')}` : '',
  `Paesi: ${paesi.join(', ')}`,
  job.target.regions.length ? `Aree / città: ${job.target.regions.join(', ')}` : '',
  job.target.company_size.length ? `Dimensione azienda (dipendenti): ${job.target.company_size.join(', ')}` : '',
  job.target.revenue_range ? `Fatturato indicativo: ${job.target.revenue_range}` : '',
  `Ruoli da contattare: ${job.target.roles.length ? job.target.roles.join(', ') : 'titolare / CEO / fondatore'}`,
  job.target.keywords.length ? `Parole chiave aggiuntive: ${job.target.keywords.join(', ')}` : '',
  job.target.exclude_keywords.length ? `Da escludere: ${job.target.exclude_keywords.join(', ')}` : '',
  job.target.notes ? `Note del cliente: ${job.target.notes}` : '',
  conSegnaliSito ? `Cerchiamo aziende con questi segnali sul sito: ${job.target.signals.codes.filter(c => c !== 'job_ad').map(c => SEGNALI_SITO[c] || c).join('; ')}. Privilegia aziende piccole e locali, con siti semplici o poco aggiornati: le controlliamo una per una.` : '',
  conAnnunci ? `Segnale richiesto: aziende che hanno pubblicato negli ultimi ${job.target.signals.max_age_days} giorni un annuncio di lavoro per: ${job.target.signals.job_families.map(f => f.label).join('; ')}` : ''
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
  ...(conAnnunci ? [
    'Le query devono cercare ANNUNCI DI LAVORO recenti per le figure indicate (es. «offerta lavoro',
    'sistemista Brescia», «se busca administrador de sistemas Madrid»), anche sulle pagine',
    '«Lavora con noi» dei siti aziendali. Evita le agenzie per il lavoro.'
  ] : []),
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
