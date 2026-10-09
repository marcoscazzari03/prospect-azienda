// Estrae le email dalla pagina scaricata (__FASE__) e sceglie la migliore
// tra quelle trovate finora sul sito ufficiale. Punteggi:
// 5   email del dominio con il nome della persona   -> personal
// 4.5 email gratuita (gmail...) in un mailto, col nome -> personal (free provider)
// 4   email generica del dominio (info@, sales@...)  -> generic
// 3   email di un'altra persona del dominio          -> other_person
// 2   email gratuita in un mailto, senza il nome     -> generic (free provider)
// 1   privacy@ / dpo@ del dominio                    -> privacy (mai venduta)
// Nessuna email viene "indovinata" qui: solo email realmente presenti nella pagina.
const prospect = $('__SORGENTE__').item.json;
const job = $('Valida richiesta').first().json;
const FASE = '__FASE__';
const FONTE = __FONTE__;

let html = String($json.html ?? '');

const cleanHost = (raw) => String(raw ?? '').trim().toLowerCase()
  .replace(/^https?:\/\//i, '').replace(/^\/\//, '')
  .split('/')[0].split('?')[0].split('#')[0]
  .replace(/^www\./, '').replace(/:\d+$/, '');

const decodeCfEmail = (encoded) => {
  try {
    if (!encoded || encoded.length < 4) return '';
    const key = parseInt(encoded.slice(0, 2), 16);
    let email = '';
    for (let i = 2; i < encoded.length; i += 2) {
      email += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
    }
    return email;
  } catch {
    return '';
  }
};

html = html
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&commat;/gi, '@').replace(/&period;/gi, '.')
  .replace(/\\u0040/gi, '@').replace(/\\u002e/gi, '.')
  .replace(/\\x40/gi, '@').replace(/\\x2e/gi, '.')
  .replace(/%40/gi, '@').replace(/%2e/gi, '.')
  .replace(/\s*\[\s*(?:at|chiocciola|arroba|ät)\s*\]\s*/gi, '@')
  .replace(/\s*\(\s*(?:at|chiocciola|arroba|ät)\s*\)\s*/gi, '@')
  .replace(/\s*\[\s*(?:dot|punto|punkt|point)\s*\]\s*/gi, '.')
  .replace(/\s*\(\s*(?:dot|punto|punkt|point)\s*\)\s*/gi, '.');

