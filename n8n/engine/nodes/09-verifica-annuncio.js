// Verifica dell'annuncio di lavoro (segnale "job_ad", regole in docs/07-segnali.md).
// Riapre la pagina indicata dall'AI e decide in modo deterministico:
//   pass         -> titolo nella famiglia, azienda giusta, data recente
//   reject       -> agenzia per il lavoro, annuncio vecchio o scaduto, titolo fuori famiglia
//   undetermined -> pagina illeggibile, nessuna data, azienda non riconoscibile
// Prova più solida: i dati strutturati schema.org JobPosting; altrimenti titolo e
// data dal testo della pagina (es. pagina «Lavora con noi» del sito aziendale).
const job = $('Valida richiesta').first().json;
const p = $('Serve verifica annuncio?').item.json;
const sg = job.target.signals;
const html = String($json.html ?? '');

const norm = (v) => ` ${String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
// Taglio senza spezzare un'emoji: un mezzo carattere (surrogato alto) in fondo rende il JSON non valido per il
// database (stesso problema del Settore aziende, 21/10).
const taglia = (t, n) => { const s = String(t).slice(0, n); const c = s.charCodeAt(s.length - 1); return c >= 0xD800 && c <= 0xDBFF ? s.slice(0, -1) : s; };
const testo = (h) => String(h ?? '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const host = (u) => String(u ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#:]/)[0];
const giorno = (d) => { const m = String(d ?? '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : ''; };
const giorniFa = (d) => Math.floor((Date.parse(job.today) - Date.parse(d)) / 86400000);

const titoli = sg.job_families.flatMap(f => f.titles.map(t => ({ fam: f.code, t: norm(t) })));
// Mestieri di officina (CNC, CAD, PLC, saldatore): valgono solo per le figure della manifattura, mai per programmatori,
// grafici o sistemisti («Programmatore CNC» non è uno sviluppatore; 22/10, punto 89). Stessa regola della raccolta Adzuna.
const OFFICINA = /\b(cnc|cad|cam|plc|fresatore|tornitore|saldatore|macchine utensili|centri di lavoro)\b/;
const MANIFATTURA = new Set(['production', 'maintenance', 'logistics']);
const famigliaDi = (titolo) => {
  const n = norm(titolo);
  return titoli.find(x => n.includes(x.t) && (!OFFICINA.test(n) || MANIFATTURA.has(x.fam)))?.fam || '';
};

// Agenzie per il lavoro: se l'annuncio non è sul sito dell'azienda, non sappiamo chi assume davvero.
const AGENZIE = /\b(randstad|adecco|manpower|gi group|synergie|openjobmetis|etjca|umana|lavoropiu|orienta|kelly services|hays|michael page|page personnel|robert half|spring professional|start people|quanta|eurointerim|ali spa|osm partners|indeed|jobrapido|infojobs|monster|stepstone)\b/;
const PER_CLIENTE = /(per (importante |nota |una )?(azienda|societa) cliente|per conto (di|del) (un |una |nostro |nostra )?client|nostro cliente|for (one of )?our client|pour (le compte d un|notre) client|para (una )?empresa cliente|fur unseren kunden|im auftrag unseres kunden|para (o nosso|um) cliente)/;

const dominio = String(p.domain ?? '').toLowerCase();
const urlAnnuncio = String(p.job_ad_url ?? '');
const sulSito = dominio && (host(urlAnnuncio) === dominio || host(urlAnnuncio).endsWith(`.${dominio}`));
const FORME = new Set(['srl', 'srls', 'spa', 'sas', 'snc', 'sl', 'sa', 'sarl', 'gmbh', 'ag', 'kg', 'ltd', 'limited', 'llc', 'inc', 'bv', 'nv', 'lda', 'the', 'and', 'di', 'de', 'del', 'della', 'group', 'gruppo']);
const parole = (s) => norm(s).trim().split(' ').filter(w => w.length > 2 && !FORME.has(w));
const stessaAzienda = (nome, sito) => {
  if (sito && host(sito) && (host(sito) === dominio || host(sito).endsWith(`.${dominio}`))) return true;
  const a = parole(nome);
  const b = new Set(parole(p.company_name));
  return a.length > 0 && a.some(w => b.has(w));
};

// 1. Dati strutturati JobPosting
const posting = [];
const visita = (o) => {
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o)) { o.forEach(visita); return; }
  const tipo = [].concat(o['@type'] || []).map(String);
  if (tipo.includes('JobPosting')) posting.push(o);
  if (o['@graph']) visita(o['@graph']);
};
for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
  try { visita(JSON.parse(m[1].trim())); } catch { /* JSON rotto: si passa al testo */ }
}

const esito = (status, reason, extra = {}) => ({ status, reason, ...extra });
let risultato;

const corpo = testo(html);
if (!html || corpo.length < 150) {
  risultato = esito('undetermined', 'pagina_non_leggibile');
} else if (posting.length) {
  const candidati = posting.map(j => {
    const org = j.hiringOrganization || {};
    return {
      title: testo(j.title || j.name || ''),
      date: giorno(j.datePosted),
      until: giorno(j.validThrough),
      org: testo(typeof org === 'string' ? org : org.name || ''),
      orgSite: typeof org === 'object' ? String(org.sameAs || org.url || '') : ''
    };
  });
  const giusto = candidati.find(c => famigliaDi(c.title)) || candidati[0];
  const fam = famigliaDi(giusto.title);
  const agenzia = !sulSito && (AGENZIE.test(norm(giusto.org)) || PER_CLIENTE.test(norm(corpo)));
  if (!fam) risultato = esito('reject', 'titolo_fuori_famiglia', { title: giusto.title });
  else if (agenzia) risultato = esito('reject', 'agenzia_per_il_lavoro', { title: giusto.title });
  else if (!sulSito && !(giusto.org ? stessaAzienda(giusto.org, giusto.orgSite) : norm(corpo).includes(norm(p.company_name)))) risultato = esito('undetermined', 'azienda_non_riconosciuta', { title: giusto.title });
  else if (!giusto.date) risultato = esito('undetermined', 'data_mancante', { title: giusto.title });
  else {
    const eta = giorniFa(giusto.date);
    const scaduto = giusto.until && Date.parse(giusto.until) < Date.parse(job.today);
    const valido = !scaduto && (eta <= sg.max_age_days || (giusto.until && eta <= 120));
    risultato = valido
      ? esito('pass', '', { title: giusto.title, date: giusto.date, family: fam })
      : esito('reject', 'annuncio_scaduto', { title: giusto.title, date: giusto.date });
  }
} else {
  // 2. Testo: blocchi (titoli, voci di elenco, link) che contengono una figura richiesta.
  const blocchi = [...html.matchAll(/<(h1|h2|h3|li|a|article|div)\b[^>]*>([\s\S]{0,600}?)<\/\1>/gi)].map(m => m[0]);
  const blocco = blocchi.find(b => famigliaDi(testo(b)));
  const titoloPagina = testo((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const titolo = blocco ? taglia(testo(blocco), 160) : '';
  if (!titolo) {
    risultato = esito('reject', 'titolo_fuori_famiglia', { title: taglia(titoloPagina, 160) });
  } else if (!sulSito && PER_CLIENTE.test(norm(corpo))) {
    risultato = esito('reject', 'agenzia_per_il_lavoro', { title: titolo });
  } else if (!sulSito && !norm(corpo).includes(norm(p.company_name))) {
    risultato = esito('undetermined', 'azienda_non_riconosciuta', { title: titolo });
  } else {
    // Data: nel blocco dell'annuncio (<time datetime>, AAAA-MM-GG, GG/MM/AAAA), poi nella pagina.
    const trovaData = (h) => {
      const t = h.match(/<time[^>]*datetime=["'](\d{4}-\d{2}-\d{2})/i);
      if (t) return t[1];
      const iso = h.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
      if (iso) return iso[0];
      const eu = testo(h).match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
      return eu ? `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}` : '';
    };
    const meta = (html.match(/<meta[^>]+(?:article:published_time|datePublished)[^>]+content=["']([^"']+)/i) || [])[1];
    const contenitore = blocchi.find(b => b.includes(blocco) && b !== blocco && /^<li/i.test(b)) || '';
    const data = trovaData(blocco) || trovaData(contenitore) || giorno(meta) || '';
    if (!data) risultato = esito('undetermined', 'data_mancante', { title: titolo });
    else if (giorniFa(data) > sg.max_age_days || giorniFa(data) < -1) risultato = esito('reject', 'annuncio_scaduto', { title: titolo, date: data });
    else risultato = esito('pass', '', { title: titolo, date: data, family: famigliaDi(titolo) });
  }
}

const segnale = {
  code: 'job_ad',
  status: risultato.status,
  reason: risultato.reason,
  evidence: {
    url: urlAnnuncio,
    title: risultato.title || p.job_ad_title || '',
    date: risultato.date || '',
    family: risultato.family || '',
    source: sulSito ? 'company_site' : 'job_board',
    checked_at: job.today
  }
};

// Con "basta uno" e altri segnali richiesti, la decisione finale spetta ai segnali dal sito.
const obbligatorio = sg.codes.length === 1 || sg.match === 'all';
const out = { ...p, signals: [...(Array.isArray(p.signals) ? p.signals : []), segnale] };
if (obbligatorio && segnale.status !== 'pass') out._scarto_segnale = `annuncio_${segnale.reason}`;
return { json: out };
