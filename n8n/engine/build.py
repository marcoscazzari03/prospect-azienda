#!/usr/bin/env python3
"""Genera workflow.sdk.ts (n8n Workflow SDK) dai sorgenti dei Code node.

I Code node vivono in nodes/*.js, sono testati da test/run.mjs e vengono
incorporati qui come stringhe JSON: una sola fonte di verità, niente copia e
incolla tra n8n e repository.

Uso: python3 n8n/engine/build.py   ->  n8n/engine/workflow.sdk.ts
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
NODES = ROOT / "nodes"

# Credenziali già presenti sull'istanza n8n (solo id e nome, nessun segreto).
OPENAI = "{ id: 'ZQVz3FqwCrCMFcB9', name: 'OpenAi account' }"
ROCKETREACH = "{ id: 'f7ay2fNfuGE4VrTP', name: 'RocketReach API' }"
# Credenziali nuove da creare in n8n (Header Auth con segreti casuali lunghi).
IN_AUTH = "newCredential('Lead Engine - Webhook in ingresso')"
CB_AUTH = "newCredential('Lead Engine - Callback verso backend')"
MODEL = "gpt-5.6-luna"


def js(name, **subs):
    s = (NODES / name).read_text(encoding="utf-8")
    for k, v in subs.items():
        s = s.replace(k, v)
    return json.dumps(s, ensure_ascii=True)


def estrai(fase, sorgente, fonte):
    s = (NODES / "05-estrai-email.template.js").read_text(encoding="utf-8")
    s = s.replace("__FASE__", fase).replace("__SORGENTE__", sorgente).replace("__FONTE__", fonte)
    if fase != "HOMEPAGE":
        # Le pagine successive non cercano altri link: basta la parte di estrazione.
        s = s.split("if (FASE !== 'HOMEPAGE') {")[0] + "if (basta) out.page_2 = '';\nreturn { json: out };\n"
    return json.dumps(s, ensure_ascii=True)


UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"


def http_page(var, name, url_expr):
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {{
    name: '{name}',
    parameters: {{
      url: expr({json.dumps(url_expr)}),
      sendHeaders: true,
      headerParameters: {{ parameters: [
        {{ name: 'User-Agent', value: '{UA}' }},
        {{ name: 'Accept-Language', value: 'it,en;q=0.9,es;q=0.8,fr;q=0.8,de;q=0.7,*;q=0.5' }}
      ] }},
      options: {{
        batching: {{ batch: {{ batchSize: 10, batchInterval: 200 }} }},
        response: {{ response: {{ neverError: true, responseFormat: 'text', outputPropertyName: 'html' }} }},
        timeout: 10000
      }}
    }}
  }},
  output: [{{ html: '<html></html>' }}]
}});
"""


def code(var, name, src, mode="runOnceForAllItems", output="{ ok: true }"):
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{ name: '{name}', parameters: {{ mode: '{mode}', jsCode: {src} }} }},
  output: [{output}]
}});
"""


def if_node(var, name, left, op_type, op, right=None):
    right_part = f", rightValue: {json.dumps(right)}" if right is not None else ""
    single = ", singleValue: true" if right is None else ""
    return f"""const {var} = ifElse({{
  version: 2.2,
  config: {{
    name: '{name}',
    parameters: {{
      conditions: {{
        options: {{ caseSensitive: true, leftValue: '', typeValidation: 'loose' }},
        conditions: [{{ leftValue: expr({json.dumps(left)}), operator: {{ type: '{op_type}', operation: '{op}'{single} }}{right_part} }}],
        combinator: 'and'
      }}
    }}
  }}
}});
"""


def callback(var, name, body_expr, execute_once=True, retry=False):
    extra = "retryOnFail: true, maxTries: 5, waitBetweenTries: 5000," if retry else "onError: 'continueRegularOutput',"
    once = "executeOnce: true," if execute_once else ""
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {{
    name: '{name}',
    {once}
    {extra}
    parameters: {{
      method: 'POST',
      url: expr("{{{{ $('Valida richiesta').first().json.callback_url }}}}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpTemplatedCustomAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr({json.dumps(body_expr)}),
      options: {{ timeout: 30000 }}
    }},
    credentials: {{ httpTemplatedCustomAuth: {CB_AUTH} }}
  }},
  output: [{{ ok: true }}]
}});
"""


def progress(stage, message_expr, counters_expr="{}"):
    return (
        "{{ JSON.stringify({ event: 'progress', contract_version: 1, "
        "job_id: $('Valida richiesta').first().json.job_id, "
        "run_id: $('Valida richiesta').first().json.run_id, "
        "run_token: $('Valida richiesta').first().json.run_token, "
        f"stage: '{stage}', message: {message_expr}, counters: {counters_expr} }}) }}}}"
    )


