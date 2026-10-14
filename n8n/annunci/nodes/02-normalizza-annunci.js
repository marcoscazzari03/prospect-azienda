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
// Mestieri di officina con titoli simili (programmatore CNC, grafico CAD): non sono le figure cercate.
const OFFICINA = /\b(cnc|cad|cam|plc|fresatore|tornitore|saldatore|macchine utensili|centri di lavoro)\b/;
const famigliaDi = (titolo) => {
  const n = norm(titolo);
  if (OFFICINA.test(n)) return '';
  return titoli.find(x => n.includes(x.t))?.fam || '';
};

// Agenzie per il lavoro, società di selezione e consulenza «presso cliente»: dal nome
// dell'azienda o da come è scritto l'annuncio.
const AGENZIE = /\b(randstad|adecco|manpower|experis|gi group|gigroup|synergie|openjobmetis|etjca|umana|lavoropiu|orienta|kelly services|hays|michael page|page personnel|robert half|spring professional|start people|quanta|eurointerim|ali spa|osm partners|indeed|jobrapido|infojobs|monster|stepstone|e work|trenkwalder|humangest|tempor|tempus|tempi moderni|wintime|samsic|maw|jobtech|in job|unimpiego|generazione vincente|articolo1|cooperjob|men at work|staff spa|risorse spa|adhr|nhrg|hunters group|lhh|joinrs|selection 4 0|hrspecialist|reclutamente|job services|during spa|labor spa|human resources|lavoro|staffing|recruiting|recruitment|head ?hunt\w*|executive search|selezione|outsourcing)\b/;
const PER_CLIENTE = new RegExp([
  'agenzia per il lavoro', 'ricerca e selezion', 'selezione del personale', 'autorizzazione ministeriale', 'albo informatico',
  'somministrazione (di )?lavoro', 'contratto di somministrazione', 'career center',
  // «ricerca per importante azienda», «seleziona per conto di una società», «per azienda specializzata»
  '(ricerca|ricerchiamo|seleziona|selezioniamo|cerca|cerchiamo) per (conto di )?(un |una |l )?((importante|nota|notevole|primaria|solida|storica|affermata|prestigiosa|dinamica|strutturata) )*(azienda|societa|realta|gruppo|ente|struttura|multinazionale|cliente)\\b',
  // «NEXT SPA, Filiale di Bologna, seleziona un/una junior accountant per società di trasporti»
  'filiale di( [a-z]+){1,3} (seleziona|ricerca|cerca)',
  '(seleziona|ricerca|ricerchiamo|selezioniamo)( [a-z]+){1,6} per (un |una |l )?((importante|nota|notevole|primaria|solida|storica|affermata|prestigiosa|dinamica|strutturata) )*(azienda|societa|realta|gruppo|cliente)\\b',
  // «per importante cliente», «per un nostro cliente» (non «per il cliente»: lo scrive anche chi assume)
  'per (un |una )?(nostro |nostra )?(importante|nota|notevole|primario|primaria) client',
  // «per nostra importante azienda cliente», «gruppo ceramico cliente»
  // (non «azienda attenta al cliente»: in mezzo niente preposizioni o articoli)
  '(azienda|gruppo|realta|societa)( (?!(al|ai|del|dei|della|verso|con|il|la|le|i|di|e|per|nel|nei|sul|a)\\b)[a-z]+){0,3} cliente\\b',
  'per conto (di|del) (un |una |nostro |nostra )?client', 'nostro cliente', 'for (one of )?our client', 'our client',
  'pour (le compte d un|notre) client', 'para (una )?empresa cliente', 'fur unseren kunden', 'im auftrag unseres kunden', 'para (o nosso|um) cliente'
].join('|'));
const ANONIMA = /^ (azienda|societa|riservato|riservata|confidenziale|anonimo|anonima|cliente|privato|privata|n d|nd|na|company|confidential) /;

const richieste = $('Prepara richieste').all().map(i => i.json);
const stats = { requests: richieste.length, errors: 0, results: 0, off_topic: 0, agencies: 0, anonymous: 0, duplicates: 0, kept: 0 };
const visti = new Set();
const ads = [];

$input.all().forEach((item) => {
  const r = item.json || {};
  if (!Array.isArray(r.results)) { stats.errors++; return; }
  const richiesta = richieste[item.pairedItem?.item ?? 0] || {};
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
