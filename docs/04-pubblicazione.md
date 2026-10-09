# 4. Pubblicazione: da zero a leads.weborastudio.it

Tempo stimato: 1-2 ore. Tutti i servizi hanno un piano gratuito sufficiente per la beta.
Il sito attuale su `weborastudio.it` **non viene toccato**: la piattaforma vive sul
sottodominio `leads.weborastudio.it`.

## 1. Supabase (database e login)

1. Crea un account su <https://supabase.com> e un progetto nella regione **Frankfurt (eu-central-1)**.
2. *SQL Editor*: esegui in ordine i file in `supabase/migrations/` (copia e incolla, uno alla volta).
3. *Authentication → URL Configuration*:
   - Site URL: `https://leads.weborastudio.it`
   - Redirect URLs: `https://leads.weborastudio.it/auth/conferma`
4. *Authentication → Emails → Templates*: i link nei modelli devono usare il formato `token_hash`
   (più affidabile del link standard: funziona anche aperto da un altro browser):
   - Confirm signup: `{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&type=email&next=/app`
   - Reset password: `{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&type=recovery&next=/nuova-password`
   Redirect URLs: aggiungere anche `https://leads.weborastudio.it/**`.
   Per inviare dal tuo dominio serve l'SMTP personalizzato (Resend, punto 5).
5. *Project Settings → API*: copia **Project URL**, **anon key** e **service_role key**.
6. Dopo esserti registrato sulla piattaforma, renditi amministratore (*SQL Editor*):
   ```sql
   update profiles set is_admin = true where email = 'la-tua-email@...';
   ```

## 2. Vercel (hosting)

1. Crea un account su <https://vercel.com> collegandolo a GitHub.
2. *Add New → Project*, scegli il repository `prospect-azienda`, framework Next.js (rilevato da solo).
3. *Environment Variables*: inserisci tutte quelle di `.env.example` (vedi tabella sotto).
4. *Deploy*. Al termine, *Settings → Domains → Add* `leads.weborastudio.it`.
5. Dal pannello DNS del tuo dominio aggiungi il record che Vercel ti indica
   (di solito `CNAME leads → cname.vercel-dns.com`). Il resto del dominio resta com'è.

| Variabile | Dove la trovi |
|---|---|
| `APP_URL` | `https://leads.weborastudio.it` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase, punto 1.5 |
| `N8N_ENGINE_WEBHOOK_URL` | `https://lefonti.app.n8n.cloud/webhook/lead-engine/v1/search` |
| `N8N_ENGINE_HEADER_NAME`, `N8N_ENGINE_HEADER_VALUE` | Li scegli tu (punto 3) |
| `ENGINE_CALLBACK_SECRET` | Lo scegli tu (punto 3) |
| `N8N_BASE_URL` | `https://lefonti.app.n8n.cloud` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe, punto 4 |
| `CRON_SECRET` | Una stringa casuale lunga |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend, punto 5 (facoltativo) |
| `MILLIONVERIFIER_API_KEY` | Facoltativo: verifica delle caselle (millionverifier.com → API) |

Per generare i segreti casuali: `openssl rand -hex 32` (oppure un generatore di password, 64 caratteri).

## 3. n8n (motore di ricerca)

Workflow: **Lead Engine | Search (v1)** (già creato, inattivo).

1. Nodo *Webhook: nuova ricerca* → credenziale **Header Auth** nuova:
   nome header = valore di `N8N_ENGINE_HEADER_NAME` (es. `X-Engine-Key`), valore = `N8N_ENGINE_HEADER_VALUE`.
   Sostituisce la credenziale "Header Auth account" assegnata in automatico.
2. Nodi *Notifica: ricerca avviata*, *Notifica: verifica email*, *Invia risultati al backend* →
   credenziale **Header Auth** "Lead Engine - Callback verso backend" con
   Name `X-Engine-Secret` e Value = valore di `ENGINE_CALLBACK_SECRET`.
3. Verifica che i nodi OpenAI e RocketReach usino le tue credenziali.
4. **Attiva** il workflow (Publish) solo dopo il primo test dal punto 6.

## 4. Stripe (pagamenti) — in modalità test finché non apri la partita IVA

1. Crea un account su <https://stripe.com>. Puoi lavorare in **modalità test** senza dati fiscali.
2. *Developers → API keys*: copia la **secret key** (`sk_test_…`) in `STRIPE_SECRET_KEY`.
3. *Developers → Webhooks → Add endpoint*: `https://leads.weborastudio.it/api/stripe/webhook`
   con gli eventi `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copia il **signing secret** in `STRIPE_WEBHOOK_SECRET`.
4. *Settings → Billing → Customer portal*: attiva il portale (cambio carta, fatture, disdetta).
5. Pagamenti di prova con la carta `4242 4242 4242 4242`, qualsiasi data futura e CVC.

Il passaggio a pagamenti reali (chiavi `sk_live_…`) va fatto **dopo** l'apertura della partita
IVA: vedi la nota fiscale nel README.

## 5. Resend (email transazionali, facoltativo)

1. Account su <https://resend.com>, *Domains → Add* `weborastudio.it`, aggiungi i record DNS indicati.
2. Copia la API key in `RESEND_API_KEY`. Le notifiche "ricerca pronta" e le conferme di opposizione
   partono solo se è configurata.
3. Facoltativo: usa Resend anche come SMTP di Supabase (Supabase → Authentication → SMTP).

## 6. Prova end-to-end

1. Registrati su `https://leads.weborastudio.it/registrati` e conferma l'email.
2. Renditi admin (punto 1.6).
3. Con n8n **attivo**, avvia una ricerca da 3-5 lead in modalità "Email generiche incluse".
4. Controlla: avanzamento nella pagina della ricerca, esecuzione in n8n, lead consegnati,
   crediti addebitati e restituiti, costi in *Amministrazione → Andamento*.
5. Prova un acquisto in modalità test da *Crediti e piano*.

## Sviluppo locale

```bash
cp .env.example .env.local   # e compila le variabili
npm install
npm run dev                  # http://localhost:3000
npm test                     # test della logica applicativa
npm run test:engine          # test dei nodi n8n
PGHOST=... PGUSER=... npm run test:sql   # test delle funzioni SQL su un Postgres locale
```
