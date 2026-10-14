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
    "notes": "testo libero del cliente",
    "signals": {                       // facoltativo (docs/07-segnali.md)
      "codes": ["job_ad", "no_mobile"], // massimo 3
      "match": "any",                   // any = basta uno, all = servono tutti
      "job_families": [{ "code": "it_systems", "label": "Sistemista / tecnico IT",
                         "titles": ["sistemista", "system administrator", "…"] }],
      "max_age_days": 60
    }
  },
  "exclusions": {
    "domains": ["agenzia-gia-venduta.es"],          // aziende già consegnate a QUESTO cliente
    "person_keys": ["mario rossi|acme.it"]           // persone già consegnate (nome normalizzato|dominio)
  },
  "limits": {
    "max_lots": 6,                     // tetto alle ricerche AI (costo)
    "candidates_per_lot": 20,
    "enrichment_cap": 30               // tetto alle ricerche Icypeas (costo), 0 = disattivato
  },
  "reserve": [                         // facoltativo: aziende con segnale già verificato nei giri
    { "company_name": "Acme Srl",      // precedenti di questa ricerca, rimaste senza referente
      "website": "https://acme.it", "source_url": "https://…", "contact_page": "",
      "signals": [{ "code": "outdated_cms", "evidence": { "detail": "WordPress 5.2 …", "url": "https://acme.it" } }] }
  ]
}
```

### Ricerche con segnali: due passaggi

1. L'AI cerca **solo aziende e siti** (fino a 30 per lotto, massimo 8 ricerche web), senza referente.
2. Il motore scarica la homepage e controlla i segnali (e gli annunci): chi non li ha esce subito.
3. **Tetto ai referenti**: il referente si cerca solo per `quantità × 1,5 + 1` aziende
   (`× 2,2` con «solo nominative"); le altre con il segnale escono con `reason: "riserva"`
   e il backend le ripassa nel campo `reserve` del giro successivo. Se la riserva basta,
   il giro non fa nessuna ricerca AI.
4. **Referente in due tentativi**: prima Claude legge il testo della homepage e della pagina
   «chi siamo / note legali / contatti» già scaricate (nessuna ricerca web, ~1 centesimo);
   solo se lì non c'è, ricerca web mirata (massimo 2 ricerche).

Risposta immediata: `200 {"accepted": true}`. Il lavoro prosegue in background.

## Evento `progress`

```json
{ "event": "progress", "contract_version": 1, "job_id": "…", "run_id": "…", "run_token": "…",
  "stage": "planning | verifying", "message": "testo per l'utente", "counters": { … } }
