# Piattaforma SaaS di lead generation B2B

Piattaforma in cui aziende, agenzie e professionisti configurano un target, avviano una
ricerca e ricevono prospect B2B reali, ognuno con fonte verificabile e stato dell'email
distinto (trovata sul sito / verificata / ipotizzata), pagando solo i lead consegnati.

## Documenti

| | |
|---|---|
| [docs/01-analisi-workflow.md](docs/01-analisi-workflow.md) | Analisi del workflow n8n "Prospect Avvocati \| Search": cosa si riusa, cosa cambia |
| [docs/02-proposta.md](docs/02-proposta.md) | Concept, pricing, UX, architettura, MVP, costi, rischi, GDPR, piano di sviluppo |
| [docs/03-contratto-motore.md](docs/03-contratto-motore.md) | Contratto API tra backend e motore n8n |

## Struttura

```
n8n/
  legacy/prospect-avvocati-search.json   workflow originale (ID e credenziali rimossi)
  engine/                                motore generalista "Lead Engine | Search (v1)"
    nodes/        sorgenti dei Code node (una sola fonte di verità)
    test/run.mjs  test dei nodi senza n8n
    build.py      genera workflow.sdk.ts (n8n Workflow SDK) dai sorgenti
    workflow.sdk.ts
```

## Motore n8n

```bash
node n8n/engine/test/run.mjs     # test dei Code node
python3 n8n/engine/build.py      # rigenera workflow.sdk.ts
```

Prima di attivare il workflow su n8n: impostare `DOMINIO_PIATTAFORMA` nel nodo
*Valida richiesta* e creare le credenziali *Lead Engine - Webhook in ingresso* e
*Lead Engine - Callback verso backend* (vedi il contratto).
