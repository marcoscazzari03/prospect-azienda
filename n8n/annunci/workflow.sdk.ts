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
    parameters: { jsCode: "// Richieste ad Adzuna: una per famiglia di figure (catalogo JOB_FAMILIES) e regione,\n// ordinate dalla più recente. Ogni giorno bastano gli annunci degli ultimi 3 giorni\n// (2 pagine da 50); il primo riempimento, avviato a mano, va indietro di 30 giorni.\n// Limiti del piano Adzuna: 50 chiamate al minuto, 500 al giorno, 5.000 al mese.\nconst REGIONI = ['Emilia-Romagna'];\n\n// Parole cercate da Adzuna (basta una, nel titolo o nel testo): la scelta finale la fa\n// «Normalizza annunci» confrontando il titolo con le figure del catalogo.\nconst PAROLE = {\n  it_systems: 'sistemista sysadmin helpdesk informatico',\n  software_dev: 'programmatore sviluppatore developer frontend backend fullstack',\n  cybersecurity: 'cybersecurity security sicurezza',\n  digital_marketing: 'marketing seo social',\n  sales: 'commerciale venditore sales account',\n  hr: 'hr recruiter risorse paghe payroll',\n  accounting: 'contabile amministrativo amministrativa controller contabilita',\n  design: 'grafico grafica designer'\n};\n\nconst manuale = $execution.mode === 'manual';\nconst giorni = manuale ? 30 : 3;\nconst pagine = manuale ? 4 : 2;\n\nconst out = [];\nfor (const regione of REGIONI) {\n  for (const [famiglia, parole] of Object.entries(PAROLE)) {\n    for (let pagina = 1; pagina <= pagine; pagina++) {\n      out.push({ json: { family: famiglia, region: regione, page: pagina, what_or: parole, max_days_old: giorni } });\n    }\n  }\n}\nreturn out;\n" }
  },
  output: [{ family: 'it_systems', region: 'Emilia-Romagna', page: 1, what_or: 'sistemista', max_days_old: 3 }]
});

