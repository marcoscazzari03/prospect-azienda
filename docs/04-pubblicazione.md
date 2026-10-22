# 4. Pubblicazione: da zero a leads.weborastudio.it

Tempo stimato: 1-2 ore. n8n Cloud richiede un piano a pagamento (2.500 esecuzioni al mese); gli altri servizi bastano
gratuiti per la beta. Aggiornata al 21/10/2026.
Il sito attuale su `weborastudio.it` **non viene toccato**: la piattaforma vive sul
sottodominio `leads.weborastudio.it`.

## 1. Supabase (database e login)

1. Crea un account su <https://supabase.com> e un progetto nella regione **Frankfurt (eu-central-1)**.
2. *SQL Editor*: esegui in ordine i file in `supabase/migrations/` (copia e incolla, uno alla volta; 57 a oggi). Le
   migrazioni nuove si eseguono sempre prima di pubblicare l'app che le usa.
3. *Authentication → URL Configuration*:
   - Site URL: `https://leads.weborastudio.it`
   - Redirect URLs: `https://leads.weborastudio.it/auth/conferma`
4. *Authentication → Emails → Templates*: i link nei modelli devono usare il formato `token_hash`
   (più affidabile del link standard: funziona anche aperto da un altro browser):
   - Confirm signup: `{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&type=email&next=/app`
   - Reset password: `{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&type=recovery&next=/nuova-password`
   Redirect URLs: aggiungere anche `https://leads.weborastudio.it/**`.
   I modelli completi, con la grafica Webora, sono in `supabase/templates/` (oggetto e posizione in
   `src/lib/email/supabase-templates.ts`): si incolla l'HTML nel campo *Body* di ciascun modello.
   Si rigenerano con `WRITE_TEMPLATES=1 npx vitest run tests/email-templates.test.ts`.
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
| `ENGINE_CALLBACK_SECRET` | Lo scegli tu (punto 3), almeno 32 caratteri |
| `SITE_CHECKS_SECRET` | Solo per il worker del controllo siti sul VPS (sezione 8), almeno 32 caratteri; apre solo `/api/engine/site-checks` |
| `N8N_BASE_URL` | `https://lefonti.app.n8n.cloud` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe, punto 4 |
| `CRON_SECRET` | Una stringa casuale lunga |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend, punto 5 (facoltativo) |
| `MILLIONVERIFIER_API_KEY` | Facoltativo: verifica delle caselle (millionverifier.com → API) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (captcha su registrazione, accesso e recupero password) |

Per generare i segreti casuali: `openssl rand -hex 32` (oppure un generatore di password, 64 caratteri).

## 3. n8n (motore di ricerca)

Workflow attivi (sorgenti e build nel repository: `n8n/engine` per il motore, `n8n/annunci` per gli altri):
**Lead Engine | Search (v1)** e **Lead Engine | Errori**; **Aziende | Popolamento OSM** (ogni notte alle 4:20),
**Aziende | Controllo siti** (ogni ora), **Annunci | Raccolta Adzuna** (ogni 2 giorni alle 6:10), **Annunci | Siti aziende**
(7:40 e 11:40), **Annunci | Settore aziende** (ogni 4 ore). Credenziali: Anthropic «Webora Leads - Anthropic», callback
«Lead Engine - Callback verso backend», Adzuna. «Prospect | Search» e «Prospect Avvocati | Search» sono di un altro
progetto: non toccarli.

Per il motore:

1. Nodo *Webhook: nuova ricerca* → credenziale **Header Auth** nuova:
   nome header = valore di `N8N_ENGINE_HEADER_NAME` (es. `X-Engine-Key`), valore = `N8N_ENGINE_HEADER_VALUE`.
   Sostituisce la credenziale "Header Auth account" assegnata in automatico.
2. Nodi *Notifica: ricerca avviata*, *Notifica: verifica email*, *Invia risultati al backend* →
   credenziale **Header Auth** "Lead Engine - Callback verso backend" con
   Name `X-Engine-Secret` e Value = valore di `ENGINE_CALLBACK_SECRET`.
