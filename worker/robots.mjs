// robots.txt dei siti (24/10, analisi privacy, checklist 98): i worker del VPS non aprono le pagine che un sito esclude
// per i robot. Regole come RFC 9309: gruppi per user-agent (il nostro token o «*»), vince la regola più lunga, a parità
// «Allow»; «*» e «$» nei percorsi. Il robots.txt si legge una volta per sito e per giro.
// robots.txt assente (4xx): tutto consentito, come dice l'RFC. Risposta 5xx: tutto escluso, come dice l'RFC (Code Reviewer,
// 24/10). Errore di rete o timeout: si procede come prima, perché il sito è quasi sempre irraggiungibile anche per la
// homepage e il controllo lo tratta già come tale.
import { richiesta } from './http.mjs';

export const AGENTE = 'avvistobot';
const MAX_SITI = 5_000;

// Testo del robots.txt -> regole per il nostro agente: [{ allow, percorso }]. Gruppi del nostro token se ci sono,
// altrimenti quelli di «*» (più gruppi con lo stesso agente si uniscono). Il token si confronta intero, senza maiuscole.
export function regoleRobots(testo, agente = AGENTE) {
  const gruppi = [];
  let attuale = null;
  let ultimaAgente = false;
  for (const riga of String(testo || '').split(/\r?\n/)) {
    const pulita = riga.replace(/#.*$/, '').trim();
    const m = pulita.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const chiave = m[1].toLowerCase();
    const valore = m[2].trim();
    if (chiave === 'user-agent') {
      if (!ultimaAgente) gruppi.push(attuale = { agenti: [], regole: [] });
      attuale.agenti.push(valore.toLowerCase());
      ultimaAgente = true;
    } else if ((chiave === 'allow' || chiave === 'disallow') && attuale) {
      ultimaAgente = false;
      // «Disallow:» vuoto non esclude niente. Caratteri non ASCII codificati come nel percorso dell'URL.
      if (valore) attuale.regole.push({ allow: chiave === 'allow', percorso: valore.replace(/[^\x00-\x7F]/gu, (c) => encodeURIComponent(c)) });
    }
    // Altre righe (Crawl-delay, Sitemap…) ignorate: non chiudono il gruppo degli user-agent.
  }
  const nostri = gruppi.filter((g) => g.agenti.includes(agente));
  const scelti = nostri.length ? nostri : gruppi.filter((g) => g.agenti.includes('*'));
  return scelti.flatMap((g) => g.regole);
}

// Percorso di regola («/privato*», «/*.pdf$») contro un percorso: «*» qualsiasi sequenza, «$» in fondo = fine del
// percorso; senza «$» basta l'inizio. Programmazione dinamica, niente espressioni regolari: un robots.txt con molti «*»
// non può bloccare il worker (tempo proporzionale a regola × percorso; percorsi tagliati a 500 caratteri).
export function corrisponde(regola, percorso) {
  const fine = regola.endsWith('$');
  const r = fine ? regola.slice(0, -1) : regola;
  // ok[j]: i primi i caratteri della regola corrispondono ai primi j del percorso.
  let ok = new Array(percorso.length + 1).fill(false);
  ok[0] = true;
  for (let i = 0; i < r.length; i++) {
    const nuovo = new Array(percorso.length + 1).fill(false);
    if (r[i] === '*') {
      let visto = false;
      for (let j = 0; j <= percorso.length; j++) { visto = visto || ok[j]; nuovo[j] = visto; }
    } else {
      for (let j = 1; j <= percorso.length; j++) nuovo[j] = ok[j - 1] && percorso[j - 1] === r[i];
    }
    ok = nuovo;
  }
  return fine ? ok[percorso.length] : ok.some(Boolean);
}

// true se il percorso (con la query) è consentito dalle regole. Prima del confronto completo, la parte fissa iniziale
// della regola (fino al primo «*») deve essere l'inizio del percorso: quasi tutte le regole si scartano subito.
export function consentito(regole, percorso) {
  let migliore = null;
  const p = String(percorso).slice(0, 500);
  for (const r of regole.slice(0, 5_000)) {
    const fisso = r.percorso.split('*')[0].replace(/\$$/, '');
    if (!p.startsWith(fisso)) continue;
    // Regole con più di 10 «*» (servono solo a rallentare, QA 24/10): valgono per tutto ciò che inizia con la parte fissa,
    // senza il confronto completo; un Disallow così esclude di più, mai di meno (Code Reviewer).
    if (r.percorso.split('*').length <= 11 && !corrisponde(r.percorso.slice(0, 500), p)) continue;
    const lunghezza = r.percorso.length;
    if (!migliore || lunghezza > migliore.lunghezza || (lunghezza === migliore.lunghezza && r.allow)) migliore = { lunghezza, allow: r.allow };
  }
  return !migliore || migliore.allow;
}

// Controllo per URL con il robots.txt letto una volta per sito. `req` come richiesta() (nei test una finta).
export function creaRobots(req = richiesta) {
  const cache = new Map();
  const regoleDi = (origine) => {
    if (!cache.has(origine)) {
      if (cache.size >= MAX_SITI) cache.clear();
      cache.set(origine, req(`${origine}/robots.txt`, { insicuro: true, redirect: 5, timeout: 5_000, maxBytes: 500_000 })
        .then((r) => (r.status >= 500 ? [{ allow: false, percorso: '/' }] : r.status >= 200 && r.status < 300 ? regoleRobots(r.body) : []))
        .catch(() => []));
    }
    return cache.get(origine);
  };
  return async (url) => {
    let u;
    try { u = new URL(url); } catch { return true; }
    return consentito(await regoleDi(u.origin), (u.pathname || '/') + u.search);
  };
}

// richiesta() che rifiuta le pagine escluse dal robots.txt (codice EROBOTS): chi la usa le tratta come pagine non lette.
export function conRobots(req = richiesta, permesso = creaRobots(req)) {
  return async (url, opzioni) => {
    if (!(await permesso(url))) throw Object.assign(new Error('pagina esclusa dal robots.txt'), { code: 'EROBOTS' });
    return req(url, opzioni);
  };
}