parts = []
add = parts.append

add("""import { workflow, node, trigger, sticky, newCredential, ifElse, merge, languageModel, expr } from '@n8n/workflow-sdk';
""")

add(f"""const webhook = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {{
    name: 'Webhook: nuova ricerca',
    parameters: {{
      httpMethod: 'POST',
      path: 'lead-engine/v1/search',
      authentication: 'headerAuth',
      responseMode: 'onReceived',
      options: {{ responseData: '{{"accepted":true}}' }}
    }},
    credentials: {{ httpHeaderAuth: {IN_AUTH} }}
  }},
  output: [{{ body: {{ job_id: '0b8e7c1e-1111-4222-8333-944455556666', run_id: 'r1', run_token: 'x', callback_url: 'https://app.example.it/api/engine/callback', email_mode: 'mixed', quantity: 25, target: {{ country_names: ['Italia'], industry: 'Software house', roles: ['CEO'] }}, exclusions: {{ domains: [], person_keys: [] }}, limits: {{ enrichment_cap: 10 }} }} }}]
}});
""")

add(code("valida", "Valida richiesta", js("01-valida-richiesta.js"),
         output="{ job_id: '0b8e7c1e-1111-4222-8333-944455556666', valida: true, errori: [], callback_url: 'https://app.example.it/api/engine/callback', planner_prompt: '...', lotti_previsti: 3 }"))
add(if_node("richiestaValida", "Richiesta valida?", "{{ $json.valida }}", "boolean", "true"))
add("""const rifiuta = node({
  type: 'n8n-nodes-base.stopAndError',
  version: 1,
  config: {
    name: 'Richiesta rifiutata',
    parameters: { errorMessage: expr('Richiesta non valida: {{ $json.errori.join(", ") }}') }
  }
});
""")

add(callback("notificaAvvio", "Notifica: ricerca avviata",
             progress("planning", "'Pianificazione della ricerca'", "{ lots_planned: $('Valida richiesta').first().json.lotti_previsti }")))

add(f"""const modelloPlanner = languageModel({{
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {{
    name: 'OpenAI (pianificazione)',
    parameters: {{ model: {{ __rl: true, mode: 'id', value: '{MODEL}' }}, options: {{ timeout: 120000 }} }},
    credentials: {{ openAiApi: {OPENAI} }}
  }}
}});
""")
add("""const planner = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Pianifica lotti AI',
    parameters: {
      promptType: 'define',
      text: expr("{{ $('Valida richiesta').first().json.planner_prompt }}"),
      options: { systemMessage: 'Sei un analista di lead generation B2B. Rispondi solo con JSON valido.', maxIterations: 3 }
    },
    subnodes: { model: modelloPlanner }
  },
  output: [{ output: '{"lotti":[{"paese":"Italia","focus":"Software house a Milano","query":["software house Milano"]}]}' }]
});
""")
add(code("prepara", "Prepara lotti", js("02-prepara-lotti.js"),
         output="{ job_id: 'x', lotto: 1, paese: 'Italia', focus: 'Software house a Milano', prompt: '...' }"))

add(f"""const modelloRicerca = languageModel({{
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {{
    name: 'OpenAI + Web Search',
    parameters: {{
      model: {{ __rl: true, mode: 'id', value: '{MODEL}' }},
      responsesApiEnabled: true,
      builtInTools: {{ webSearch: {{ searchContextSize: 'low' }} }},
      options: {{ timeout: 240000 }}
    }},
    credentials: {{ openAiApi: {OPENAI} }}
  }}
}});
""")
add("""const ricerca = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Ricerca prospect AI',
    onError: 'continueRegularOutput',
    parameters: {
      promptType: 'define',
      text: expr('{{ $json.prompt }}'),
      options: {
        systemMessage: 'Sei un ricercatore di prospect B2B. Usi la ricerca web, citi sempre la fonte e non inventi mai dati. Rispondi solo con JSON valido.',
        maxIterations: 8,
        batching: { batchSize: 3, delayBetweenBatches: 1000 }
      }
    },
    subnodes: { model: modelloRicerca }
  },
  output: [{ output: '{"candidates":[]}' }]
});
""")
add(code("normalizzaAI", "Normalizza output AI", js("03-normalizza-output-ai.js"), mode="runOnceForEachItem",
         output="{ lotto: 1, stato_lotto: 'OK', candidates: [] }"))
add(code("deduplica", "Deduplica candidati", js("04-deduplica-candidati.js"),
         output="{ _vuoto: false, company_name: 'Acme Srl', website: 'https://acme.it', domain: 'acme.it', full_name: 'Mario Rossi', person_key: 'mario rossi|acme.it', role_match: 'exact' }"))
