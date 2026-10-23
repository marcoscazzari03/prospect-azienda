// Partita IVA dalle pagine dei siti (punto 92, 23/10): usata da worker/cc.mjs (aziende da Common Crawl) e da
// worker/site-checks.mjs (partita IVA delle aziende già nel database, migrazione 069). Stesse regole di vat_valid().
// Partita IVA italiana: 11 cifre, ufficio provinciale valido (cifre 8–10) e cifra di controllo (algoritmo di Luhn).
// Le 11 cifre che iniziano per 8 o 9 sono codici fiscali di enti e associazioni senza partita IVA (Pro Loco, bande,
// associazioni sportive, fondazioni: 12 su 135 nel campione del 23/10): non sono clienti.
export function pivaValida(p) {
  if (!/^[0-7]\d{10}$/.test(p) || /^0+$/.test(p)) return false;
  const ufficio = Number(p.slice(7, 10));
  if (!((ufficio >= 1 && ufficio <= 100) || [120, 121, 888, 999].includes(ufficio))) return false;
  let somma = 0;
  for (let i = 0; i < 11; i++) {
    let c = Number(p[i]);
    if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9; }
    somma += c;
  }
  return somma % 10 === 0;
}

// Toglie i blocchi <tag>…</tag> in un solo passaggio (un blocco senza chiusura toglie il resto della pagina). Con le
// regex «<script[\s\S]*?<\/script>» una pagina con migliaia di «<script» senza chiusura costava secondi o minuti e
// fermava il worker (Code Reviewer, 23/10).
export function togliBlocchi(html, tag) {
  const basso = html.toLowerCase();
  const prossimo = new Map(tag.map(t => [t, -2]));
  let out = '';
  let i = 0;
  while (i < html.length) {
    let k = -1;
    let scelto = '';
    for (const t of tag) {
      if (prossimo.get(t) !== -1 && prossimo.get(t) < i) prossimo.set(t, basso.indexOf(`<${t}`, i));
      const j = prossimo.get(t);
      if (j >= 0 && (k < 0 || j < k)) { k = j; scelto = t; }
    }
    if (k < 0) { out += html.slice(i); break; }
    out += `${html.slice(i, k)} `;
    const fine = basso.indexOf(`</${scelto}`, k);
    if (fine < 0) break;
    const chiusa = basso.indexOf('>', fine);
    i = chiusa < 0 ? html.length : chiusa + 1;
  }
  return out;
}

// Testo visibile della pagina. «<[^<>]*>» si ferma al «<» successivo: niente tempi quadratici con «<» senza «>».
export const testoDi = (html) => togliBlocchi(String(html ?? ''), ['script', 'style', 'noscript'])
  .replace(/<br\s*\/?>|<\/(?:p|div|li|span|td|footer|h\d)>/gi, ' · ')
  .replace(/<[^<>]*>/g, ' ')
  .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#039;|&#39;|&rsquo;|&apos;/gi, "'")
  .replace(/&[a-z]+;|&#\d+;/gi, ' ')
  .replace(/\s+/g, ' ');

// Partita IVA della web agency nel piè di pagina («Realizzato da …», «Powered by …»): non è quella dell'azienda.
const CREDITI = /realizzat[oa] da|sviluppat[oa] da|powered by|designed by|web ?design|credits|crediti|made by|progettato da|sito by|site by|web ?agency|agenzia web|a cura di/i;

// La prima partita IVA valida con un'etichetta vicina («P.IVA», «Partita IVA», «VAT», «C.F. e P.IVA»), non nei crediti.
export function trovaPiva(testo) {
  for (const m of testo.matchAll(/(?:^|[^\d])(?:IT ?)?(\d{11})(?!\d)/g)) {
    const prima = testo.slice(Math.max(0, m.index - 60), m.index + 1);
    // «vat» come parola: dentro «privato» o «innovativa» non è un'etichetta (Code Reviewer).
    if (!/p\.? ?i\.? ?v\.? ?a|partita ?iva|\bvat\b|c\.? ?f\.?|codice fiscale/i.test(prima)) continue;
    if (CREDITI.test(testo.slice(Math.max(0, m.index - 150), m.index))) continue;
    if (pivaValida(m[1])) return { piva: m[1], dove: m.index };
  }
  return null;
}

// La partita IVA della homepage, o '' se non c'è.
export const pivaDaPagina = (html) => (html && html.length >= 500 ? trovaPiva(testoDi(html.slice(0, 1_500_000)))?.piva || '' : '');
