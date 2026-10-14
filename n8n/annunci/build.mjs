// Genera workflow.sdk.ts (n8n Workflow SDK) del workflow «Annunci | Raccolta Adzuna».
// I Code node vivono in nodes/*.js (testati da test/run.mjs); le figure da cercare
// vengono dal catalogo del sito (src/lib/domain/signals.ts, JOB_FAMILIES): una sola
// fonte di verità per motore, sito e raccolta annunci.
// Uso: node n8n/annunci/build.mjs  ->  n8n/annunci/workflow.sdk.ts e siti.sdk.ts
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
export const codice = (f) => readFileSync(join(dir, 'nodes', f), 'utf8').split('__FAMIGLIE__').join(JSON.stringify(famiglie));

const ADZUNA = "{ id: '9uw7ry3Mp3ULA4fe', name: 'Adzuna API' }";
const CALLBACK = "{ id: 'kaAuSs06rml1sMA9', name: 'Lead Engine - Callback verso backend' }";
const ERRORI = 'LOw3fRo49WKvrF6z';

const sdk = `import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

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
    parameters: { jsCode: ${JSON.stringify(codice('01-prepara-richieste.js'))} }
  },
  output: [{ term: 'sistemista', region: 'Emilia-Romagna', max_days_old: 2 }]
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
        { name: 'location1', value: expr('{{ $json.region }}') },
        { name: 'max_days_old', value: expr('{{ $json.max_days_old }}') },
        { name: 'sort_by', value: 'date' },
        { name: 'content-type', value: 'application/json' }
      ] },
      options: {
        // Piano Adzuna: massimo 50 chiamate al minuto.
        batching: { batch: { batchSize: 1, batchInterval: 1500 } },
        // Pagina successiva finché la pagina è piena (50), al massimo 5 pagine.
        // $pageCount vale 0 già alla prima richiesta: la prima è la pagina 1.
        pagination: { pagination: {
          paginationMode: 'responseContainsNextURL',
          nextURL: expr("{{ 'https://api.adzuna.com/v1/api/jobs/it/search/' + ($pageCount + 1) }}"),
          paginationCompleteWhen: 'other',
          completeExpression: expr('{{ !Array.isArray($response.body.results) || $response.body.results.length < 50 }}'),
          limitPagesFetched: true,
          maxRequests: 5,
          requestInterval: 1500
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
    parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 6, triggerAtMinute: 40 }] } }
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
      url: 'https://leads.weborastudio.it/api/engine/job-ads/companies?limit=150',
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
    parameters: { jsCode: ${JSON.stringify(codice('04-scegli-sito.js'))} }
  },
  output: [{ results: [], stats: {} }]
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
  .add(aMano)
  .to(aziende);
`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(dir, 'workflow.sdk.ts'), sdk);
  writeFileSync(join(dir, 'siti.sdk.ts'), siti);
  console.log('workflow.sdk.ts e siti.sdk.ts generati');
}
