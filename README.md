# Webora Leads — lead generation B2B con la fonte

Piattaforma SaaS in cui agenzie e professionisti descrivono il cliente ideale e ricevono aziende in target
(«Solo azienda»: nessun dato di persone), con la fonte, l'email aziendale trovata sul sito (mai ipotizzata) o il modulo
di contatto e, nelle ricerche opportunità, segnali verificati con prova e data. Si pagano solo i lead consegnati.

Destinazione: **https://leads.weborastudio.it**

## Documenti

Indice completo, con lo stato di ogni documento: [docs/README.md](docs/README.md). I principali:
[checklist](docs/00-checklist.md) · [registro](docs/13-registro.md) · [panoramica del sistema](docs/12-panoramica-sistema.md) ·
[contratto del motore](docs/03-contratto-motore.md) · [segnali](docs/07-segnali.md) · [beta](docs/10-beta.md).

## Architettura

```
Browser ── Next.js 16 (Vercel, fra1) ── Supabase (Postgres + Auth + RLS, Francoforte)
                 │        ▲
     webhook ────┘        └──── callback (progress / results)
                 ▼
          n8n "Lead Engine | Search (v1)" ── Claude (ricerca web), siti aziendali
          + workflow che riempiono il database: OSM, Controllo siti, Adzuna, Siti aziende, Settore
Stripe ── webhook ──► crediti, abbonamenti, ricevute
```

- **Crediti**: registro append-only (`credit_ledger`); riserva all'avvio, addebito per lead
  consegnato, restituzione automatica del non usato. Tutto in funzioni SQL transazionali
  eseguibili solo dal server.
- **Isolamento clienti**: Row Level Security su ogni tabella; il magazzino dei lead non è mai
  leggibile dai browser.
- **Mai due volte la stessa azienda allo stesso cliente**: vincolo `UNIQUE(org_id, person_key)` sulle consegne.
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
n8n/annunci           popolamento OSM, controllo siti, annunci Adzuna, siti e settore delle aziende
n8n/legacy            workflow originale "Prospect Avvocati | Search" (di un altro progetto: non toccare)
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

Gli stessi controlli girano a ogni push su GitHub (`.github/workflows/ci.yml`). Prima di ogni push con codice, SQL o n8n
serve la revisione del code-reviewer (`.claude/agents/`, regola in `CLAUDE.md`).

## Nota fiscale

Vendere un servizio online in modo continuativo richiede la partita IVA **prima** di incassare:
non è possibile "dichiarare dopo". Finché non è aperta, Stripe resta in modalità test (acquisti solo per gli
admin; ai beta tester i crediti li assegna l'admin) e la piattaforma si usa in beta gratuita su invito. Da verificare con un commercialista
(regime forfettario, codice ATECO, fatturazione elettronica).
