import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// GENERATO da n8n/annunci/build.mjs: non modificare a mano.
// Ogni mattina scarica da Adzuna gli annunci delle figure del catalogo, scarta agenzie
// e titoli fuori tema e li salva nel database (POST /api/engine/job-ads -> job_ads).

const ogniGiorno = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Ogni mattina',
    parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 6, triggerAtMinute: 10 }] } }
  }
});

const aMano = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Primo riempimento (a mano)' }
});

const preparaRichieste = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepara richieste',
    parameters: { jsCode: "// Richieste ad Adzuna: una per famiglia di figure (catalogo JOB_FAMILIES) e regione,\n// ordinate dalla più recente. Le pagine da 50 vanno avanti finché ci sono annunci\n// (al massimo 6 al giorno, 10 nel primo riempimento). Ogni giorno bastano gli annunci\n// degli ultimi 2 giorni; il primo riempimento, avviato a mano, va indietro di 30.\n// Limiti del piano Adzuna: 50 chiamate al minuto, 500 al giorno, 5.000 al mese.\nconst REGIONI = ['Emilia-Romagna'];\n\n// Parole cercate da Adzuna (basta una, nel titolo o nel testo): la scelta finale la fa\n// «Normalizza annunci» confrontando il titolo con le figure del catalogo. Niente parole\n// generiche (sicurezza, account, risorse...): riempirebbero le pagine di annunci fuori tema.\nconst PAROLE = {\n  it_systems: 'sistemista sysadmin helpdesk sistemisti',\n  software_dev: 'programmatore sviluppatore developer frontend backend fullstack',\n  cybersecurity: 'cybersecurity soc pentester',\n  digital_marketing: 'marketing seo',\n  sales: 'commerciale venditore',\n  hr: 'recruiter payroll paghe',\n  accounting: 'contabile controller accountant',\n  design: 'grafico designer'\n};\n\n// Avvio a mano = primo riempimento. ($execution.mode non basta: vale «test» anche per\n// le prove dall'editor.)\nlet programmato = false;\ntry { programmato = $('Ogni mattina').isExecuted; } catch { programmato = false; }\nconst giorni = programmato ? 2 : 30;\nconst pagine = programmato ? 6 : 10;\n\nconst out = [];\nfor (const regione of REGIONI) {\n  for (const [famiglia, parole] of Object.entries(PAROLE)) {\n    out.push({ json: { family: famiglia, region: regione, what_or: parole, max_days_old: giorni, max_pages: pagine } });\n  }\n}\nreturn out;\n" }
  },
  output: [{ family: 'it_systems', region: 'Emilia-Romagna', what_or: 'sistemista', max_days_old: 2, max_pages: 6 }]
});

const adzuna = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Adzuna - Annunci',
    parameters: {
      url: 'https://api.adzuna.com/v1/api/jobs/it/search/1',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpCustomAuth',
      sendQuery: true,
      queryParameters: { parameters: [
        { name: 'results_per_page', value: '50' },
        { name: 'what_or', value: expr('{{ $json.what_or }}') },
        { name: 'location0', value: 'Italia' },
        { name: 'location1', value: expr('{{ $json.region }}') },
        { name: 'max_days_old', value: expr('{{ $json.max_days_old }}') },
        { name: 'sort_by', value: 'date' },
        { name: 'content-type', value: 'application/json' }
      ] },
      options: {
        // Piano Adzuna: massimo 50 chiamate al minuto.
        batching: { batch: { batchSize: 1, batchInterval: 1500 } },
        // Pagina successiva finché la pagina è piena (50) e fino a max_pages.
        pagination: { pagination: {
          paginationMode: 'responseContainsNextURL',
          nextURL: expr("{{ 'https://api.adzuna.com/v1/api/jobs/it/search/' + (Number($request.url.split('?')[0].split('/').pop()) + 1) }}"),
          paginationCompleteWhen: 'other',
          completeExpression: expr("{{ !Array.isArray($response.body.results) || $response.body.results.length < 50 || Number($request.url.split('?')[0].split('/').pop()) >= $json.max_pages }}"),
          limitPagesFetched: true,
          maxRequests: 10,
          requestInterval: 1500
        } },
        response: { response: { neverError: true } },
        timeout: 30000
      }
    },
    credentials: { httpCustomAuth: { id: '9uw7ry3Mp3ULA4fe', name: 'Adzuna API' } },
    onError: 'continueRegularOutput'
  },
  output: [{ count: 1, results: [] }]
});

