// Esito della ricerca web del sito (livello 3): dal sito proposto da Claude a un dominio
// da verificare come nel livello 2 (stesse regole di «Domini candidati»). Portali,
// elenchi e social vengono scartati.
const richieste = $('Prepara ricerca web').all().map(i => i.json);
const norm = (v) => String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, ' ').trim();
const FORME = new Set(['srl', 'srls', 'spa', 'sas', 'snc', 'sapa', 'scarl', 'scrl', 'soc', 'coop', 'societa', 'cooperativa',
  'unipersonale', 's', 'r', 'l', 'p', 'a', 'c', 'e', 'di', 'del', 'della', 'the', 'and', 'ltd', 'inc', 'gmbh', 'ag', 'sa', 'bv']);
const GENERICHE = new Set(['group', 'gruppo', 'italia', 'italy', 'italiana', 'holding', 'international', 'filiale', 'sede']);
const PAESE = new Set(['italia', 'italy', 'italiana']);
// Nomi interni e servizi DNS «jolly» che puntano a qualsiasi IP (ripasso di sicurezza del 22/10).
const INTERNI = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|invalid|test|example|nip\.io|sslip\.io|xip\.io|localtest\.me|lvh\.me|vcap\.me|traefik\.me|lacolhost\.com|localhost\.run)$/;
const NON_UFFICIALI = /(^|\.)(linkedin|facebook|instagram|twitter|x|youtube|tiktok|wikipedia|indeed|infojobs|adzuna|jobrapido|glassdoor|monster|subito|paginegialle|paginebianche|kompass|europages|reportaziende|ufficiocamerale|registroimprese|atoka|companyreports|informazione-aziende|fatturatoitalia|google|bing|amazon|trustpilot)\.[a-z.]+$/;

const out = [];
$input.all().forEach((item, i) => {
  const r = item.json || {};
  const p = richieste[item.pairedItem?.item ?? i] || {};
  const testo = (Array.isArray(r.content) ? r.content : []).filter(b => b?.type === 'text').map(b => b.text).join('');
  let sito = '';
  try { const a = testo.indexOf('{'); const b = testo.lastIndexOf('}'); sito = a >= 0 && b > a ? String(JSON.parse(testo.slice(a, b + 1)).website ?? '') : ''; } catch { sito = ''; }
  const dominio = sito.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#:]/)[0];
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(dominio) || NON_UFFICIALI.test(dominio) || INTERNI.test(dominio)) return;
  const parole = norm(p.company_name).split(' ').filter(w => w && !FORME.has(w));
  const nucleo = parole.filter(w => !GENERICHE.has(w));
  if (!nucleo.length) return;
  out.push({ json: {
    company_key: p.company_key, company_name: p.company_name, city: p.city || '',
    nucleo: nucleo.join(' '), nome: parole.filter(w => !PAESE.has(w)).join(' '),
    domain: dominio, ordine: 0, url: `https://${dominio}`
  } });
});
return out;