const adzuna = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Adzuna - Annunci',
    parameters: {
      url: expr('https://api.adzuna.com/v1/api/jobs/it/search/{{ $json.page }}'),
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
    parameters: { jsCode: "// Dalle risposte di Adzuna agli annunci da salvare (tabella job_ads).\n// Tiene solo gli annunci con un titolo del catalogo (stesse regole della verifica\n// annuncio del motore, n8n/engine/nodes/09-verifica-annuncio.js), con un'azienda\n// riconoscibile e non pubblicati da agenzie per il lavoro: chi assume deve essere\n// l'azienda stessa, altrimenti non sappiamo a chi proporre il servizio.\nconst FAMIGLIE = [{\"code\":\"it_systems\",\"titles\":[\"sistemista\",\"tecnico informatico\",\"tecnico it\",\"amministratore di sistema\",\"amministratore di rete\",\"help desk\",\"supporto it\",\"system administrator\",\"sysadmin\",\"systems engineer\",\"network administrator\",\"network engineer\",\"it technician\",\"it support\"]},{\"code\":\"software_dev\",\"titles\":[\"programmatore\",\"sviluppatore\",\"developer\",\"software engineer\",\"full stack\",\"frontend\",\"backend\",\"software developer\",\"programmer\",\"web developer\"]},{\"code\":\"cybersecurity\",\"titles\":[\"cyber security\",\"cybersecurity\",\"sicurezza informatica\",\"security analyst\",\"security engineer\",\"information security\",\"soc analyst\"]},{\"code\":\"digital_marketing\",\"titles\":[\"digital marketing\",\"marketing specialist\",\"social media manager\",\"seo specialist\",\"marketing manager\",\"web marketing\",\"growth marketer\"]},{\"code\":\"sales\",\"titles\":[\"commerciale\",\"agente di commercio\",\"sales manager\",\"account manager\",\"venditore\",\"business developer\",\"sales representative\",\"account executive\"]},{\"code\":\"hr\",\"titles\":[\"risorse umane\",\"hr specialist\",\"hr manager\",\"recruiter\",\"selezione del personale\",\"addetto paghe\",\"human resources\",\"talent acquisition\",\"payroll\"]},{\"code\":\"accounting\",\"titles\":[\"contabile\",\"impiegato amministrativo\",\"addetto contabilita\",\"controller\",\"responsabile amministrativo\",\"accountant\",\"bookkeeper\",\"finance assistant\",\"accounts payable\"]},{\"code\":\"design\",\"titles\":[\"grafico\",\"web designer\",\"graphic designer\",\"ui designer\",\"ux designer\",\"visual designer\"]}];\n\nconst norm = (v) => ` ${String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()\n  .replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\\s+/g, ' ').trim()} `;\nconst testo = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')\n  .replace(/\\s+/g, ' ').trim();\n\n// Titolo -> famiglia: vince il titolo del catalogo più lungo contenuto nel titolo\n// (es. «business developer» è commerciale, non programmatore).\nconst titoli = FAMIGLIE.flatMap(f => f.titles.map(t => ({ fam: f.code, t: norm(t) })))\n  .sort((a, b) => b.t.length - a.t.length);\nconst famigliaDi = (titolo) => { const n = norm(titolo); return titoli.find(x => n.includes(x.t))?.fam || ''; };\n\nconst AGENZIE = /\\b(randstad|adecco|manpower|gi group|synergie|openjobmetis|etjca|umana|lavoropiu|orienta|kelly services|hays|michael page|page personnel|robert half|spring professional|start people|quanta|eurointerim|ali spa|osm partners|indeed|jobrapido|infojobs|monster|stepstone|e work|trenkwalder|humangest|tempor|maw|jobtech|in job|generazione vincente|articolo1|cooperjob|men at work|lavoro doc|staffing|recruiting|head ?hunt\\w*|executive search|agenzia per il lavoro|selezione del personale)\\b/;\nconst PER_CLIENTE = /(per (importante |nota |una )?(azienda|societa) cliente|per conto (di|del) (un |una |nostro |nostra )?client|nostro cliente|nostra azienda cliente|for (one of )?our client|pour (le compte d un|notre) client|para (una )?empresa cliente|fur unseren kunden|im auftrag unseres kunden|para (o nosso|um) cliente)/;\nconst ANONIMA = /^ (azienda|societa|riservato|riservata|confidenziale|anonimo|anonima|cliente|privato|privata|n d|nd|na|company|confidential) /;\n\nconst richieste = $('Prepara richieste').all().map(i => i.json);\nconst stats = { requests: richieste.length, errors: 0, results: 0, off_topic: 0, agencies: 0, anonymous: 0, duplicates: 0, kept: 0 };\nconst visti = new Set();\nconst ads = [];\n\n$input.all().forEach((item, i) => {\n  const r = item.json || {};\n  if (!Array.isArray(r.results)) { stats.errors++; return; }\n  const richiesta = richieste[item.pairedItem?.item ?? i] || {};\n  for (const a of r.results) {\n    stats.results++;\n    const id = String(a.id ?? '');\n    const titolo = testo(a.title).slice(0, 200);\n    const azienda = testo(a.company?.display_name).slice(0, 200);\n    const descrizione = testo(a.description);\n    if (!id || visti.has(id)) { stats.duplicates++; continue; }\n    visti.add(id);\n\n    const famiglia = famigliaDi(titolo);\n    if (!famiglia) { stats.off_topic++; continue; }\n    if (!azienda || ANONIMA.test(norm(azienda))) { stats.anonymous++; continue; }\n    if (AGENZIE.test(norm(azienda)) || PER_CLIENTE.test(norm(`${titolo} ${descrizione}`))) { stats.agencies++; continue; }\n\n    const area = Array.isArray(a.location?.area) ? a.location.area.map(String) : [];\n    ads.push({\n      external_id: id,\n      family: famiglia,\n      title: titolo,\n      company_name: azienda,\n      country: 'IT',\n      region: area[1] || richiesta.region || '',\n      city: area.length > 2 ? area[area.length - 1] : '',\n      posted_at: String(a.created ?? ''),\n      url: String(a.redirect_url ?? '').replace(/^http:\\/\\//, 'https://'),\n      description: descrizione.slice(0, 600),\n      contract: [a.contract_type, a.contract_time].filter(Boolean).join(' ').slice(0, 40)\n    });\n  }\n});\nstats.kept = ads.length;\n\nreturn [{ json: { source: 'adzuna', ads, stats } }];\n" }
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
