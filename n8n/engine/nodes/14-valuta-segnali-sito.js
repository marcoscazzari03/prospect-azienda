// Segnali dal sito (regole in docs/07-segnali.md), calcolati sull'HTML della
// homepage PRIMA della ricerca del referente, delle email e di Icypeas: chi non
// ha il segnale richiesto non costa altro. Prepara anche il testo della homepage
// e la pagina «chi siamo» per cercare il referente sul sito. Ogni segnale ha un esito:
//   pass -> presente (con la prova), fail -> assente, undetermined -> non dimostrabile.
// "Non determinabile" non conta mai come superato.
// Modo DECIDI (ricerca opportunità): controlla i segnali richiesti e scarta chi non li ha.
// Modo SCANSIONA (ricerca in target): sulla homepage già scaricata per le email fa TUTTI
// i controlli (tranne HTTPS, che richiede un'altra chiamata) e non scarta nessuno: gli
// esiti finiscono nel database delle aziende, riusabili dalle ricerche opportunità.
const MODO = '__MODO__';
const SCANSIONE = MODO === 'SCANSIONA';
const job = $('Valida richiesta').first().json;
const base = SCANSIONE ? $('Estrai email homepage').item.json : $('Serve controllo sito?').item.json;
const sg = job.target.signals;
const SITO = ['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright', 'under_construction', 'no_booking_engine'];
const DECISIVI = ['job_ad', 'no_https', 'no_mobile', 'outdated_cms', 'single_language']; // gli indicativi non decidono mai
// In una ricerca opportunità i controlli sono già stati fatti prima del referente.
if (SCANSIONE && sg.codes.length) return { json: base };
const richiesti = SCANSIONE ? SITO.filter(c => c !== 'no_https') : base._riserva ? [] : sg.codes.filter(c => SITO.includes(c));

const html = String((SCANSIONE ? $('HTTP - Homepage') : $('HTTP - Sito (segnali)')).item.json.html ?? '');
const { testo, esiti, tecnologie } = controlliSito({ html, website: base.website, oggi: job.today, richiesti, https: $json });

// Per il referente: testo della homepage e la pagina più adatta (chi siamo, team, note legali, contatti).
let paginaReferente = '';
if (base._serve_referente && !SCANSIONE) {
  const dom = String(base.domain || '');
  const origine = (String(base.website).match(/^(https?:\/\/[^\/?#]+)/i) || [])[1] || '';
  const assoluto = (h) => /^https?:\/\//i.test(h) ? h : h.startsWith('//') ? 'https:' + h : h.startsWith('/') ? origine + h : origine + '/' + h.replace(/^\.\//, '');
  const link = [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map(m => assoluto(m[1].trim()))
    .filter(u => !/[\\@]/.test(u))
    .filter(u => { const h = u.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#:]/)[0]; return dom && (h === dom || h.endsWith('.' + dom)); })
    .filter(u => !/\.(pdf|jpe?g|png|gif|svg|webp|zip|css|js)(\?|$)/i.test(u))
    .filter(u => u.replace(/\/+$/, '') !== String(base.website).replace(/\/+$/, ''));
  const PRIORITA = [/chi-?siamo|chi_siamo|about|azienda|storia|team|staff|lo-studio|profilo|who-we-are|uber-uns|ueber-uns|quienes-somos|qui-sommes/i,
    /note-legali|impressum|aviso-legal|mentions-legales|colofon/i, /contatt|contact|kontakt/i];
  for (const re of PRIORITA) { paginaReferente = link.find(u => re.test(u)) || ''; if (paginaReferente) break; }
  if (!paginaReferente && base.contact_page) paginaReferente = base.contact_page;
}
const aux = base._serve_referente && !SCANSIONE ? { _testo_home: testo.slice(0, 6000), _pagina_referente: paginaReferente } : {};
const p = { ...base, ...aux };
if (!richiesti.length) return { json: p };

const segnali = [...(Array.isArray(p.signals) ? p.signals : []), ...Object.values(esiti)];
const out = { ...p, signals: segnali, technologies: tecnologie };

if (SCANSIONE) return { json: out };

// Decisione: solo sui segnali verificati richiesti (annuncio compreso, se c'è).
const decisivi = sg.codes.filter(c => DECISIVI.includes(c));
if (decisivi.length) {
  const stato = (c) => (segnali.find(s => s.code === c) || {}).status;
  const ok = sg.match === 'all' ? decisivi.every(c => stato(c) === 'pass') : decisivi.some(c => stato(c) === 'pass');
  if (!ok && !out._scarto_segnale) {
    out._scarto_segnale = decisivi.every(c => stato(c) === 'undetermined') ? 'segnale_non_determinabile' : 'segnale_assente';
  }
}
return { json: out };

__CONTROLLI_SITO__