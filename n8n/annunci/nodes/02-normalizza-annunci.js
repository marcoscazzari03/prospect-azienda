// Dalle risposte di Adzuna agli annunci da salvare (tabella job_ads).
// Tiene solo gli annunci con un titolo del catalogo (stesse regole della verifica
// annuncio del motore, n8n/engine/nodes/09-verifica-annuncio.js), con un'azienda
// riconoscibile e non pubblicati da agenzie per il lavoro: chi assume deve essere
// l'azienda stessa, altrimenti non sappiamo a chi proporre il servizio.
const FAMIGLIE = __FAMIGLIE__;

const norm = (v) => ` ${String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const testo = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ').trim();

// Titolo -> famiglia: vince il titolo del catalogo più lungo contenuto nel titolo
// (es. «business developer» è commerciale, non programmatore).
const titoli = FAMIGLIE.flatMap(f => f.titles.map(t => ({ fam: f.code, t: norm(t) })))
  .sort((a, b) => b.t.length - a.t.length);
const famigliaDi = (titolo) => { const n = norm(titolo); return titoli.find(x => n.includes(x.t))?.fam || ''; };

const AGENZIE = /\b(randstad|adecco|manpower|gi group|synergie|openjobmetis|etjca|umana|lavoropiu|orienta|kelly services|hays|michael page|page personnel|robert half|spring professional|start people|quanta|eurointerim|ali spa|osm partners|indeed|jobrapido|infojobs|monster|stepstone|e work|trenkwalder|humangest|tempor|maw|jobtech|in job|generazione vincente|articolo1|cooperjob|men at work|lavoro doc|staffing|recruiting|head ?hunt\w*|executive search|agenzia per il lavoro|selezione del personale)\b/;
const PER_CLIENTE = /(per (importante |nota |una )?(azienda|societa) cliente|per conto (di|del) (un |una |nostro |nostra )?client|nostro cliente|nostra azienda cliente|for (one of )?our client|pour (le compte d un|notre) client|para (una )?empresa cliente|fur unseren kunden|im auftrag unseres kunden|para (o nosso|um) cliente)/;
const ANONIMA = /^ (azienda|societa|riservato|riservata|confidenziale|anonimo|anonima|cliente|privato|privata|n d|nd|na|company|confidential) /;

const richieste = $('Prepara richieste').all().map(i => i.json);
const stats = { requests: richieste.length, errors: 0, results: 0, off_topic: 0, agencies: 0, anonymous: 0, duplicates: 0, kept: 0 };
const visti = new Set();
const ads = [];

$input.all().forEach((item, i) => {
  const r = item.json || {};
  if (!Array.isArray(r.results)) { stats.errors++; return; }
  const richiesta = richieste[item.pairedItem?.item ?? i] || {};
  for (const a of r.results) {
    stats.results++;
    const id = String(a.id ?? '');
    const titolo = testo(a.title).slice(0, 200);
    const azienda = testo(a.company?.display_name).slice(0, 200);
    const descrizione = testo(a.description);
    if (!id || visti.has(id)) { stats.duplicates++; continue; }
    visti.add(id);

    const famiglia = famigliaDi(titolo);
    if (!famiglia) { stats.off_topic++; continue; }
    if (!azienda || ANONIMA.test(norm(azienda))) { stats.anonymous++; continue; }
    if (AGENZIE.test(norm(azienda)) || PER_CLIENTE.test(norm(`${titolo} ${descrizione}`))) { stats.agencies++; continue; }

    const area = Array.isArray(a.location?.area) ? a.location.area.map(String) : [];
    ads.push({
      external_id: id,
      family: famiglia,
      title: titolo,
      company_name: azienda,
      country: 'IT',
      region: area[1] || richiesta.region || '',
      city: area.length > 2 ? area[area.length - 1] : '',
      posted_at: String(a.created ?? ''),
      url: String(a.redirect_url ?? '').replace(/^http:\/\//, 'https://'),
      description: descrizione.slice(0, 600),
      contract: [a.contract_type, a.contract_time].filter(Boolean).join(' ').slice(0, 40)
    });
  }
});
stats.kept = ads.length;

return [{ json: { source: 'adzuna', ads, stats } }];
