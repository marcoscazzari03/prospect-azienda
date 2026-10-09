# 3. Contratto API backend ↔ motore n8n (v1)

Il motore n8n è **stateless**: non legge né scrive il database. Riceve una richiesta, lavora in
modo asincrono e restituisce eventi al backend. Tutte le decisioni economiche (crediti, tetti di
spesa, rimborsi, top-up) restano nel backend.

```
Cliente ──► Backend (Next.js) ──POST webhook──► n8n "Lead Engine | Search (v1)"
               ▲                                     │
               └──── POST /api/engine/callback ◄─────┘  (progress, results)
```

## Sicurezza

| Direzione | Autenticazione | Note |
|---|---|---|
| Backend → n8n | Header Auth sul webhook (credenziale n8n *Lead Engine - Webhook in ingresso*) | URL e segreto solo in variabili d'ambiente server (`N8N_ENGINE_WEBHOOK_URL`, `N8N_ENGINE_SECRET`), mai nel frontend |
| n8n → Backend | Header `X-Engine-Secret` (credenziale *Lead Engine - Callback verso backend*) **+** `run_token` | Il backend salva solo l'hash del `run_token` (32 byte casuali per run) e lo confronta in tempo costante |
| Anti-SSRF | `callback_url` accettato solo se sul dominio della piattaforma (`DOMINIO_PIATTAFORMA` in *Valida richiesta*) | Un payload manomesso non può far chiamare a n8n URL arbitrari |
| Idempotenza | `run_id` univoco; il backend accetta un solo evento `results` per run | I retry di n8n (5 tentativi) non generano doppi addebiti |

## Richiesta: `POST {N8N_ENGINE_WEBHOOK_URL}` (path `lead-engine/v1/search`)

```json
{
  "contract_version": 1,
  "job_id": "7f1c2a4e-…",              // id della ricerca (searches.id)
  "run_id": "b3d9…",                   // id del giro (search_runs.id); una ricerca può avere più giri
  "run_token": "64 caratteri hex",      // segreto monouso del giro
  "callback_url": "https://app.TUO-DOMINIO.it/api/engine/callback",
  "email_mode": "mixed",               // generic_ok | personal_only | mixed
  "quantity": 50,                      // lead ancora da trovare in questo giro
  "contacts_per_company": 1,           // 1-3
  "language": "it",
  "target": {
    "countries": ["ES", "PT"],
    "country_names": ["Spagna", "Portogallo"],
    "regions": ["Madrid", "Lisbona"],
    "industry": "Agenzie di marketing digitale",
    "industry_keywords": ["agencia de marketing digital", "agência de marketing"],
    "company_size": ["11-50", "51-200"],
    "revenue_range": "1-10 M€",
    "roles": ["CEO", "Founder", "Managing Director"],
    "keywords": ["e-commerce"],
    "exclude_keywords": ["franchising"],
    "notes": "testo libero del cliente"
  },
  "exclusions": {
    "domains": ["agenzia-gia-venduta.es"],          // aziende già consegnate a QUESTO cliente
    "person_keys": ["mario rossi|acme.it"]           // persone già consegnate (nome normalizzato|dominio)
  },
  "limits": {
    "max_lots": 6,                     // tetto alle ricerche AI (costo)
    "candidates_per_lot": 20,
    "enrichment_cap": 30               // tetto ai lookup RocketReach (costo), 0 = disattivato
  }
}
```

Risposta immediata: `200 {"accepted": true}`. Il lavoro prosegue in background.

## Evento `progress`

```json
{ "event": "progress", "contract_version": 1, "job_id": "…", "run_id": "…", "run_token": "…",
  "stage": "planning | verifying", "message": "testo per l'utente", "counters": { … } }
```

Errori di consegna degli eventi `progress` sono ignorati (non bloccano la ricerca).

## Evento `results` (uno per giro)

```json
{
  "event": "results", "contract_version": 1, "job_id": "…", "run_id": "…", "run_token": "…",
  "email_mode": "mixed", "requested": 50,
  "leads": [{
    "company": { "name": "Acme S.L.", "domain": "acme.es", "website": "https://acme.es",
                 "country": "Spagna", "city": "Madrid", "industry": "…", "size_hint": "11-50" },
    "person":  { "full_name": "Lucía García Pérez", "first_name": "Lucía", "last_name": "García Pérez",
                 "job_title": "CEO", "role_match": "exact", "linkedin_url": "" },
    "email": {
      "address": "lucia.garcia@acme.es",
      "type": "personal",                 // personal | generic
      "status": "found_public",           // found_public | validated | unverified
      "source": "website",                // website | enrichment
      "source_url": "https://acme.es/equipo",
      "free_provider": false,
      "alternatives": [{ "address": "info@acme.es", "type": "generic", "status": "found_public", "source_url": "…" }]
    },
    "email_patterns": [],                 // solo ipotesi, status "guessed": MAI vendute come email
    "sources": { "discovery_url": "https://…", "contact_page": "https://acme.es/contacto" },
    "keys": { "person_key": "lucia garcia perez|acme.es", "company_key": "acme.es" },
    "quality": { "score": 88, "checks": { "official_site": true, "discovery_source": true, "role_match": "exact",
                 "email_on_company_domain": true, "email_personal": true, "email_verified": true } }
  }],
  "rejected": [{ "company": {…}, "person": {…}, "reason": "solo_email_generica | nessuna_email | arricchimento_da_riprovare" }],
  "stats": { "lots": 4, "lots_failed": 0, "ai_candidates": 80, "valid_candidates": 46,
             "dedup_discards": { "sito_non_ufficiale": 12, "azienda_gia_acquistata": 5 },
             "leads": 31, "leads_personal": 12, "leads_generic": 19, "rejected": 15, "rejected_reasons": {…} },
  "usage": { "ai_search_calls": 4, "ai_planner_calls": 1, "enrichment_lookups": 18, "pages_fetched": 97 },
  "n8n_execution_id": "12345"
}
```

## Cosa fa il backend alla ricezione di `results`

1. Verifica header, `run_token`, stato del run (`running`), idempotenza.
2. Ri-deduplica contro `deliveries` del cliente (vincolo `UNIQUE(org_id, person_key)`) e contro la
   **lista di opposizione globale** (`suppression_list`).
3. Inserisce/aggiorna i lead nel magazzino (`companies`, `people`, `emails`) con fonte e stato.
4. Crea le `deliveries` fino alla quantità ordinata e **addebita i crediti solo per i lead
   consegnati**, in base al tipo reale di email (vedi pricing).
5. Registra i costi del giro (`usage` × costi unitari) in `run_costs` per i margini.
6. Se mancano lead e i giri sono < 3 e il budget del giro lo consente → nuovo giro (top-up) con
   esclusioni aggiornate. Altrimenti chiude la ricerca come `completed` o `partial` e **rilascia i
   crediti riservati non usati**.

Watchdog: un cron ogni 5 minuti marca `failed` i run senza eventi da oltre 30 minuti e rilascia
i crediti riservati; il cliente riceve una notifica.
