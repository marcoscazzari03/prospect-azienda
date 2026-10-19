// Genera workflow.sdk.ts (n8n Workflow SDK) del workflow «Annunci | Raccolta Adzuna».
// I Code node vivono in nodes/*.js (testati da test/run.mjs); le figure da cercare
// vengono dal catalogo del sito (src/lib/domain/signals.ts, JOB_FAMILIES): una sola
// fonte di verità per motore, sito e raccolta annunci.
// Uso: node n8n/annunci/build.mjs  ->  n8n/annunci/workflow.sdk.ts, siti.sdk.ts, settore.sdk.ts, controllo.sdk.ts e popolamento.sdk.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '..', '..');
const { createJiti } = createRequire(import.meta.url)('jiti');
const { JOB_FAMILIES } = await createJiti(join(root, 'build.js')).import('./src/lib/domain/signals.ts');

// Annunci in Italia: titoli in italiano e inglese.
export const famiglie = JOB_FAMILIES.map(f => ({ code: f.code, titles: [...new Set([...f.titles.it, ...f.titles.en])] }));
// Controlli sul sito: gli stessi del motore (n8n/engine/nodes/lib-controlli-sito.js).
const controlliSito = readFileSync(join(root, 'n8n', 'engine', 'nodes', 'lib-controlli-sito.js'), 'utf8');
const rilasciCms = JSON.stringify(JSON.parse(readFileSync(join(root, 'src', 'lib', 'domain', 'cms-releases.json'), 'utf8')));
// Province (sigla, nome, regione), per il popolamento da OpenStreetMap.
const province = JSON.stringify(JSON.parse(readFileSync(join(dir, 'province.json'), 'utf8')));
export const codice = (f, subs = {}) => Object.entries({ __FAMIGLIE__: JSON.stringify(famiglie), __CMS_RELEASES__: rilasciCms, __PROVINCE__: province, ...subs })
  .reduce((s, [k, v]) => s.split(k).join(v), readFileSync(join(dir, 'nodes', f), 'utf8').split('__CONTROLLI_SITO__').join(controlliSito));
// Verifica dei siti: livello 2 (domini indovinati) e livello 3 (ricerca web).
export const scegliSito = (livello) => codice('04-scegli-sito.js', livello === 2
  ? { __METODO__: 'guess', __CANDIDATI__: 'Domini candidati', __ELENCO__: "($('Aziende senza sito').first().json.companies || [])" }
  : { __METODO__: 'web', __CANDIDATI__: 'Esito ricerca web', __ELENCO__: "$('Esito ricerca web').all().map(i => i.json)" });

const ADZUNA = "{ id: '9uw7ry3Mp3ULA4fe', name: 'Adzuna API' }";
const CALLBACK = "{ id: 'kaAuSs06rml1sMA9', name: 'Lead Engine - Callback verso backend' }";
const ERRORI = 'LOw3fRo49WKvrF6z';
const ANTHROPIC = "{ id: 'LyaIAvxLwaL5YMIO', name: 'Webora Leads - Anthropic' }";

