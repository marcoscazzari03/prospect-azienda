// Genera workflow.sdk.ts (n8n Workflow SDK) del workflow «Annunci | Raccolta Adzuna».
// I Code node vivono in nodes/*.js (testati da test/run.mjs); le figure da cercare
// vengono dal catalogo del sito (src/lib/domain/signals.ts, JOB_FAMILIES): una sola
// fonte di verità per motore, sito e raccolta annunci.
// Uso: node n8n/annunci/build.mjs  ->  n8n/annunci/workflow.sdk.ts
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(dir, 'workflow.sdk.ts'), sdk);
  console.log('workflow.sdk.ts generato');
}