add(if_node("ciSonoCandidati", "Ci sono candidati?", "{{ $json._vuoto === true }}", "boolean", "false"))

add(callback("notificaVerifica", "Notifica: verifica email",
             progress("verifying", "'Verifica dei siti e delle email in corso'",
                      "{ candidates: $('Deduplica candidati').all().filter(i => !i.json._vuoto).length }")))

add(http_page("homepage", "HTTP - Homepage", "{{ $json.website }}"))
add(code("estraiHome", "Estrai email homepage",
         estrai("HOMEPAGE", "Deduplica candidati", "$('Deduplica candidati').item.json.website"),
         mode="runOnceForEachItem", output="{ email_site: 'info@acme.it', email_site_type: 'generic', page_1: 'https://acme.it/contatti', page_2: '' }"))
add(if_node("servePagina2", "Serve pagina 2?", "{{ $json.page_1 }}", "string", "notEmpty"))
add(http_page("pagina2", "HTTP - Pagina 2", "{{ $json.page_1 }}"))
add(code("estraiP2", "Estrai email pagina 2",
         estrai("PAGINA 2", "Serve pagina 2?", "$('Serve pagina 2?').item.json.page_1"),
         mode="runOnceForEachItem", output="{ email_site: 'info@acme.it', page_2: '' }"))
add(if_node("servePagina3", "Serve pagina 3?", "{{ $json.page_2 }}", "string", "notEmpty"))
add(http_page("pagina3", "HTTP - Pagina 3", "{{ $json.page_2 }}"))
add(code("estraiP3", "Estrai email pagina 3",
         estrai("PAGINA 3", "Serve pagina 3?", "$('Serve pagina 3?').item.json.page_2"),
         mode="runOnceForEachItem", output="{ email_site: 'info@acme.it' }"))
add("""const riunisciEmail = merge({
  version: 3.2,
  config: { name: 'Riunisci email sito', parameters: { mode: 'append', numberInputs: 3 } }
});
""")

add(code("decidi", "Decidi arricchimento", js("06-decidi-arricchimento.js"),
         output="{ full_name: 'Mario Rossi', company_name: 'Acme Srl', job_title: 'CEO', needs_enrichment: true }"))
add(if_node("serveArricchimento", "Arricchimento necessario?", "{{ $json.needs_enrichment }}", "boolean", "true"))
add(f"""const rrLookup = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {{
    name: 'RocketReach - Lookup persona',
    parameters: {{
      url: 'https://api.rocketreach.co/api/v2/person/lookup',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendQuery: true,
      queryParameters: {{ parameters: [
        {{ name: 'name', value: expr('{{{{ $json.full_name }}}}') }},
        {{ name: 'current_employer', value: expr('{{{{ $json.company_name }}}}') }},
        {{ name: 'title', value: expr('{{{{ $json.job_title }}}}') }},
        {{ name: 'return_cached_emails', value: 'true' }}
      ] }},
      options: {{
        batching: {{ batch: {{ batchSize: 1, batchInterval: 5000 }} }},
        response: {{ response: {{ neverError: true }} }}
      }}
    }},
    credentials: {{ httpHeaderAuth: {ROCKETREACH} }}
  }},
  output: [{{ id: 123, status: 'complete', emails: [] }}]
}});
""")
add(if_node("rrInCorso", "RocketReach in corso?",
            "{{ !!$json.id && ['progress','searching','waiting','queued','not queued'].includes(String($json.status ?? '').toLowerCase()) }}",
            "boolean", "true"))
add("""const rrAttendi = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: { name: 'Attendi RocketReach', parameters: { resume: 'timeInterval', amount: 25, unit: 'seconds' } }
});
""")
add(f"""const rrStato = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {{
    name: 'RocketReach - Stato',
    parameters: {{
      url: 'https://api.rocketreach.co/api/v2/person/checkStatus',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendQuery: true,
      queryParameters: {{ parameters: [{{ name: 'ids', value: expr('{{{{ $json.id }}}}') }}] }},
      options: {{
        batching: {{ batch: {{ batchSize: 1, batchInterval: 2000 }} }},
        response: {{ response: {{ neverError: true }} }}
      }}
    }},
    credentials: {{ httpHeaderAuth: {ROCKETREACH} }}
  }},
  output: [{{ id: 123, status: 'complete', emails: [] }}]
}});
""")
add("""const riunisciRR = merge({
  version: 3.2,
  config: { name: 'Riunisci RocketReach', parameters: { mode: 'append', numberInputs: 2 } }
});
""")
add(code("normalizzaRR", "Normalizza RocketReach", js("07-normalizza-rocketreach.js"), mode="runOnceForEachItem",
         output="{ email_enrichment: '', email_enrichment_status: 'NOT_FOUND' }"))

