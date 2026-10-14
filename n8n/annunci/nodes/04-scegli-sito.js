// Sceglie il sito di ogni azienda tra i domini provati: la pagina deve esistere, non
// essere un dominio parcheggiato o in vendita e contenere il nome dell'azienda (tutte le
// parole distintive, o il nome scritto attaccato). Con una sola parola distintiva serve
// il nome intero se ha parole generiche («Var Group»: var.it di «Var Sport» non va),
// altrimenti il nome nel titolo o nella descrizione («Digital», «ENG»: nel testo
// comparirebbero per caso).
// Un'azienda senza dominio valido viene salvata come «non trovata» (si riprova tra 30 giorni).
const candidati = $('Domini candidati').all().map(i => i.json);
const pagine = $input.all().map(i => i.json);

const norm = (v) => ` ${String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const testo = (h) => String(h ?? '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&');
const PARCHEGGIATO = /\b((domain|dominio) (is )?(for sale|in vendita|acquistabile)|buy this domain|this domain (is|may be) for sale|sedo|dan com|parkingcrew|bodis|domain parking|parked (free|domain)|registra il tuo dominio|questo dominio e stato registrato|hugedomains|afternic)\b/;

// Pagine di parcheggio riconoscibili dal codice (anche in tedesco: «steht zum Verkauf»).
const PARCHEGGIO_HTML = /sedoparking|data-adblockkey|parkingcrew|bodis\.com|afternic|hugedomains|dan\.com\/buy|steht zum verkauf|est a vendre|se vende este dominio/i;

const errori = {};
const valuta = (c, p) => {
  const html = String(p?.html ?? '');
  if (p?.error) {
    const e = p.error;
    const tipo = String(e.code || e.name || e.message || 'errore').slice(0, 40);
    errori[tipo] = (errori[tipo] || 0) + 1;
  }
  if (html.length < 500) return 'irraggiungibile';
  if (PARCHEGGIO_HTML.test(html.slice(0, 20000))) return 'parcheggiato';
  const corpo = norm(testo(html).slice(0, 150000));
  if (PARCHEGGIATO.test(corpo)) return 'parcheggiato';
  const titolo = norm(testo((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]));
  const meta = norm((html.match(/<meta[^>]+(?:og:site_name|og:title|description)[^>]+content=["']([^"']+)/i) || [])[1]);
  const tutto = `${titolo}${meta}${corpo}`;
  const parole = c.nucleo.split(' ').filter(Boolean);
  const attaccato = parole.join('');
  if (parole.length === 1) {
    const nome = String(c.nome || attaccato);
    if (nome !== attaccato) return tutto.includes(` ${nome} `) || tutto.includes(` ${nome.replace(/ /g, '')} `) ? 'ok' : 'nome_assente';
    return `${titolo}${meta}`.includes(` ${attaccato} `) ? 'ok' : 'nome_assente';
  }
  if (parole.every(w => tutto.includes(` ${w} `))) return 'ok';
  if (tutto.replace(/ /g, '').includes(attaccato)) return 'ok';
  return 'nome_assente';
};

const esiti = new Map();
// Anche le aziende senza domini da provare (nome fatto solo di parole generiche).
for (const a of $('Aziende senza sito').first().json.companies || []) {
  esiti.set(a.company_key, { company_key: a.company_key, company_name: a.company_name, city: a.city || '', domain: '', method: 'guess', ordine: 99 });
}
const stats = { companies: 0, tried: candidati.length, found: 0, not_found: 0, unreachable: 0, parked: 0, name_missing: 0 };
candidati.forEach((c, i) => {
  const e = esiti.get(c.company_key) || { company_key: c.company_key, company_name: c.company_name, city: c.city, domain: '', method: 'guess', ordine: 99 };
  const v = valuta(c, pagine[i]);
  if (v === 'irraggiungibile') stats.unreachable++;
  else if (v === 'parcheggiato') stats.parked++;
  else if (v === 'nome_assente') stats.name_missing++;
  if (v === 'ok' && c.ordine < e.ordine) { e.domain = c.domain; e.ordine = c.ordine; }
  esiti.set(c.company_key, e);
});

const results = [...esiti.values()].map(({ ordine, ...e }) => e);
stats.companies = results.length;
stats.found = results.filter(r => r.domain).length;
stats.not_found = stats.companies - stats.found;
stats.errors = errori;
return [{ json: { results, stats } }];