3. Verifica che i nodi Claude usino la credenziale Anthropic di Webora. Icypeas è spento («Solo azienda»: niente referenti).
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
IVA: vedi la nota fiscale nel README. Con la chiave di test acquisti e portale sono solo per gli admin
(`checkoutAllowed` in `src/lib/server/stripe.ts`); con `sk_live_`/`rk_live_` si riaprono a tutti da soli.

## 5. Resend (email transazionali, facoltativo)

1. Account su <https://resend.com>, *Domains → Add* `weborastudio.it`, aggiungi i record DNS indicati.
2. Copia la API key in `RESEND_API_KEY`. Le notifiche "ricerca pronta" e le conferme di opposizione
   partono solo se è configurata.
3. Facoltativo: usa Resend anche come SMTP di Supabase (Supabase → Authentication → SMTP).

## 6. Prova end-to-end

1. Registrati su `https://leads.weborastudio.it/registrati` e conferma l'email.
2. Renditi admin (punto 1.6).
3. Con n8n **attivo**, avvia una ricerca da 3-5 lead («Solo azienda», l'unica modalità attiva).
4. Controlla: avanzamento nella pagina della ricerca, esecuzione in n8n, lead consegnati,
   crediti addebitati e restituiti, costi in *Amministrazione → Andamento*.
5. Prova un acquisto in modalità test da *Crediti e piano* (con l'account admin).

## 7. Cambio di nome o di dominio (preparato il 21/10 per Avvisto)

Nel codice il nome e gli indirizzi stanno in pochi punti:
- `src/lib/config.ts` → `BRAND` (nome, parte verde del logo, titolare, email di supporto, dominio): da qui prendono il nome
  sito, email, modelli di Supabase (`WRITE_TEMPLATES=1 npx vitest run tests/email-templates.test.ts`, poi da incollare in
  Supabase), file Excel e app di autenticazione;
- logo: `src/components/logo.tsx` (simbolo) e `public/email/logo.png` (email);
- n8n: `APP` e `BOT` in `n8n/annunci/build.mjs`; `HOST_APP` in `n8n/engine/nodes/01-valida-richiesta.js` (va **aggiunto** il
  dominio nuovo, tenendo il vecchio finché il rinvio è attivo); poi build e caricamento dei nodi;
- fuori dal codice: `APP_URL` ed `EMAIL_FROM` su Vercel, dominio su Vercel e su Resend (SPF/DKIM), Site URL e Redirect URLs su
  Supabase, Turnstile (domini ammessi), webhook di Stripe, rinvio permanente dal vecchio dominio.

## 8. Worker del controllo siti sul VPS (dal 22/10)

Server Hetzner CX23 `2.31.7.149` (Ubuntu 24.04, preparato con `scripts/vps/setup.sh`): si entra con
`ssh worker@2.31.7.149` dal computer che ha la chiave; senza chiave, console web di Hetzner con la password di root.
Il worker (`worker/site-checks.mjs`) fa il lavoro di «Aziende | Controllo siti» con le stesse regole, 300 aziende ogni
30 minuti invece di 150 ogni ora.

1. **Vercel:** variabile `SITE_CHECKS_SECRET` (Production, almeno 32 caratteri, generata nel browser con
   `crypto.randomUUID() + crypto.randomUUID()`, senza apici), poi una pubblicazione nuova di main.
2. **Server:** scaricare lo script e installare (chiede il segreto, che non resta nella cronologia):
   `curl -fsSL https://raw.githubusercontent.com/marcoscazzari03/prospect-azienda/main/scripts/vps/worker.sh -o worker.sh && bash worker.sh installa`
3. `bash worker.sh prova`: giro di 20 aziende senza salvare; deve stampare i numeri, non «HTTP 401».
4. `bash worker.sh avvia`: popolamento OSM il lunedì (punto 5), controllo siti alle :05 e alle :35, contatti (punto 86, `worker/contacts.mjs`: pagine «Contatti»,
   «Note legali», «Chi siamo» delle aziende senza email né modulo) alle :15 e alle :45. Poi si spegne «Aziende | Controllo siti» su n8n.
5. Popolamento OSM (punto 87, `worker/osm.mjs` e `scripts/vps/osm.sh`): ogni lunedì alle 2:20 UTC scarica l'Italia da
   Geofabrik (circa 2 GB, solo se cambiata, con il controllo md5, in `/var/lib/webora-osm`), tiene con osmium le attività e i
   confini delle province e salva le aziende con un sito su `/api/engine/companies-import`, con le regole del nodo n8n
   «Normalizza OSM». Prima volta: `bash worker.sh prova-osm` (conta senza salvare, 10–20 minuti, finestra aperta), poi
   `bash worker.sh osm` (in sottofondo) e `bash worker.sh stato-osm`. Poi si spegne «Aziende | Popolamento OSM» su n8n.
6. Siti delle attività OSM senza sito (punto 88, `worker/siti-osm.mjs`): ogni ora alle :50, 3.000 attività, domini
   indovinati dal nome e verificati sulla homepage (nome e luogo). Prima volta: `bash worker.sh prova-siti` (300 attività,
   senza salvare, con esempi da controllare), poi `bash worker.sh giro-siti` e `bash worker.sh stato-siti`.
7. Backup notturno del database (punto 90, `scripts/vps/backup.sh`), finché non c'è Supabase Pro: ogni notte alle 1:40 UTC
   `pg_dump` dello schema `public` e dei dati di `auth.users`/`auth.identities`, controllati con `pg_restore --list` e cifrati
   con age in `/var/lib/webora-backup` (ultimi 7 giorni più le domeniche fino a 35 giorni). Sul server c'è solo la chiave
   pubblica: la privata (`AGE-SECRET-KEY-…`) la mostra una volta `bash worker.sh installa-backup` e va tenuta in un gestore di
   password. Connessione: stringa «Session pooler» di Supabase (Connect) e, a parte, la password del database, in
   `/etc/webora/backup.env` (solo root: la legge systemd); il backup gira con un utente temporaneo (`DynamicUser`), non con
   «worker», e lo script eseguito è la copia di root in `/usr/local/lib/webora/`. `ferma` non spegne il backup. Comandi: `installa-backup`, `backup`, `stato-backup`; `avvia` accende anche il
   timer del backup. **Ripristino** sul proprio computer: scaricare l'archivio
   (`scp worker@2.31.7.149:/var/lib/webora-backup/db-AAAA-MM-GG.public.dump.age .`, serve `sudo` sul server per leggerlo
   oppure copiarlo prima in /tmp), poi `age -d -i chiave.txt -o public.dump db-AAAA-MM-GG.public.dump.age` e
   `pg_restore --no-owner --no-privileges -d "<stringa del nuovo progetto Supabase>" public.dump` (idem per `auth`, con
   `--data-only`). Provato il 22/10 su un database locale: 17.500 aziende ripristinate.
8. Altri comandi: `prova-contatti`, `giro`, `giro-contatti`, `stato`, `ferma`; dopo un aggiornamento del codice
   `bash worker.sh installa` (scarica da main, installa osmium se manca e riscrive i servizi; il segreto resta).

## Sviluppo locale

```bash
cp .env.example .env.local   # e compila le variabili
npm install
npm run dev                  # http://localhost:3000
npm test                     # test della logica applicativa
npm run test:engine          # test dei nodi n8n
PGHOST=... PGUSER=... npm run test:sql   # test delle funzioni SQL su un Postgres locale
```

Gli stessi controlli girano a ogni push su GitHub (`.github/workflows/ci.yml`). Il cron di Vercel (`vercel.json`, ogni
notte alle 3:00 UTC) chiama `/api/cron/watchdog`: giri bloccati, scadenze dei crediti, ricerche ricorrenti, avviso
settimanale del lunedì, pulizia del magazzino.