add("""const riunisciEsiti = merge({
  version: 3.2,
  config: { name: 'Riunisci esiti', parameters: { mode: 'append', numberInputs: 3 } }
});
""")
add(code("classifica", "Classifica e prepara risultati", js("08-classifica-e-prepara-risultati.js"),
         output="{ event: 'results', job_id: 'x', leads: [], rejected: [], stats: {}, usage: {} }"))
add(callback("inviaRisultati", "Invia risultati al backend", "{{ JSON.stringify($json) }}",
             execute_once=False, retry=True))

add("""const nota = sticky(
  '## Lead Engine | Search (v1)\\n' +
  'Motore di ricerca prospect **generalista** chiamato dalla piattaforma SaaS via webhook autenticato.\\n\\n' +
  '**Flusso:** richiesta validata (anti-SSRF) -> piano AI in lotti -> ricerca AI con web search -> ' +
  'deduplica (anche contro lo storico del cliente) -> email dal sito ufficiale (homepage, contatti, note legali) -> ' +
  'RocketReach solo se serve e entro il tetto del backend -> classificazione per modalita email -> callback al backend.\\n\\n' +
  '**Non genera mai email ipotizzate come contatti:** i pattern finiscono in `email_patterns` con stato `guessed`.\\n\\n' +
  '**Prima di attivare:** 1) imposta `DOMINIO_PIATTAFORMA` in *Valida richiesta*; 2) crea le due credenziali ' +
  '(*Lead Engine - Webhook in ingresso*: Header Auth; *Lead Engine - Callback verso backend*: header `X-Engine-Secret`) con segreti lunghi casuali, gli stessi del backend.\\n\\n' +
  'Sorgenti, test e contratto API: GitHub `marcoscazzari03/prospect-azienda` (cartella n8n/engine).',
  [],
  { color: 7, width: 760, height: 420 }
);
""")

add("""export default workflow('lead-engine-search-v1', 'Lead Engine | Search (v1)')
  .add(webhook)
  .to(valida)
  .to(richiestaValida
    .onTrue(notificaAvvio.to(planner))
    .onFalse(rifiuta))
  .add(planner)
  .to(prepara)
  .to(ricerca)
  .to(normalizzaAI)
  .to(deduplica)
  .to(ciSonoCandidati
    .onTrue(homepage)
    .onFalse(riunisciEsiti.input(2)))
  .add(deduplica)
  .to(notificaVerifica)
  .add(homepage)
  .to(estraiHome)
  .to(servePagina2
    .onTrue(pagina2)
    .onFalse(riunisciEmail.input(0)))
  .add(pagina2)
  .to(estraiP2)
  .to(servePagina3
    .onTrue(pagina3.to(estraiP3).to(riunisciEmail.input(2)))
    .onFalse(riunisciEmail.input(1)))
  .add(riunisciEmail)
  .to(decidi)
  .to(serveArricchimento
    .onTrue(rrLookup)
    .onFalse(riunisciEsiti.input(0)))
  .add(rrLookup)
  .to(rrInCorso
    .onTrue(rrAttendi.to(rrStato).to(riunisciRR.input(1)))
    .onFalse(riunisciRR.input(0)))
  .add(riunisciRR)
  .to(normalizzaRR)
  .to(riunisciEsiti.input(1))
  .add(riunisciEsiti)
  .to(classifica)
  .to(inviaRisultati)
  .add(nota)
  .group('1 - Richiesta', [valida, richiestaValida, rifiuta, notificaAvvio], { description: 'Valida il payload del backend, blocca callback non ammessi e prepara il brief per l AI.' })
  .group('2 - Ricerca AI', [planner, modelloPlanner, prepara, ricerca, modelloRicerca, normalizzaAI], { description: 'Piano in lotti non sovrapposti, ricerca web per lotto, recupero output anche se malformato.' })
  .group('3 - Email dal sito', [homepage, estraiHome, servePagina2, pagina2, estraiP2, servePagina3, pagina3, estraiP3, riunisciEmail], { description: 'Email reali dal sito ufficiale: homepage, contatti, note legali. Nessuna email ipotizzata.' })
  .group('4 - Arricchimento', [rrLookup, rrInCorso, rrAttendi, rrStato, riunisciRR, normalizzaRR], { description: 'RocketReach solo per chi ne ha bisogno ed entro il tetto deciso dal backend. Solo email SMTP valid.' })
  .group('5 - Consegna', [classifica, inviaRisultati], { description: 'Classifica per modalita email, calcola qualita e invia i risultati al backend con retry.' });
""")

out = ROOT / "workflow.sdk.ts"
out.write_text("\n".join(parts), encoding="utf-8")
print(f"scritto {out} ({out.stat().st_size} byte)")