const sdk = `import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// GENERATO da n8n/annunci/build.mjs: non modificare a mano.
// Ogni 2 giorni, al mattino, scarica da Adzuna gli annunci delle figure del catalogo, scarta agenzie
// e titoli fuori tema e li salva nel database (POST /api/engine/job-ads -> job_ads).

const ogniGiorno = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Ogni mattina',
    parameters: { rule: { interval: [{ field: 'days', daysInterval: 2, triggerAtHour: 6, triggerAtMinute: 10 }] } }
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
    parameters: { jsCode: ${JSON.stringify(codice('01-prepara-richieste.js'))} }
  },
  output: [{ term: 'sistemista', region: '', max_days_old: 3 }]
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
        { name: 'title_only', value: expr('{{ $json.term }}') },
        { name: 'location0', value: 'Italia' },
        { name: 'max_days_old', value: expr('{{ $json.max_days_old }}') },
        { name: 'sort_by', value: 'date' },
        { name: 'content-type', value: 'application/json' }
      ] },
      options: {
        // API Adzuna: massimo 25 chiamate al minuto -> una ogni 2,5 secondi (24 al minuto).
        batching: { batch: { batchSize: 1, batchInterval: 2500 } },
        // Pagina successiva finché la pagina è piena (50), al massimo 5 pagine.
        // $pageCount vale 0 già alla prima richiesta: la prima è la pagina 1.
        pagination: { pagination: {
          paginationMode: 'responseContainsNextURL',
          nextURL: expr("{{ 'https://api.adzuna.com/v1/api/jobs/it/search/' + ($pageCount + 1) }}"),
          paginationCompleteWhen: 'other',
          completeExpression: expr('{{ !Array.isArray($response.body.results) || $response.body.results.length < 50 }}'),
          limitPagesFetched: true,
          maxRequests: 5,
          requestInterval: 2500
        } },
        response: { response: { neverError: true } },
        timeout: 30000
      }
    },
    credentials: { httpCustomAuth: ${ADZUNA} },
    onError: 'continueRegularOutput'
  },
  output: [{ count: 1, results: [] }]
});

const normalizza = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalizza annunci',
    parameters: { jsCode: ${JSON.stringify(codice('02-normalizza-annunci.js'))} }
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
    credentials: { httpHeaderAuth: ${CALLBACK} }
  },
  output: [{ ok: true, received: 0, saved: 0, new: 0, linked: 0, deleted: 0 }]
});

export default workflow('annunci-adzuna', 'Annunci | Raccolta Adzuna', {
  timezone: 'Europe/Rome',
  errorWorkflow: '${ERRORI}',
  executionOrder: 'v1'
})
  .add(ogniGiorno)
  .to(preparaRichieste)
  .to(adzuna)
  .to(normalizza)
  .to(salva)
  .add(aMano)
  .to(preparaRichieste);
`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const siti = `import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// GENERATO da n8n/annunci/build.mjs: non modificare a mano.
// Ogni mattina, dopo la raccolta annunci, cerca il sito delle aziende degli annunci che
// non l'hanno ancora: prova i domini più probabili dal nome e accetta solo le pagine che
// contengono il nome dell'azienda (livello 2, gratuito). Esiti in company_resolutions,
// aziende trovate in companies con gli annunci collegati.

const ogniGiorno = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Ogni mattina',
    // Ogni 4 ore, 120 aziende per giro: con 300 aziende (circa 1.200 pagine in memoria)
    // l'esecuzione n8n si interrompeva; più spesso no per il tetto di esecuzioni al mese.
    parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 4, triggerAtMinute: 40 }] } }
  }
});

const aMano = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'A mano' }
});

const aziende = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Aziende senza sito',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      url: 'https://leads.weborastudio.it/api/engine/job-ads/companies?limit=120',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      options: { timeout: 30000 }
    },
    credentials: { httpHeaderAuth: ${CALLBACK} }
  },
  output: [{ companies: [{ company_key: 'var', company_name: 'Var Group', city: 'Bologna', ads: 2 }] }]
});

const candidati = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Domini candidati',
    parameters: { jsCode: ${JSON.stringify(codice('03-domini-candidati.js'))} }
  },
  output: [{ company_key: 'var', company_name: 'Var Group', city: 'Bologna', nucleo: 'var', nome: 'var group', domain: 'vargroup.it', ordine: 2, url: 'https://vargroup.it' }]
});

const apriSito = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Apri sito',
    parameters: {
      url: expr('{{ $json.url }}'),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: '${UA}' },
        { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        { name: 'Accept-Language', value: 'it,en;q=0.8' }
      ] },
      options: {
        // Poche richieste insieme: n8n non aspetta la fine di un gruppo prima del successivo,
        // con gruppi grandi centinaia di richieste partono insieme e vanno in timeout.
        batching: { batch: { batchSize: 2, batchInterval: 500 } },
        redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } },
        // Si legge solo la pagina pubblica: molti siti hanno il certificato solo su www.
        allowUnauthorizedCerts: true,
        timeout: 8000
      }
    },
    // Un dominio inesistente o lento non deve fermare il giro.
    onError: 'continueRegularOutput'
  },
  output: [{ html: '<html></html>' }]
});

const scegli = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Scegli sito',
    parameters: { jsCode: ${JSON.stringify(scegliSito(2))} }
  },
  output: [{ results: [], stats: {} }]
});

// Livello 3: ricerca web del sito con Claude Haiku per le aziende non trovate (max 40 al giorno).
const preparaWeb = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepara ricerca web',
    parameters: { jsCode: ${JSON.stringify(codice('05-prepara-ricerca-web.js'))} }
  },
  output: [{ company_key: 'var', company_name: 'Var Group', city: 'Bologna', _claude: {} }]
});

const claudeSito = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'HTTP - Claude sito',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'anthropicApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($json._claude) }}'),
      options: {
        batching: { batch: { batchSize: 3, batchInterval: 1000 } },
        response: { response: { neverError: true } },
        timeout: 120000
      }
    },
    credentials: { anthropicApi: ${ANTHROPIC} }
  },
  output: [{ content: [], usage: {} }]
});

const esitoWeb = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Esito ricerca web',
    parameters: { jsCode: ${JSON.stringify(codice('06-esito-ricerca-web.js'))} }
  },
  output: [{ company_key: 'var', company_name: 'Var Group', city: 'Bologna', nucleo: 'var', nome: 'var group', domain: 'vargroup.it', ordine: 0, url: 'https://vargroup.it' }]
});

const apriSitoWeb = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Apri sito trovato',
    parameters: {
      url: expr('{{ $json.url }}'),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: '${UA}' },
        { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        { name: 'Accept-Language', value: 'it,en;q=0.8' }
      ] },
      options: {
        batching: { batch: { batchSize: 2, batchInterval: 500 } },
        redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } },
        allowUnauthorizedCerts: true,
        timeout: 8000
      }
    },
    onError: 'continueRegularOutput'
  },
  output: [{ html: '<html></html>' }]
});

const verificaWeb = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Verifica sito trovato',
    parameters: { jsCode: ${JSON.stringify(scegliSito(3))} }
  },
  output: [{ results: [], stats: {} }]
});

const salvaWeb = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Salva siti trovati sul web',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: 'https://leads.weborastudio.it/api/engine/job-ads/companies',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ results: $json.results }) }}'),
      options: { timeout: 60000 }
    },
    credentials: { httpHeaderAuth: ${CALLBACK} }
  },
  output: [{ ok: true, found: 0, not_found: 0, linked_ads: 0 }]
});

const salva = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Salva siti',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: 'https://leads.weborastudio.it/api/engine/job-ads/companies',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ results: $json.results }) }}'),
      options: { timeout: 60000 }
    },
    credentials: { httpHeaderAuth: ${CALLBACK} }
  },
  output: [{ ok: true, found: 0, not_found: 0, linked_ads: 0 }]
});

export default workflow('annunci-siti', 'Annunci | Siti aziende', {
  timezone: 'Europe/Rome',
  errorWorkflow: '${ERRORI}',
  executionOrder: 'v1'
})
  .add(ogniGiorno)
  .to(aziende)
  .to(candidati)
  .to(apriSito)
  .to(scegli)
  .to(salva)
  .add(scegli)
  .to(preparaWeb)
  .to(claudeSito)
  .to(esitoWeb)
  .to(apriSitoWeb)
  .to(verificaWeb)
  .to(salvaWeb)
  .add(aMano)
  .to(aziende);
`;

