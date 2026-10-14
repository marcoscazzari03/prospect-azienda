// Esito della ricerca del referente (__FASE__): controlla la risposta e completa il prospect.
// SITO: letto dal testo del sito; se non c'è si passa alla ricerca web (_cerca_web).
// WEB: ricerca web; senza una persona valida l'azienda esce dal flusso (nessuna ricerca email).
const FASE = '__FASE__';
const job = $('Valida richiesta').first().json;
const { _claude_ref, _claude_sito, ...p } = $('__ORIGINE__').item.json;
const r = $json;

const norm = (v) => String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const pulito = (v, max = 200) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const host = (u) => String(u ?? '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  .split(/[/?#]/)[0].replace(/:\d+$/, '');
// Stessi controlli anti-SSRF della deduplica: solo host pubblici e porte 80/443.
const hostPubblico = (h) => /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(h) && !h.split('.').some(x => !x || x.startsWith('-') || x.endsWith('-'))
  && !/(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|invalid|test|example)$/.test(h);
const urlPulito = (v) => {
  const s = String(v ?? '').replace(/\s+/g, '').slice(0, 500);
  const m = s.match(/^(https?):\/\/([a-z0-9.-]+)(:\d+)?([/?#].*)?$/i);
  if (!m || !hostPubblico(m[2].toLowerCase()) || (m[3] && !/^:(80|443)$/.test(m[3]))) return '';
  return `${m[1].toLowerCase()}://${m[2].toLowerCase()}${m[4] || '/'}`;
};

const testo = (Array.isArray(r.content) ? r.content : []).filter(b => b?.type === 'text').map(b => b.text).join('');
let dati = null;
try {
  const a = testo.indexOf('{');
  const b = testo.lastIndexOf('}');
  dati = a >= 0 && b > a ? JSON.parse(testo.slice(a, b + 1)) : null;
} catch { dati = null; }
const persona = dati && typeof dati.person === 'object' ? dati.person : null;

// Consumo di Claude per questa ricerca del referente (sommato in «Classifica e prepara risultati»).
const u = r.usage || {};
const out = {
  ...p, _serve_referente: false, _cerca_web: false, enrichment_lookups: p.enrichment_lookups || 0,
  // Token di input equivalenti al prezzo pieno: scrittura in cache 1,25×, lettura 0,1×.
  ai_input_tokens: (Number(p.ai_input_tokens) || 0) + Math.round((Number(u.input_tokens) || 0)
    + 1.25 * (Number(u.cache_creation_input_tokens) || 0) + 0.1 * (Number(u.cache_read_input_tokens) || 0)),
  ai_output_tokens: (Number(p.ai_output_tokens) || 0) + (Number(u.output_tokens) || 0),
  ai_web_searches: (Number(p.ai_web_searches) || 0) + (Number(u.server_tool_use?.web_search_requests) || 0)
};
const nome = pulito(persona?.full_name, 120);
const parti = norm(nome).split(' ').filter(x => x.length > 1);
// Dal sito la fonte deve essere una delle pagine lette (altrimenti la homepage).
const pagine = Array.isArray(p._pagine_referente) ? p._pagine_referente : [];
const fonte = FASE === 'SITO'
  ? (pagine.find(x => urlPulito(x) && urlPulito(x) === urlPulito(persona?.source_url)) || urlPulito(pagine[0]))
  : urlPulito(persona?.source_url);
// Note dell'AI al posto del nome («cognome non indicato») non sono un referente.
const NOTE_AI = /\b(non|nd|cognome|nome|surname|name|unknown|anonim[oa]|indicat\w*|specificat\w*|disponibil\w*|sconosciut\w*)\b/i;

const valido = persona && parti.length >= 2 && parti.length <= 5 && !/[()\[\]{}0-9@:;?!/]/.test(nome) && !NOTE_AI.test(nome) && fonte;
if (FASE === 'SITO' && (r.type === 'error' || r.error || !valido)) {
  out._cerca_web = true;
} else if (r.type === 'error' || r.error) {
  out._scarto_segnale = 'referente_errore_ricerca';
} else if (!valido) {
  out._scarto_segnale = 'referente_non_trovato';
} else {
  const kp = `${norm(nome)}|${p.company_key}`;
  const giaVenduta = job.exclusions.person_keys.map(k => String(k).toLowerCase()).includes(kp);
  if (giaVenduta) {
    out._scarto_segnale = 'persona_gia_acquistata';
  } else {
    // Coerenza del ruolo: il ruolo richiesto (o una sua parte) deve comparire nel titolo.
    const titolo = pulito(persona.job_title, 120);
    const richiesti = job.target.roles.flatMap(x => String(x).split(/\s*(?:\/|,|\|)\s*/)).map(norm).filter(Boolean);
    const contatti = urlPulito(persona.contact_page);
    Object.assign(out, {
      full_name: nome,
      first_name: pulito(persona.first_name, 60) || nome.split(' ')[0],
      last_name: pulito(persona.last_name, 80) || nome.split(' ').slice(1).join(' '),
      job_title: titolo,
      role_match: richiesti.some(x => ` ${norm(titolo)} `.includes(` ${x} `)) ? 'exact' : 'plausible',
      person_key: kp,
      linkedin_url: /linkedin\.com\/in\//i.test(String(persona.linkedin_url ?? '')) ? pulito(persona.linkedin_url, 300) : '',
      source_url: fonte,
      contact_page: contatti && host(contatti) === p.domain ? contatti : (p.contact_page || '')
    });
  }
}
delete out._pagine_referente;
delete out._referente_sito;
return { json: out };
