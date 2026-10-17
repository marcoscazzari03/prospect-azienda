// Deduplica e validazione formale dei candidati dell'AI.
// Scarta: senza fonte, senza sito ufficiale, siti non ufficiali (social,
// directory), aziende/persone già vendute al cliente (exclusions dal backend),
// duplicati interni alla ricerca, oltre N contatti per azienda.
// Se non resta nessuno, emette un solo item {_vuoto:true}: il ramo "vuoto"
// invia comunque i risultati (0 lead) al backend, che chiude la ricerca.
const job = $('Valida richiesta').first().json;

const norm = (v) => String(v ?? '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

// Caratteri invisibili che l'AI a volte copia dalle pagine (es. U+FEFF): rompono gli URL.
// (Costruita dai codici: nel caricamento su n8n gli escape unicode verrebbero convertiti.)
const INVISIBILI = new RegExp(`[${[0xAD, 0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x2060, 0xFEFF].map(c => String.fromCharCode(c)).join('')}]`, 'g');
const pulito = (v, max = 200) => String(v ?? '').replace(INVISIBILI, '').trim().replace(/\s+/g, ' ').slice(0, max);
// Solo nomi di dominio pubblici: niente IP, localhost o domini interni (anti-SSRF:
// gli indirizzi arrivano dall'AI, che legge pagine di terzi e le note del cliente).
const hostPubblico = (h) => {
  const x = String(h || '').toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(x)) return false; // richiede un TLD alfabetico: esclude gli IP
  if (x.split('.').some((p) => !p || p.startsWith('-') || p.endsWith('-'))) return false;
  return !/(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|invalid|test|example)$/.test(x);
};
// URL: niente spazi né invisibili, e deve essere un indirizzo http(s) valido.
// (Niente `new URL`: nella sandbox dei Code node di n8n non è disponibile.)
const urlPulito = (v, max = 500) => {
  let s = String(v ?? '').replace(INVISIBILI, '').replace(/\s+/g, '').slice(0, max);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  const m = s.match(/^(https?):\/\/([a-z0-9.-]+)(:\d+)?([/?#].*)?$/i);
  if (!m || !hostPubblico(m[2]) || (m[3] && !/^:(80|443)$/.test(m[3]))) return '';
  return `${m[1].toLowerCase()}://${m[2].toLowerCase()}${m[4] || '/'}`;
};

const host = (u) => String(u ?? '').trim().toLowerCase()
  .replace(/^https?:\/\//i, '').replace(/^\/\//, '').replace(/^www\./i, '')
  .split('/')[0].split('?')[0].split('#')[0].replace(/:\d+$/, '').trim();

// Chiave azienda = dominio (sulle piattaforme condivise anche il primo segmento).
const chiaveAzienda = (sito) => {
  const s = String(sito ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  const [h, primo] = s.split(/[?#]/)[0].split('/');
  if (!h) return '';
  return ['sites.google.com', 'linktr.ee', 'business.site'].includes(h) && primo ? `${h}/${primo}` : h;
};

const NON_UFFICIALI = /(^|\.)(linkedin|facebook|instagram|twitter|x|youtube|tiktok|google|goo|bing|yelp|trustpilot|tripadvisor|glassdoor|indeed|crunchbase|zoominfo|rocketreach|apollo|dnb|bloomberg|wikipedia|kompass|europages|infobel|paginegialle|paginebianche|paginasamarillas|yellowpages|gelbeseiten|pagesjaunes|herold|panoramafirm|firmy|zlatestranky|cylex|hotfrog|yell|192|houzz|clutch|g2|capterra|amazon|ebay|etsy|medium|wordpress|blogspot|wixsite|reddit|quora|ufficiocamerale|registroimprese|reportaziende|informazione-aziende|atoka|companieshouse|northdata|opencorporates|thefork|booking|airbnb|expedia|trivago|agoda|justeat|deliveroo|glovoapp|ubereats|vorreiordinare)\.[a-z.]+$/;

const parti = (nome) => norm(nome).split(' ').filter(p => p.length > 1);
// Nome di una persona reale: niente note dell'AI («cognome non indicato»), parentesi o numeri.
const NOTE_AI = /\b(non|nd|cognome|nome|surname|name|unknown|anonim[oa]|indicat\w*|specificat\w*|disponibil\w*|sconosciut\w*)\b/i;
const nomeValido = (nome) => {
  const n = String(nome ?? '').trim();
  return parti(n).length >= 2 && parti(n).length <= 5 && !/[()\[\]{}0-9@:;?!/]/.test(n) && !NOTE_AI.test(n);
};
const chiavePersona = (nome, dominio) => `${norm(nome)}|${dominio}`;

const escludiDomini = new Set(job.exclusions.domains.map(d => chiaveAzienda(d)));
const escludiPersone = new Set(job.exclusions.person_keys.map(k => String(k).toLowerCase()));
const escludiParole = job.target.exclude_keywords.map(norm).filter(Boolean);

// Coerenza del ruolo: corrispondenza con i ruoli richiesti o sinonimi di vertice.
const VERTICE = ['ceo', 'founder', 'co founder', 'cofounder', 'owner', 'titolare', 'fondatore', 'presidente',
  'president', 'managing director', 'amministratore', 'general manager', 'direttore generale', 'partner',
  'managing partner', 'socio', 'geschaftsfuhrer', 'gerente', 'director general', 'directeur general', 'proprietario',
  'principal', 'head', 'chief'];
// I ruoli scelti nel wizard possono contenere alternative ("Titolare / CEO"):
// ognuna conta da sola, con i sinonimi più comuni in italiano e inglese.
const SINONIMI = {
  ceo: ['ceo', 'chief executive', 'amministratore delegato', 'ad'],
  titolare: ['titolare', 'owner', 'proprietario', 'imprenditore', 'legale rappresentante', 'amministratore unico', 'gestore', 'socio unico'],
  fondatore: ['fondatore', 'founder', 'co founder', 'cofounder', 'co fondatore', 'cofondatore'],
  founder: ['founder', 'co founder', 'cofounder', 'fondatore', 'co fondatore'],
  'managing director': ['managing director', 'direttore generale', 'general manager', 'amministratore unico'],
  partner: ['partner', 'socio', 'managing partner', 'senior partner'],
  cto: ['cto', 'chief technology', 'responsabile it', 'it manager', 'head of it'],
  cfo: ['cfo', 'chief financial', 'direttore finanziario', 'responsabile amministrativo'],
  cmo: ['cmo', 'chief marketing', 'direttore marketing', 'marketing director', 'head of marketing', 'responsabile marketing'],
};
const scelti = job.target.roles
  .flatMap(r => String(r).split(/\s*(?:\/|,|\||&|\so\s|\sor\s)\s*/i))
  .map(norm).filter(Boolean);
const ruoliRichiesti = [...new Set(scelti.flatMap(a => [a, ...(SINONIMI[a] || [])]))];
// Parole generiche che da sole non dicono nulla sul ruolo.
const GENERICHE_RUOLO = new Set(['responsabile', 'direttore', 'director', 'manager', 'head', 'chief', 'senior', 'junior', 'ufficio']);
const parola = (testo, termine) => ` ${testo} `.includes(` ${termine} `);
const coerenzaRuolo = (titolo) => {
  const t = norm(titolo);
  if (!t) return 'unknown';
  if (ruoliRichiesti.some(r => parola(t, r))) return 'exact';
  const tok = scelti.flatMap(r => r.split(' ')).filter(w => w.length >= 4 && !GENERICHE_RUOLO.has(w));
  if (tok.some(w => parola(t, w))) return 'plausible';
  if (!ruoliRichiesti.length && VERTICE.some(v => parola(t, v))) return 'exact';
  if (VERTICE.some(v => parola(t, v))) return 'plausible';
  return 'mismatch';
};

// Annuncio di lavoro (segnale job_ad): l'URL passa dagli stessi controlli anti-SSRF.
const annunciRichiesti = job.target.signals.codes.includes('job_ad');
// Due passaggi per tutte le ricerche (17/10): prima le aziende, poi il referente solo per
// le aziende che servono (con i segnali: solo per chi ha il segnale).
const dueFasi = true;
const annuncioObbligatorio = annunciRichiesti && (job.target.signals.codes.length === 1 || job.target.signals.match === 'all');

const visti = new Set();
const perAzienda = {};
const scarti = {};
const scarta = (m) => { scarti[m] = (scarti[m] || 0) + 1; };
const out = [];

// Riserva: aziende con il segnale GIÀ verificato nei giri precedenti di questa
// ricerca, rimaste senza referente. Vanno per prime e non costano una nuova ricerca AI.
for (const r of job.reserve || []) {
  const sito = urlPulito(r.website, 300);
  const dominio = host(sito);
  const chiave = chiaveAzienda(sito);
  if (!r.company_name || !dominio || !dominio.includes('.') || NON_UFFICIALI.test(dominio)) continue;
  if (escludiDomini.has(chiave) || visti.has(`|${chiave}`) || (perAzienda[chiave] || 0) >= job.contacts_per_company) continue;
  visti.add(`|${chiave}`);
  perAzienda[chiave] = (perAzienda[chiave] || 0) + 1;
  out.push({
    json: {
      company_name: pulito(r.company_name), website: sito, domain: dominio, company_key: chiave,
      country: pulito(r.country, 80), city: pulito(r.city, 80), industry: pulito(r.industry, 120) || job.target.industry,
      size_hint: pulito(r.size_hint, 60), technologies: r.technologies || [],
      full_name: '', first_name: '', last_name: '', job_title: '', role_match: 'unknown', person_key: `|${chiave}`, linkedin_url: '',
      source_url: urlPulito(r.source_url) || sito,
      contact_page: host(urlPulito(r.contact_page)) === dominio ? urlPulito(r.contact_page) : '',
      job_ad_url: '', job_ad_title: '', job_ad_date: '',
      signals: r.signals, lotto: 0, _riserva: true, _serve_referente: true
    }
  });
}

for (const item of $input.all()) {
  for (const c of item.json.candidates || []) {
    const azienda = pulito(c?.company_name);
    const nomeAI = pulito(c?.full_name, 120);
    // Un nome non valido vale come assente: nei due passaggi il referente lo cerchiamo noi.
    const nome = nomeValido(nomeAI) ? nomeAI : (dueFasi ? '' : nomeAI);
    const sito = urlPulito(c?.website, 300);
    const dominio = host(sito);
    const chiave = chiaveAzienda(sito);
    const fonte = /^https?:\/\//i.test(String(c?.source_url ?? '').trim()) ? urlPulito(c.source_url) : '';

    // Il referente arriva in un secondo passaggio; un nome dell'AI con un ruolo non coerente
    // non scarta l'azienda (es. «Legale rappresentante» per «Titolare / CEO»): lo cerchiamo noi.
    const ruoloAI = nome && parti(nome).length >= 2 ? coerenzaRuolo(c?.job_title) : 'unknown';
    const senzaReferente = dueFasi && (!nome || parti(nome).length < 2 || ruoloAI === 'mismatch');
    const annuncio = annunciRichiesti && /^https?:\/\//i.test(String(c?.job_ad_url ?? '').trim()) ? urlPulito(c.job_ad_url) : '';

    if (!azienda || (!senzaReferente && !nomeValido(nome))) { scarta('dati_persona_incompleti'); continue; }
    if (!fonte && !annuncio) { scarta('senza_fonte'); continue; }
    if (!dominio || !dominio.includes('.') || NON_UFFICIALI.test(dominio)) { scarta('sito_non_ufficiale'); continue; }
    if (escludiDomini.has(chiave)) { scarta('azienda_gia_acquistata'); continue; }
    if (!senzaReferente && escludiPersone.has(chiavePersona(nome, chiave))) { scarta('persona_gia_acquistata'); continue; }
    if (escludiParole.some(p => norm(`${azienda} ${c?.industry ?? ''}`).includes(p))) { scarta('parola_esclusa'); continue; }

    const kp = senzaReferente ? `|${chiave}` : chiavePersona(nome, chiave);
    if (visti.has(kp)) { scarta('duplicato_ricerca'); continue; }
    if ((perAzienda[chiave] || 0) >= job.contacts_per_company) { scarta('limite_contatti_azienda'); continue; }

    const ruolo = senzaReferente ? 'unknown' : coerenzaRuolo(c?.job_title);
    if (ruolo === 'mismatch') { scarta('ruolo_non_coerente'); continue; }

    if (annuncioObbligatorio && !annuncio) { scarta('annuncio_mancante'); continue; }
    if (annuncio && /(^|\.)linkedin\.[a-z.]+$/.test(host(annuncio))) { scarta('annuncio_non_verificabile'); continue; }

    const contatti = /^https?:\/\//i.test(String(c?.contact_page ?? '').trim()) ? urlPulito(c.contact_page) : '';
    visti.add(kp);
    perAzienda[chiave] = (perAzienda[chiave] || 0) + 1;

    const p = senzaReferente ? [] : parti(nome);
    out.push({
      json: {
        company_name: azienda,
        website: sito,
        domain: dominio,
        company_key: chiave,
        country: pulito(c?.country, 80),
        city: pulito(c?.city, 80),
        industry: pulito(c?.industry, 120) || job.target.industry,
        size_hint: pulito(c?.size_hint, 60),
        full_name: senzaReferente ? '' : nome,
        first_name: senzaReferente ? '' : pulito(c?.first_name, 60) || p[0],
        last_name: senzaReferente ? '' : pulito(c?.last_name, 80) || p.slice(1).join(' '),
        job_title: senzaReferente ? '' : pulito(c?.job_title, 120),
        role_match: ruolo,
        person_key: kp,
        linkedin_url: /linkedin\.com\/in\//i.test(String(c?.linkedin_url ?? '')) ? pulito(c.linkedin_url, 300) : '',
        source_url: fonte || annuncio,
        contact_page: /^https?:\/\//i.test(contatti) && host(contatti) === dominio ? contatti : '',
        job_ad_url: annuncio,
        job_ad_title: annuncio ? pulito(c?.job_ad_title, 160) : '',
        job_ad_date: annuncio && /^\d{4}-\d{2}-\d{2}$/.test(pulito(c?.job_ad_date, 10)) ? pulito(c.job_ad_date, 10) : '',
        lotto: item.json.lotto,
        _serve_referente: senzaReferente
      }
    });
  }
}

const totale = $input.all().reduce((s, i) => s + (i.json.candidates || []).length, 0);
const stats = { candidati_ai: totale, candidati_validi: out.length, scarti };

if (!out.length) return [{ json: { _vuoto: true, stats } }];
out[0].json._stats_deduplica = stats;
return out;
