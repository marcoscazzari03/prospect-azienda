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

// Indirizzi con «\\» o «@» nascondono un altro host (ripasso di sicurezza del 19/10): nessun host.
const cleanHost = (raw) => /[\\@]/.test(String(raw ?? '')) ? '' : String(raw ?? '').trim().toLowerCase()
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
  // Espressioni lineari (22/10): con lunghe sequenze di spazi o di caratteri base64 le versioni senza (?<!…) impiegavano
  // minuti e bloccavano «Valuta siti» (Task runner unresponsive, 4 giri falliti la notte del 22/10).
  .replace(/(?<!\s)\s*\[\s*(?:at|chiocciola|arroba|ät)\s*\]\s*/gi, '@')
  .replace(/(?<!\s)\s*\(\s*(?:at|chiocciola|arroba|ät)\s*\)\s*/gi, '@')
  .replace(/(?<!\s)\s*\[\s*(?:dot|punto|punkt|point)\s*\]\s*/gi, '.')
  .replace(/(?<!\s)\s*\(\s*(?:dot|punto|punkt|point)\s*\)\s*/gi, '.');

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
tutte.push(...(html.match(/(?<![A-Z0-9._%+-])[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,}/gi) || []));

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
  'booking', 'prenotazioni', 'kanzlei', 'kancelaria', 'cabinet', 'despacho', 'bufete', 'biuro', 'kontor', 'web', 'mailbox',
  // Strutture ricettive (collaudo del 19/10: reservations@vittoriahotels.it scartata come «persona»).
  'reservations', 'reservation', 'reservas', 'reserva', 'reservierung', 'prenota', 'prenotazione', 'ricevimento',
  'accoglienza', 'frontdesk', 'welcome', 'hotel', 'albergo', 'residence', 'camping', 'agriturismo'
]);
// Caselle privacy anche composte: contact.dataprivacy@, privacy-office@, dpo.italia@.
const PRIVACY_PAROLE = /privacy|gdpr|datenschutz|dataprotection|protecciondedatos|datiperson/;
const PRIVACY_SIGLE = /^(dpo|rodo|lopd|rgpd|avg|legal|compliance)$/;
const privacy = (local) => PRIVACY_PAROLE.test(local.replace(/[^a-z]/g, '')) || local.split(/[._-]+/).some(t => PRIVACY_SIGLE.test(t));
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

// Caselle di ufficio anche se contengono un nome: segreteria.rossi@, studiodentisticorossi@, info-rossi@.
const PREFISSI_UFFICIO = ['segreteria', 'studio', 'ufficio', 'amministrazione', 'reception', 'info', 'contatti', 'office', 'direzione',
  'albergo', 'hotel', 'booking', 'prenota', 'reserv', 'ricevimento', 'accoglienza'];
// Nome del dominio senza estensione (zoello.it -> zoello, albergo.mo.it -> albergo, magnagallo-hotel.com -> magnagallohotel).
const etichetta = (d) => {
  const l = String(d ?? '').toLowerCase().replace(/^www\./, '').split('.');
  const x = l.length >= 3 && l[l.length - 2].length <= 3 ? l[l.length - 3] : l[Math.max(l.length - 2, 0)];
  return String(x ?? '').replace(/[^a-z0-9]/g, '');
};
const nomeSito = etichetta(dominio);
// Casella col nome del sito (zoello@zoello.it): è dell'azienda.
const diUfficio = (local) => local.split(/[._-]+/).some(t => GENERICHE.has(t.replace(/[0-9]+$/, '')))
  || PREFISSI_UFFICIO.some(x => local.startsWith(x))
  || (nomeSito.length >= 4 && local.replace(/[^a-z0-9]/g, '') === nomeSito);
// Dominio «fratello» pubblicato sul sito ufficiale: stesso nome con un'altra estensione
// (zoello.it / info@zoello.com) o un nome che contiene l'altro, di almeno 6 lettere
// (magnagallo-hotel.com / info@magnagallo.it). Stessa regola di email_on_domain in SQL.
const fratello = (dom) => {
  const a = nomeSito, b = etichetta(dom);
  if (!a || !b || GRATUITE.test(dom)) return false;
  if (a === b) return a.length >= 4;
  const [corto, lungo] = a.length < b.length ? [a, b] : [b, a];
  return corto.length >= 6 && lungo.includes(corto);
};

// Cosa resta dell'indirizzo togliendo nome, cognome e numeri: se resta altro
// (es. bocciacostruzionisrl@) è la casella dell'azienda, non della persona.
const soloNome = (local) => {
  let l = local.replace(/[^a-z]/g, '');
  for (const p of [...parti].sort((a, b) => b.length - a.length)) if (p.length >= 3) l = l.replace(p, '');
  return l.length <= 3;
};

