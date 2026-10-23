import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// Workflow di errore del motore: quando un'esecuzione di «Lead Engine | Search (v1)»
// si interrompe, avvisa il backend che chiude subito la ricerca e restituisce i crediti.
// Impostato come errorWorkflow nelle impostazioni del motore.

const erroreMotore = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Errore nel motore' },
  output: [{ execution: { id: '123', error: { message: 'errore' }, lastNodeExecuted: 'HTTP - Claude ricerca' }, workflow: { id: 'x', name: 'Lead Engine | Search (v1)' } }]
});

const avvisaBackend = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Avvisa il backend',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: 'https://avvisto.it/api/engine/error',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ execution_id: String($json.execution?.id ?? ''), error: String($json.execution?.error?.message ?? '').slice(0, 480), node: String($json.execution?.lastNodeExecuted ?? '').slice(0, 120) }) }}"),
      options: { timeout: 30000 }
    },
    credentials: { httpHeaderAuth: { id: 'kaAuSs06rml1sMA9', name: 'Lead Engine - Callback verso backend' } }
  },
  output: [{ ok: true, closed: true }]
});

export default workflow('lead-engine-errors', 'Lead Engine | Errori')
  .add(erroreMotore)
  .to(avvisaBackend);
