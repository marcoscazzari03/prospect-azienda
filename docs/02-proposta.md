# 2. Proposta: piattaforma SaaS di lead generation B2B

> Nome di lavoro: **Tracciato** — "Lead B2B con la fonte". Da sostituire con il brand legato al
> tuo dominio. Tutti i prezzi sono IVA esclusa e i costi sono **stime da verificare** sui
> listini attuali dei fornitori prima del lancio.

---

## 2.1 Concept e posizionamento

### Il problema
Chi vende B2B oggi sceglie tra:
- **database enormi** (Apollo, ZoomInfo, Lusha, Cognism): abbonamenti costosi, dati spesso
  vecchi, pensati per SDR esperti, deboli fuori da USA/UK e sulle piccole imprese europee;
- **liste comprate** da agenzie: nessuna fonte, duplicati, email inventate, rischio GDPR;
- **ricerca manuale**: ore di lavoro per poche decine di contatti.

### La proposta
Una piattaforma in cui descrivi il cliente ideale in italiano ("agenzie di marketing a Madrid e
Lisbona, 10-200 dipendenti, CEO o fondatore") e ricevi **lead freschi, cercati su misura in
quel momento, ognuno con la sua fonte verificabile**, pagando solo quelli consegnati.

### Posizionamento: "ricerca su misura, non database"
| | Database (Apollo & co.) | Tracciato |
|---|---|---|
| Dati | Archivio aggiornato a cicli | Ricerca live sul web per ogni ordine |
| Copertura | Forte su grandi aziende USA/UK | Forte su PMI e studi professionali europei, nicchie locali, lingue locali |
| Trasparenza | Email "verificata" senza spiegazioni | Ogni lead ha **fonte**, **stato email** e **punteggio qualità** spiegato |
| Prezzo | Abbonamento a posti, minimi annuali | Crediti, paghi solo i lead consegnati |
| Utente | SDR esperto | Imprenditore, agenzia, consulente: wizard in 4 passi |

**Il vantaggio difendibile non è l'AI** (tutti la usano), ma le **regole di qualità** già
collaudate nel tuo workflow + la **trasparenza** (stato email distinto, fonte, garanzia) +
il **magazzino** che cresce a ogni ricerca (vedi 2.5) e abbassa i costi nel tempo.

### Clienti target (in ordine di priorità)
1. **Agenzie di lead generation / marketing** che rivendono campagne ai loro clienti (volumi alti, ricorrenti).
2. **PMI e startup B2B** senza team SDR (wizard semplice, pacchetti).
3. **Organizzatori di eventi, premi, media** (il tuo caso Le Fonti: target di nicchia per paese).
4. **Consulenti e professionisti** (piccoli volumi, piano gratuito come porta d'ingresso).

### Messaggio della landing
- Titolo: *"I tuoi prossimi clienti, con nome, ruolo e fonte."*
- Sottotitolo: *"Descrivi chi cerchi. Troviamo aziende reali e i contatti giusti sul web, li
  verifichiamo e paghi solo quelli che ricevi."*
- Prova: *"Nessuna email inventata. Ogni contatto ha la sua fonte."* + garanzia rimborso.

---

## 2.2 Modello di business e pricing

### Scelta: crediti + abbonamenti, con pacchetti per chi compra una volta
- **Crediti** come unica "moneta": semplice da capire, assorbe le differenze di costo tra tipi
  di email, rende i margini prevedibili.
- **Abbonamenti mensili** per i ricorrenti (ricavo prevedibile, crediti a prezzo migliore,
  funzioni in più).
- **Pacchetti una tantum** per chi vuole provare o ha bisogni saltuari.
- **Piano gratuito** limitato per l'acquisizione (con controlli anti-abuso).
- **Enterprise** su richiesta (API, volumi, fatturazione annuale).

Scartato: **prezzo a posto/utente** (penalizza le agenzie, nostro target principale) e
**abbonamento illimitato** (incompatibile con costi variabili per ricerca).

### Quanto costa un lead (in crediti)
Si paga **in base all'email effettivamente consegnata**, non alla modalità scelta. La modalità
scelta decide solo cosa è accettabile:

| Email consegnata | Stato | Crediti |
|---|---|---|
| Generica aziendale (info@, sales@...) trovata sul sito ufficiale | `found_public` | **1** |
| Nominativa trovata sul sito ufficiale | `found_public` | **2** |
| Nominativa da arricchimento con verifica SMTP | `validated` | **3** |
| Ipotizzata (nome.cognome@) | `guessed` | **0** — mai venduta come email, mostrata solo come suggerimento |

| Modalità scelta | Cosa ricevi | Prezzo indicativo |
|---|---|---|
| Email generiche incluse | Nominative quando le troviamo, altrimenti generiche | 1-2 crediti (anche una nominativa verificata costa al massimo 2) |
| Solo nominative | Solo email riferibili alla persona | 2-3 crediti |
| Mista | Cerchiamo prima nominative (più insistenza e arricchimento), poi generiche | 1-3 crediti |

Prima di avviare, il wizard mostra **una stima** ("tra 120 e 190 crediti") e **riserva il
massimo**; a fine ricerca si addebita il consumato e il resto torna disponibile.

### Listino iniziale
| Piano | Prezzo | Crediti | Note |
|---|---|---|---|
| **Gratis** | 0 € | 15 una tantum | Email aziendale verificata, max 1 ricerca attiva, export CSV, nessuna carta |
| **Pacchetto 100** | 49 € | 100 | Validi 12 mesi |
| **Pacchetto 500** | 199 € | 500 | Validi 12 mesi |
| **Pacchetto 2.000** | 690 € | 2.000 | Validi 12 mesi |
| **Starter** | 49 €/mese | 150/mese | Rollover 1 mese, ricerche salvate |
| **Growth** ★ | 149 €/mese | 600/mese | + ricerche ricorrenti, liste, note, 3 utenti, export Excel |
| **Scale** | 399 €/mese | 2.000/mese | + API, 10 utenti, integrazioni CRM, priorità |
| **Enterprise** | da 1.500 €/mese | su misura | Contratto, DPA dedicato, SLA |

Crediti extra per abbonati: −20% rispetto ai pacchetti. Annuale: 2 mesi gratis.

### Margini (stima)
Costo variabile per lead consegnato (AI + web search + pagine + arricchimento + verifica):

| Tipo | Costo stimato | Ricavo (Growth, 0,25 €/credito) | Margine lordo |
|---|---|---|---|
| Generica `found_public` | 0,02-0,06 € | 0,25 € | ~80-90% |
| Nominativa dal sito | 0,03-0,10 € | 0,50 € | ~80-90% |
| Nominativa `validated` (RocketReach) | 0,40-1,00 € | 0,75 € | **da −30% a +45%** ⚠️ |

Conseguenze già incorporate nel progetto:
- il **tetto di arricchimento** per ricerca (`enrichment_cap`) lo decide il backend in base al
  piano e al budget del giro: l'arricchimento non può mai mangiare il margine;
- priorità a fonti gratuite (sito) e al **magazzino** (lead già trovati, riverificati);
- da negoziare un piano RocketReach a volume o aggiungere un fornitore più economico in
  cascata. Se non si scende sotto ~0,35 €/email validata, portare la nominativa validata a 4
  crediti.

Costi fissi stimati all'avvio: 150-350 €/mese (vedi 2.7). Punto di pareggio: circa 5-10 clienti
Growth.

### Pagamenti, fatture, rimborsi
- **Stripe** (Checkout, Billing, Customer Portal, Stripe Tax per IVA UE e reverse charge B2B,
  verifica Partita IVA/VIES).
- **Fattura elettronica SDI** per i clienti italiani: Stripe non la invia allo SDI → integrazione
  con un provider (es. Fatture in Cloud, Aruba, Openapi) via webhook Stripe `invoice.paid`.
  Per i clienti esteri basta la fattura Stripe.
- Rinnovi, upgrade/downgrade pro-rata, cancellazione a fine periodo e recupero pagamenti falliti
  gestiti da Stripe; il nostro DB si aggiorna dai webhook Stripe (fonte di verità per lo stato).

### Politica equa su crediti, rimborsi e sostituzioni
1. **Paghi solo ciò che ricevi**: se la ricerca trova 37 lead su 50, paghi 37 e i crediti
   riservati tornano disponibili. Mai riempire con dati non conformi.
2. **Top-up automatico**: se mancano lead, il sistema fa fino a 2 giri extra con ricerche
   diverse, senza costi aggiuntivi oltre ai lead consegnati.
3. **Garanzia bounce (30 giorni)**: email con hard bounce → credito restituito. Il cliente carica
   il report di bounce o segnala il lead; noi riverifichiamo automaticamente.
4. **Segnalazione "non conforme" (14 giorni)**: ruolo sbagliato, azienda chiusa, fuori filtro →
   rimborso automatico fino al 10% dell'ordine, oltre revisione dall'admin.
5. **Nessun duplicato**: un lead già consegnato allo stesso cliente non viene mai riaddebitato
   (vincolo a livello di database).

---

## 2.3 Esperienza utente

### Direzione visiva: "Il registro"
Invece del solito SaaS viola-gradiente, un'identità ispirata a **registri, schede e archivi**:
la qualità del prodotto è la *tracciabilità*, e il design la rende visibile.

- **Palette**: carta calda `#F6F3EC` (sfondo), inchiostro `#141A1F` (testo), **verde
  registro `#0F5C4D`** (azione primaria, fiducia), **ambra timbro `#E0A526`** (evidenze, stato
  "in corso"), rosso mattone `#B4472C` (errori). Modalità scura: fondo `#0E1316`, verde `#3FB59A`.
- **Tipografia**: *Fraunces* (titoli, carattere editoriale con personalità) + *Inter* (interfaccia)
  + *JetBrains Mono* (email, domini, crediti: tutto ciò che è "dato").
- **Elemento firma**: il **"bollino di provenienza"** su ogni lead (icona timbro + stato email:
  `Trovata sul sito`, `Verificata`, `Ipotizzata`) che al passaggio mostra la fonte con link.
- **Animazione**: la ricerca in corso come un registro che si compila riga per riga (Realtime),
  con i contatori "aziende trovate → verificate → consegnate". Movimenti brevi, rispettando
  `prefers-reduced-motion`.
- Accessibilità: contrasto AA, tutto navigabile da tastiera, etichette per screen reader.

### Landing (ordine delle sezioni)
1. Hero con **demo interattiva del wizard** (si scrive il target, si vede un'anteprima di 3 lead
   di esempio *etichettati come esempio*) + CTA "Prova gratis: 15 crediti".
2. "Come funziona" in 3 passi (Descrivi → Cerchiamo e verifichiamo → Scarichi).
3. **Anatomia di un lead**: un lead esploso con fonte, stato email, punteggio.
4. Confronto onesto con database e liste comprate.
5. Prezzi con **calcolatore** (quanti lead × tipo email = crediti = €).
6. Garanzia e GDPR (pagina dedicata, non solo un footer).
7. FAQ, casi d'uso per settore, CTA finale.

### Onboarding (meno di 2 minuti al primo valore)
1. Registrazione (email + password o Google/Microsoft), verifica email aziendale.
2. Una domanda: "Cosa vendi e a chi?" → l'AI propone un **primo target precompilato**.
3. Prima ricerca gratuita già impostata (10 lead) → "Avvia". Email quando è pronta.

### Wizard di ricerca (4 passi, linguaggio non tecnico)
1. **Chi cerchi** – settore (testo libero + suggerimenti), paesi/regioni/città, dimensione,
   fatturato se disponibile, parole chiave incluse/escluse.
2. **Chi contattare** – ruoli (chip: Titolare/CEO, Marketing, Vendite, HR, IT, Acquisti,
   personalizzato), contatti per azienda (1-3).
3. **Che email vuoi** – le 3 modalità come carte con esempio, costo in crediti e tasso di
   successo atteso.
4. **Quanti** – slider, stima crediti min/max, opzione "ricerca ricorrente ogni mese",
   riepilogo e avvio.

### Dashboard cliente
- **Home**: crediti disponibili/riservati, abbonamento e rinnovo, ricerche in corso (con barra
  di avanzamento live), ultimi lead, qualità media, suggerimento di nuova ricerca.
- **Ricerche**: elenco con stato (In coda · In corso · Completata · Parziale · Fallita), dettaglio
  con timeline degli eventi, risultati, crediti addebitati/rilasciati, "Ripeti" e "Salva come
  ricorrente".
- **Lead**: tabella con filtri (paese, settore, ruolo, tipo/stato email, punteggio, ricerca,
  lista, data), ricerca testuale, colonne configurabili, scheda laterale con fonte e storico,
  note, tag, segnala problema.
- **Liste**: raccolte personali (es. "Campagna ottobre"), export per lista.
- **Export**: CSV ed Excel con mappature pronte per HubSpot, Pipedrive, Salesforce, Mailchimp,
  Brevo, MailUp, Lemlist. Ogni export registrato (chi/quando/quanti).
- **Fatturazione**: piano, crediti, storico movimenti (ledger), fatture scaricabili, portale Stripe.
- **Team** (Growth+): inviti, ruoli (Owner, Admin, Membro), crediti condivisi.
- **Statistiche**: lead per mese, distribuzione per paese/ruolo/tipo email, costo medio per lead,
  tasso di bounce segnalato.

### Pannello amministratore
- **Panoramica economica**: MRR, ricavi, crediti venduti/consumati, **costi variabili per
  fornitore** (OpenAI, RocketReach, verifica), margine lordo per giorno, piano, cliente e
  modalità email; costi fissi inseriti manualmente; churn e conversione free→paid.
- **Clienti e organizzazioni**: ricerca, scheda con piano, crediti, ricerche, pagamenti, note;
  azioni: accredito/storno crediti (con motivo, sempre a ledger), sospensione, impersonazione in
  sola lettura (registrata nell'audit).
- **Prezzi e piani**: listino, costo in crediti per tipo email, tetti di arricchimento e lotti per
  piano, coupon; sincronizzati con Stripe.
- **Ricerche e motore**: coda, run in corso, durata, errori, link all'esecuzione n8n, ripetizione
  manuale, kill switch globale del motore.
- **Qualità**: tasso lead/candidati, scarti per motivo (dai `stats` del motore), bounce e
  segnalazioni per settore/paese, revisione segnalazioni, gestione **lista di opposizione** e
  richieste GDPR.
- **Supporto**: ticket dal widget in app collegati a utente e ricerca.
- **Log**: audit log di tutte le azioni amministrative e sensibili.

---

## 2.4 Architettura tecnica

### Stack scelto
| Livello | Scelta | Perché |
|---|---|---|
| App web | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** | Un solo codice per landing (SEO) e app, ecosistema maturo |
| Database e auth | **Supabase (Postgres, Auth, RLS, Realtime, Storage)** — regione UE (Francoforte) | Isolamento dati con Row Level Security, avanzamento live senza infrastruttura extra |
| Pagamenti | **Stripe** (+ provider SDI per le fatture italiane) | Abbonamenti, IVA UE, portale cliente |
| Motore | **n8n Cloud** (la tua istanza) | Riutilizzo del know-how, modifiche rapide senza deploy |
| Hosting | **Vercel** (regione `fra1`) | Deploy da GitHub, anteprime per branch, dominio e SSL automatici |
| Email | **Resend** (transazionali) | Notifiche "ricerca pronta", fatture, reset password |
| Monitoraggio | **Sentry** + log Vercel + uptime check | Errori e allarmi |
| Job e cron | Tabella `search_runs` in Postgres + **Vercel Cron** (watchdog, rinnovo crediti, pulizia GDPR) | Nessun servizio di code esterno per l'MVP |

### Flusso di una ricerca
```
Wizard ──► POST /api/searches  (server: valida, calcola stima, RISERVA crediti in transazione)
              │
              ├─ crea search + search_run(run_token hash)
              └─ POST webhook n8n (segreto server-side) ──► 200 accepted
                                                     │
n8n: piano AI → ricerca lotti → deduplica → email dal sito → arricchimento → classificazione
                                                     │
POST /api/engine/callback (progress) ──► search_events ──► Supabase Realtime ──► UI live
POST /api/engine/callback (results) ──► dedup per cliente + opposizioni → deliveries
                                       → addebito crediti per lead → costi run
                                       → top-up o chiusura + rilascio crediti + email al cliente
```

### Modello dati (Postgres)
```
organizations(id, name, vat_id, country, stripe_customer_id, plan_id, status)
memberships(org_id, user_id, role)                         -- owner | admin | member
profiles(user_id, full_name, locale)

plans(id, name, monthly_price, monthly_credits, max_users, enrichment_cap_per_run, features jsonb)
credit_prices(email_type, email_status, credits)          -- listino crediti modificabile da admin
subscriptions(org_id, stripe_subscription_id, plan_id, status, current_period_end, cancel_at)
credit_ledger(id, org_id, delta, kind, reference, expires_at, created_by, created_at)
   -- append-only: grant | purchase | reserve | release | charge | refund | adjust | expire
   -- saldo = somma; vincolo applicativo: disponibile >= 0
payments(org_id, stripe_invoice_id, amount, currency, status, sdi_status, pdf_url)

searches(id, org_id, created_by, name, target jsonb, email_mode, quantity,
         contacts_per_company, status, recurring_rule, credits_reserved, credits_charged)
search_runs(id, search_id, attempt, run_token_hash, status, started_at, finished_at,
            n8n_execution_id, stats jsonb, usage jsonb)
search_events(id, search_id, run_id, stage, message, counters jsonb, created_at)
run_costs(run_id, provider, units, unit_cost, total)

-- Magazzino dei lead (condiviso, mai esposto direttamente ai clienti)
companies(id, domain UNIQUE, name, website, country, city, industry, size_hint, last_verified_at)
people(id, company_id, person_key UNIQUE, full_name, first_name, last_name, job_title,
       linkedin_url, discovery_url, last_verified_at)
emails(id, person_id NULL, company_id, address UNIQUE, type, status, source, source_url,
       verified_at, bounce_count)

-- Ciò che il cliente ha acquistato (copia immutabile al momento della consegna)
deliveries(id, org_id, search_id, person_id, email_id, snapshot jsonb, credits,
           delivered_at, UNIQUE(org_id, person_key))
lead_lists(id, org_id, name) · lead_list_items(list_id, delivery_id)
lead_notes(id, delivery_id, user_id, body) · lead_reports(id, delivery_id, reason, status, refund_ledger_id)
exports(id, org_id, user_id, format, rows, filters jsonb, created_at)

suppression_list(hash_email, hash_domain, reason, created_at)   -- opposizioni GDPR globali
gdpr_requests(id, kind, email_hash, status, handled_by, handled_at)
support_tickets(id, org_id, user_id, subject, status, search_id)
audit_log(id, actor_id, action, target, metadata jsonb, created_at)
```

### Sicurezza
- **RLS** su tutte le tabelle del cliente: ogni query è filtrata per `org_id` di cui l'utente è
  membro; il magazzino (`companies/people/emails`) non è leggibile dai client, solo via
  `deliveries.snapshot`.
- Operazioni sui crediti solo in **funzioni SQL transazionali** (`reserve_credits`,
  `charge_delivery`, `release_credits`) chiamate dal server con service role; mai dal browser.
- Segreti (Stripe, n8n, Supabase service key) solo in variabili d'ambiente server; webhook
  Stripe con verifica firma; callback n8n con segreto + `run_token` + idempotenza.
- Rate limit su API e wizard, captcha sulla registrazione, blocco email usa-e-getta per il piano
  gratuito, 2FA per admin, audit log.
- Header di sicurezza (CSP, HSTS), dipendenze aggiornate (Dependabot), backup.

### Backup, monitoraggio, scalabilità
- Supabase Pro: backup giornalieri + Point-in-Time Recovery (add-on) ; export settimanale
  cifrato su storage esterno.
- Sentry su frontend/backend, alert su: run falliti > 10%/ora, callback rifiutati, saldo crediti
  negativo, webhook Stripe in errore, costi giornalieri sopra soglia.
- Scalabilità: il collo di bottiglia è n8n (esecuzioni concorrenti) e i rate limit dei
  fornitori. Il backend limita i run concorrenti (coda in Postgres) e n8n può passare a un piano
  con più concorrenza o a self-hosting in *queue mode* con worker multipli.

---

## 2.5 Idee da fondatore (oltre a quanto richiesto)

1. **Magazzino dei lead** — ogni ricerca arricchisce un archivio comune (aziende, persone,
   email con fonte e data di verifica). Le ricerche successive servono prima dal magazzino i lead
   freschi (verificati < 90 giorni) e non ancora venduti al cliente, poi cercano sul web solo il
   resto. Effetti: consegna in secondi, costo marginale vicino a zero, margine che cresce col
   tempo. È anche la base per l'**anteprima gratuita** ("ci sono ~240 aziende così, eccone 3").
2. **Ricerche ricorrenti**: "ogni mese 50 nuovi lead con questo target" → retention da
   abbonamento naturale.
3. **Segnali di intento** (v2): aziende che assumono, hanno aperto una sede, hanno appena
   lanciato un prodotto → lead "caldi" a più crediti.
4. **API e integrazioni CRM** come leva per le agenzie (piano Scale).
5. **Programma agenzie / white label**: le agenzie rivendono con il loro marchio.
6. **Messa in discussione**: suggerisco di **non** promettere "email verificate" in generale, ma
   di vendere *trasparenza* (stato per ogni email). È più credibile e riduce rimborsi e
   contestazioni.

---

## 2.6 MVP e fasi successive

| MVP (lancio) | Fase 2 | Fase 3 |
|---|---|---|
| Landing, prezzi, pagine legali | Ricerche ricorrenti | API pubblica |
| Registrazione, login, organizzazione (1 utente) | Team e ruoli | White label agenzie |
| Wizard 4 passi + stima crediti | Liste, note, tag | Segnali di intento |
| Ricerca asincrona con avanzamento live | Export Excel + mappature CRM | Integrazioni CRM native (HubSpot, Pipedrive) |
| Risultati: tabella, filtri, scheda lead con fonte | Magazzino con consegna dal cache | Verifica SMTP multi-fornitore |
| Export CSV | Verifica SMTP email del sito | Enrichment a cascata |
| Crediti (ledger), pacchetti, abbonamenti Stripe, fatture | Fattura SDI automatica* | Self-hosting n8n in queue mode |
| Garanzia: segnalazione + rimborso automatico | Statistiche avanzate cliente | |
| Admin: clienti, crediti, ricerche, costi e margini, opposizioni | Ticket di supporto in app | |
| Opt-out GDPR pubblico + lista di opposizione | Programma referral | |

\* Se vendi da subito a clienti italiani, la fattura elettronica SDI è **obbligatoria** già al
lancio: all'inizio può essere gestita emettendo le fatture dal tuo gestionale attuale a partire
dai pagamenti Stripe, poi automatizzata.

---

## 2.7 Costi operativi e rischi

### Costi fissi mensili stimati (avvio)
| Voce | Stima |
|---|---|
| Vercel Pro | ~20 $ |
| Supabase Pro (+ PITR facoltativo) | ~25-125 $ |
| n8n Cloud (già in uso; verificare il piano per concorrenza ed esecuzioni) | ~25-120 € |
| RocketReach (abbonamento a lookup) | da verificare; è la voce più importante |
| Resend, Sentry, uptime | 0-50 $ |
| Provider SDI | ~5-30 € |
| Dominio, email aziendale | ~10 € |
| **Totale** (escluso RocketReach) | **~150-350 €/mese** |

Costi variabili: OpenAI (ricerca web + token) ~0,05-0,20 € per lotto da 20 candidati; Stripe
~1,5% + 0,25 € per pagamento UE; verifica SMTP 0,1-0,4 cent per email.

### Rischi principali
| Rischio | Impatto | Mitigazione |
|---|---|---|
| **Normativa sulle email commerciali** (in Italia art. 130 Codice Privacy: per email promozionali serve in genere il consenso anche verso indirizzi aziendali; regole diverse in ogni paese) | Alto: i clienti usano i dati per cold email | Termini d'uso che rendono il cliente responsabile dell'uso lecito; guida per paese nel prodotto; **parere legale prima del lancio** |
| GDPR: siamo titolari dei dati che raccogliamo (B2B, interesse legittimo) | Alto | Vedi 2.8; DPIA, LIA, registro dei trattamenti, informativa art. 14, opposizione |
| Costo arricchimento sopra il ricavo | Medio | Tetti per ricerca, prezzi in crediti per tipo, magazzino, fornitori alternativi |
| Allucinazioni AI | Medio | Fonte obbligatoria, sito ufficiale verificato con download reale, email solo se presenti nella pagina o validate |
| Termini d'uso di siti e fornitori | Medio | Niente scraping di LinkedIn o siti che lo vietano; solo pagine pubbliche dei siti aziendali, con rate limit; rispetto dei termini di RocketReach sulla rivendita (**da verificare**: alcuni fornitori vietano la rivendita dei dati) |
| Dipendenza da n8n Cloud / OpenAI | Medio | Contratto API versionato: il motore è sostituibile; fallback su altri modelli |
| Abuso del piano gratuito | Basso | Verifica email aziendale, captcha, limiti per IP/dominio |
| Repository pubblico | Medio | Oggi `prospect-azienda` è **pubblico**: proposta, prezzi e logica del motore sono visibili. Consiglio di renderlo privato |

---

## 2.8 GDPR e provenienza dei dati (sintesi operativa)

- **Base giuridica**: legittimo interesse (art. 6.1.f) per la raccolta di dati professionali
  pubblici di referenti aziendali, documentato con un *Legitimate Interest Assessment*.
- **Minimizzazione**: solo nome, ruolo, azienda, email/sito professionali, fonte. Niente dati
  personali privati, telefoni personali o social privati.
- **Trasparenza (art. 14)**: informativa pubblica sulla piattaforma; obbligo contrattuale per il
  cliente di fornire l'informativa al primo contatto (testo pronto fornito da noi); valutare con
  il legale se applicare l'eccezione dello "sforzo sproporzionato".
- **Diritti degli interessati**: pagina pubblica `/privacy/opposizione` (verifica via email) →
  inserimento nella **lista di opposizione globale** (hash dell'email e, se richiesto, del
  dominio); i lead opposti spariscono dalle consegne future e vengono segnalati ai clienti che li
  hanno già acquistati.
- **Conservazione**: dati del magazzino riverificati o cancellati dopo 24 mesi; consegne
  conservate per la durata del contratto del cliente + termini fiscali; log 12 mesi.
- **Ruoli**: piattaforma titolare per il magazzino; il cliente diventa titolare autonomo per i
  lead acquistati. Accordi: Termini, Privacy, DPA con i fornitori (Supabase, Vercel, OpenAI,
  RocketReach, n8n) con dati in UE dove possibile.
- **Documenti da preparare** (con un legale): Termini di servizio, Informativa privacy, Cookie
  policy, Policy di uso accettabile, DPIA, registro dei trattamenti.

---

## 2.9 Piano di sviluppo e pubblicazione

| Settimana | Obiettivo | Risultato verificabile |
|---|---|---|
| 0 (fatto) | Analisi, proposta, nuovo motore n8n | Questo documento, workflow "Lead Engine | Search (v1)" inattivo, test dei nodi |
| 1 | Fondamenta | Repo Next.js, Supabase (schema + RLS + funzioni crediti con test), auth, deploy su Vercel con dominio di staging |
| 2 | Ricerca end-to-end | Wizard, `POST /api/searches`, webhook n8n, callback, avanzamento live, risultati in tabella |
| 3 | Monetizzazione | Stripe Checkout/Billing/Portal, ledger crediti, pacchetti e abbonamenti, fatture |
| 4 | Admin e qualità | Pannello admin (clienti, crediti, ricerche, costi/margini), segnalazioni e rimborsi, opposizione GDPR |
| 5 | Design e landing | Identità visiva completa, landing con calcolatore, onboarding, email transazionali |
| 6 | Beta privata | 10-20 utenti invitati, monitoraggio costi reali per lead, correzione prezzi |
| 7 | Lancio | Pagine legali validate, dominio di produzione, Stripe live, attivazione del motore |

Pubblicazione: GitHub → Vercel (anteprima per ogni branch, produzione da `main`), dominio
collegato via DNS a Vercel (`TUO-DOMINIO.it` per la landing, `app.TUO-DOMINIO.it` per l'app),
Supabase in UE, segreti in Vercel/n8n, motore n8n attivato solo dopo i test end-to-end.

---

## 2.10 Decisioni che servono da te prima del codice

1. **Dominio e nome del brand** (serve per configurazione, callback n8n, email e Stripe).
2. **Chi fattura**: quale società (ragione sociale, P.IVA) e quale gestionale/provider SDI usi.
3. **Account**: va bene usare Vercel, Supabase e Stripe (da creare o già esistenti)?
4. **Listino**: confermi i prezzi e i crediti di 2.2 o vuoi partire più alti/bassi?
5. **Repository**: lo rendiamo privato?