const settore = `import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// GENERATO da n8n/annunci/build.mjs: non modificare a mano.
// Settore delle aziende degli annunci: legge la homepage delle aziende ancora senza
// settore e la fa classificare a Claude Haiku (settore e parole chiave in italiano), così
// escono anche nelle ricerche con un settore. Esiti in companies (industry, tags).

const ogniQuattroOre = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Ogni 4 ore',
    // Ogni 4 ore con 120 aziende: il piano n8n ha un tetto di esecuzioni al mese (oltre, rischio memoria).
    parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 4, triggerAtMinute: 10 }] } }
  }
});

const aMano = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'A mano' }
});

const aziende = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Aziende senza settore',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      url: 'https://leads.weborastudio.it/api/engine/job-ads/industries?limit=120',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      options: { timeout: 30000 }
    },
    credentials: { httpHeaderAuth: ${CALLBACK} }
  },
  output: [{ companies: [{ company_id: '00000000-0000-4000-8000-000000000000', company_name: 'Var Group', website: 'https://vargroup.it', city: 'Bologna', ads: 2 }] }]
});

const daLeggere = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Homepage da leggere',
    // Solo siti http(s) senza credenziali, porte o barre rovesciate (ripasso di sicurezza del 19/10).
    parameters: { jsCode: "const ok = (w) => /^https?:[/][/]/i.test(w) && !w.includes('@') && !w.includes(String.fromCharCode(92)) && !/^https?:[/][/][^/]*:/i.test(w); return ($input.first().json.companies || []).filter(c => ok(String(c.website || ''))).map(c => ({ json: { company_id: c.company_id, company_name: c.company_name, url: c.website } }));" }
  },
  output: [{ company_id: '00000000-0000-4000-8000-000000000000', company_name: 'Var Group', url: 'https://vargroup.it' }]
});

const apri = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Apri homepage',
    parameters: {
      url: expr('{{ $json.url }}'),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: '${UA}' },
        { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        { name: 'Accept-Language', value: 'it,en;q=0.8' }
      ] },
      options: {
        batching: { batch: { batchSize: 2, batchInterval: 500 } },
        redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } },
        allowUnauthorizedCerts: true,
        timeout: 10000
      }
    },
    onError: 'continueRegularOutput'
  },
  output: [{ html: '<html></html>' }]
});

const prepara = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepara settore',
    parameters: { jsCode: ${JSON.stringify(codice('07-prepara-settore.js'))} }
  },
  output: [{ aziende: [], senza_testo: [], _claude: {} }]
});

const claude = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'HTTP - Claude settore',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'anthropicApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($json._claude) }}'),
      options: {
        batching: { batch: { batchSize: 1, batchInterval: 1000 } },
        response: { response: { neverError: true } },
        timeout: 120000
      }
    },
    credentials: { anthropicApi: ${ANTHROPIC} }
  },
  output: [{ content: [], usage: {} }]
});

const esito = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Esito settore',
    parameters: { jsCode: ${JSON.stringify(codice('08-esito-settore.js'))} }
  },
  output: [{ results: [], stats: {} }]
});

const salva = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Salva settori',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: 'https://leads.weborastudio.it/api/engine/job-ads/industries',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ results: $json.results }) }}'),
      options: { timeout: 60000 }
    },
    credentials: { httpHeaderAuth: ${CALLBACK} }
  },
  output: [{ ok: true, classified: 0, unknown: 0 }]
});

export default workflow('annunci-settore', 'Annunci | Settore aziende', {
  timezone: 'Europe/Rome',
  errorWorkflow: '${ERRORI}',
  executionOrder: 'v1'
})
  .add(ogniQuattroOre)
  .to(aziende)
  .to(daLeggere)
  .to(apri)
  .to(prepara)
  .to(claude)
  .to(esito)
  .to(salva)
  .add(aMano)
  .to(aziende);
`;