```

Errori di consegna degli eventi `progress` sono ignorati (non bloccano la ricerca).
Il primo evento (`planning`) porta in `counters.n8n_execution_id` l'ID dell'esecuzione:
il backend lo salva sul giro per riconoscerlo se l'esecuzione si interrompe.

## Esecuzione interrotta: `POST /api/engine/error`

Inviato dal workflow di errore «Lead Engine | Errori» (impostato come errorWorkflow del motore),
con lo stesso header `x-engine-secret` del callback:

```json
{ "execution_id": "12345", "error": "messaggio", "node": "HTTP - Claude ricerca" }
```

Il backend segna il giro come fallito (`fail_engine_run`), chiude la ricerca e restituisce i crediti non usati.

## Evento `results` (uno per giro)

```json
{
  "event": "results", "contract_version": 1, "job_id": "…", "run_id": "…", "run_token": "…",
  "email_mode": "mixed", "requested": 50,
  "leads": [{
    "company": { "name": "Acme S.L.", "domain": "acme.es", "website": "https://acme.es",
                 "country": "Spagna", "city": "Madrid", "industry": "…", "size_hint": "11-50",
                 "technologies": ["wordpress"] },   // solo se la ricerca ha segnali dal sito
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
                 "email_on_company_domain": true, "email_personal": true, "email_verified": true } },
    "signals": [{ "code": "job_ad", "evidence": { "url": "https://…", "title": "Sistemista IT", "date": "2026-09-28",
                  "family": "it_systems", "source": "company_site", "checked_at": "2026-10-13" } }]
  }],
  "rejected": [{ "company": {…}, "person": {…}, "reason": "solo_email_generica | nessuna_email | arricchimento_da_riprovare | riserva | …" }],
  "stats": { "lots": 4, "lots_failed": 0, "ai_candidates": 80, "valid_candidates": 46,
             "dedup_discards": { "sito_non_ufficiale": 12, "azienda_gia_acquistata": 5 },
             "leads": 31, "leads_personal": 12, "leads_generic": 19, "rejected": 15, "rejected_reasons": {…} },
  "usage": { "ai_search_calls": 4, "ai_planner_calls": 1, "enrichment_lookups": 18, "pages_fetched": 97,
             "claude_input_tokens": 41000, "claude_output_tokens": 5200, "claude_web_searches": 9 },
  "company_checks": [{ "company": { "domain": "acme.it", "name": "Acme", "website": "https://acme.it", "technologies": ["wordpress"] },
                      "checks": [{ "code": "outdated_cms", "status": "pass | fail | undetermined", "evidence": { "detail": "WordPress 5.2" } }] }],
  "n8n_execution_id": "12345"
}
```

`company_checks`: esito dei controlli tecnici di TUTTE le aziende controllate nel giro (anche
scartate). Il backend li salva nel database delle aziende (`company_checks`, `record_company_checks`)
prima della consegna; un errore qui non blocca la consegna. Nella ricerca in target i controlli si
fanno sulla homepage già scaricata per le email (nodo «Controlli tecnici sito», nessuno scarto).

## Cosa fa il backend alla ricezione di `results`

1. Verifica header, `run_token`, stato del run (`running`), idempotenza.
2. Ri-deduplica contro `deliveries` del cliente (vincolo `UNIQUE(org_id, person_key)`) e contro la
   **lista di opposizione globale** (`suppression_list`).
3. Salva nel magazzino (`companies`, `people` con la scheda `lead` ed `email_id`, `emails`,
   `company_signals`) **ogni lead valido**, anche quelli che non consegna (oltre la quantità, già
   avuti dal cliente, oltre il limite per azienda, senza il segnale richiesto). Anche le generiche
   scartate da una ricerca «solo nominative» (in `rejected`, motivo `solo_email_generica`, con
   `email`) finiscono nel magazzino. Mai salvati: email ipotizzate o non valide, contatti in
   opposizione, caselle inesistenti.
4. Crea le `deliveries` fino alla quantità ordinata e **addebita i crediti solo per i lead
   consegnati**, in base al tipo reale di email (vedi pricing). Con segnali verificati richiesti:
   consegna solo i lead che li hanno («basta uno» / «servono tutti»), +1 credito per lead, prove
   copiate sul lead e salvate per azienda in `company_signals` (riusabili dal magazzino finché fresche).
5. Registra i costi del giro (`usage` × costi unitari) in `run_costs` per i margini.
6. Se mancano lead e i giri sono < 3 e il budget del giro lo consente → nuovo giro (top-up) con
   esclusioni aggiornate. Altrimenti chiude la ricerca come `completed` o `partial` e **rilascia i
   crediti riservati non usati**.

Watchdog: un cron ogni 5 minuti marca `failed` i run senza eventi da oltre 30 minuti e rilascia
i crediti riservati; il cliente riceve una notifica.

## Annunci di lavoro (`POST /api/engine/job-ads`)

Workflow n8n «Annunci | Raccolta Adzuna» (sorgenti in `n8n/annunci/`, generato da `build.mjs`).
Stesso segreto del callback (`x-engine-secret`). Corpo:

```json
{ "source": "adzuna", "ads": [{ "external_id": "123", "family": "it_systems", "title": "Sistemista",
  "company_name": "Meccanica Emiliana Srl", "country": "IT", "region": "Emilia-Romagna", "city": "Modena",
  "posted_at": "2026-10-12T08:00:00Z", "url": "https://www.adzuna.it/land/ad/123", "description": "…", "contract": "permanent full_time" }] }