const normalizza = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalizza annunci',
    parameters: { jsCode: "// Dalle risposte di Adzuna agli annunci da salvare (tabella job_ads).\n// Tiene solo gli annunci con un titolo del catalogo (stesse regole della verifica\n// annuncio del motore, n8n/engine/nodes/09-verifica-annuncio.js), con un'azienda\n// riconoscibile e non pubblicati da agenzie per il lavoro: chi assume deve essere\n// l'azienda stessa, altrimenti non sappiamo a chi proporre il servizio.\nconst FAMIGLIE = [{\"code\":\"it_systems\",\"titles\":[\"sistemista\",\"tecnico informatico\",\"tecnico it\",\"amministratore di sistema\",\"amministratore di rete\",\"help desk\",\"supporto it\",\"system administrator\",\"sysadmin\",\"systems engineer\",\"network administrator\",\"network engineer\",\"it technician\",\"it support\"]},{\"code\":\"software_dev\",\"titles\":[\"programmatore\",\"sviluppatore\",\"developer\",\"software engineer\",\"full stack\",\"frontend\",\"backend\",\"software developer\",\"programmer\",\"web developer\"]},{\"code\":\"cybersecurity\",\"titles\":[\"cyber security\",\"cybersecurity\",\"sicurezza informatica\",\"security analyst\",\"security engineer\",\"information security\",\"soc analyst\"]},{\"code\":\"digital_marketing\",\"titles\":[\"digital marketing\",\"marketing specialist\",\"social media manager\",\"seo specialist\",\"marketing manager\",\"web marketing\",\"growth marketer\"]},{\"code\":\"sales\",\"titles\":[\"commerciale\",\"agente di commercio\",\"sales manager\",\"account manager\",\"venditore\",\"business developer\",\"sales representative\",\"account executive\"]},{\"code\":\"hr\",\"titles\":[\"risorse umane\",\"hr specialist\",\"hr manager\",\"recruiter\",\"selezione del personale\",\"addetto paghe\",\"human resources\",\"talent acquisition\",\"payroll\"]},{\"code\":\"accounting\",\"titles\":[\"contabile\",\"impiegato amministrativo\",\"addetto contabilita\",\"controller\",\"responsabile amministrativo\",\"accountant\",\"bookkeeper\",\"finance assistant\",\"accounts payable\"]},{\"code\":\"design\",\"titles\":[\"grafico\",\"web designer\",\"graphic designer\",\"ui designer\",\"ux designer\",\"visual designer\"]}];\n\nconst norm = (v) => ` ${String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()\n  .replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\\s+/g, ' ').trim()} `;\nconst testo = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')\n  .replace(/\\s+/g, ' ').trim();\n\n// Titolo -> famiglia: vince il titolo del catalogo più lungo contenuto nel titolo\n// (es. «business developer» è commerciale, non programmatore).\nconst titoli = FAMIGLIE.flatMap(f => f.titles.map(t => ({ fam: f.code, t: norm(t) })))\n  .sort((a, b) => b.t.length - a.t.length);\nconst famigliaDi = (titolo) => { const n = norm(titolo); return titoli.find(x => n.includes(x.t))?.fam || ''; };\n\n// Agenzie per il lavoro, società di selezione e consulenza «presso cliente»: dal nome\n// dell'azienda o da come è scritto l'annuncio.\nconst AGENZIE = /\\b(randstad|adecco|manpower|experis|gi group|synergie|openjobmetis|etjca|umana|lavoropiu|orienta|kelly services|hays|michael page|page personnel|robert half|spring professional|start people|quanta|eurointerim|ali spa|osm partners|indeed|jobrapido|infojobs|monster|stepstone|e work|trenkwalder|humangest|tempor|tempus|tempi moderni|wintime|samsic|maw|jobtech|in job|unimpiego|generazione vincente|articolo1|cooperjob|men at work|staff spa|lavoro|staffing|recruiting|recruitment|head ?hunt\\w*|executive search|selezione|outsourcing)\\b/;\nconst PER_CLIENTE = new RegExp([\n  'agenzia per il lavoro', 'ricerca e selezion', 'selezione del personale', 'autorizzazione ministeriale', 'albo informatico',\n  'somministrazione (di )?lavoro', 'contratto di somministrazione', 'career center',\n  // «ricerca per importante azienda», «seleziona per conto di una società», «per azienda specializzata»\n  '(ricerca|ricerchiamo|seleziona|selezioniamo|cerca|cerchiamo) per (conto di )?(un |una |l )?((importante|nota|notevole|primaria|solida|storica|affermata|prestigiosa|dinamica|strutturata) )*(azienda|societa|realta|gruppo|ente|struttura|multinazionale|cliente)\\\\b',\n  // «per importante cliente», «per un nostro cliente» (non «per il cliente»: lo scrive anche chi assume)\n  'per (un |una )?(nostro |nostra )?(importante|nota|notevole|primario|primaria) client',\n  // «per nostra importante azienda cliente», «gruppo ceramico cliente»\n  // (non «azienda attenta al cliente»: in mezzo niente preposizioni o articoli)\n  '(azienda|gruppo|realta|societa)( (?!(al|ai|del|dei|della|verso|con|il|la|le|i|di|e|per|nel|nei|sul|a)\\\\b)[a-z]+){0,3} cliente\\\\b',\n  'per conto (di|del) (un |una |nostro |nostra )?client', 'nostro cliente', 'for (one of )?our client', 'our client',\n  'pour (le compte d un|notre) client', 'para (una )?empresa cliente', 'fur unseren kunden', 'im auftrag unseres kunden', 'para (o nosso|um) cliente'\n].join('|'));\nconst ANONIMA = /^ (azienda|societa|riservato|riservata|confidenziale|anonimo|anonima|cliente|privato|privata|n d|nd|na|company|confidential) /;\n\nconst richieste = $('Prepara richieste').all().map(i => i.json);\nconst stats = { requests: richieste.length, errors: 0, results: 0, off_topic: 0, agencies: 0, anonymous: 0, duplicates: 0, kept: 0 };\nconst visti = new Set();\nconst ads = [];\n\n$input.all().forEach((item, i) => {\n  const r = item.json || {};\n  if (!Array.isArray(r.results)) { stats.errors++; return; }\n  const richiesta = richieste[item.pairedItem?.item ?? i] || {};\n  for (const a of r.results) {\n    stats.results++;\n    const id = String(a.id ?? '');\n    const titolo = testo(a.title).slice(0, 200);\n    const azienda = testo(a.company?.display_name).slice(0, 200);\n    const descrizione = testo(a.description);\n    if (!id || visti.has(id)) { stats.duplicates++; continue; }\n    visti.add(id);\n\n    const famiglia = famigliaDi(titolo);\n    if (!famiglia) { stats.off_topic++; continue; }\n    if (!azienda || ANONIMA.test(norm(azienda))) { stats.anonymous++; continue; }\n    if (AGENZIE.test(norm(azienda)) || PER_CLIENTE.test(norm(`${titolo} ${descrizione}`))) { stats.agencies++; continue; }\n\n    const area = Array.isArray(a.location?.area) ? a.location.area.map(String) : [];\n    ads.push({\n      external_id: id,\n      family: famiglia,\n      title: titolo,\n      company_name: azienda,\n      country: 'IT',\n      region: area[1] || richiesta.region || '',\n      city: area.length > 2 ? area[area.length - 1] : '',\n      posted_at: String(a.created ?? ''),\n      url: String(a.redirect_url ?? '').replace(/^http:\\/\\//, 'https://'),\n      description: descrizione.slice(0, 600),\n      contract: [a.contract_type, a.contract_time].filter(Boolean).join(' ').slice(0, 40)\n    });\n  }\n});\nstats.kept = ads.length;\n\nreturn [{ json: { source: 'adzuna', ads, stats } }];\n" }
  },
  output: [{ source: 'adzuna', ads: [], stats: {} }]
});

const salva = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Salva nel database',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: 'https://leads.weborastudio.it/api/engine/job-ads',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ source: $json.source, ads: $json.ads }) }}'),
      options: { timeout: 60000 }
    },
    credentials: { httpHeaderAuth: { id: 'kaAuSs06rml1sMA9', name: 'Lead Engine - Callback verso backend' } }
  },
  output: [{ ok: true, received: 0, saved: 0, new: 0, linked: 0, deleted: 0 }]
});

export default workflow('annunci-adzuna', 'Annunci | Raccolta Adzuna', {
  timezone: 'Europe/Rome',
  errorWorkflow: 'LOw3fRo49WKvrF6z',
  executionOrder: 'v1'
})
  .add(ogniGiorno)
  .to(preparaRichieste)
  .to(adzuna)
  .to(normalizza)
  .to(salva)
  .add(aMano)
  .to(preparaRichieste);