const controllo = `import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// GENERATO da n8n/annunci/build.mjs: non modificare a mano.
// Controllo dei siti del database (gratis, solo richieste HTTP): ogni 2 ore 150 aziende mai
// controllate o controllate da più di 25 giorni, con le stesse regole del motore. Le prove
// (HTTPS, CMS vecchio, mobile, lingue, copyright...) servono alle ricerche opportunità
// senza ricerca AI e restano fresche (valgono 30 giorni).

// Ogni ora (dal 17/10): con le province grandi OSM porta 2.000-3.000 aziende a notte e ogni 2
// ore (1.800 al giorno) non bastava. Finito il popolamento si può tornare a ogni 2 ore (tetto
// di esecuzioni del piano n8n).
const ogniDueOre = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Ogni ora',
    parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1, triggerAtMinute: 25 }] } }
  }
});

const aMano = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'A mano' }
});

const aziende = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Aziende da controllare',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      url: 'https://leads.weborastudio.it/api/engine/site-checks?limit=150',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      options: { timeout: 30000 }
    },
    credentials: { httpHeaderAuth: ${CALLBACK} }
  },
  output: [{ companies: [{ company_id: '00000000-0000-4000-8000-000000000000', domain: 'vargroup.it', name: 'Var Group', website: 'https://vargroup.it' }] }]
});

const daControllare = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Siti da controllare',
    parameters: { jsCode: "return ($input.first().json.companies || []).map(c => ({ json: c }));" }
  },
  output: [{ company_id: '00000000-0000-4000-8000-000000000000', domain: 'vargroup.it', name: 'Var Group', website: 'https://vargroup.it' }]
});

const https = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Controllo HTTPS',
    parameters: {
      // HEAD: serve solo sapere se la connessione HTTPS riesce, non la pagina (con il GET
      // ogni sito veniva scaricato due volte e il giro andava in crash per memoria).
      method: 'HEAD',
      url: expr("{{ 'https://' + $json.domain + '/' }}"),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: '${UA}' },
        { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        { name: 'Accept-Language', value: 'it,en;q=0.8' }
      ] },
      options: {
        batching: { batch: { batchSize: 2, batchInterval: 500 } },
        redirect: { redirect: { followRedirects: true, maxRedirects: 3 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'https_body' } },
        timeout: 8000
      }
    },
    // L'errore (certificato scaduto, HTTPS assente) è proprio l'esito da registrare.
    onError: 'continueRegularOutput'
  },
  output: [{ https_body: '<html></html>' }]
});

const apri = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Apri sito',
    parameters: {
      // Dal dominio validato, non dal sito salvato (ripasso di sicurezza del 19/10).
      url: expr("https://{{ $('Siti da controllare').item.json.domain }}"),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: '${UA}' },
        { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        { name: 'Accept-Language', value: 'it,en;q=0.8' }
      ] },
      options: {
        batching: { batch: { batchSize: 2, batchInterval: 500 } },
        redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } },
        allowUnauthorizedCerts: true,
        timeout: 10000
      }
    },
    onError: 'continueRegularOutput'
  },
  output: [{ html: '<html></html>' }]
});

const valuta = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Valuta siti',
    parameters: { jsCode: ${JSON.stringify(codice('09-valuta-siti.js'))} }
  },
  output: [{ items: [], stats: {} }]
});

const salva = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Salva controlli',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: 'https://leads.weborastudio.it/api/engine/site-checks',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ items: $json.items }) }}'),
      options: { timeout: 60000 }
    },
    credentials: { httpHeaderAuth: ${CALLBACK} }
  },
  output: [{ ok: true, saved: 0 }]
});

export default workflow('aziende-controllo-siti', 'Aziende | Controllo siti', {
  timezone: 'Europe/Rome',
  errorWorkflow: '${ERRORI}',
  executionOrder: 'v1'
})
  .add(ogniDueOre)
  .to(aziende)
  .to(daControllare)
  .to(https)
  .to(apri)
  .to(valuta)
  .to(salva)
  .add(aMano)
  .to(aziende);
`;

