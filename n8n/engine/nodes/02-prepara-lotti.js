// Trasforma il piano dell'AI in N lotti di ricerca, ognuno con il proprio
// prompt. Se il piano è illeggibile, ripiega su lotti costruiti dai filtri
// (paesi x aree) così la ricerca parte comunque.
const job = $('Valida richiesta').first().json;

const parse = (raw) => {
  if (raw && typeof raw === 'object') return raw;
  let s = String(raw ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { return null; }
};

const piano = parse($input.first().json.output);
let lotti = Array.isArray(piano?.lotti) ? piano.lotti : [];

lotti = lotti
  .map(l => ({
    paese: String(l?.paese ?? '').trim().slice(0, 80),
    focus: String(l?.focus ?? '').trim().slice(0, 300),
    query: (Array.isArray(l?.query) ? l.query : []).map(q => String(q).trim().slice(0, 160)).filter(Boolean).slice(0, 6)
  }))
  .filter(l => l.focus)
  .slice(0, job.lotti_previsti);

if (!lotti.length) {
  const paesi = job.target.country_names.length ? job.target.country_names : job.target.countries;
  const aree = job.target.regions.length ? job.target.regions : [''];
  for (const p of paesi) for (const a of aree) {
    lotti.push({ paese: p, focus: [job.target.industry, a].filter(Boolean).join(' - '), query: [] });
  }
  lotti = lotti.slice(0, job.lotti_previsti);
}

const ruoli = job.target.roles.length ? job.target.roles.join(', ') : 'titolare, fondatore, CEO, amministratore delegato';
const perAzienda = job.contacts_per_company;

const prompt = (l, i) => [
  `Cerca sul web fino a ${job.limits.candidates_per_lot} AZIENDE REALI con il relativo referente, come prospect commerciali B2B.`,
  '',
  `LOTTO ${i + 1} di ${lotti.length}`,
  `PAESE: ${l.paese}`,
  `FOCUS DEL LOTTO: ${l.focus}`,
  l.query.length ? `QUERY SUGGERITE (lingua locale): ${l.query.join(' | ')}` : null,
  '',
  'TARGET DEL CLIENTE',
  job.brief,
  '',
  'CHI CERCHIAMO',
  `Per ogni azienda indica al massimo ${perAzienda} persona/e con uno di questi ruoli: ${ruoli}.`,
  'Il ruolo deve risultare da una fonte pubblica (sito aziendale, pagina team, registro, articolo,',
  'profilo professionale). Se non trovi nessuna persona con un ruolo coerente, NON inserire l\'azienda.',
  'Non indicare dipendenti junior, stagisti, consulenti esterni o personale amministrativo,',
  'a meno che il ruolo non sia esplicitamente richiesto.',
  '',
  'SITO UFFICIALE OBBLIGATORIO',
  '"website" deve essere il sito dell\'azienda (dominio proprio). NON sono siti ufficiali: LinkedIn,',
  'Facebook, Instagram, Google Maps, directory, pagine gialle, marketplace, articoli.',
  'Usa directory e registri solo per SCOPRIRE i nomi, poi trova il sito ufficiale.',
  'Se non trovi il sito ufficiale, scarta il candidato e passa al successivo.',
  '',
  'PAGINA CONTATTI',
  'Se durante la ricerca vedi la pagina contatti / note legali / impressum del sito ufficiale,',
  'mettila in "contact_page". NON cercare email e NON scriverne: le email le troviamo noi.',
  '',
  'METODO',
  'Usa davvero la ricerca web, anche nella lingua del paese. Privilegia la quantità di candidati',
  'verificabili. Non approfondire un candidato quando hai già: azienda reale, sito ufficiale,',
  'persona reale con ruolo coerente, una fonte.',
  '',
  'REGOLE INVIOLABILI',
  '- Non inventare mai persone, aziende, ruoli, siti, URL o dati economici.',
  '- Ogni candidato deve avere "source_url": la pagina in cui hai visto la persona e il ruolo.',
  '- Se un dato non è noto lascialo stringa vuota.',
  '- Niente grandi gruppi quotati o multinazionali, salvo richiesta esplicita del cliente.',
  '',
  'OUTPUT',
  'Restituisci ESCLUSIVAMENTE JSON valido, senza testo prima o dopo:',
  '{"candidates":[{"company_name":"","website":"","country":"","city":"","industry":"",',
  '"size_hint":"","full_name":"","first_name":"","last_name":"","job_title":"",',
  '"source_url":"","contact_page":"","linkedin_url":""}]}'
].filter(x => x !== null).join('\n');

return lotti.map((l, i) => ({
  json: {
    job_id: job.job_id,
    lotto: i + 1,
    paese: l.paese,
    focus: l.focus,
    prompt: prompt(l, i)
  }
}));
