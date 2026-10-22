// Contatti per tutto il database (punto 86, 22/10): per le aziende con il sito vivo ma senza email né modulo, il worker
// apre la homepage e fino a 3 pagine tra «Contatti», «Note legali»/privacy e «Chi siamo», con le stesse regole del motore
// (scelta delle pagine come «Estrai email homepage», n8n/engine/nodes/05-estrai-email.template.js; email aziendale con
// lib-email-azienda.js, solo caselle d'ufficio del dominio; modulo come «Estrai email»: un <form> con un campo messaggio e
// uno email). Nessuna AI, nessun costo.
//   GET  {APP}/api/engine/contacts?limit=N   coda (migrazione 066)
//   POST {APP}/api/engine/contacts           { items: [{ domain, email?, contact_form?, pages_read }] }
// Configurazione come worker/site-checks.mjs: SITE_CHECKS_SECRET, APP_URL, LIMIT (predefinito 150), CONCURRENCY, DRY_RUN.
import { fileURLToPath } from 'node:url';
import { richiesta } from './http.mjs';
import { caricaRegole, inParallelo } from './site-checks.mjs';

// Categorie e pesi delle pagine come nel motore (05-estrai-email.template.js, funzione «categoria»).
export function categoria(url) {
  const u = String(url).toLowerCase().split('?')[0].split('#')[0];
  if (/contact|kontakt|contacto|contato|contatti|contacte|get-in-touch|reach-us|enquir|inquir|dove-siamo|find-us|location|donde-estamos|onde-estamos|yhteys|kapcsolat/.test(u)) return ['CONTATTI', 100];
  if (/impressum|impresszum|aviso-legal|avisolegal|nota-legal|note-legali|legal-notice|mentions-legales|colofon|privacy|privacidad|datenschutz|gdpr|polityka/.test(u)) return ['LEGALE', 80];
  if (/cookie|terms|termini|condizioni/.test(u)) return ['LEGALE', 50];
  if (/team|people|management|leadership|chi-siamo|about|azienda|company|quienes-somos|quem-somos|over-ons|uber-uns|ueber-uns|qui-sommes|o-nas|staff|persone|organigramma/.test(u)) return ['TEAM', 70];
  return ['', 0];
}