// Email nella pagina ("sicure" = in un mailto o protette da Cloudflare).
const sicure = new Set();
const tutte = [];
let m;
const cfRegex = /data-cfemail=["']([0-9a-f]+)["']/gi;
while ((m = cfRegex.exec(html)) !== null) {
  const e = decodeCfEmail(m[1]);
  if (e) { sicure.add(e.toLowerCase()); tutte.push(e); }
}
const mailtoRegex = /mailto:([^"'?#\s<>]+)/gi;
while ((m = mailtoRegex.exec(html)) !== null) {
  let v = m[1];
  try { v = decodeURIComponent(v); } catch {}
  sicure.add(v.toLowerCase().trim());
  tutte.push(v);
}
tutte.push(...(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []));

const ESTENSIONI = /\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?|ttf|pdf)$/i;
const SCARTA_LOCALI = /^(no-?reply|do-?not-?reply|donotreply|noreply|mailer-daemon|postmaster|abuse|example|test|user|email|e-mail|name|nome|your|youremail|yourname|you|tuonome|sentry|wordpress|webmaster|hostmaster|jobs?|careers?|lavora(con)?noi|recruit(ment|ing)?|cv|hr|bewerbung|praktikum|stage|empleo|trabaja|vacatures|rekrutacja|kariera|unsubscribe|bounce)$/;
const SCARTA_DOMINI = /(^|\.)(example\.(com|org)|sentry\.io|sentry-next\.wixpress\.com|wixpress\.com|domain\.com|email\.com|yoursite\.com|godaddy\.com|wix\.com|squarespace\.com|sentry\.wixpress\.com)$/;
const GRATUITE = /(^|\.)(gmail\.com|googlemail\.com|icloud\.com|me\.com|aol\.com|protonmail\.(com|ch)|proton\.me|mail\.com|zoho\.(com|eu)|(hotmail|outlook|live|yahoo|gmx|msn)\.[a-z.]+|libero\.it|virgilio\.it|tiscali\.it|alice\.it|tin\.it|fastwebnet\.it|seznam\.cz|centrum\.(cz|sk)|email\.cz|wp\.pl|o2\.pl|onet\.(pl|eu)|interia\.(pl|eu)|abv\.bg|otenet\.gr|freemail\.hu|sapo\.pt|telenet\.be|skynet\.be|ziggo\.nl|kpnmail\.nl|bluewin\.ch|aon\.at|eircom\.net|btinternet\.com|sky\.com|telia\.com|online\.no|web\.de|t-online\.de|orange\.fr|free\.fr|wanadoo\.fr|laposte\.net|sfr\.fr|yandex\.(com|ru)|pec\.it|legalmail\.it|arubapec\.it)$/;
const PEC = /(^|\.)(pec\.[a-z.]+|legalmail\.it|arubapec\.it|postacert\.[a-z.]+|pecimprese\.it|cert\.[a-z.]+)$/;
const GENERICHE = new Set([
  'info', 'infos', 'hello', 'hi', 'ciao', 'contact', 'contacts', 'contatti', 'kontakt', 'kontakty', 'contacto', 'contato', 'contacte',
  'office', 'ufficio', 'mail', 'post', 'posta', 'postmottak', 'admin', 'amministrazione', 'administration', 'administracion',
  'segreteria', 'secretaria', 'secretariat', 'sekretariat', 'secretary', 'reception', 'recepcion', 'enquiries', 'enquiry',
  'inquiries', 'inquiry', 'general', 'geral', 'sales', 'vendite', 'commerciale', 'business', 'ventas', 'vertrieb', 'verkauf',
  'marketing', 'ordini', 'orders', 'order', 'support', 'assistenza', 'service', 'servizioclienti', 'customerservice',
  'team', 'studio', 'company', 'azienda', 'firma', 'direzione', 'management', 'board', 'export', 'import', 'shop', 'store',
  'booking', 'prenotazioni', 'kanzlei', 'kancelaria', 'cabinet', 'despacho', 'bufete', 'biuro', 'kontor', 'web', 'mailbox'
]);
const PRIVACY = /^(privacy|dpo|gdpr|rodo|datenschutz|dataprotection|data\.protection|protecciondedatos|lopd|rgpd|avg|legal|compliance)$/;
const SEGNAPOSTO = /^(firstname|first\.?name|name|nome|nombre|prenom|vorname|voornaam|imie|jmeno|etunimi|fornamn|fornavn)[._-]?(lastname|last\.?name|surname|cognome|apellidos?|nom|nachname|achternaam|nazwisko|prijmeni|sukunimi|efternamn|etternavn)?$/;

const dominio = cleanHost(prospect.website);
const titoli = new Set(['dr', 'dott', 'dssa', 'mr', 'mrs', 'ms', 'prof', 'avv', 'ing', 'arch', 'geom', 'rag', 'me', 'mag', 'mgr', 'adw', 'adv', 'lic', 'ldo', 'dra', 'jur', 'kc', 'qc', 'judr', 'dipl', 'phd']);
const parti = String(prospect.full_name ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .split(/[\s-]+/).map(p => p.replace(/[^a-z]/g, '')).filter(p => p && !titoli.has(p));
const primo = parti[0] || '';
const ultimo = parti.length > 1 ? parti[parti.length - 1] : '';

const conNome = (local) => {
  const l = local.replace(/[^a-z]/g, '');
  if (ultimo.length >= 3 && l.includes(ultimo)) return true;
  if (primo.length >= 3 && ultimo && l.startsWith(primo)) return true;
  if (primo && ultimo && l === primo[0] + ultimo) return true;
  return parti.slice(1, -1).some(p => p.length >= 4 && l.includes(p));
};

const punteggio = (email) => {
  const [local, dom] = email.split('@');
  if (!local || !dom || SCARTA_LOCALI.test(local) || SCARTA_DOMINI.test(dom) || ESTENSIONI.test(email)) return 0;
  if (dom.startsWith('www.') || SEGNAPOSTO.test(local) || PEC.test(dom)) return 0;
  const delDominio = dominio && (dom === dominio || dom.endsWith('.' + dominio));
  if (delDominio) {
    if (conNome(local)) {
      // Stesso cognome ma un altro nome (es. un familiare in azienda): non è la persona.
      const altroNome = local.split(/[._-]+/).some(t =>
        /^[a-z]{3,}$/.test(t) && !parti.some(p => p === t || t.includes(p) || p.includes(t)));
      return altroNome ? 3 : 5;
    }
    if (GENERICHE.has(local.replace(/[0-9]+$/, ''))) return 4;
    if (PRIVACY.test(local)) return 1;
    return 3;
  }
  if (GRATUITE.test(dom) && sicure.has(email)) return conNome(local) ? 4.5 : 2;
  return 0;
};

const TIPO = (p) => p >= 4.5 ? 'personal' : p >= 4 ? 'generic' : p >= 3 ? 'other_person' : p >= 2 ? 'generic' : 'privacy';

const precedenti = Array.isArray(prospect._emails) ? prospect._emails : [];
const trovate = [...precedenti];
const giaViste = new Set(precedenti.map(x => x.email));

for (const raw of tutte) {
  const email = String(raw).toLowerCase().trim().replace(/^[^a-z0-9]+/, '').replace(/[),.;:'"]+$/g, '');
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) || giaViste.has(email)) continue;
  giaViste.add(email);
  const p = punteggio(email);
  if (p > 0) trovate.push({ email, p, type: TIPO(p), free_provider: GRATUITE.test(email.split('@')[1]), source_url: FONTE, in_mailto: sicure.has(email) });
}

trovate.sort((a, b) => b.p - a.p);
const migliore = trovate[0];

// Quando fermarsi: con "solo generiche" basta una generica; altrimenti
// si continua a cercare finché non c'è una nominativa.
const soglia = job.email_mode === 'generic_ok' ? 4 : 4.5;
const basta = Boolean(migliore && migliore.p >= soglia);

const out = {
  ...prospect,
  _emails: trovate.slice(0, 8),
  email_site: migliore ? migliore.email : '',
  email_site_type: migliore ? migliore.type : '',
  email_site_score: migliore ? migliore.p : 0,
  email_site_source: migliore ? migliore.source_url : '',
  email_site_free_provider: migliore ? migliore.free_provider : false,
  pages_fetched: (Number(prospect.pages_fetched) || 0) + 1,
  email_search_stage: (migliore ? 'FOUND ' : 'NOT FOUND ') + FASE
};

if (FASE !== 'HOMEPAGE') {
  if (basta) out.page_2 = '';
  return { json: out };
}

// Pagine da controllare dopo la homepage: contatti (o quella indicata dall'AI),
// poi note legali / impressum / privacy, dove l'email aziendale c'è quasi sempre.
const sitoConProtocollo = /^https?:\/\//i.test(prospect.website) ? prospect.website : 'https://' + prospect.website;
const originMatch = sitoConProtocollo.match(/^(https?:\/\/[^\/?#]+)/i);
const origin = originMatch ? originMatch[1] : '';

const normalizeUrl = (raw) => {
  const s = String(raw ?? '').trim().replace(/^https?:\/\//i, '').replace(/^\/\//, '');
  const [h, ...resto] = s.split('/');
  const path = ('/' + resto.join('/')).split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  return h.toLowerCase().replace(/^www\./, '') + path.toLowerCase();
};

const rendiAssoluto = (href) => {
  const link = String(href ?? '').trim().replace(/&amp;/gi, '&');
  if (!link || /^(#|mailto:|tel:|javascript:|data:|whatsapp:)/i.test(link)) return '';
  if (/^https?:\/\//i.test(link)) return link;
  if (/^\/\//.test(link)) return 'https:' + link;
  if (!origin) return '';
  if (link.startsWith('/')) return origin + link;
  return origin + '/' + link.replace(/^\.\//, '');
};

const categoria = (url) => {
  const u = String(url).toLowerCase().split('?')[0].split('#')[0];
  if (/contact|kontakt|contacto|contato|contatti|contacte|get-in-touch|reach-us|enquir|inquir|dove-siamo|find-us|location|donde-estamos|onde-estamos|yhteys|kapcsolat/.test(u)) return ['CONTATTI', 100];
  if (/impressum|impresszum|aviso-legal|avisolegal|nota-legal|note-legali|legal-notice|mentions-legales|colofon|privacy|privacidad|datenschutz|gdpr|cookie|terms|termini|polityka/.test(u)) return ['LEGALE', 80];
  if (/team|people|management|leadership|chi-siamo|about|azienda|company|quienes-somos|quem-somos|over-ons|uber-uns|ueber-uns|qui-sommes|o-nas|staff|persone|organigramma/.test(u)) return ['TEAM', 70];
  return ['', 0];
};

const linkTrovati = [];
const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
const homeNorm = normalizeUrl(prospect.website);
while ((m = hrefRegex.exec(html)) !== null) {
  const url = rendiAssoluto(m[1]);
  const h = cleanHost(url);
  if (!url || !h || !dominio || !(h === dominio || h.endsWith('.' + dominio))) continue;
  const percorso = url.split('?')[0].split('#')[0];
  if (/\.(pdf|jpe?g|png|gif|svg|webp|docx?|zip|css|js|xml|json|ico)$/i.test(percorso)) continue;
  if (/\/(wp-content|wp-includes|wp-json|feed|news|blog|insights|articles?|cdn-cgi|tag|category|product|prodotti?|shop)(\/|$)/i.test(percorso)) continue;
  if (normalizeUrl(url) === homeNorm) continue;
  linkTrovati.push(url.split('#')[0]);
}

const candidate = [...new Set(linkTrovati)]
  .map(url => { const [cat, score] = categoria(url); return { url, cat, score }; })
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score || a.url.length - b.url.length);

const paginaAI = String(prospect.contact_page ?? '');
if (paginaAI && normalizeUrl(paginaAI) !== homeNorm) {
  candidate.unshift({ url: paginaAI, cat: categoria(paginaAI)[0] || 'AI', score: 110 });
}

// Siti in JavaScript senza link leggibili: percorsi tipici per lingua.
if (!candidate.length && origin) {
  const p = String(prospect.country || '').toLowerCase();
  const ipotesi =
    /ital|^it$/.test(p) ? ['/contatti', '/chi-siamo'] :
    /spagn|spain|^es$/.test(p) ? ['/contacto', '/aviso-legal'] :
    /portog|portugal|^pt$/.test(p) ? ['/contactos', '/contacto'] :
    /german|tedesc|^de$|austri|^at$|svizz|switz|^ch$/.test(p) ? ['/kontakt', '/impressum'] :
    /franc|^fr$|belg|^be$|lussemb|^lu$/.test(p) ? ['/contact', '/mentions-legales'] :
    /olanda|paesi bassi|netherl|^nl$/.test(p) ? ['/contact', '/colofon'] :
    /polon|poland|^pl$|ceca|czech|^cz$|slovac|^sk$/.test(p) ? ['/kontakt', '/kontakty'] :
    ['/contact', '/contact-us'];
  ipotesi.forEach((path, k) => candidate.push({ url: origin + path, cat: 'IPOTESI', score: 1 - k / 10 }));
}

const pagina1 = candidate[0];
const pagina2 = pagina1
  ? (candidate.find(x => x !== pagina1 && x.cat !== pagina1.cat && normalizeUrl(x.url) !== normalizeUrl(pagina1.url)) ||
     candidate.find(x => x !== pagina1 && normalizeUrl(x.url) !== normalizeUrl(pagina1.url)))
  : null;

out.page_1 = basta || !pagina1 ? '' : pagina1.url;
out.page_2 = basta || !pagina2 ? '' : pagina2.url;

return { json: out };
