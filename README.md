# Webora Leads — lead generation B2B con la fonte

Piattaforma SaaS in cui aziende, agenzie e professionisti descrivono il cliente ideale e
ricevono prospect B2B reali, ognuno con la fonte verificabile e lo stato dell'email
(trovata sul sito / verificata / ipotizzata), pagando solo i lead consegnati.

Destinazione: **https://leads.weborastudio.it**

## Documenti

| | |
|---|---|
| [docs/01-analisi-workflow.md](docs/01-analisi-workflow.md) | Analisi del workflow n8n originale: cosa si riusa, cosa cambia |
| [docs/02-proposta.md](docs/02-proposta.md) | Concept, pricing, UX, architettura, MVP, costi, rischi, GDPR, piano |
| [docs/03-contratto-motore.md](docs/03-contratto-motore.md) | Contratto API tra backend e motore n8n |
| [docs/04-pubblicazione.md](docs/04-pubblicazione.md) | Guida passo-passo: Supabase, Vercel, n8n, Stripe, dominio |

## Architettura

```
Browser ── Next.js 16 (Vercel, fra1) ── Supabase (Postgres + Auth + RLS, Francoforte)
                 │        ▲
     webhook ────┘        └──── callback (progress / results)
                 ▼
          n8n "Lead Engine | Search (v1)" ── OpenAI web search, siti aziendali, RocketReach
Stripe ── webhook ──► crediti, abbonamenti, ricevute
```

- **Crediti**: registro append-only (`credit_ledger`); riserva all'avvio, addebito per lead
  consegnato, restituzione automatica del non usato. Tutto in funzioni SQL transazionali
  eseguibili solo dal server.
- **Isolamento clienti**: Row Level Security su ogni tabella; il magazzino dei lead non è mai
  leggibile dai browser.
- **Mai due volte lo stesso contatto**: vincolo `UNIQUE(org_id, person_key)` sulle consegne.
- **Opposizione GDPR**: lista di esclusione globale (solo impronte SHA-256).

## Struttura

```
src/app/(marketing)   landing, prezzi, privacy, termini, opposizione
src/app/(auth)        registrazione, accesso, recupero password
src/app/app           area cliente: panoramica, nuova ricerca, ricerche, lead, crediti
src/app/admin         amministrazione: andamento, clienti, ricerche, segnalazioni, costi
src/app/api           callback motore, webhook Stripe, export CSV, cron
src/lib               dominio (puro, testato), server (DAL, ricerche, Stripe), Supabase
supabase/migrations   schema, funzioni, RLS, catalogo
supabase/tests        test SQL end-to-end (senza Docker)
n8n/engine            sorgenti e test del motore n8n
n8n/legacy            workflow originale "Prospect Avvocati | Search"
```

## Comandi

```bash
npm run dev            # sviluppo
npm run build          # build di produzione
npm test               # test logica applicativa (vitest)
npm run test:engine    # test dei nodi n8n
npm run test:sql       # test SQL (PGHOST/PGPORT/PGUSER verso un Postgres 15+)
npm run typecheck      # tipi di route + TypeScript
```

## Nota fiscale

Vendere un servizio online in modo continuativo richiede la partita IVA **prima** di incassare:
non è possibile "dichiarare dopo". Finché non è aperta, Stripe resta in modalità test e la
piattaforma può essere usata in beta gratuita. Da verificare con un commercialista
(regime forfettario, codice ATECO, fatturazione elettronica).