const punteggio = (email) => {
  const [local, dom] = email.split('@');
  if (!local || !dom || SCARTA_LOCALI.test(local) || SCARTA_DOMINI.test(dom) || ESTENSIONI.test(email)) return 0;
  if (dom.startsWith('www.') || SEGNAPOSTO.test(local) || PEC.test(dom)) return 0;
  const delDominio = dominio && (dom === dominio || dom.endsWith('.' + dominio) || fratello(dom));
  if (delDominio) {
    if (privacy(local)) return 1;
    if (diUfficio(local)) return 4;
    // Cognome che è anche il nome dell'azienda (Paolo Maggioli, maggioli.it): senza il nome
    // o l'iniziale è la casella dell'azienda (maggiolispa@, maggioli@), non della persona.
    const l = local.replace(/[^a-z]/g, '');
    const cognomeAzienda = ultimo.length >= 3 && String(dominio).replace(/[^a-z]/g, '').includes(ultimo);
    const conIlNome = (primo.length >= 3 && l.includes(primo)) || (primo && (l.startsWith(primo[0] + ultimo) || local.startsWith(primo[0] + '.')));
    if (cognomeAzienda && !conIlNome) return 4;
    if (conNome(local)) {
      // Stesso cognome ma un altro nome (es. un familiare in azienda): non è la persona.
      const altroNome = local.split(/[._-]+/).some(t =>
        /^[a-z]{3,}$/.test(t) && !parti.some(p => p === t || t.includes(p) || p.includes(t)));
      return altroNome ? 3 : soloNome(local) ? 5 : 4;
    }
    return 3;
  }
  if (GRATUITE.test(dom) && sicure.has(email)) return conNome(local) && soloNome(local) && !diUfficio(local) ? 4.5 : 2;
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
// «Solo azienda»: basta la generica del dominio (non si cercano nominative).
const soglia = job.email_mode === 'generic_ok' || job.email_mode === 'company_only' ? 4 : 4.5;
const basta = Boolean(migliore && migliore.p >= soglia);

// Modulo di contatto: un <form> con un campo per il messaggio (textarea) e uno per l'email.
// Si salva la prima pagina che lo ha (serve a valutare le aziende senza email pubblica).
const moduloContatto = (html.match(/<form\b[\s\S]*?<\/form>/gi) || []).some(f =>
  /<textarea\b/i.test(f) && /type\s*=\s*["']?email|name\s*=\s*["'][^"']*e-?mail/i.test(f) && !/role\s*=\s*["']?search/i.test(f));

const out = {
  ...prospect,
  contact_form: prospect.contact_form || (moduloContatto ? FONTE : ''),
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
  if (basta) { out.page_2 = ''; out.page_3 = ''; }
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
  if (/impressum|impresszum|aviso-legal|avisolegal|nota-legal|note-legali|legal-notice|mentions-legales|colofon|privacy|privacidad|datenschutz|gdpr|polityka/.test(u)) return ['LEGALE', 80];
  // Cookie e condizioni d'uso: l'email aziendale c'è di rado, si provano per ultime.
  if (/cookie|terms|termini|condizioni/.test(u)) return ['LEGALE', 50];
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
  if (/^https?:\/\/[^/?#]+:(?!80\b|443\b)\d+/i.test(url)) continue; // porte non standard: no (anti-SSRF)
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

// Homepage che rimanda altrove con <meta http-equiv="refresh">: si segue il rimando.
const rimando = (html.match(/http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["'][^"']*url\s*=\s*([^"'>\s]+)/i) || [])[1];
if (rimando) {
  const u = rendiAssoluto(rimando.replace(/^['"]|['"]$/g, ''));
  const h = cleanHost(u);
  if (u && h && dominio && (h === dominio || h.endsWith('.' + dominio)) && normalizeUrl(u) !== homeNorm) {
    candidate.unshift({ url: u.split('#')[0], cat: 'RIMANDO', score: 120 });
  }
}

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
  [...ipotesi, '/privacy-policy'].forEach((path, k) => candidate.push({ url: origin + path, cat: 'IPOTESI', score: 1 - k / 10 }));
}

const pagina1 = candidate[0];
const pagina2 = pagina1
  ? (candidate.find(x => x !== pagina1 && x.cat !== pagina1.cat && normalizeUrl(x.url) !== normalizeUrl(pagina1.url)) ||
     candidate.find(x => x !== pagina1 && normalizeUrl(x.url) !== normalizeUrl(pagina1.url)))
  : null;

// Quarta pagina (solo se le prime tre non bastano): un'altra pagina, di preferenza di un tipo
// non ancora visto (es. note legali dopo contatti e chi siamo). Collaudo del 18/10: 23 aziende
// su 40 senza email dopo tre pagine, spesso con la privacy policy mai aperta.
const usate = [pagina1, pagina2].filter(Boolean);
const nuova = (x) => !usate.some(u => normalizeUrl(u.url) === normalizeUrl(x.url));
const pagina3 = pagina2
  ? (candidate.find(x => nuova(x) && !usate.some(u => u.cat === x.cat)) || candidate.find(nuova))
  : null;

out.page_1 = basta || !pagina1 ? '' : pagina1.url;
out.page_2 = basta || !pagina2 ? '' : pagina2.url;
out.page_3 = basta || !pagina3 ? '' : pagina3.url;

return { json: out };