const radice = (u) => String(u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^\/\//, '').split(/[/?#:]/)[0].replace(/^www\./, '');
const normalizza = (u) => {
  const s = String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^\/\//, '');
  const [h, ...resto] = s.split('/');
  return h.toLowerCase().replace(/^www\./, '') + ((('/' + resto.join('/')).split('?')[0].split('#')[0].replace(/\/+$/, '')) || '/').toLowerCase();
};

// Pagine da aprire dopo la homepage: link del dominio, per categoria (contatti, legali, chi siamo), al massimo 3 di tipo
// diverso dove possibile; rimando <meta refresh> per primo; senza link leggibili, i percorsi tipici italiani.
export function pagineDaAprire(html, base, dominio) {
  const origin = (base.match(/^(https?:\/\/[^/?#]+)/i) || [])[1] || '';
  const assoluto = (href) => {
    const l = String(href || '').trim().replace(/&amp;/gi, '&');
    if (!l || /^(#|mailto:|tel:|javascript:|data:|whatsapp:)/i.test(l)) return '';
    if (/^https?:\/\//i.test(l)) return l;
    if (/^\/\//.test(l)) return 'https:' + l;
    if (!origin) return '';
    return l.startsWith('/') ? origin + l : origin + '/' + l.replace(/^\.\//, '');
  };
  const delDominio = (u) => { const h = radice(u); return h && (h === dominio || h.endsWith('.' + dominio)); };
  const home = normalizza(base);
  const link = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const u = assoluto(m[1]);
    if (!u || !delDominio(u) || /[\\@]/.test(u)) continue;
    if (/^https?:\/\/[^/?#]+:(?!80\b|443\b)\d+/i.test(u)) continue;
    const percorso = u.split('?')[0].split('#')[0];
    if (/\.(pdf|jpe?g|png|gif|svg|webp|docx?|zip|css|js|xml|json|ico)$/i.test(percorso)) continue;
    if (/\/(wp-content|wp-includes|wp-json|feed|news|blog|insights|articles?|cdn-cgi|tag|category|product|prodotti?|shop)(\/|$)/i.test(percorso)) continue;
    if (normalizza(u) === home) continue;
    link.push(u.split('#')[0]);
  }
  const candidate = [...new Set(link)].map(url => { const [cat, score] = categoria(url); return { url, cat, score }; })
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.url.length - b.url.length);
  // Quantificatori limitati: su una pagina con molti «refresh» senza «>» la regex non diventa quadratica (Code Reviewer).
  const rimando = (html.match(/http-equiv\s*=\s*["']?refresh["']?[^>]{0,300}?content\s*=\s*["'][^"'>]{0,50}url\s*=\s*([^"'>\s]{1,500})/i) || [])[1];
  if (rimando) {
    const u = assoluto(rimando.replace(/^['"]|['"]$/g, ''));
    if (u && delDominio(u) && normalizza(u) !== home) candidate.unshift({ url: u.split('#')[0], cat: 'RIMANDO', score: 120 });
  }
  if (!candidate.length && origin) ['/contatti', '/chi-siamo', '/privacy-policy'].forEach((p, k) => candidate.push({ url: origin + p, cat: 'IPOTESI' + k, score: 1 }));
  const scelte = [];
  for (const c of candidate) {
    if (scelte.length >= 3) break;
    const diversa = !scelte.some(s => s.cat === c.cat);
    if (diversa && !scelte.some(s => normalizza(s.url) === normalizza(c.url))) scelte.push(c);
  }
  for (const c of candidate) {
    if (scelte.length >= 3) break;
    if (!scelte.some(s => normalizza(s.url) === normalizza(c.url))) scelte.push(c);
  }
  return scelte.map(s => s.url);
}

// Modulo di contatto: un <form> con un campo per il messaggio e uno per l'email, non una ricerca (come «Estrai email»).
// Ricerca lineare con indexOf: una regex su tanti «<form» senza «</form>» costerebbe minuti (Code Reviewer, 22/10).
export function haModulo(html) {
  const h = html.toLowerCase();
  let da = 0;
  for (let n = 0; n < 50; n++) {
    const i = h.indexOf('<form', da);
    if (i < 0) return false;
    const j = h.indexOf('</form>', i);
    const f = h.slice(i, j < 0 ? Math.min(h.length, i + 20_000) : Math.min(j, i + 200_000));
    if (f.includes('<textarea') && /type\s*=\s*["']?email|name\s*=\s*["'][^"']{0,100}e-?mail/.test(f) && !/role\s*=\s*["']?search/.test(f)) return true;
    da = i + 5;
  }
  return false;
}

// Solo risposte 2xx: una 404 o una sfida anti-bot non è una pagina letta (Code Reviewer, 22/10). Pagine oltre i 500 KB
// ridotte a inizio e fine (dove stanno contatti e piè di pagina), per tenere brevi le regex.
export const apri = async (url, req) => {
  try {
    const r = await req(url, { insicuro: true, redirect: 5, timeout: 10_000 });
    if (!(r.status >= 200 && r.status < 300)) return '';
    return r.body.length > 500_000 ? r.body.slice(0, 400_000) + r.body.slice(-100_000) : r.body;
  } catch { return ''; }
};

// Una azienda: homepage, poi le pagine scelte; la prima email aziendale trovata (contatti prima della homepage) e la prima
// pagina con un modulo.
export async function trovaContatti(regole, a, req = richiesta) {
  const www = String(a.website || '').toLowerCase().includes('://www.') ? 'www.' : '';
  const protocollo = String(a.website || '').toLowerCase().startsWith('http://') ? 'http://' : 'https://';
  const base = `${protocollo}${www}${a.domain}/`;
  const home = await apri(base, req);
  const dominio = radice(a.domain);
  const pagine = home.length >= 500 ? pagineDaAprire(home, base, dominio) : [];
  const lette = [];
  for (const url of pagine) lette.push({ url, html: await apri(url, req) });
  lette.push({ url: base, html: home });
  const valide = lette.filter(p => p.html.length >= 500);
  let email = '';
  for (const p of valide) { email = regole.emailAziendale(p.html, a.website || base); if (email) break; }
  const modulo = valide.find(p => p.url !== base && haModulo(p.html))?.url || (haModulo(home) ? base : '');
  return { domain: a.domain, ...(email ? { email } : {}), ...(modulo ? { contact_form: modulo.slice(0, 300) } : {}), pages_read: valide.length };
}

async function main() {
  const segreto = process.env.SITE_CHECKS_SECRET || '';
  if (segreto.length < 32) throw new Error('SITE_CHECKS_SECRET mancante o troppo corto');
  const app = (process.env.APP_URL || 'https://leads.weborastudio.it').replace(/\/+$/, '');
  const limite = Math.min(Math.max(Number(process.env.LIMIT) || 150, 1), 300);
  const parallelo = Math.min(Math.max(Number(process.env.CONCURRENCY) || 8, 1), 32);
  const prova = ['1', 'true', 'si', 'sì', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());
  const intestazioni = { 'x-engine-secret': segreto, 'Content-Type': 'application/json' };
  const inizio = Date.now();

  const r = await fetch(`${app}/api/engine/contacts?limit=${limite}`, { headers: intestazioni, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`lettura della coda: HTTP ${r.status}`);
  const aziende = (await r.json()).companies || [];
  if (!aziende.length) { console.log('Coda vuota.'); return; }

  const regole = caricaRegole();
  // Oltre 15 minuti non si parte con altre aziende e si salva quanto trovato, dentro i 20 minuti di systemd (Code Reviewer).
  const scadenza = inizio + 15 * 60_000;
  const trovati = await inParallelo(aziende, parallelo, async (a) => {
    if (Date.now() > scadenza) return null;
    try {
      // Al massimo 60 s per azienda (4 pagine da 10 s più margine); oltre, nessuna pagina letta.
      return await Promise.race([
        trovaContatti(regole, a),
        new Promise((r) => setTimeout(() => r({ domain: a.domain, pages_read: 0 }), 60_000).unref()),
      ]);
    } catch (e) {
      console.error(`contatti non riusciti per ${a.domain}: ${e?.message || e}`);
      return { domain: a.domain, pages_read: 0 };
    }
  });
  const items = trovati.filter(Boolean);
  const stats = { aziende: items.length, lette: items.filter(i => i.pages_read > 0).length, email: items.filter(i => i.email).length, moduli: items.filter(i => i.contact_form).length };
  if (prova) { console.log(JSON.stringify({ prova: true, secondi: Math.round((Date.now() - inizio) / 1000), stats }, null, 2)); return; }
  const s = await fetch(`${app}/api/engine/contacts`, { method: 'POST', headers: intestazioni, body: JSON.stringify({ items }), signal: AbortSignal.timeout(60_000) });
  if (!s.ok) throw new Error(`salvataggio: HTTP ${s.status}`);
  console.log(JSON.stringify({ ...(await s.json()), secondi: Math.round((Date.now() - inizio) / 1000), stats }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(`Contatti falliti: ${e?.message || e}`); process.exit(1); });
}