const popolamento = `import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// GENERATO da n8n/annunci/build.mjs: non modificare a mano.
// Popolamento del database aziende da OpenStreetMap (dati aperti, licenza ODbL): ogni notte
// 8 province a rotazione, prima il Nord (province.json), le attività con un sito web (uffici, artigiani, negozi, studi,
// hotel, industrie). Solo dati d'azienda, nessun dato personale. Poi «Aziende | Controllo
// siti» trova i segnali e «Annunci | Settore aziende» classifica chi non ha una categoria.

const ogniGiorno = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Ogni giorno',
    parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 4, triggerAtMinute: 20 }] } }
  }
});

const aMano = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'A mano' }
});

const prepara = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepara richieste OSM',
    parameters: { jsCode: ${JSON.stringify(codice('10-prepara-osm.js'))} }
  },
  output: [{ sigla: 'MO', provincia: 'Modena', regione: 'Emilia-Romagna', url: '', data: '' }]
});

const overpass = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Overpass',
    parameters: {
      method: 'POST',
      // Server scelto in «Prepara richieste OSM» (overpass-api.de è spesso sovraccarico).
      url: expr('{{ $json.url }}'),
      sendHeaders: true,
      headerParameters: { parameters: [
        // Overpass rifiuta (406) le richieste senza un User-Agent che identifichi il servizio.
        { name: 'User-Agent', value: 'WeboraLeads/1.0 (+https://leads.weborastudio.it)' },
        { name: 'Accept', value: 'application/json' }
      ] },
      sendBody: true,
      contentType: 'form-urlencoded',
      bodyParameters: { parameters: [{ name: 'data', value: expr('{{ $json.data }}') }] },
      options: {
        // Uso corretto del servizio pubblico: una richiesta alla volta, un minuto tra l'una e
        // l'altra (con 10 secondi il server era spesso «too busy»).
        batching: { batch: { batchSize: 1, batchInterval: 60000 } },
        response: { response: { neverError: true } },
        timeout: 280000
      }
    },
    // Il server è a volte sovraccarico: 2 tentativi (un timeout di 5 minuti al terzo
    // tentativo non passa quasi mai; le province fallite si riprovano il giorno dopo).
    retryOnFail: true,
    maxTries: 2,
    waitBetweenTries: 5000,
    onError: 'continueRegularOutput'
  },
  output: [{ elements: [] }]
});

const normalizza = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalizza OSM',
    parameters: { jsCode: ${JSON.stringify(codice('11-normalizza-osm.js'))} }
  },
  output: [{ source: 'osm', companies: [], stats: {} }]
});

const salva = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Salva aziende',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: 'https://leads.weborastudio.it/api/engine/companies-import',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ source: $json.source, companies: $json.companies }) }}'),
      options: { timeout: 120000 }
    },
    credentials: { httpHeaderAuth: ${CALLBACK} }
  },
  output: [{ ok: true, received: 0, new: 0, updated: 0, skipped: 0 }]
});

export default workflow('aziende-popolamento-osm', 'Aziende | Popolamento OSM', {
  timezone: 'Europe/Rome',
  errorWorkflow: '${ERRORI}',
  executionOrder: 'v1'
})
  .add(ogniGiorno)
  .to(prepara)
  .to(overpass)
  .to(normalizza)
  .to(salva)
  .add(aMano)
  .to(prepara);
`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(dir, 'workflow.sdk.ts'), sdk);
  writeFileSync(join(dir, 'siti.sdk.ts'), siti);
  writeFileSync(join(dir, 'settore.sdk.ts'), settore);
  writeFileSync(join(dir, 'controllo.sdk.ts'), controllo);
  writeFileSync(join(dir, 'popolamento.sdk.ts'), popolamento);
  console.log('workflow.sdk.ts, siti.sdk.ts, settore.sdk.ts, controllo.sdk.ts e popolamento.sdk.ts generati');
}