```

Massimo 2.000 annunci per chiamata. `store_job_ads` scarta gli annunci senza link https, data o
nome azienda, aggiorna `last_seen_at` di quelli già visti, collega l'annuncio all'azienda del
database quando il nome normalizzato (`company_name_key`) corrisponde a una sola azienda e cancella
gli annunci più vecchi di 180 giorni. Risposta: `{ ok, received, saved, new, linked, deleted }`.

## Sito delle aziende degli annunci (`/api/engine/job-ads/companies`)

Workflow n8n «Annunci | Siti aziende» (generato da `n8n/annunci/build.mjs` in `siti.sdk.ts`), stesso segreto.

- `GET ?limit=150` → `{ companies: [{ company_key, company_name, city, ads }] }`: aziende degli annunci senza
  sito, mai provate o non trovate da più di 30 giorni, le più attive per prime.
- `POST { results: [{ company_key, company_name, city, domain, method }] }` (domain vuoto = non trovato) →
  `{ ok, found, not_found, linked_ads }`. Le trovate entrano in `companies` (origine `adzuna`, paese Italia)
  e i loro annunci vengono collegati; ogni esito resta in `company_resolutions`.

## Settore delle aziende degli annunci (`/api/engine/job-ads/industries`)

Workflow n8n «Annunci | Settore aziende» (generato da `n8n/annunci/build.mjs` in `settore.sdk.ts`), stesso
segreto. Ogni 4 ore legge la homepage di 120 aziende e la fa classificare a Claude Haiku a lotti di 20
(senza ricerca web, circa 0,1 centesimi per azienda).

- `GET ?limit=40` → `{ companies: [{ company_id, company_name, website, city, ads }] }`: aziende con annunci
  (o importate da OpenStreetMap) e senza settore, mai classificate o non classificabili da più di 60 giorni, le più attive per prime.
- `POST { results: [{ company_id, industry, keywords }] }` (industry vuoto = non classificabile) →
  `{ ok, classified, unknown }`. Il settore va in `companies.industry` (se vuoto), settore e parole chiave
  nelle etichette `tags` usate da magazzino e riserva.

## Controllo dei siti del database (`/api/engine/site-checks`)

Workflow n8n «Aziende | Controllo siti» (generato da `n8n/annunci/build.mjs` in `controllo.sdk.ts`), stesso
segreto. Ogni 2 ore 150 aziende: richiesta HTTPS stretta senza scaricare la pagina (HEAD, per `no_https`) e homepage, poi gli stessi controlli
del motore (`n8n/engine/nodes/lib-controlli-sito.js`).

- `GET ?limit=150` → `{ companies: [{ company_id, domain, name, website }] }`: mai controllate prima, poi
  controllate da più di 25 giorni (le prove valgono 30); escluse opposizioni e aziende chiuse.
- `POST { items: [{ company, checks }] }` → `{ ok, saved }`, salvati da `store_company_checks` (origine `seed`).

## Popolamento del database aziende (`/api/engine/companies-import`)

Workflow n8n «Aziende | Popolamento OSM» (generato da `n8n/annunci/build.mjs` in `popolamento.sdk.ts`), stesso
segreto. Ogni notte una regione a rotazione (a mano l'Emilia-Romagna): Overpass API di OpenStreetMap, una
query per tipo di attività (office, craft, shop, amenity, tourism, healthcare, industrial) con sito web.
Scartati enti pubblici, associazioni, luoghi non commerciali, siti non aziendali (social, portali) e catene
(stesso dominio su 3+ punti). Categoria OSM tradotta in settore italiano + parole chiave; le categorie senza
traduzione restano senza settore e le classifica Claude Haiku («Annunci | Settore aziende»).

- `POST { source: "osm", companies: [{ domain, name, website, city, province, region, industry, keywords }] }`
  (max 5.000) → `{ ok, received, new, updated, skipped }` da `store_imported_companies`. Solo dati d'azienda;
  le aziende già presenti non vengono sovrascritte (si aggiungono luoghi ed etichette).

## Riserva dal database (ricerche opportunità)

Per le ricerche con segnali il backend aggiunge alla `reserve` del payload (dopo quella dei giri
precedenti, massimo 40 in tutto) le aziende restituite da `opportunity_reserve(search, esclusi, n)`:
prova recente dei segnali richiesti (annuncio Adzuna degli ultimi 60 giorni della famiglia scelta,
segnali dal sito controllati negli ultimi 30), paese, zona (anche città e regione degli annunci) e
settore della ricerca, escluse aziende già consegnate, già controllate nella ricerca e in opposizione.
Il motore le tratta come la riserva: niente ricerca AI se bastano, referente dal sito, poi email.
La selezione è `opportunity_pool(org, target, contatti, esclusi)`: il wizard la usa tramite
`opportunity_availability` per mostrare quante aziende sono disponibili prima di avviare.

## Riserva dal database (ricerche in target, versione prudente)

Solo per le ricerche in target «semplici» (`target_is_simple`: settore o parole chiave del settore,
eventuali zona ed esclusioni; nessuna dimensione, fatturato, parole chiave aggiuntive o note, che il
database non sa verificare) il backend aggiunge alla `reserve` le aziende di
`target_reserve(search, esclusi, n)` (massimo 40, senza `signals`): tutte le parole del settore
nelle etichette dell'azienda, sito controllato negli ultimi 60 giorni con un esito leggibile, paese
e zona, escluse aziende già consegnate, in opposizione o chiuse. Il motore ammette la riserva senza
segnali solo se la ricerca non ha segnali; scarica la homepage («Serve controllo sito?» vale anche
per `_riserva`), cerca il referente prima sul sito e poi sul web (tetto `referenti_max`), poi le
email. Niente ricerca AI se la riserva è almeno 1,4 volte i lead (2 con «solo nominative»),
altrimenti i lotti AI coprono solo la parte mancante. Il wizard mostra il numero con
`target_availability` (migrazione 029).
