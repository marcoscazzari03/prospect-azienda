// Classifica ogni prospect secondo la modalità email scelta dal cliente e
// prepara UN solo payload "results" per il backend.
//
// Stato dell'email (mai confusi tra loro):
//   found_public -> presente su una pagina pubblica del sito ufficiale (fonte = URL)
//   validated    -> verificata tecnicamente da un servizio di arricchimento (SMTP valid)
//   unverified   -> trovata ma senza verifica né fonte pubblica (oggi: non prodotta)
//   guessed      -> ipotizzata dal pattern nome.cognome@dominio: NON è un'email
//                   del lead, va solo in email_patterns e non si vende come contatto.
//
// Il backend ripete la deduplica contro lo storico del cliente prima di
// addebitare: questo payload è una proposta, non una consegna.
const job = $('Valida richiesta').first().json;
const items = $input.all().map(i => i.json);
const vuoto = items.length === 1 && items[0]._vuoto;
const prospects = vuoto ? [] : items.filter(j => !j._vuoto);

const cleanPart = (v) => String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

const pattern = (p) => {
  const first = cleanPart(p.first_name);
  const last = cleanPart(String(p.last_name ?? '').split(/\s+/).pop());
  if (!first || !last || !p.domain) return [];
  return [`${first}.${last}@${p.domain}`, `${first[0]}${last}@${p.domain}`, `${first}@${p.domain}`];
};

const leads = [];
const rejected = [];
let lookups = 0;
let pagine = 0;

for (const p of prospects) {
  lookups += Number(p.enrichment_lookups) || 0;
  pagine += Number(p.pages_fetched) || 0;

  const sito = p.email_site
    ? {
        address: p.email_site,
        type: p.email_site_type,
        status: 'found_public',
        source: 'website',
        source_url: p.email_site_source || p.website,
        free_provider: Boolean(p.email_site_free_provider)
      }
    : null;
  const arricchita = p.email_enrichment
    ? { address: p.email_enrichment, type: 'personal', status: 'validated', source: 'enrichment', source_url: '', free_provider: false }
    : null;

  // Nominativa: dal sito (con nome) o validata. Generica: solo dal dominio aziendale
  // o in un mailto del sito. "other_person" e "privacy" non si vendono mai.
  const nominativa = sito && sito.type === 'personal' ? sito : arricchita;
  const generica = sito && sito.type === 'generic' ? sito : null;

  let email = null;
  let motivo = '';
  if (job.email_mode === 'personal_only') {
    email = nominativa;
    if (!email) motivo = generica ? 'solo_email_generica' : 'nessuna_email';
  } else {
    // generic_ok e mixed accettano entrambe; cambiano la priorità di ricerca
    // (mixed insiste di più sulle nominative) e il prezzo, non il filtro.
    email = nominativa || generica;
    if (!email) motivo = 'nessuna_email';
  }

  if (p.email_enrichment_status === 'RATE_LIMIT' || p.email_enrichment_status === 'PENDING') {
    if (!email) motivo = 'arricchimento_da_riprovare';
  }

  const base = {
    company: {
      name: p.company_name, domain: p.domain, website: p.website, country: p.country,
      city: p.city, industry: p.industry, size_hint: p.size_hint
    },
    person: {
      full_name: p.full_name, first_name: p.first_name, last_name: p.last_name,
      job_title: p.job_title, role_match: p.role_match, linkedin_url: p.linkedin_url || ''
    },
    sources: { discovery_url: p.source_url, contact_page: p.contact_page || '' },
    keys: { person_key: p.person_key, company_key: p.company_key }
  };

  if (!email) {
    rejected.push({ ...base, reason: motivo, enrichment_status: p.email_enrichment_status || '' });
    continue;
  }

  const altre = (p._emails || [])
    .filter(e => e.email !== email.address && (e.type === 'personal' || e.type === 'generic'))
    .slice(0, 3)
    .map(e => ({ address: e.email, type: e.type, status: 'found_public', source_url: e.source_url }));

  // Punteggio qualità 0-100: trasparente e ricalcolabile dal backend.
  const checks = {
    official_site: true,
    discovery_source: Boolean(p.source_url),
    role_match: p.role_match,
    email_on_company_domain: !email.free_provider,
    email_personal: email.type === 'personal',
    email_verified: email.status === 'validated' || email.status === 'found_public'
  };
  const score = Math.min(100,
    30 +
    (checks.discovery_source ? 10 : 0) +
    (p.role_match === 'exact' ? 20 : p.role_match === 'plausible' ? 10 : 0) +
    (checks.email_on_company_domain ? 10 : 0) +
    (checks.email_personal ? 20 : 5) +
    (email.status === 'validated' ? 10 : email.status === 'found_public' ? 8 : 0));

  leads.push({
    ...base,
    email: { ...email, alternatives: altre },
    email_patterns: email.type === 'personal' ? [] : pattern(p).map(a => ({ address: a, status: 'guessed' })),
    quality: { score, checks }
  });
}

// Ordine: prima le nominative e i punteggi più alti.
leads.sort((a, b) => b.quality.score - a.quality.score);

const lotti = $('Normalizza output AI').all().map(i => i.json);
const dedup = vuoto ? items[0].stats : (prospects[0]?._stats_deduplica || {});
const motivi = rejected.reduce((m, r) => ({ ...m, [r.reason]: (m[r.reason] || 0) + 1 }), {});

return [{
  json: {
    event: 'results',
    contract_version: 1,
    job_id: job.job_id,
    run_id: job.run_id,
    run_token: job.run_token,
    email_mode: job.email_mode,
    requested: job.quantity,
    leads,
    rejected,
    stats: {
      lots: lotti.length,
      lots_failed: lotti.filter(l => l.stato_lotto === 'ERRORE' || l.stato_lotto === 'JSON NON VALIDO').length,
      ai_candidates: dedup.candidati_ai || 0,
      valid_candidates: dedup.candidati_validi || 0,
      dedup_discards: dedup.scarti || {},
      leads: leads.length,
      leads_personal: leads.filter(l => l.email.type === 'personal').length,
      leads_generic: leads.filter(l => l.email.type === 'generic').length,
      rejected: rejected.length,
      rejected_reasons: motivi
    },
    usage: {
      ai_search_calls: lotti.length,
      ai_planner_calls: 1,
      enrichment_lookups: lookups,
      pages_fetched: pagine
    },
    n8n_execution_id: $execution.id
  }
}];
