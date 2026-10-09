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

const pulito = (v, max = 200) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

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

const NON_UFFICIALI = /(^|\.)(linkedin|facebook|instagram|twitter|x|youtube|tiktok|google|goo|bing|yelp|trustpilot|tripadvisor|glassdoor|indeed|crunchbase|zoominfo|rocketreach|apollo|dnb|bloomberg|wikipedia|kompass|europages|infobel|paginegialle|paginebianche|paginasamarillas|yellowpages|gelbeseiten|pagesjaunes|herold|panoramafirm|firmy|zlatestranky|cylex|hotfrog|yell|192|houzz|clutch|g2|capterra|amazon|ebay|etsy|medium|wordpress|blogspot|wixsite|reddit|quora|ufficiocamerale|registroimprese|reportaziende|informazione-aziende|atoka|companieshouse|northdata|opencorporates)\.[a-z.]+$/;

const parti = (nome) => norm(nome).split(' ').filter(p => p.length > 1);
const chiavePersona = (nome, dominio) => `${norm(nome)}|${dominio}`;

const escludiDomini = new Set(job.exclusions.domains.map(d => chiaveAzienda(d)));
const escludiPersone = new Set(job.exclusions.person_keys.map(k => String(k).toLowerCase()));
const escludiParole = job.target.exclude_keywords.map(norm).filter(Boolean);

// Coerenza del ruolo: corrispondenza con i ruoli richiesti o sinonimi di vertice.
const VERTICE = ['ceo', 'founder', 'co founder', 'cofounder', 'owner', 'titolare', 'fondatore', 'presidente',
  'president', 'managing director', 'amministratore', 'general manager', 'direttore generale', 'partner',
  'managing partner', 'socio', 'geschaftsfuhrer', 'gerente', 'director general', 'directeur general', 'proprietario',
  'principal', 'head', 'chief'];
const ruoliRichiesti = job.target.roles.map(norm).filter(Boolean);
const coerenzaRuolo = (titolo) => {
  const t = norm(titolo);
  if (!t) return 'unknown';
  if (ruoliRichiesti.some(r => t.includes(r) || r.includes(t))) return 'exact';
  const tok = ruoliRichiesti.flatMap(r => r.split(' ')).filter(w => w.length >= 4);
  if (tok.some(w => t.includes(w))) return 'plausible';
  if (!ruoliRichiesti.length && VERTICE.some(v => t.includes(v))) return 'exact';
  if (VERTICE.some(v => t.includes(v))) return 'plausible';
  return 'mismatch';
};

const visti = new Set();
const perAzienda = {};
const scarti = {};
const scarta = (m) => { scarti[m] = (scarti[m] || 0) + 1; };
const out = [];

for (const item of $input.all()) {
  for (const c of item.json.candidates || []) {
    const azienda = pulito(c?.company_name);
    const nome = pulito(c?.full_name, 120);
    const sito = pulito(c?.website, 300);
    const dominio = host(sito);
    const chiave = chiaveAzienda(sito);
    const fonte = /^https?:\/\//i.test(String(c?.source_url ?? '').trim()) ? pulito(c.source_url, 500) : '';

    if (!azienda || !nome || parti(nome).length < 2) { scarta('dati_persona_incompleti'); continue; }
    if (!fonte) { scarta('senza_fonte'); continue; }
    if (!dominio || !dominio.includes('.') || NON_UFFICIALI.test(dominio)) { scarta('sito_non_ufficiale'); continue; }
    if (escludiDomini.has(chiave)) { scarta('azienda_gia_acquistata'); continue; }
    if (escludiPersone.has(chiavePersona(nome, chiave))) { scarta('persona_gia_acquistata'); continue; }
    if (escludiParole.some(p => norm(`${azienda} ${c?.industry ?? ''}`).includes(p))) { scarta('parola_esclusa'); continue; }

    const kp = chiavePersona(nome, chiave);
    if (visti.has(kp)) { scarta('duplicato_ricerca'); continue; }
    if ((perAzienda[chiave] || 0) >= job.contacts_per_company) { scarta('limite_contatti_azienda'); continue; }

    const ruolo = coerenzaRuolo(c?.job_title);
    if (ruolo === 'mismatch') { scarta('ruolo_non_coerente'); continue; }

    const contatti = String(c?.contact_page ?? '').trim();
    visti.add(kp);
    perAzienda[chiave] = (perAzienda[chiave] || 0) + 1;

    const p = parti(nome);
    out.push({
      json: {
        company_name: azienda,
        website: /^https?:\/\//i.test(sito) ? sito : `https://${sito}`,
        domain: dominio,
        company_key: chiave,
        country: pulito(c?.country, 80),
        city: pulito(c?.city, 80),
        industry: pulito(c?.industry, 120) || job.target.industry,
        size_hint: pulito(c?.size_hint, 60),
        full_name: nome,
        first_name: pulito(c?.first_name, 60) || p[0],
        last_name: pulito(c?.last_name, 80) || p.slice(1).join(' '),
        job_title: pulito(c?.job_title, 120),
        role_match: ruolo,
        person_key: kp,
        linkedin_url: /linkedin\.com\/in\//i.test(String(c?.linkedin_url ?? '')) ? pulito(c.linkedin_url, 300) : '',
        source_url: fonte,
        contact_page: /^https?:\/\//i.test(contatti) && host(contatti) === dominio ? contatti : '',
        lotto: item.json.lotto
      }
    });
  }
}

const totale = $input.all().reduce((s, i) => s + (i.json.candidates || []).length, 0);
const stats = { candidati_ai: totale, candidati_validi: out.length, scarti };

if (!out.length) return [{ json: { _vuoto: true, stats } }];
out[0].json._stats_deduplica = stats;
return out;
