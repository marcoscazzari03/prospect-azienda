# Registro delle modifiche e delle decisioni

Da interrogare per tornare su passi precedenti: **cosa** è cambiato, **perché**, **dove** (file, migrazioni,
workflow) e **come tornare indietro**. Regola dal 20/10/2026: ogni modifica e ogni decisione si scrive qui,
nello stesso commit della modifica. Le voci più recenti stanno in alto.

Fonti complementari: `git log` (storia completa del codice, dal 09/10) · `00-checklist.md` (stato dei lavori) ·
`archivio/05-da-fare.md` (storico fino al 19/10) · versioni dei workflow su n8n (cronologia di ogni workflow).

Come tornare indietro, in generale:
- **Codice dell'app:** `git revert <commit>` e push su main (Vercel ripubblica da solo).
- **Workflow n8n:** cronologia delle versioni del workflow (ogni modifica ha un nome), oppure si ricarica il
  codice del nodo dal repository a un commit precedente.
- **Database:** le migrazioni non si annullano da sole; per ognuna qui sotto è indicato cosa rifare.

---

## Decisioni e regole in vigore

| Data | Decisione | Motivo |
|---|---|---|
| 22/10 | **Ricerche consigliate (punti 84–85):** domanda «Di cosa si occupa la tua attività?» alla prima apertura dell'app, non nella registrazione; Haiku propone 3 ricerche solo verso aziende e solo se il database ha i lead; chi vende solo a privati riceve un messaggio onesto, non ricerche forzate. Interruttore nell'Admin: prima solo admin, per tutti con Avvisto dopo il 25/10 | utile ai mestieri che oggi non trovano il loro servizio nel wizard, senza vendere crediti a chi non può usarli e senza sporcare i numeri della beta |
| 22/10 | Produzione solo con il database coperto anche per manifattura, uffici e studi professionali in tutte le regioni (soglia proposta: 500 aziende con contatto per regione principale e macro-settore). Fonti ammesse: OpenStreetMap, siti delle aziende, annunci, Common Crawl; no Google Maps, PagineGialle, Registro Imprese; albi professionali solo dopo il parere del legale | oggi 22% di aziende con contatto, Centro e manifattura quasi vuoti (decisione dell'utente) |
| 22/10 | Prezzi di Claude Haiku 5.5 (usato da «Settore aziende» e «Siti aziende»): 0,10 $ per milione di token in ingresso e 0,50 $ in uscita fino a 100.000 token per richiesta (0,50/2,50 $ oltre); circa 0,092 € e 0,46 € con il cambio delle tariffe della migrazione 020. Le ricerche web costano a parte, come per Sonnet. Misura del 22/10: 3 giri del Settore (114.782 token in ingresso, 46.655 in uscita) ≈ 0,03 €, non 0,30 € come stimato nel resoconto | i costi dei workflow con Haiku non erano scritti da nessuna parte (proposta 3 del resoconto); fonte: documentazione Anthropic dei modelli |
| 22/10 | Agenti per livello di rischio (CLAUDE.md): revisione prima della produzione (main, migrazione, nodi n8n) e non prima di ogni push sul branch; livelli 0–3; designer solo per pagine nuove o cambi di flusso; seconda revisione solo se la correzione va oltre il proposto o tocca il livello 3; brief e risposte corti | meno tempo e token, stessa sicurezza (decisione dell'utente) |
| 22/10 | `sales-copywriter`, `ui-ux-designer` e `business-analyst` sul modello Sonnet (`model: sonnet` nei file degli agenti); `code-reviewer`, `qa-tester` e `data-quality` restano sul modello principale. Indietro: `model: inherit` | più veloci ed economici dove non serve il massimo (decisione dell'utente) |
| 20/10 | «Prospect \| Search» e «Prospect Avvocati \| Search» su n8n sono di un altro progetto **attivo**: non toccarli e non proporre di disattivarli. Usano ChatGPT, non la chiave Anthropic di Webora | indicazione dell'utente |
| 20/10 | Nessuna promessa di «contatto senza consenso» nel marketing finché il legale non risponde per iscritto (art. 130 vale anche per le aziende secondo il Garante) | rischio legale |
| 20/10 | Il listino non promette funzioni che l'app non ha (tolto «Fino a 3 utenti») | fiducia dei clienti |
| 20/10 | Frase di apertura dei lead: costruita dalla prova, **senza AI** (costo zero, niente dettagli inventati) | qualità e costi |
| 21/10 | **Pagamenti:** finché la chiave Stripe non è live (`sk_live_`/`rk_live_`), acquisti e portale solo per gli amministratori (`checkoutAllowed` in `src/lib/server/stripe.ts`); sul sito i pulsanti dei prezzi portano alla registrazione | con la chiave di test un cliente avrebbe pagato con una carta di prova e ricevuto crediti veri |
| 21/10 | Il futuro worker del controllo siti (punto 49) girerà sul VPS Hetzner dell'utente, da reinstallare; n8n Cloud resta per motore, Adzuna, OSM e settore. Dopo il 30/10 | niente tetto di esecuzioni, segnali «certificato in scadenza» e PageSpeed, costo già sostenuto |
| 21/10 sera | Sospeso anche il promemoria del 24–25/10 alle agenzie del 19/10; **Supabase Pro** rinviato alla messa in produzione definitiva | decisione dell'utente |
| 21/10 sera | **Cambio di tattica:** inviti nuovi in pausa per 3–4 giorni per vedere se rispondono le 13 agenzie invitate; intanto si sistema tutto il lato tecnico e di sicurezza (checklist 70–73). Se non risponde nessuno, verso il 25/10 si passa al nome nuovo **Avvisto** (marchio verificato libero dall'utente, avvisto.it libero) | decisione dell'utente |
| 21/10 | **Nome nuovo:** una parola, staccato da Webora; dominio .it a parte su Hostinger, aggiunto al Business Web Hosting che c'è già (niente server nuovo); l'app resta su Vercel; passaggio dopo il 30/10, con la seconda ondata (checklist 65–69) | costo minimo (circa 16 €/anno in più) e nessun cambio a metà beta |
| 21/10 | Beta: inviti a 15 al giorno dal 22 al 24/10; promemoria alle agenzie del 19/10 il 24–25/10 (non il 27/10); se il 30/10 le agenzie attive sono meno di 3, decisione rinviata al **6/11** | arrivare al 30/10 con abbastanza giorni d'uso (Business Analyst) |
| 21/10 | **Pagine che non sono il sito** (blocco anti-bot, dominio in vendita, pagina del server, trasloco, pagina provvisoria): segnali della homepage non determinabili e vecchie prove tolte (`invalid_page`, migrazione 055). Gli errori momentanei (404, 5xx) danno non determinabile ma **non** tolgono le prove | prove false ai clienti senza perdere prove vere per un guasto passeggero |
| 21/10 | **Squadra di agenti:** questa chat coordina; per ogni domanda si interpellano gli agenti pertinenti; il `code-reviewer` rivede ogni modifica di codice, SQL o n8n prima di ogni push, e con «NON PRONTO» non si pubblica (regola in `CLAUDE.md`) | richiesta dell'utente |
| 20/10 | Inviti della beta: invio largo a circa 50 agenzie nei prossimi giorni, anche più nella stessa città; email singole da leads@, 10–15 al giorno (dettagli in `10-beta.md`) | ottenere almeno qualche risposta |
| 20/10 | Beta allargata a una decina di agenzie in più (Sud ed Emilia-Romagna). Decisione sulla seconda ondata il **30/10** con soglie in percentuale: almeno 3 agenzie attive, esporta almeno la metà (minimo 2), almeno 1 risposta, segnalati sotto il 10% | con 3 agenzie il campione era troppo piccolo |
| 20/10 | ~~Decisione del 28/10: 2 agenzie su 3 esportano, 1 ha una risposta, segnalati sotto il 10%~~ (sostituita la sera stessa) | decidere sui numeri |
| 20/10 | Ogni modifica e decisione va in questo registro, nello stesso commit | richiesta dell'utente |
| 19/10 | Niente verifica in due passaggi su Anthropic, Resend, Hostinger, Cloudflare, Icypeas (scelta dell'utente) | — |
| 19/10 | Sconto beta: −30% per 12 mesi a chi continua dopo la beta | — |
| 19/10 | Beta: prima ondata Sud ed Emilia-Romagna (Gopher, Mutart, Studio360); il Nord dopo il 28/10, se ci sono almeno 40–50 aziende pronte per servizio | copertura del database |
| 18/10 | «Solo azienda»: nessun dato di persone; referenti spenti fino al parere legale | GDPR, posizionamento |
| — | Mai chiavi o segreti in chat o nel repository (pubblico) | sicurezza |
| — | Push su main solo dopo che le migrazioni da cui dipende l'app sono state eseguite | evitare errori in produzione |
| — | Il dettaglio delle vulnerabilità resta solo in `06-audit-sicurezza.md` (escluso dal repository) | repository pubblico |

---

## 23/10/2026 — ricerche consigliate: «Cancella la descrizione», sezione nel profilo, lead ricontati ogni notte · su main (Code Reviewer «pronto con riserve», corrette; testi del Sales Copywriter)
- **Cosa:** pulsante «Rimuovi» (azione `clearBusinessProfile`: descrizione, zona e proposte cancellate, il riquadro torna alla
  riga «Vuoi ricerche già pronte…»); sezione «La tua attività» in Account → Profilo (solo con l'interruttore acceso) con
  «Modifica e aggiorna le proposte» (apre il modulo nella Panoramica, `/app?attivita=modifica#attivita`) e «Rimuovi»;
  `recountSuggestions` nel cron notturno (`/api/cron/watchdog`, 3:00 UTC): ricontano i lead di tutte le proposte di Haiku già
  salvate, senza chiamare Haiku, fino a 10 organizzazioni a notte; i tentativi salvano la proposta intera e `countedAt`.
  Testo «I numeri si aggiornano ogni notte».
- **Revisione:** un conteggio in errore o il tempo finito lasciano le proposte di prima (non si svuotano); scadenza a 240 s
  dall'inizio del cron, controllata anche tra un conteggio e l'altro; il ricalcolo non sovrascrive se il cliente ha
  cancellato o rifatto le proposte (condizione su `business_suggested_at`); diagnosi `db` separata per ogni chiamata.
- **Testi (Sales Copywriter):** «Cosa offri alle aziende?», «circa X aziende» / «oltre 500 aziende», «Cancella la descrizione»,
  «Crea una ricerca», «Non parte niente da solo: le controlli e le avvii tu», «Paghi solo i lead consegnati, con i crediti»;
  scartato «aziende con un motivo documentato» (non vale per le ricerche semplici).
- **Perché:** richiesta dell'utente («aggiorna tutti i giorni» e «cancella»): aggiornamento automatico invece di un
  interruttore, perché costa zero (niente Haiku).
- **Indietro:** revert del commit.

## 23/10/2026 — ricerche consigliate: «oltre 500 lead» · su main
- **Cosa:** quando il conteggio arriva al tetto (501 aziende lette) e quasi tutte sono raggiungibili, la scheda dice «oltre 500
  lead» invece di «circa 500» (`leadsLabel` in `src/lib/domain/suggestions.ts`). Richiesta dell'utente.
- **Indietro:** revert del commit.

## 23/10/2026 — ricerche consigliate: con un servizio e pochi lead, la ricerca semplice dello stesso settore · su main
- **Cosa:** in `generateSuggestions` una proposta con servizio (ricerca di opportunità) sotto i 10 lead si ricalcola senza
  servizio e si propone come ricerca semplice; i tentativi salvano anche `offer`.
- **Perché (trovato con la diagnosi):** per «Studio commercialista» Haiku legava tutte le proposte al servizio «Amministrazione /
  contabilità», cioè «aziende con un annuncio recente per contabile»: in tutta Italia 12 ristoranti, 18 imprese edili, quindi
  0 proposte. La 070 era giusta; il conteggio a mano dava 501 perché era una ricerca semplice.
- **Indietro:** revert del commit.

## 23/10/2026 — ricerche consigliate: risposta grezza del database nei tentativi (diagnosi) · su main
- **Cosa:** `business_suggestions.tried[].db` (conteggi di `availability_contacts`, tipo di ricerca e target) e `at`.
- **Perché:** «Studio commercialista» in tutta Italia contava ancora Ristorante 3 dopo la 070, mentre la stessa chiamata a
  mano nel SQL Editor dava 501 con email; «Web agency» (ricerche con servizio, `opportunity_pool`) funziona.
- **Indietro:** togliere `debug` da `src/lib/server/suggestions.ts` quando la causa è trovata.

## 23/10/2026 — ricerche consigliate: errori visibili, risposta più lunga, conteggi due alla volta · su main
- **Cosa:** se il calcolo nuovo fallisce, la pagina mostra l'errore sopra le proposte di prima (prima sembravano nuove:
  «cache»); conteggio in errore salvato come -1 nei tentativi (non 0); `max_tokens` di Haiku da 1.500 a 4.000 (11:56: «Unterminated
  string in JSON»); conteggi due alla volta invece di sei insieme. File: `src/components/suggested-searches.tsx`,
  `src/lib/server/suggestions.ts`.
- **Perché:** dopo la migrazione 070 l'admin vedeva ancora «nessuna proposta» senza capire se il calcolo fosse nuovo.
- **Indietro:** revert del commit.

## 23/10/2026 — disponibilità: prima le aziende con un contatto (migrazione 070) · rivista (Code Reviewer «pronto», QA «pronto con riserve» corrette); da eseguire, poi nessun deploy necessario
- **Cosa:** `availability_contacts` (065) leggeva al massimo 501 aziende del gruppo, prese come capitava; ora ordina prima
  quelle con l'email, poi il solo modulo, poi le aziende ancora da provare, infine quelle provate senza email, come la
  riserva (`supabase/migrations/20261214000070_availability_ready_first.sql`, test SQL 41). QA: 0,05–0,55 s in più con
  10.000 aziende nel gruppo; con la regione circa 2 s, quasi tutti spesi nel calcolo delle candidate (già prima).
- **Perché:** nei settori grandi le 501 erano quasi tutte «email non trovata»: Ristorante in tutta Italia contava 3 lead
  (ricerche consigliate dell'admin, 23/10), e lo stesso errore c'era nella stima del wizard.
- **Indietro:** ripristinare la funzione dalla 065.

## 23/10/2026 — ricerche consigliate: 100 proposte al giorno per l'admin · su main
- **Cosa:** `saveBusinessProfile` in `src/app/app/actions.ts`: tetto giornaliero 100 per l'admin, 10 per gli altri.
- **Perché:** l'admin le prova e arrivava al limite (23/10). Costo massimo circa 3 centesimi al giorno.
- **Indietro:** revert del commit. Per sbloccare a mano: `delete from rate_events where kind = 'business_suggestions';`.

## 23/10/2026 — ricerche consigliate solo sui settori del database · su main (Code Reviewer «pronto con riserve», corrette)
- **Cosa:** Haiku riceve l'elenco dei 144 settori del database (`src/lib/domain/db-sectors.ts`, uguale a `SETTORI` di
  `n8n/annunci/nodes/lib-osm.js`, controllato da un test) e deve sceglierne uno per proposta; `sanitizeAnswer` tiene solo
  le proposte con un settore dell'elenco, usa le parole chiave del settore (non quelle di Haiku), toglie i doppioni e ne
  tiene fino a 6 (se ne mostrano 3). Per i servizi utili a tutte le aziende il prompt chiede settori concreti con molte
  piccole attività. Senza zona, il messaggio «nessuna proposta» parla della descrizione, non della zona.
- **Revisione:** il settore è un `z.enum` nello schema della risposta (Haiku non può scriverlo diverso), niente parole
  chiave chieste a Haiku (non servivano), settori diversi e non quasi uguali in ogni proposta. Limite noto: i settori di
  più parole («Trasporti e logistica») contano solo le aziende che hanno tutte le radici del nome.
- **Perché:** «Studio commercialista» in tutta Italia dava 0 proposte: settori generici («PMI», «artigiani») e parole chiave
  che le aziende non hanno restringevano il conteggio a meno di 10.
- **Indietro:** revert del commit.

## 23/10/2026 — ricerche consigliate: «Dove cerchi clienti?» invece di «Dove lavori?» · su main
- **Cosa:** etichetta, esempio («Es. Milano e Monza») e aiuto («Province o regioni, anche più di una. Vuoto: tutta Italia.») del
  campo zona in `src/components/suggested-searches.tsx`; riassunto con «Tutta Italia» se vuoto; prompt di Haiku «Zona in cui
  cerca clienti» (`src/lib/server/suggestions.ts`).
- **Perché:** il campo è la zona delle ricerche proposte, non la sede dell'attività (osservazione dell'utente); un solo campo.
- **Indietro:** revert del commit. Nessun dato da cambiare (`business_area` resta la stessa colonna).

## 23/10/2026 — partita IVA delle aziende (migrazione 069) e correzioni della revisione del punto 92 · rivisto (Code Reviewer «pronto», QA «pronto con riserve» corrette); da fare: migrazione 069, main, VPS
- **Cosa:** migrazione `20261213000069_company_vat.sql`: `vat_valid(text)` (stesse regole di `pivaValida` del worker),
  colonna `companies.vat_number` (`''` se non nota, controllo e indice parziale, non unica), `store_imported_companies` come
  la 048 più `vat` (azienda con la partita IVA già di un altro dominio non importata, contata tra le scartate),
  `store_company_checks` come la 055 più `company.vat` (scritta solo se manca e se non è già di un'altra azienda). Worker:
  funzioni della partita IVA in `worker/piva.mjs`, usate da `cc.mjs` e dal controllo siti (`site-checks.mjs` manda `vat`);
  route `companies-import` e `site-checks` accettano `vat`. Test SQL 40, test del worker.
- **Correzioni della revisione (Code Reviewer, «NON PRONTO»):** regex con tempi quadratici su pagine costruite apposta
  (città senza limite di parole, `<script`/`<header` senza chiusura, `<` senza `>`): ora funzioni lineari, luogo cercato
  entro 6.000 caratteri dalla partita IVA, test con pagine di 1,5 MB (meno di 300 ms); giro entro i 50 minuti del servizio
  (pagine fino a 30, settore fino a 40); `\bvat\b` come etichetta; tetto di 1.000 chiamate al giorno su
  `/api/engine/companies-classify` (`rate_hit`).
- **Seconda revisione (Code Reviewer, «pronto con riserve»):** una partita IVA della web agency scritta sul primo cliente
  restava per sempre e faceva scartare gli altri: ora `vat_sightings` e `vat_seen()` contano su quanti domini compare (1 =
  dell'azienda, 2 = stessa azienda con due siti, 3 o più = fornitore, tolta da tutte); un dominio già presente si aggiorna
  sempre invece di essere scartato; `vat_number <> ''` nelle ricerche per usare l'indice; `lock_timeout` di 5 s.
- **Limite accettato (Code Reviewer):** una web agency con soli 2 clienti nel database resta con la sua partita IVA sul
  primo e il secondo non entra (e non si ripropone per un anno da Common Crawl); due import in parallelo con la stessa
  partita IVA possono scriverla entrambi (indice non unico: nessun errore).
- **Seconda QA («pronto con riserve»):** una partita IVA scritta male non fa più rifiutare tutto il lotto (`.catch` nelle
  route `site-checks` e `companies-import`); i doppioni li decide solo il database (tolto `senzaDoppioni` dal worker, che gli
  nascondeva la terza volta); i crediti valgono solo per la partita IVA che segue («Sito by Pixel P.IVA … | Rossi Srl P.IVA …»).
- **Correzioni della QA («NON PRONTO»):** dominio con «--» che faceva fallire il giro (nome di riserva) e analisi di ogni
  pagina protetta da un try/catch; crediti «sito by», «web agency», «a cura di»; città con trattino o «nell'»
  («Bolzano-Bozen», «Reggio nell'Emilia»); og:site_name generico («Il mio blog WordPress») ignorato; siti non aperti
  riprovati dopo 30 giorni (segnati «x» in `cc-provati.tsv`); `stato` mostra anche il timer di Common Crawl.
- **Perché:** la partita IVA (decisione dell'utente del 23/10) evita doppioni tra fonti diverse con domini diversi e si potrà
  mostrare nei lead.
- **Indietro:** ripristinare `store_imported_companies` dalla 048 e `store_company_checks` dalla 055; la colonna si può
  lasciare. Worker: revert del commit.

## 23/10/2026 — aziende da Common Crawl (punto 92) · codice pronto, in revisione; non installato sul VPS
- **Cosa:** nuovo worker `worker/cc.mjs`: elenco dei domini .it dal grafo pubblico di Common Crawl (1.487.050 di secondo
  livello), homepage aperta dal VPS, tenute solo le attività con partita IVA valida (non nei crediti della web agency, non
  codici fiscali di enti che iniziano per 8 o 9, non domini in vendita), nome, città e provincia dalla pagina, doppioni per
  partita IVA esclusi. Nuova route `/api/engine/companies-classify` (segreto del worker): settore e parole chiave da Claude
  Haiku con lo stesso testo di «Aziende | Settore» (`src/lib/domain/industry.ts`), chiave solo su Vercel. Import con origine
  `cc` (`companies-import` accetta `"cc"`). Comandi `prova-cc`, `giro-cc`, `stato-cc`, `avvia-cc` in `worker.sh`; servizio
  `webora-cc` ogni 3 ore alle :25, **non** acceso da `avvia`. Test in `worker/test.mjs` (sezione 10) e
  `tests/industry.test.ts`. Documento vivo `docs/16-common-crawl.md`.
- **Misura del campione:** 600 domini, 300 aperti, 124 con partita IVA valida (21%), 87 con città (70%).
- **Perché:** allargare il database alle aziende che non sono in OSM né negli annunci (manifattura, uffici, studi), senza
  elenchi di terzi. Il settore da Haiku perché «Aziende | Settore» su n8n classifica 120 aziende ogni 4 ore e non le `cc`.
- **Dove:** `worker/cc.mjs`, `src/app/api/engine/companies-classify/route.ts`, `src/lib/domain/industry.ts`,
  `src/app/api/engine/companies-import/route.ts`, `scripts/vps/worker.sh`.
- **Indietro:** `bash worker.sh ferma` (o `sudo systemctl disable --now webora-cc.timer`); le aziende importate si tolgono
  con `delete from companies where origin = 'cc'` (prima controllare che non abbiano lead consegnati); revert del commit
  per la route.
- **Costo:** circa 0,01 centesimi per azienda (Haiku), circa 0,50 € al giorno al ritmo proposto.

## 23/10/2026 — checklist riscritta, query della resa giornaliera, approfondimento del punto 92 · documenti e query di sola lettura
- **Cosa:** `docs/00-checklist.md` riscritta tutta allo stato del 23/10 (nuove voci 49b, 85a, 85b, 85g, 89b, 91b, 94–97; 69
  superato perché il VPS lavora). Nuova query `supabase/queries/resa_giornaliera.sql`: R1 aziende nuove, siti controllati,
  email e moduli trovati giorno per giorno (14 giorni); R2 imbuto di oggi; R3 campi coperti (settore, città, email, modulo,
  tecnologie, almeno un segnale) su tutte le aziende e sui lead pronti. Provata su un Postgres locale con tutte le migrazioni.
- **Punto 92, proposta (da decidere, nessun codice):** elenco dei domini .it dal grafo pubblico dei domini di Common Crawl
  (file scaricabile, niente scraping di elenchi); homepage letta dal VPS con le stesse regole di `siti-osm.mjs`; si tiene solo
  chi mostra una partita IVA valida (cifra di controllo), poi nome, città, settore, email e modulo dalle pagine. Prima una
  prova su 5.000 domini per misurare la resa, poi il giro intero. Si parte solo quando il controllo siti non ha arretrato:
  oggi il collo di bottiglia è il controllo siti (circa 55.850 aziende in attesa al 23/10), non il numero di aziende.
- **Perché:** l'utente vuole allargare il database e sapere quanti lead pronti nascono al giorno e quali campi copriamo.
- **Indietro:** nulla da annullare (documenti e query di sola lettura).

## 22/10/2026 — rotazione dei segreti del motore (punto 17) · completata il 22/10 (A e B verificati, `vercel.json` online con `5e44953`)
- **Cosa:** l'utente ha cambiato `ENGINE_CALLBACK_SECRET` (n8n → app, credenziale n8n «Lead Engine - Callback verso
  backend», usata da tutti i workflow) e `N8N_ENGINE_HEADER_VALUE` (app → n8n, credenziale «Lead Engine - Webhook in
  ingresso») su Vercel e in n8n. Valori generati nel browser (`crypto.randomUUID()`), mai in chat né nel repository.
- **Intoppo:** il Redeploy dal pannello di Vercel è stato annullato in 1 s dal nostro `ignoreCommand` (stesso commit = nessuna
  differenza = build saltata), quindi l'app ha continuato a usare il segreto vecchio: due controlli siti a mano in 401
  (esecuzioni 3991, 3992). Risolto pubblicando su main (`bb5707b`, con un commento cambiato in `src`); controllo a mano
  3993 riuscito (150 aziende salvate). Il giro automatico delle 12:25 UTC era partito prima del cambio.
- **Correzione di `vercel.json`:** `ignoreCommand` salta la build solo se il commit è diverso da quello già pubblicato; un
  Redeploy dello stesso commit ora costruisce davvero (provato in locale: stesso commit → pubblica, solo documenti → salta,
  codice cambiato → pubblica, senza commit precedente → pubblica). Vale dal prossimo push su main.
- **Deploy fallito (975ac36):** Vercel accetta un `ignoreCommand` di al massimo 256 caratteri; con la condizione nuova erano
  274 («Deployment failed», online resta `bb5707b`). Accorciato a 232 con la forma breve `':!…'` di `':(exclude)…'`, stessa
  logica (provato: stesso commit → pubblica, solo documenti → salta, codice → pubblica, vuoto o inesistente → pubblica).
- **Da ricordare:** dopo aver cambiato una variabile su Vercel serve una pubblicazione nuova; finché questa correzione non è
  online, il Redeploy dal pannello va fatto con «Redeploy» senza cache o con un push su main.
- **Segreto B:** il primo valore non coincideva (ricerca di prova mai arrivata a n8n: l'app risponde «Il motore di ricerca non
  ha risposto» e restituisce i crediti); su Vercel le variabili «Sensitive» non si possono rileggere, quindi l'utente ha messo
  un valore nuovo su entrambi i lati e il deploy `5e44953` l'ha letto. Verifica: ricerca di prova in target arrivata al
  motore (esecuzioni 3995 e 3996 riuscite). Una prima ricerca da 1 lead era stata servita dal magazzino senza il motore.
- **Indietro:** rimettere i valori precedenti su entrambi i lati (o due valori nuovi uguali sui due lati); per `vercel.json`
  togliere la condizione `[ "$P" != "$(git rev-parse HEAD)" ]`.

## 22/10/2026 — pulizia dei dati di collaudo (punto 19) · eseguita il 22/10 (resta solo «Webora», 1 utente)
- **Inventario** (`supabase/queries/inventario_collaudo.sql`, sola lettura): 3 organizzazioni, tutte dell'utente. «Webora»
  (admin, 44 ricerche e 195 lead di collaudo), «Scazza» e «Prova» (nessuna ricerca, solo i crediti di benvenuto).
- **Decisione dell'utente:** cancellare «Scazza» e «Prova» con i loro utenti; tenere «Webora» (storico dei collaudi: costi,
  resa del motore, misure usate dalla pagina Admin e dal resoconto; i suoi 195 lead escludono quelle aziende solo dalle
  ricerche di prova dell'admin).
- **Script:** `supabase/queries/pulizia_collaudo_22_10.sql`, un solo blocco: si ferma se le due organizzazioni hanno
  ricerche, lead, segnalazioni, acquisti o avvisi, o se nome e piano non corrispondono; cancella un utente solo se non è
  admin e non è in altre organizzazioni. Aziende, controlli, prove dei segnali e annunci restano. Provato su un database di
  prova (blocco con una ricerca, pulizia, seconda esecuzione bloccata, admin membro di «Prova» non cancellato).
- **Revisione:** Code Reviewer PRONTO, QA FUNZIONA. Aggiunti i controlli su pagamenti, abbonamenti, cliente Stripe, ticket,
  esportazioni e liste, e il blocco delle due righe tra controllo e cancellazione. QA: acquisto, segnalazione, avviso, nome
  diverso, piano diverso, già cancellata → si ferma; utente anche in Webora → resta; crediti di Webora e aziende invariati.
- **Indietro:** non si torna indietro se non dal backup; gli account si possono ricreare con una nuova registrazione.

## 22/10/2026 — disponibilità come la riserva, prova del certificato, filtro porte nel motore · in produzione (migrazione 065 eseguita e workflow pubblicati il 22/10)
- **Disponibilità (migrazione `20261209000065_availability_like_reserve.sql`):** `availability_contacts` toglie come la riserva
  portali e piattaforme, pagine ospitate e aziende fuori target dal nome; prima le aziende con email potevano risultare di
  più (QA del punto 40). Banco: 0,15–0,48 s come prima. Test 37. Indietro: `availability_contacts` dalla 063.
- **Prova del certificato (`lib-controlli-sito.js`):** con un errore sul nome del certificato la prova non dice più
  «scaduto» o «autofirmato»: decide solo la regola del nome (Data Quality, 22/10: jmpshop «scaduto» con un certificato di un
  altro dominio valido fino al 2027). Test in `n8n/engine/test/run.mjs`. **jmpshop non è risolto da questa regola:**
  l'errore salvato da n8n (esecuzione 3979) è solo «certificate has expired» (Node segnala la catena scaduta prima del
  nome), quindi da lì non si capisce che il certificato è di un altro sito. Il segnale resta giusto (l'HTTPS non funziona),
  cambia solo il dettaglio. La regola serve quando il messaggio contiene entrambi. Le funzioni `opportunity_availability` e
  `target_availability` restano senza i tre filtri: l'app non le usa più (Code Reviewer).
- **Motore allineato al controllo siti:** i nodi «Valuta segnali sito» e «Controlli tecnici sito» non avevano ancora il
  filtro sulle porte (ripasso del 22/10) né le regole del 21/10 su «Senza HTTPS» (domini in vendita, traslochi, indirizzo
  vero dichiarato su un altro dominio), caricate finora solo nel controllo siti. Si caricano con la regola del certificato;
  nel controllo siti cambia solo «Valuta siti».
- **Dove:** `KlpbVKZWttHa0L14` («Valuta segnali sito», «Controlli tecnici sito»), `bMlXndGWBTMp66Fa` («Valuta siti»).
- **Indietro:** versioni precedenti dei workflow nella cronologia di n8n; `git revert`.

## 22/10/2026 — coda del controllo siti con priorità, seconda versione (punto 39) · in produzione (migrazione 064 eseguita il 22/10; primo giro delle 11:25 UTC riuscito: 150 aziende salvate in 92 s, prima circa 90 s)
- **Misura in produzione** (`supabase/queries/misura_039.sql`): 17.482 aziende, 4.588 da controllare (25 giorni), 44
  ricerche in 30 giorni con 23 zone/settori diversi, nessun avviso; la coda attuale (054) impiega già 2,1 s.
- **Banco di prova rifatto con le stesse dimensioni** (17.500 aziende, 44 ricerche; prima c'era una sola ricerca): coda
  attuale 1,07 s, 060 0,94 s. Gran parte del tempo è la compilazione JIT di Postgres (0,7 s): senza JIT 0,59 s e 0,33 s.
  Il fallimento della 060 in produzione (oltre 8 s) non si riproduce: serve il piano reale
  (`supabase/queries/misura_039_piano.sql`, esegue la 060 come semplice lettura).
- **Il piano reale non si ottiene:** in produzione la 060 supera il minuto dell'editor SQL (timeout), quindi i dati veri
  hanno una forma diversa dal banco. Prossima misura: `supabase/queries/misura_039_forma.sql` (zone e parole chiave delle
  ricerche, etichette e luoghi delle aziende, aziende da ricontrollare della 054, JIT), senza eseguire la 060.
- **Forma dei dati (22/10):** uguale al banco (zone 0,9 per ricerca, parole chiave 0,1, etichette 4,5, luoghi 2,8; 7.948
  aziende da ricontrollare della 054; JIT spento). Causa probabile: nella 060 l'elenco di zone e settori era una sottoquery
  che il piano può ricalcolare per ogni azienda in coda (sul banco la memorizzava). Nuova versione (064, non ancora
  migrazione): zone e settori calcolati una volta sola e passati come parametro. Banco, JIT spento: coda attuale 0,55 s,
  064 0,63 s. Prova in produzione come semplice lettura: `supabase/queries/misura_039_v2.sql`.
- **Prova in produzione (22/10):** 1,7 s (coda attuale 2,1 s, 060 oltre un minuto); 10.519 aziende in coda, 27
  combinazioni zona/settore, 150 su 150 aziende scelte nelle zone e nei settori cercati. Migrazione
  `20261208000064_site_checks_priority_v2.sql`, test `35_site_checks_priority_test.sql` aggiornato (zona e settore,
  settore su tutto il paese, scadute prima delle 054, ricerca vecchia con e senza avviso, permessi).
- **Differenze dalla 060 (Code Reviewer, 22/10):** due livelli invece di tre: tolto «zona di una ricerca con un altro
  settore» (più semplice; in produzione 150 su 150 aziende scelte sono già nella zona e nel settore cercati); un settore
  fatto solo di parole vuote (es. «di») non dà priorità invece di valere come «tutti i settori». Per rimettere il livello
  intermedio: aggiungere all'ordine un secondo `exists` sulla sola zona. Zone e parole chiave accettate solo come elenchi,
  altrimenti la ricerca vale come «tutto il paese» / «nessuna parola»; qualsiasi errore nel leggere le ricerche lascia la
  coda senza priorità (ordine della 061) invece di fermare il controllo siti; oltre 100 combinazioni restano quelle delle
  ricerche più recenti. Test 35: 406 «ok» in tutto. Dopo la migrazione: controllare la durata del primo giro orario.
- **Indietro:** rieseguire la 061 (coda della 054).

## 22/10/2026 — stima realistica nel wizard (punto 40) · migrazione 063 eseguita il 22/10; app pubblicata su main il 22/10
- **Problema:** il wizard mostra le aziende «disponibili» (`target_pool` / `opportunity_pool`), ma il pool non richiede
  un'email: una parte delle aziende non diventa un lead (nessuna email né modulo). «120 disponibili» può voler dire molti
  meno lead consegnati.
- **Primo passo:** `supabase/queries/resa_wizard.sql` (sola lettura): composizione delle aziende vive (con email, solo
  modulo, provate senza contatto, mai provate), lead validi e motivi di scarto dei giri degli ultimi 30 giorni, consegne.
  Con questi numeri si decide la resa da usare nella stima.
- **Misura (22/10):** 10.583 aziende vive: 2.015 con email (19%), 96 solo modulo, 52 provate senza contatto, 8.420 mai
  provate. Giri degli ultimi 30 giorni: 400 lead validi e 265 «nessuna_email» (circa 60% di resa, ma il motore prova prima
  chi ha già l'email). Consegnati 195 lead, 7 con il solo modulo.
- **Cosa:** migrazione `20261207000063_availability_contacts.sql`: `availability_contacts(org, target, contatti,
  opportunità)` divide le stesse aziende di `target_availability` / `opportunity_availability` (al massimo 501) in con
  email, solo modulo, provate senza contatto (90 giorni) e da provare. App: `searchAvailability` la usa al posto delle
  due funzioni; `expectedLeads` in `src/lib/domain/pricing.ts` (resa delle «da provare» 30–50%, `CONTACT_YIELD`);
  wizard: «Lead attesi: circa X–Y» / «Dal nostro database: circa X–Y lead» al posto del numero di aziende, tolto «Avvia
  la ricerca per scoprire altri risultati» (UI/UX: ambiguo); con le ricerche solo da annunci la spesa in crediti ed euro
  segue i lead attesi, la riserva resta sui lead richiesti. Test SQL 37, test in `tests/domain.test.ts`.
- **Prima la migrazione, poi main:** l'app nuova chiama `availability_contacts`; le funzioni di prima restano.
- **Revisione (Code Reviewer: pronto con riserve, corrette):** il massimo non supera le aziende esistenti (11 aziende non
  fanno «10–15»), senza aziende da provare niente forbice; solo annunci con aziende ma nessun contatto possibile: ricerca
  bloccata come con zero aziende; test 37 confronta i totali veri. Testi rivisti dal Sales Copywriter («non tutte
  avranno», «con la prova del segnale», «per arrivare a Z cerchiamo anche sul web»).
- **QA (funziona con problemi, corretti):** oltre 500 aziende (la funzione ne conta 501) il massimo resta quello
  richiesto, prima diceva «la ricerca si fermerà prima» a torto; niente «circa 0 lead» nelle ricerche che cercano anche
  sul web; crediti ed euro stimati seguono la forbice dei lead; frasi al singolare con una sola azienda; durante il
  ricalcolo resta la stima di prima (i crediti non saltano). **Aperti, c'erano già prima:** la disponibilità non toglie
  portali, pagine ospitate e aziende fuori target come fa la riserva (le aziende con email possono risultare un po' di
  più); arrotondamento degli euro a 10 centesimi sulle cifre piccole. Da ricontrollare la resa del 30–50% con
  `resa_wizard.sql` dopo qualche giorno.
- **Indietro:** `git revert`; `drop function public.availability_contacts(uuid, jsonb, integer, boolean)` dopo il revert.

## 22/10/2026 — controllo siti bloccato di notte da pagine enormi (proposta 1 del resoconto) · controllo siti in produzione (pubblicato il 22/10); motore in produzione (pubblicato il 22/10)
- **Problema:** 4 giri falliti di fila la notte del 22/10 (00:25–03:25 UTC, «Task runner unresponsive» in «Valuta siti»). La coda
  è sempre la stessa e un giro fallito non salva niente, quindi lo stesso lotto (ricontrollo della 054, Puglia) tornava ogni
  ora; è ripartito solo perché le aziende nuove di OSM sono passate davanti, e quel lotto è ancora in coda.
- **Causa (misurata):** non le regole del 21/10 ma la ricerca delle email: `[A-Z0-9._%+-]+@…` senza ancoraggio e le
  sostituzioni «[at]» con `\s*` iniziale crescono col quadrato su lunghe sequenze di base64 o di spazi (una homepage di 1,46 MB:
  4,2 s; 200 kB di spazi: 124 s).
- **Cosa:** espressioni lineari con `(?<!…)` in `lib-email-azienda.js` (controllo siti) e `05-estrai-email.template.js`
  (motore): sulle 255 pagine vere misurate, stesse email e tempo da 7,4 s a 1,3 s. In «Valuta siti» le pagine oltre 2 MB tengono
  il primo e l'ultimo MB. Test in `n8n/annunci/test/run.mjs` (pagina con 200.000 spazi e base64: sotto i 2 s, email trovata).
- **Dove:** «Aziende | Controllo siti» («Valuta siti»), motore («Estrai email homepage», «pagina 2/3/4»).
- **Indietro:** versioni precedenti dei workflow nella cronologia di n8n; `git revert`.

## 22/10/2026 — province che vanno in timeout su Overpass (proposta 2 del resoconto) · in produzione (workflow pubblicato il 22/10)
- **Problema:** notte del 22/10, timeout di Overpass su Brescia, Milano, Venezia, Verona, Vicenza e Bologna (zona della beta),
  anche se le grandi erano già divise in 3 richieste.
- **Cosa:** `n8n/annunci/nodes/10-prepara-osm.js`: le province `ENORMI` (MI, RM, NA, TO, BS, BO, VE, VR, VI) con una richiesta
  per tipo di attività (7, più leggere); Vicenza tra le grandi. `11-normalizza-osm.js`: le attività ripetute in più
  richieste (es. forno-bar: shop e amenity) contate una volta sola, altrimenti sembravano catene (Code Reviewer).
  Test in `n8n/annunci/test/run.mjs`; reso indipendente dalla data un test che dal 22/10 falliva per le notti di recupero.
- **Effetto atteso:** notti più lunghe (fino a circa 55 richieste invece di 40), meno province perse.
- **Indietro:** versione precedente del workflow «Aziende | Popolamento OSM» nella cronologia di n8n; `git revert`.

## 23/10/2026 — segnali nuovi dal VPS: certificato in scadenza e sito lento (punto 91, fase 1) · rivisto, migrazione 068 eseguita, su main; da fare: `installa` sul VPS (23/10 sera), poi Data Quality su un campione
- **Cosa:** il worker del controllo siti misura il certificato HTTPS (scadenza ed emittente, dal controllo HTTPS con il
  certificato verificato) e il tempo della prima risposta della homepage (`worker/http.mjs` restituisce `ms` e `cert`;
  `segnaliVps` in `worker/site-checks.mjs`). `cert_expiring`: entro 14 giorni (non 30: Let's Encrypt si rinnova a 30);
  `slow_site`: 4 s o più, entro 1,5 s «fail», in mezzo non determinabile. Migrazione 068: i due codici in
  `site_check_codes()`, quindi salvati come gli altri controlli. Regole in `docs/07-segnali.md`.
- **Fase 1:** solo dati, niente catalogo né motore: nessuna ricerca li chiede. **Fase 2** dopo il controllo di Data Quality
  su un campione: catalogo, servizi «Sicurezza del sito» e «Rifacimento del sito», ricerche solo dal database.
- **Prove:** `worker/test.mjs` (soglie, casi dubbi, certificato già scaduto, tempo passato al segnale), test SQL 39 (salvati
  come prove, codice sconosciuto fuori, prova tolta quando il sito torna veloce); 420 controlli SQL.
- **Revisione (Code Reviewer, pronto con riserve, corretto):** dopo un redirect verso un altro dominio certificato e tempo
  non sono dell'azienda: «non determinabile»; tempo misurato dalla connessione al sito, non dalla partenza (le code del DNS
  condivise tra le corsie facevano sembrare lenti i siti; `UV_THREADPOOL_SIZE=16` già nei servizi); «sito lento» solo con
  risposta 2xx (non una pagina d'errore lenta); schema della route a 12 controlli per azienda (erano esattamente 10 su 10).
  Verificato: `create_search` non è chiamabile dagli utenti (revoca nella 002), quindi nessuno può chiedere i codici nuovi.
  **Per la fase 2:** `cert_expiring` deve valere solo con `expires_at` futuro (`signal_is_fresh` tiene buone 30 giorni le
  prove dei siti, anche dopo un rinnovo).
- **Indietro:** ripristinare `site_check_codes()` della 051; versione precedente del worker.

## 23/10/2026 — pagine dell'app troppo larghe su telefono · in produzione dal 23/10
- **Cosa:** su iPhone Panoramica, Crediti e Lead occupavano metà schermo (pagina larga circa il triplo, poi rimpicciolita).
  Causa: griglie senza colonne fisse su telefono, che si allargano quanto la riga di testo più lunga anche se tagliata con
  i puntini. Riprodotto su Chromium a 402 px: pagina larga 1.225 px, 402 con la correzione. Wizard e Amministrazione erano a
  posto (colonne dichiarate).
- **Correzione:** `src/app/globals.css`, `.grid > * { min-width: 0 }` per tutte le griglie.
- **Indietro:** togliere la regola.

## 23/10/2026 — ricerche consigliate in dashboard (punti 84–85) · in produzione dal 23/10 solo per l'admin (migrazione 067 eseguita, `ANTHROPIC_API_KEY` su Vercel, main pubblicato); da fare: prove con descrizioni diverse, poi «Tutti» con Avvisto
- **Cosa:** riquadro «Di cosa si occupa la tua attività?» in cima alla dashboard (saltabile), proposte di Claude Haiku verso
  aziende, contate sul database come il wizard, schede che aprono il wizard compilato. Dettagli in
  `docs/15-ricerche-consigliate.md`. Nuova dipendenza `@anthropic-ai/sdk` 0.132.0 (versione di oltre due settimane fa).
- **Perché:** decisione del 22/10 (tabella in alto): utile ai mestieri che non trovano il loro servizio nel wizard.
- **Revisione (Code Reviewer, pronto con riserve, corretto):** «Salta per ora» non chiamava l'azione (era `formAction` su un
  pulsante che non invia il modulo); se Haiku non risponde si salvano solo descrizione e zona, le proposte buone di prima
  restano; oltre 4 proposte si ignorano invece di rifiutare la risposta; chiavi delle schede uniche. Verificati: scritture
  solo sull'organizzazione dell'utente, prompt injection senza effetti fuori dai testi del cliente stesso, limite di 10 al
  giorno, conteggio uguale al wizard. Testi rivisti dal sales-copywriter.
- **Prima prova (23/10):** «Falegnameria · Modena» senza proposte: si contavano solo le aziende con contatto già noto (8% del
  database, le nuove di OSM aspettano il controllo siti). Ora la stessa stima del wizard (valore basso di `expectedLeads`) e le
  proposte scartate salvate in `business_suggestions.tried` per le prove.
- **Seconda prova (23/10):** Haiku risponde bene (hotel, studi di architettura, imprese edili, negozi di arredamento per una
  falegnameria a Modena) ma tutte a 0 lead: ai dati della ricerca mancavano `roles`, `keywords` ed `excludeKeywords` vuoti,
  il controllo li rifiutava e il conteggio dava 0 in silenzio. Ora `suggestionSearchInput` (stessi campi del wizard), un
  test che li fa passare dal controllo vero e un messaggio nel log se il controllo rifiuta.
- **Indietro:** Admin → Servizi → «Spente» (il riquadro sparisce); drop delle colonne della 067.

## 23/10/2026 — worker del controllo siti fermo dopo l'import OSM · correzione pronta; da fare: revisione, main, `installa` sul VPS (stasera)
- **Cosa si è visto:** query oraria su `site_checked_at` (23/10): il worker ha salvato alle 15:05 e 15:35 UTC del 22/10, poi
  più niente; n8n «Aziende | Controllo siti» continua a 150 l'ora. La coda non è il problema (`pending_site_checks(300)` in
  9 s in produzione, sotto i 30 s del worker; 150 in 6 s); il salvataggio non dipende dal numero di aziende. Il worker dei
  contatti, che ha un tetto di 15 minuti, lavora (4.755 aziende in 24 ore). Ipotesi, da confermare con i log: con le 52.000
  aziende nuove di OSM (molti siti morti o lentissimi) il giro di 300 arrivava ai 20 minuti di systemd ed era interrotto
  prima dell'unico salvataggio finale, ogni volta.
- **Correzione:** `worker/site-checks.mjs` lavora a blocchi da 100, ognuno salvato subito, e non apre blocchi nuovi dopo
  12 minuti; pagina ridotta a 500 KB prima delle regole e avviso nel log per le valutazioni oltre 3 s (Code Reviewer: con
  i tempi massimi delle richieste un giro non arriva a 20 minuti, quindi la causa potrebbe essere un'espressione regolare
  bloccata su una pagina enorme, che ferma Node e con lui ogni tempo massimo; i log di stasera lo diranno); in caso di errore scrive anche il testo della risposta. `worker.sh`: `UV_THREADPOOL_SIZE=16` per controllo
  siti e contatti (risoluzioni DNS). Si spegne «Aziende | Controllo siti» su n8n solo dopo un giorno di worker regolare.
- **Indietro:** versione precedente di `worker/site-checks.mjs`, poi `bash worker.sh aggiorna`.

## 22/10/2026 — backup notturno cifrato del database sul VPS (punto 90) · rivisto, su main, **non installato** (22/10: l'utente rimanda, i backup arriveranno con Supabase Pro; il codice resta pronto)
- **Perché:** Supabase gratuito non ha backup scaricabili; il database ora ha circa 70.000 aziende e cresce ogni ora.
- **Cosa:** `scripts/vps/backup.sh` (servizio `webora-backup`, ogni notte alle 1:40 UTC): `pg_dump` di PostgreSQL 17 (repository
  ufficiale PGDG) dello schema `public` e dei dati di `auth.users` e `auth.identities`, controllo con `pg_restore --list` (si
  ferma se meno di 10 tabelle con dati), cifratura con age per la sola chiave pubblica; la chiave privata non sta sul
  server (la mostra una volta `installa-backup`, la tiene l'utente). Connessione in `/etc/webora/backup.env` come variabili
  di libpq (la password non passa mai sulla riga di comando). Tenuti 7 giorni più le domeniche fino a 35 giorni.
  `worker.sh`: `installa-backup`, `backup`, `stato-backup`; `avvia` e `ferma` comprendono il timer del backup se c'è.
- **Prove:** in locale su `bench39` (40 tabelle, 2,8 MB cifrati), ripristino in un database vuoto con le 17.500 aziende,
  pulizia degli archivi vecchi con date finte (tenuti gli ultimi 7 giorni e le domeniche entro 35 giorni).
- **Revisione (Code Reviewer, pronto con riserve, corretto):** il backup gira con un utente temporaneo di systemd
  (`DynamicUser`), non con «worker» che apre siti esterni; `backup.env` solo root (la legge systemd), script e chiave pubblica
  copiati da root in `/usr/local/lib/webora/`; password chiesta a parte (niente codifica `%xx` da fare a mano); motivo
  scritto anche con 0 tabelle; schermo e storico del terminale puliti dopo la chiave; `ferma` non spegne il backup.
- **QA (funziona con problemi, corretto):** prima del backup si contano le aziende (almeno 1.000, altrimenti si ferma: un
  database svuotato non sostituisce i backup buoni); avanzi in chiaro di un giro interrotto a forza cancellati all'inizio;
  i due archivi si cifrano entrambi e poi si sostituiscono insieme; password con spazi conservata; la stringa
  «Transaction pooler» (porta 6543) viene rifiutata. Provati: password sbagliata, disco pieno, chiave mancante, SIGTERM,
  secondo giro nello stesso giorno, chiave sbagliata, caratteri speciali nella password.
- **Limiti:** i backup stanno sullo stesso VPS (proteggono da un guasto di Supabase o da un errore, non dalla perdita del
  VPS); un backup fallito non manda ancora avvisi (lo si vede con `stato-backup`). Copia fuori dal VPS e avvisi: dopo.
- **Indietro:** `sudo systemctl disable --now webora-backup.timer`; `sudo rm /etc/webora/backup.env` per togliere la password.

## 22/10/2026 — annunci di lavoro anche per la manifattura (punto 89) · rivisto (Code Reviewer, Sales Copywriter), su main; in produzione dal 22/10 (nodi di «Annunci | Raccolta Adzuna» e «Lead Engine» pubblicati)
- **Perché:** manifattura e industria sono i settori più deboli; gli annunci per operai, manutentori e magazzinieri sono
  il segnale più forte che un'azienda industriale assume, e chi seleziona personale per l'industria è un cliente possibile.
- **Cosa:** tre figure nuove in `JOB_FAMILIES` (`src/lib/domain/signals.ts`): `production` (operai specializzati,
  produzione), `maintenance` (manutentori, tecnici di impianto e qualità), `logistics` (magazzino); servizio nuovo
  `recruiting_industry` «Selezione di operai e tecnici» (area HR). Campo `adzuna` delle figure: i titoli chiesti ad Adzuna
  (19 in più, quasi solo italiani: 86 ricerche ogni 2 giorni invece di 67; stima circa 1.800 chiamate al mese su 2.500),
  mentre tutti i titoli valgono per riconoscere gli annunci. `02-normalizza-annunci.js`: i mestieri di officina (CNC, PLC,
  CAD, saldatore, tornitore) prima erano fuori tema, ora vanno alla manifattura (mai a programmatori o grafici).
  Nessuna migrazione: le figure sono testo libero in `job_ads.family` e nel target.
- **Prove:** `n8n/annunci/test/run.mjs` (officina e manifattura, magazziniere, agenzie escluse, numero di ricerche);
  `tests/signals-catalog.test.ts` (titoli di Adzuna tra quelli della figura).
- **Revisione (Code Reviewer, «NON PRONTO», corretto):** un titolo di officina vale solo con un titolo della
  manifattura (prima «Tecnico commerciale CNC» o «Help desk CAD» finivano in «produzione»: lead pagati con la figura
  sbagliata); niente «operaio» da solo (edili e agricoli, e 5 pagine di Adzuna piene): cercati «operaio produzione»,
  «operaio metalmeccanico», «operaio specializzato»; operai edili, agricoli, comunali, delle pulizie esclusi dalla
  manifattura; «programmatore cad/cam» tra i titoli della produzione. 88 ricerche ogni 2 giorni. Corretto anche il difetto
  che c'era già nel motore (`09-verifica-annuncio.js`): un annuncio «Programmatore CNC» valeva per «Sviluppo software»; ora i
  mestieri di officina valgono solo per le figure della manifattura (nodo da caricare in «Lead Engine»).
- **Da guardare:** chiamate Adzuna nel riquadro dell'Admin dopo 2–3 giri (limite 2.500 al mese, 250 al giorno; caso
  peggiore circa 165 chiamate a giro). **Non avviare a mano** «Annunci | Raccolta Adzuna»: l'avvio a mano va indietro di
  30 giorni e con 88 ricerche supererebbe le 250 chiamate del giorno.
- **Indietro:** togliere le tre figure e il servizio, ricaricare i nodi 01 e 02 di «Annunci | Raccolta Adzuna».

## 22/10/2026 — sito delle attività OSM che non ce l'hanno (punto 88) · in produzione dal 22/10 (VPS, ogni ora alle :50)
- **Perché:** il popolamento OSM ha trovato 397.605 attività con un nome ma senza sito: senza dominio non entrano nel
  database. Solo la parte gratuita (domini indovinati); la ricerca web con Haiku per i casi difficili, con un tetto di spesa,
  è una decisione a parte.
- **Cosa:** `worker/siti-osm.mjs` (servizio `webora-siti`, ogni ora alle :50, 3.000 attività per giro, 16 in parallelo,
  massimo 40 minuti): legge le attività senza sito dal file del popolamento (`senza-sito.json`, rifatto quando il file
  cambia), sceglie prima uffici, manifattura e artigiani, salta i nomi presenti in 4 o più posti («Bar Sport») e quelle
  provate negli ultimi 180 giorni (`siti-provati.tsv`). Per ognuna: domini dal nome e verifica con i nodi n8n
  `03-domini-candidati.js` e `04-scegli-sito.js` eseguiti così come sono, più la conferma del luogo (città o provincia
  scritte sulla pagina). Le trovate vanno su `/api/engine/companies-import` con origine `osm_sito` (nuova nello schema della
  route). `osm.sh` ora scrive i file con un altro nome e poi li rinomina, perché il worker li legge ogni ora.
- **Prove:** `worker/test.mjs` (attività senza sito con provincia, sito trovato con nome e città, senza città serve la
  provincia, omonimo in un'altra città scartato, dominio in vendita scartato, priorità e riprova dopo 180 giorni).
- **Revisione (Code Reviewer, «NON PRONTO», corretto):** niente domini di una sola parola per i nomi che ne hanno di più
  (era la categoria: «Hotel Bellavista» → hotel.com, il portale con nome e città passava); la pagina deve restare sullo
  stesso dominio dopo i rimandi (non PagineGialle o Facebook); la provincia conta solo senza città, mai dopo «via»,
  «corso», «piazza» e mai per le province che sono parole comuni (Prato, Massa, Fermo, Latina...); lo stesso dominio per
  due attività nello stesso giro si scarta; cache scritta con un file temporaneo; in memoria solo le attività senza sito;
  `UV_THREADPOOL_SIZE=16` per le risoluzioni DNS.
- **Prova sul VPS (22/10, senza salvare):** 355.179 attività senza sito in elenco; 300 provate in 92 s, **32 siti trovati
  (11%)**: studi, agenzie immobiliari, assicurazioni, informatica. Controllati a mano 8 esempi: 6 giusti (titolo con il
  nome), 2 non apribili da qui (protezione anti-bot), nessuno sbagliato.
- **Primo giro vero (22/10, 16:12–16:18 UTC):** 3.000 attività in 366 s, **257 siti trovati (8,6%)**: 241 aziende nuove, 16
  già presenti. Giro ogni ora alle :50: circa 5 giorni per tutte le 355.000, stima 25–30.000 aziende nuove.
- **Indietro:** `sudo systemctl disable --now webora-siti.timer`; le aziende aggiunte hanno `origin = 'osm_sito'`.

## 22/10/2026 — tutta Italia da OpenStreetMap sul VPS (punto 87) · in produzione dal 22/10 (primo giro: 52.284 aziende nuove, 15.132 aggiornate; giro ogni lunedì alle 2:20 UTC); da spegnere «Aziende | Popolamento OSM» su n8n
- **Perché:** il popolamento n8n chiede a Overpass 8 province a notte (due settimane per un giro, province perse per i
  timeout: Milano, Brescia, Bologna...) e solo i tipi con sito; manifattura e uffici sono i settori più deboli del database.
- **Cosa:** `scripts/vps/osm.sh` (ogni lunedì alle 2:20 UTC, servizio `webora-osm`, dati in `/var/lib/webora-osm`): scarica
  `italy-latest.osm.pbf` da Geofabrik solo se cambiato (md5), tiene con osmium le attività dei tipi utili e i confini con
  il codice ISO; `worker/osm.mjs` assegna la provincia (indirizzo, altrimenti confini semplificati a circa 50 m) e passa le
  attività con sito al nodo n8n «Normalizza OSM» eseguito così com'è, poi le salva a blocchi di 2.000 su
  `/api/engine/companies-import` (ora apribile anche con `SITE_CHECKS_SECRET`, come le altre route del worker).
  Regole spostate in `n8n/annunci/nodes/lib-osm.js` (usate da n8n e dal worker), con due novità: stabilimenti
  `man_made=works` («Produzione industriale») e aree industriali di ogni tipo tranne porti, ferrovie, depositi, impianti
  di acqua, gas, elettricità e discariche (le categorie senza traduzione prendono il settore da Haiku). Le catene ora si
  contano su tutta Italia (stesso dominio su 3 o più punti), non sulle 8 province della notte.
- **Non ancora:** le attività senza sito restano nel file `attivita.geojsonseq` sul VPS (contate nel riepilogo come
  `senza_sito_con_nome`): servono al punto 88 (cercare il sito). Il nodo n8n caricato in «Aziende | Popolamento OSM» resta
  quello di prima: il workflow si spegne dopo il primo giro del worker.
- **Prove:** `worker/test.mjs` (filtri di osmium, confini con buchi, province dall'indirizzo o dai confini, fuori Italia,
  regole del nodo n8n, catene); `n8n/annunci/test/run.mjs` (fabbriche e aree industriali, non porti né torri); catena osmium
  provata su un file finto (attività, edificio, confine `IT-MO`); 300.000 attività su 107 province finte in 49 s, 320 MB.
- **Revisione (Code Reviewer, pronto con riserve, corretto):** `man_made` conta solo se vale `works` (un ristorante in
  una torre restava scartato); la stessa azienda segnata più volte entro circa 500 m (area industriale, edificio, ufficio)
  vale un punto solo, altrimenti sembrava una catena; nel riepilogo le province senza confine (`senza_confine`); confini
  letti in streaming; spazio libero controllato (6 GB) e file a metà cancellato; `apt-get update` prima di osmium;
  `Persistent=true` solo sul timer OSM.
- **QA (funziona con problemi, corretto):** il «stesso posto» conta solo gli oggetti che il nodo può tenere (con nome,
  senza Wikidata): un ufficio senza nome faceva sparire la fabbrica vera con lo stesso sito. Resta: un'azienda con 3 sedi
  lontane conta come catena (regola di sempre, ora su tutta Italia).
- **Prima prova sul VPS (22/10, senza salvare):** dopo due correzioni allo scaricamento (`-L`: Geofabrik rimanda al file
  del giorno, prima si salvava la pagina del rimando; impronta md5 riletta) 645.147 righe elaborate in 30 s, 106 province su
  107 (Aosta senza confine: in OSM è solo regione, ora presa da `IT-23`), 592.429 attività, 94.982 con sito → **69.557
  aziende** (oggi nel database circa 17.500), 397.605 senza sito ma con nome (per il punto 88); scartate 14.815 come catene,
  3.331 con sito non aziendale, 1.249 fuori.
- **Primo giro vero (22/10, 15:43–15:54 UTC, 276 s per l'elaborazione):** 107 province su 107, 70.012 aziende inviate:
  **52.284 nuove**, 15.132 aggiornate, 2.596 saltate (fuori target o in opposizione). Le nuove entrano nelle code del
  controllo siti e dei contatti (circa 4 giorni) e, se senza settore, di Haiku.
- **Indietro:** `sudo systemctl disable --now webora-osm.timer`; riaccendere «Aziende | Popolamento OSM» su n8n.

## 22/10/2026 — contatti per tutto il database (punto 86) · in produzione dal 22/10 (migrazione 066 eseguita, main pubblicato, primo giro: 150 aziende in 42 s, 116 siti letti, 18 email e 35 moduli salvati; giro alle :15 e :45 UTC)
- **Perché:** solo il 22% delle aziende vive ha un'email o un modulo (2.530 su 11.623): il controllo siti legge solo la
  homepage, le pagine «Contatti» e «Note legali» le apriva solo il motore durante una ricerca.
- **Cosa:** migrazione `20261210000066_contact_checks.sql`: colonna `contacts_checked_at`; `pending_contact_checks(n)` (sito
  vivo da 60 giorni, senza email né modulo, non cercata da 90 giorni, non provata dal motore da 90 giorni, non fuori
  target né in opposizione); `store_contact_checks(items)` (email solo del dominio o di un fratello, modulo solo su una pagina
  del dominio, la prima email non si sostituisce; pagine lette senza email: «email non trovata» come il motore; sito non
  letto: si riprova tra 7 giorni). Route `/api/engine/contacts` (stesso segreto del worker, `src/lib/server/worker-auth.ts`).
  `worker/contacts.mjs`: homepage più fino a 3 pagine scelte come il motore, email con `lib-email-azienda.js`, modulo come
  «Estrai email»; 150 aziende ogni 30 minuti (alle :15 e :45), al massimo 60 s per azienda. Nessuna AI, nessun costo.
- **Prove:** test SQL 38 (10 controlli, 417 in tutto); `worker/test.mjs` (pagine scelte, modulo, email del dominio e non la
  gmail, sito spento); coda in 0,35 s sul banco da 17.500 aziende.
- **Revisione (Code Reviewer, «NON PRONTO», corretto):** ricerca del modulo lineare e regex del `meta refresh` limitata
  (prima minuti di calcolo su una pagina ostile da 3 MB, che bloccava il giro); pagine oltre 500 KB ridotte a inizio e
  fine; contano solo le risposte 2xx (una 404 o una sfida anti-bot non scrive «email non trovata» né un modulo
  inesistente); dopo 15 minuti il giro non parte con altre aziende e salva quanto trovato (systemd lo ferma a 20).
- **QA (funziona con problemi, corretto):** sito non letto (spento, rete del VPS, tempo scaduto) di nuovo in coda dopo 7
  giorni e non dopo 90; modulo salvato all'indirizzo finale dopo i redirect (un modulo su un altro sito viene scartato dal
  database); homepage corta (sito in JavaScript): si provano i percorsi tipici. Resta: si guardano al massimo 50 `<form>`
  per pagina.
- **Indietro:** `bash worker.sh ferma` (ferma entrambi i giri; per il solo controllo siti riaccendere il suo timer);
  drop di `pending_contact_checks` e `store_contact_checks`.

## 22/10/2026 — worker del controllo siti sul VPS (punto 49) · in produzione dal 22/10 (giro vero: 300 aziende in 79 s; giro automatico alle :05 e alle :35 UTC acceso); «Aziende | Controllo siti» su n8n acceso fino al 23/10 per confronto
- **Cosa:** `worker/site-checks.mjs` fa il lavoro di «Aziende | Controllo siti» con le stesse regole (carica
  `lib-controlli-sito.js` e `lib-email-azienda.js` senza copiarli; valutazione come `09-valuta-siti.js`): 300 aziende per
  giro, 8 siti in parallelo, un giro ogni 30 minuti (systemd, `scripts/vps/worker.sh`). `worker/http.mjs`: richieste come i
  nodi n8n (HEAD con certificato verificato e 3 redirect per l'HTTPS; GET senza verifica, 5 redirect, 10 s per la pagina),
  più: niente indirizzi interni nemmeno dopo un redirect, solo porte 80/443, al massimo 3 MB per pagina.
- **App:** `SITE_CHECKS_SECRET` apre solo `/api/engine/site-checks` (il server non ha il segreto del callback del motore);
  entrambi i segreti devono avere almeno 32 caratteri.
- **Prove:** `node worker/test.mjs`: esiti identici a «Valuta siti» su 120 casi (16 pagine × 2 indirizzi × 4 esiti HTTPS),
  indirizzi interni, porte e protocolli rifiutati, redirect, gzip, limite di 3 MB, 404, HEAD.
- **Servizio:** systemd con `ProtectSystem=strict`, `ProtectHome`, `NoNewPrivileges`, `MemoryMax=1G`; segreto in
  `/etc/webora/site-checks.env` (root:worker, 640), mai nel repository.
- **Revisione (Code Reviewer: NON PRONTO, corretto):** tempo massimo su tutta la richiesta, redirect e lettura compresi
  (prima un sito che manda un byte al secondo restava aperto: con 8 così si perdeva il giro) e 30 s al massimo per azienda;
  un redirect verso un indirizzo malformato era un'eccezione non gestita che fermava il worker, ora è un rifiuto; bloccati
  anche gli IPv6 che incapsulano un IPv4 (NAT64, 6to4, Teredo) e solo 192.0.0.0/24 e 192.0.2.0/24 invece di 192.0.x;
  niente `deflate` tra le compressioni accettate (alcuni server lo mandano grezzo). Differenza nota da n8n: un redirect
  dell'HTTPS verso un IP o una porta non standard dà «non determinabile» invece di «no».
- **Dopo:** una settimana di giri del worker, poi «Aziende | Controllo siti» su n8n si spegne (circa 720 esecuzioni al mese).
- **Indietro:** `bash worker.sh ferma` e riaccendere il workflow n8n; togliere `SITE_CHECKS_SECRET` da Vercel.

## 22/10/2026 — VPS Hetzner configurato (punto 49, preparazione) · server pronto, worker da scrivere
- **Cosa:** rebuild con Ubuntu 24.04 e `scripts/vps/setup.sh`, passo per passo con l'utente. Hetzner ha inserito da solo la
  chiave SSH salvata nel progetto, quindi lo script ha preso la strada «con chiave»: utente `worker` con sudo, accesso solo
  con chiave, root e password via SSH spenti. Verificato: l'utente entra con `ssh worker@2.31.7.149`; dopo il riavvio Node
  v22.23.4 e firewall attivo (solo OpenSSH).
- **Da ricordare:** si entra solo dal computer dell'utente (la chiave sta lì). Senza la chiave: console web di Hetzner con
  la password di root. Nessun segreto sul server per ora.
- **Indietro:** rebuild dalla console Hetzner.

## 21/10/2026 — VPS Hetzner: prima configurazione (punto 49, preparazione) · script pronto, da eseguire sul server
- **Cosa:** `scripts/vps/setup.sh`: aggiornamenti (anche automatici), firewall con la sola porta SSH, fail2ban, utente
  `worker` con la chiave SSH di root, SSH solo con chiave e senza root, Node.js 22 e git. Nessun segreto nello script.
- **Perché:** il server sarà pronto per il worker del controllo siti; il worker si scrive dopo il 30/10, come deciso.
- **Prima:** reinstallazione del VPS con Ubuntu 24.04 dalla console Hetzner (cancella il vecchio progetto abbandonato,
  confermato dall'utente il 21/10) con la propria chiave SSH.
- **Senza chiave SSH (scelta dell'utente, 21/10):** lo script salta utente `worker` e indurimento di SSH e lascia l'accesso di
  root con password, protetto da fail2ban. Server ridimensionato a CX23 (6,70 €/mese invece di circa 14).
- **Indietro:** reinstallare il VPS.

## 21/10/2026 — aziende con nome e dominio molto diversi (punto 54e, migrazione 062) · in produzione (verifica: 107 business.site e 14 portali; eseguita il 21/10)
- **Misura (Data Quality):** 6.939 aziende controllate dal 14 al 21/10; nome e dominio molto diversi in 234 aziende OSM (3,8%),
  0 su 681 degli annunci (domini indovinati o cercati), 6 su 317 del motore. Tutte le 234 aperte dal vivo: 98 siti giusti
  (marchio, sigla, gruppo), 28 pagine di portali, 6 siti di un'altra azienda (3 domini scaduti e riusati), 102 non
  determinabili. Un dominio diverso dal nome è sbagliato solo in un caso su cinque: non basta da solo per scartare.
- **Cosa c'era già:** le pagine interne di un altro sito (`is_hosted_page`, 033) erano già escluse dalle ricerche.
- **Cosa:** la 062 aggiunge a `is_platform_domain` i portali trovati indicati con la sola homepage e i siti business.site di
  Google (servizio chiuso, 59 aziende; la vecchia espressione non riconosceva i sottodomini). Escono da riserve, avvisi e
  prossimi import. Test `36_platform_domains_test.sql`; prima di eseguirla, `supabase/queries/verifica_062.sql` conta le
  aziende colpite per portale.
- **Rimandato:** sospendere email e segnali quando il nome non compare nella homepage (prende i 6 siti di altre aziende, ma
  sbaglia su 1 sito giusto su 5).
- **Indietro:** rieseguire `is_platform_domain` dalla 033.

## 21/10/2026 — ritorno alla coda della 054 (migrazione 061) · in produzione (eseguita il 21/10 sera)
- **Problema:** dopo la 060 «Aziende | Controllo siti» è fallita alle 17:25 (esecuzione 3953, «lettura non riuscita», 500
  dall'app dopo 3 tentativi): sui dati veri `pending_site_checks` supera gli 8 secondi di Supabase. Sul banco di prova (12.000
  aziende) impiegava 0,5 s: la differenza con i dati veri va capita prima di riproporla.
- **Cosa:** la 061 rimette la funzione della 054 identica (con revoke e grant). Il test 35 ora verifica l'ordine di arrivo.
- **Indietro:** rieseguire la 060 (sconsigliato finché non si capisce il tempo sui dati veri).

## 21/10/2026 — coda del controllo siti con priorità (punto 39, migrazione 060) · tolta il 21/10 sera con la 061: troppo lenta sui dati veri
- **Cosa:** `pending_site_checks` ordina le aziende da controllare così: prima quelle nella zona e nel settore (o in una delle
  parole chiave) di una ricerca degli ultimi 30 giorni o di un avviso settimanale attivo, o nella zona di una ricerca
  senza settore (opportunità «tutti i settori»); poi quelle nella zona di una ricerca di un altro settore; poi le altre, come
  prima. Al massimo le 200 ricerche più recenti, senza doppioni (Code Reviewer: il tempo cresce con il numero di ricerche). Chi va controllato non cambia
  (25 giorni, ricontrollo della 054, opposizioni, aziende chiuse).
- **Perché:** il controllo orario (150 siti) le prendeva solo per anzianità: le aziende delle zone cercate dai clienti della
  beta potevano aspettare settimane.
- **Prove:** test `35_site_checks_priority_test.sql` (ordine con e senza ricerca recente) e test 12 e 31 invariati; 392 «ok».
  Tempo sul banco di prova (12.000 aziende da controllare): circa 0,5 s con 40 ricerche (prima 0,4 s), 1,7 s con 2.000.
- **Dove:** `supabase/migrations/20261205000060_site_checks_priority.sql`. Nessuna modifica all'app né a n8n.
- **Indietro:** rieseguire `pending_site_checks` dalla 054.

## 21/10/2026 — ricerche in target più veloci (punto 63, migrazione 059) · in produzione (verifica sui dati veri: 0 differenze; migrazione eseguita il 21/10)
- **Cosa:** `target_pool` riscritta come la 057: radici di settore, parole chiave, zone ed esclusioni calcolate una volta sola
  invece che per ogni azienda, e query pianificata a ogni chiamata con i valori veri (plpgsql con `execute … using`). Una ricerca
  non «semplice» esce subito senza leggere le aziende.
- **Perché:** su Supabase ogni chiamata dell'app ha al massimo 8 secondi; riserva e conteggio delle ricerche in target
  (`target_reserve`, `target_availability`) usano questa funzione.
- **Prove (12.000 aziende di prova):** stessi risultati in 10 ricerche diverse (0 differenze, anche con esclusioni, più
  contatti per azienda, settore senza termini utili e paese estero); tempi da 1,1–3,6 s a 0,6–1,0 s (da 1,5 a 5 volte più
  veloce). Test SQL: 390 «ok».
- **Prima di eseguirla:** `supabase/queries/verifica_059.sql` confronta sui dati veri la funzione nuova con l'attuale sulle
  ultime 4 ricerche in target e annulla tutto; atteso «differenze» = 0.
- **Dove:** `supabase/migrations/20261204000059_target_pool_speed.sql`. Nessuna modifica all'app (niente Vercel).
- **Indietro:** rieseguire `target_pool` dalla 052.

## 21/10/2026 — falsi «Senza HTTPS» (punto 19e) · in produzione (Controllo siti pubblicato il 21/10)
- **Misura (Data Quality):** dalle esecuzioni di «Controllo siti» dopo la seconda correzione (dalla 3893, 2.681 siti), 139 segnali
  «Senza HTTPS» ricontrollati tutti dal vivo: 118 veri (85%), 17 falsi (12%), 4 non determinabili. Falsi: 9 siti che con http
  rimandano a un altro dominio con HTTPS valido, 7 domini in vendita su Nidoma, 1 dominio nudo con certificato vecchio.
  Scoperto anche che **nessun sito risultava mai «no»**: la HEAD riuscita restituisce `{}` e il codice la leggeva come «non
  eseguita» (2.258 siti con HTTPS funzionante «non determinabili»), quindi le vecchie prove sbagliate non si toglievano.
- **Cosa:** `n8n/annunci/nodes/09-valuta-siti.js` segna la richiesta come eseguita; `n8n/engine/nodes/lib-controlli-sito.js`:
  pagina di Nidoma riconosciuta dal titolo come «non è il sito»; «Senza HTTPS» non determinabile su domini in vendita o parcheggiati e su pagine
  di trasloco (con `invalid_page`, la vecchia prova si toglie; non sulle altre pagine di blocco, dove l'errore del certificato
  dell'hosting è vero: Code Reviewer) e quando `canonical`/`og:url` indicano un https su un altro dominio.
  Test in `n8n/annunci/test/run.mjs`. Restano 4 falsi su 139: servono il rimando di http (worker, punto 49).
- **Effetto atteso:** al prossimo controllo di ogni sito (ogni 25 giorni circa) le prove sbagliate spariscono; i siti con HTTPS
  funzionante risultano «no».
- **Dove:** workflow «Aziende | Controllo siti» («Valuta siti»): caricato il 21/10, verificato identico al repository e
  pubblicato. Il motore («Valuta segnali sito», «Controlli tecnici sito») usa lo stesso codice ma non è stato ricaricato: lì
  la HEAD non c'è e i domini in vendita contano poco; si carica alla prossima modifica del motore, insieme al filtro delle
  porte del 21/10.
- **Indietro:** versione precedente dei workflow nella cronologia di n8n; `git revert`.

## 21/10/2026 — Vercel non pubblicava main · configurazione
- **Problema:** dalle 13:10 circa i push su main non hanno creato pubblicazioni (ultima in produzione: `b5947ca`); testi per i
  freelance, limiti e registrazione erano su GitHub ma non online. Probabile causa: troppe pubblicazioni in un giorno (ogni
  commit su branch e main, oltre 80 il 21/10) o stesso commit inviato prima al branch e poi a main.
- **Cosa:** `vercel.json`: niente anteprime per i branch `claude/*`; `ignoreCommand` salta la build se dall'ultima pubblicazione
  riuscita (`VERCEL_GIT_PREVIOUS_SHA`) cambiano solo `docs/`, file `.md`, `supabase/queries` o `.claude` (nel dubbio pubblica).
- **Correzione:** il primo `ignoreCommand` usciva con 128 («bad object»: il clone di Vercel non contiene il commit precedente) e
  Vercel l'ha trattato come build fallita (`fa9a3ba`). Ora il comando esce solo con 0 (salta) o 1 (pubblica, anche nel dubbio).
- **Causa confermata (stati dei commit su GitHub):** «Deployment rate limited — retry in 24 hours» dalle 13:21 UTC: limite del
  piano Hobby di 100 pubblicazioni nelle 24 ore (anteprime comprese). Online resta `b5947ca` fino alla prossima pubblicazione
  riuscita di main; il motore n8n non ne dipende.
- **Risolto il 21/10 alle 23:30:** push di main (`5a178be`) pubblicato da Vercel; online verificati homepage («anche da solo»,
  FAQ per chi lavora da solo), /prezzi e /registrati («Azienda o attività»). D'ora in poi il codice va su main a gruppi.
- **Indietro:** togliere `git` e `ignoreCommand` da `vercel.json`.

## 21/10/2026 — nome in un solo punto del codice (punto 72) · in produzione al push (nessun cambiamento visibile)
- **Cosa:** i «Webora Leads» e gli indirizzi scritti a mano nell'app ora vengono da `BRAND` (`src/lib/config.ts`), con il nuovo
  campo `suffix` (la parte verde del logo, vuota con un nome di una parola); in `n8n/annunci/build.mjs` l'indirizzo dell'app e
  la firma del bot sono le costanti `APP` e `BOT` (workflow generati identici: niente da ricaricare).
- **Perché:** il passaggio ad Avvisto diventa un cambio di configurazione più logo e testi.
- **Dove:** config, logo, layout delle email, FAQ, crediti, 404, registrazione, verifica in due passaggi, Excel, `env.ts`;
  passaggi completi in `04-pubblicazione.md` (sezione 7). Modelli email di Supabase rigenerati: identici.
- **Indietro:** `git revert`.

## 21/10/2026 — registrazione, menu e motore (punti 74, 77, 78) · in produzione (workflow pubblicati il 21/10)
- **Registrazione (V10/N3, `src/app/(auth)/actions.ts`):** un indirizzo già registrato riceve la stessa risposta di una
  registrazione riuscita; al titolare arriva un'email «Hai già un account» con accesso e recupero password (al massimo una al
  giorno per indirizzo), oppure di nuovo il link di attivazione se l'account non è mai stato confermato. Rischio residuo
  accettato: il limite di 3 registrazioni al giorno per connessione lo fa capire solo creando account veri (Code Reviewer).
- **Menu del sito (`src/components/site-chrome.tsx`):** sotto i 360px «Prezzi» resta solo nel piè di pagina; a 320px il menu
  sbordava di 54px (QA).
- **Motore e workflow (punto 74):**
  - nomi DNS «jolly» (nip.io, sslip.io, localtest.me e simili) scartati in `04-deduplica-candidati.js`,
    `06-esito-ricerca-web.js` e «Homepage da leggere» del Settore, che ora scarta anche gli IP e i nomi interni;
  - pagina del referente senza porte strane (`14-valuta-segnali-sito.js`);
  - callback del motore solo verso `https://leads.weborastudio.it/api/engine/callback` (`01-valida-richiesta.js`, `HOST_APP`):
    **al cambio di nome va aggiunto il dominio nuovo**;
  - nell'app `publicDomain()` (`src/lib/domain/engine.ts`) usata da `urlOnDomain` e dalle route `api/engine/*`.
  - **Non fatto, con motivo:** i redirect verso indirizzi interni e la verifica dell'IP non si possono controllare dentro n8n:
    si fanno con il worker sul VPS (punto 49). I certificati non validi restano accettati nei nodi che leggono le pagine
    (siti con il certificato solo su www): togliere l'opzione farebbe perdere molti siti; il segnale «Senza HTTPS» si misura
    a parte e resta corretto. Rischio basso (serve un attacco sulla rete di n8n Cloud); si risolve nel worker.
- **Dove:** workflow «Lead Engine | Search (v1)» (nodi 01, 04, 14), «Aziende | Siti aziende» (06), «Aziende | Settore»
  («Homepage da leggere»). Test in `n8n/engine/test/run.mjs` e `tests/security-review.test.ts`.
- **Caricati e pubblicati su n8n il 21/10:** «Valida richiesta» e «Deduplica candidati» nel motore (verificati identici al
  repository), «Esito ricerca web» in Siti aziende, «Homepage da leggere» in Settore. **Non caricato:** il filtro delle porte
  in «Valuta segnali sito» e «Controlli tecnici sito» (nodo 14): il ramo del referente è spento e «Controlli tecnici» non lo
  usa; si carica alla prossima modifica di quei nodi.
- **Nota sulle date:** questo lavoro è del 21/10 sera; nei commenti del codice (anche nei nodi n8n e nella migrazione 058, già
  pubblicati) è scritto per errore «22/10».
- **Indietro:** `git revert`; sui workflow, la versione precedente dalla cronologia di n8n.

## 21/10/2026 — ripasso di sicurezza (punti 70–71) e testi per i freelance (punto 75) · in produzione al push; migrazione 058 eseguita il 21/10
- **Ripasso:** due revisori indipendenti su tutto ciò che è cambiato dal 19/10 (dettagli fuori dal repository, in
  `06-audit-sicurezza.md`). App e SQL: nessun problema grave; le correzioni del 19/10 sono tutte al loro posto. Motore: un
  problema medio sui redirect, punto 74.
- **Corretto nell'app:**
  - `splitZones` (`src/lib/domain/search-input.ts`): testo tagliato a 2.000 caratteri e spazi compattati prima delle espressioni
    regolari; prima migliaia di spazi tenevano occupato il server per secondi. Test in `tests/zones.test.ts`.
  - Verifica in due passaggi (`src/app/(auth)/actions.ts`, `src/app/app/account/actions.ts`): si contano i tentativi
    all'ingresso, anche quando la si attiva (10 in 15 minuti, `MFA_ATTEMPTS` in `src/lib/server/rate.ts`) invece degli errori dopo, così non si supera il
    tetto inviando codici in parallelo.
  - Cambio password: 5 tentativi in 15 minuti (`PASSWORD_CHECKS`). Avviso settimanale: 20 attivazioni l'ora per account.
- **Migrazione 058** (`20261203000058_security_review_22_10.sql`): `rate_hit` sotto un lock per chiave; tabelle dell'avviso
  senza permessi per i client; `search_alerts` sotto la regola della verifica in due passaggi. Test `34_security_review_22_10_test.sql`.
  L'app funziona anche prima della migrazione (stessa funzione, stessi parametri).
- **Da decidere:** la registrazione risponde in modo diverso se l'indirizzo esiste già (si scopre se qualcuno è cliente).
  Impatto basso per un servizio B2B con captcha; proposta: accettarlo fino al lancio.
- **Testi per i freelance** (decisione del 21/10, Sales & Copy e Designer): «Per chi vende alle aziende, anche da solo»
  sopra il titolo, «Che tu sia un'agenzia, un'impresa o un professionista con partita IVA» in «Per chi è», «web designer e
  grafici» nella riga delle web agency, prima domanda delle FAQ «Lavoro da solo con partita IVA: fa per me?», riga per chi
  lavora da solo nella pagina prezzi, «Azienda o attività» con suggerimento nella registrazione, descrizione per i motori
  di ricerca (`src/app/layout.tsx`). Listino e funzioni invariati.
- **Indietro:** `git revert` del commit; per la 058, rieseguire `rate_hit` della 046 (i revoke e la policy non servono all'app).

## 21/10/2026 — nome nuovo e costi di Hostinger (punti 65–69) · decisione, nessuna modifica all'app

- **Cosa:** piano per il cambio di nome e controllo dei costi. Oggi Hostinger costa circa 234 €/anno: dominio weborastudio.it
  15,99 € (rinnovo 20/01/2027), Business Web Hosting 203,88 € (rinnovo 02/02/2027), Starter Business Email in prova 14,16 €
  (rinnovo 19/02/2027). Con il dominio nuovo sono circa 250 €/anno.
- **Nome:** l'utente propone Prosperia (prosperia.it); prosperia.com risulta già registrato. Parere di Sales & Copy: sconsigliato,
  perché evoca finanza e promesse di guadagno più che prove concrete e ha l'accento incerto. Alternative: Pista e Spunto (le due
  migliori), Indizio, Varco, Fiuto, Traccia. Scelta finale dell'utente, dopo il controllo di marchio (UIBM/EUIPO, classi 35 e
  42), dominio e social.
- **Domini (controllo DNS del 21/10, da confermare all'acquisto):** occupati pista, spunto, prosperia, indizio, varco, fiuto (.it).
  Risultano liberi: avvisto.it, scovia.it, spuntia.it e .com, fiutia.it e .com, opportia.it, pistia.it.
- **Scelta in prova (21/10):** **Avvisto** («ho avvistato un'occasione»); avvisto.it confermato libero su Hostinger. Restano da fare
  il controllo del marchio e l'acquisto del dominio (checklist 65–66).
- **Passaggio (dopo il 30/10):** DNS verso Vercel, rinvio permanente da leads.weborastudio.it, dominio su Resend, indirizzi in
  Supabase, Stripe, Turnstile e callback di n8n, casella email nuova con leads@ inoltrata, firma, testi e documenti.
- **Dove:** `docs/00-checklist.md` (punti 65–69; il 33 assorbito dal 68).
- **Come tornare indietro:** nessuna modifica tecnica; si tolgono i punti dalla checklist.

## 21/10/2026 — riordino dei documenti (punto 61) · documento
- **Cosa:** storici spostati in `docs/archivio/` con una nota in cima (01-analisi-workflow, 02-proposta, 05-da-fare,
  08-messa-in-produzione, 11-analisi-motore); indice `docs/README.md`; README e riferimenti aggiornati (anche nell'agente
  Business Analyst); regola in `CLAUDE.md`: a ogni modifica si aggiorna il documento vivo che la descrive. Contenuti aggiornati dopo il
  confronto di un agente con il codice: panoramica (beta, Stripe solo admin, 57 migrazioni, segnale privacy, pagine che non
  sono il sito, orari dei workflow, pagine del motore, avviso settimanale, limiti Adzuna ed esecuzioni n8n, «Come
  lavoriamo»), pubblicazione (piano n8n, Turnstile, workflow attivi, Stripe, cron, controlli su GitHub), domande ai
  consulenti (stato «Solo azienda», domande G sull'avviso e sul segnale privacy), README.
- **Indietro:** `git mv` inverso dei cinque file.

## 21/10/2026 — checklist riscritta per intero · documento
- **Cosa:** `docs/00-checklist.md` riordinata per stato (questa settimana, decisione del 30/10, lancio a pagamento, durante la
  beta, tecnico aperto, dopo la beta, fatto per giorno). Numeri invariati; nuovi: 5i (promemoria), 56b, 57b, 61 (riordino di
  `docs`), 62 (CMS vecchio sulle pagine provvisorie), 63 (velocità delle ricerche in target), 64 (migrazione 057). Il 5h (ricerca
  di prova per ogni agenzia invitata) non si fa: decisione dell'utente.

## 21/10/2026 — testi: fascia della beta e riquadro dell'avviso · in produzione al push
- **Cosa:** fascia del sito «Beta gratuita su invito: 4 settimane, crediti gratuiti, nessuna carta.» (prima «per le web agency
  invitate»: gli inviti potranno andare anche a studi grafici e altri; `src/lib/config.ts`), e in homepage «Beta gratuita su invito». Riquadro dell'avviso: «se ci sono
  aziende nuove» (prima «almeno 3»; la soglia di 3 resta nel database). Richiesta dell'utente.
- **Indietro:** `git revert`.

## 21/10/2026 — ricerche opportunità più veloci (migrazione 057) · in produzione (verifica sui dati veri: 0 differenze; migrazione eseguita il 21/10)
- **Cosa:** `supabase/migrations/20261202000057_opportunity_pool_speed.sql` ridefinisce `opportunity_pool` (dalla 052): radici
  di parole chiave e zone e segnali richiesti calcolati una volta sola invece che per ogni azienda (prima `sector_matches` e
  `signals_satisfy` per riga), query dinamica pianificata a ogni chiamata con i valori veri. Il pulsante dell'avviso ora
  mostra un messaggio se l'attivazione non riesce (`toggleAlert`, pagina della ricerca) e registra l'errore.
- **Perché:** il 21/10 «Avvisami ogni settimana» non faceva niente: in produzione `opportunity_pool` su tutta Italia impiegava
  9,5 s (Veneto 3,8 s) e Supabase interrompe le chiamate dell'app dopo 8 s (`authenticator`: statement_timeout 8s). La
  stessa funzione serve al contatore «Disponibili ora», alla riserva delle ricerche opportunità e all'avviso.
- **Misure (12.000 aziende di prova):** tutta Italia 6,9 → 1,0 s; regione 4,1 → 1,2 s. Risultati identici su 8 ricerche
  di prova (settore, parole chiave, zone, annunci, «servono tutti», nessun risultato). Test SQL 384 ok.
- **Verifica sui dati veri prima della migrazione:** `supabase/queries/verifica_057.sql` (copia temporanea, confronto
  sulle ultime 4 ricerche opportunità, rollback).
- **Revisione:** Code Reviewer PRONTO CON RISERVE: equivalenza verificata riga per riga con 052/053/016 e su 18 casi di prova
  (0 differenze). Corretti: messaggio d'errore dell'avviso che restava dopo una disattivazione; script di verifica più leggero
  (due calcoli per ricerca, confronto delle righe intere).
- **Indietro:** rieseguire `opportunity_pool` dalla 052.

## 21/10/2026 — avviso settimanale delle opportunità (punto 36) · in produzione (migrazione 056 eseguita il 21/10); visibile solo agli admin
- **Cosa:** su una ricerca opportunità, «Avvisami ogni settimana» (riquadro nella pagina della ricerca; etichetta «Avviso»
  nell'elenco). Ogni lunedì il cron notturno (`/api/cron/watchdog` → `src/lib/server/alerts.ts`) conta le aziende che
  soddisfano la ricerca, non consegnate all'account e mai segnalate da quell'avviso; se sono almeno 3 manda un'email
  («N nuove aziende con opportunità per "X"», pulsante che apre la ricerca precompilata, `?da=`). Nessun credito: si spende
  solo se il cliente avvia la ricerca. Nessun nome di azienda nell'email.
- **Dove:** migrazione `20261201000056_search_alerts.sql` (tabelle `search_alerts`, `search_alert_domains`, `search_alert_runs`;
  funzioni `start_search_alert`, `stop_search_alert`, `due_search_alerts`, `run_search_alert`, `next_alert_monday`),
  `toggleAlert` in `src/app/app/actions.ts`, pagina e elenco delle ricerche, tipi in `database.types.ts`. Test SQL
  `supabase/tests/33_search_alerts_test.sql`.
- **Perché così:** Business Analyst: «nuove» = mai segnalate (le prove si rinnovano ogni 25 giorni e le stesse aziende
  sembrerebbero nuove ogni mese); all'attivazione le aziende già disponibili si segnano come viste; soglia 3; ogni giro
  registrato per misurare l'uso. Designer: solo nella pagina della ricerca (non nel wizard, dove c'è già la ripetizione
  automatica); mai insieme alla ripetizione automatica; parole «avviso» e «gratis».
- **Revisione:** Code Reviewer PRONTO CON RISERVE, QA FUNZIONA CON PROBLEMI. Corretti: conteggio con gli stessi filtri
  della riserva (piattaforme, pagine ospitate, aziende fuori target); tutte le aziende nuove segnate, senza tetto (oltre 500
  tornavano «nuove» la settimana dopo); avviso rimasto fermo (ricerca ripristinata, organizzazione riattivata) riparte dal
  lunedì senza email fuori giorno; avviso solo a chi è ancora nell'organizzazione; avviso tolto quando la ricerca si
  archivia o si elimina; email: pulsante «Apri la ricerca» e frase «le aziende si scelgono tra tutte quelle disponibili»
  (la ricerca avviata pesca dall'intero bacino); invio fallito registrato tra gli errori; grant a service_role.
- **Da sapere:** se l'invio fallisce le aziende restano segnate come segnalate (errore registrato). Tempo di
  `opportunity_pool` per ricerche larghe da misurare prima di aprire a tutti (fino a 50 avvisi a notte nel cron da 300 s).
  Seconda revisione del Code Reviewer: PRONTO. Prima di aprire a tutti: oltre 50 avvisi scaduti in una notte gli altri
  slittano e vengono saltati (alzare il limite o ripetere la chiamata); i giri saltati non finiscono in `search_alert_runs`.
- **Da fare dopo la beta:** aprirlo a tutti (togliere il controllo admin in pagina e in `toggleAlert`), link di
  disattivazione diretto nell'email, soglia scelta dal cliente, riepilogo ogni 4 settimane senza novità.
- **Indietro:** `git revert`; drop delle tabelle e funzioni della 056.

## 21/10/2026 — sigle di provincia, tagli di testo negli annunci, giri di «Siti aziende» (punti 54, 59) · in produzione (workflow pubblicati il 21/10)
- **Sigle di provincia:** `splitZones` traduce le sigle in maiuscolo («MO, RE», «Bari (BA)») nel nome della provincia
  (`n8n/annunci/province.json`, gli stessi nomi dei luoghi delle aziende OSM). In minuscolo («no») restano come sono. Sigle,
  macroaree e «Reggio» valgono solo se la ricerca comprende l'Italia («CA» negli Stati Uniti non è Cagliari; Code Reviewer).
- **Tagli di testo:** `taglia()` in `n8n/annunci/nodes/02-normalizza-annunci.js` (titolo, azienda, descrizione) e
  `n8n/engine/nodes/09-verifica-annuncio.js` (titolo): un'emoji spezzata dal taglio lasciava un mezzo carattere, che il
  database rifiuta nel JSON (stesso problema del Settore aziende). Test in `n8n/annunci/test/run.mjs`.
- **«Siti aziende»:** due giri al mattino (7:40 e 11:40) invece di ogni 4 ore: gli annunci arrivano ogni 2 giorni alle 6:10 e
  gli altri giri finivano in 3 secondi senza aziende. 4 esecuzioni al giorno in meno (circa 120 al mese). Il controllo siti
  resta ogni ora finché non finisce il ricontrollo della migrazione 054; «Settore aziende» resta ogni 4 ore (lavora quasi
  sempre: anche le aziende OSM senza settore).
- **54f (pagina contatti prima di «nessuna_email»):** già presente nel motore: homepage e fino a 4 pagine, prima contatti
  (`05-estrai-email.template.js`); gli scarti controllati il 21/10 erano giusti. Nessuna modifica.
- **Indietro:** `git revert`; nodi n8n dalla cronologia dei workflow.

## 21/10/2026 — zone e sinonimi del settore nel wizard (punti 54a e 54b) · in produzione al push (solo app)
- **Cosa:** `src/lib/domain/search-input.ts`.
  - `splitZones`: separa con virgola, punto e virgola, a capo, «/», «&», parentesi e su ogni «e»/«ed» («Modena e Reggio
    Emilia» → due zone); riduce al nome «X e provincia», «provincia di X», «X (prov.)», «X e dintorni/hinterland/cintura/area
    metropolitana», «tutta la X», «area di X», «X città»; «Italia»/«tutta Italia» = nessuna zona; «Nord», «Nord Est», «Centro»,
    «Sud», «Isole»… diventano le loro regioni; «Reggio» da solo diventa Reggio Emilia o Reggio Calabria se le altre zone lo
    dicono; restano intere Pesaro e Urbino, Monza e (della) Brianza e i comuni con «e» nel nome; niente doppioni.
  - `withSynonyms` in `toTarget`: le parole chiave del settore portano le varianti («web agency» ↔ «agenzia web» ↔
    «webagency», anche dai plurali; «software house»; «e-commerce»). `withoutSynonyms` le toglie in «Ripeti la ricerca»
    (`ricerche/nuova/page.tsx`) e nella pagina della ricerca (`ricerche/[id]/page.tsx`).
  - Messaggi in italiano oltre 20 zone (le macroaree contano come le loro regioni) o 10 parole chiave; tra parentesi
    «Sud» non è una macroarea («Sardegna (Sud)»).
- **Perché:** QA del 21/10: «Napoli e provincia» e «Modena e Reggio Emilia» davano 0 aziende dal database (le zone si
  confrontano con le parole dei luoghi dell'azienda); «web agency» non trovava «Agenzia Web» né «WebAgency».
- **Revisione:** Code Reviewer PRONTO CON RISERVE e QA FUNZIONA CON PROBLEMI; corretti: «Ripeti la ricerca» bloccata dai
  sinonimi oltre 10, messaggio in inglese oltre 10 zone, «Reggio» ambiguo, «province» al plurale, macroaree, parentesi,
  comuni con «ed». Seconda revisione: PRONTO CON RISERVE (macroaree oltre il limite, «Sud» tra parentesi, zona «e»),
  corretti. Test in `tests/zones.test.ts`.
- **Da sapere:** le ricerche già salvate (anche le ripetizioni automatiche) tengono le zone di prima. Le sigle di provincia
  («MO, RE») danno ancora 0 aziende dal database: da fare con la tabella delle province.
- **Indietro:** `git revert` del commit.

## 21/10/2026 — inviti della beta, seconda ondata
- **Cosa:** inviate dall'utente 10 email di invito: SCF Group, La Russa Design, mscompany, Officine Grafiche (websorrento),
  Creative Idea, Fashion-web, Kreativeweb, Diginetica, MAG Web Agency, Marco Loprete Web Agency (lista di 62 agenzie del 21/10,
  fuori dal repository). Esclusa Webapp s.r.l.: non fa siti web, quindi è fuori dal target della beta.
- **Prossimo passo:** alle risposte, procedura del punto 5b (account, +150 crediti, piano Growth, email di benvenuto).
- **Testi (Sales & Copy, 21/10):** in `docs/10-beta.md` il promemoria per Gopher, Mutart e Studio360 (24–25/10, parte dal
  PDF già mandato) e il benvenuto aggiornato (link /registrati?beta=1, nessun numero di aziende promesso, firma senza telefono).

## 21/10/2026 — falsi segnali dalle pagine che non sono il sito, errore del Settore aziende, Adzuna (punti 58–59) · in produzione (migrazione 055 eseguita e workflow pubblicati il 21/10)
- **Cosa (segnali):** `n8n/engine/nodes/lib-controlli-sito.js` (nodi «Valuta segnali sito» e «Controlli tecnici sito» del motore,
  «Valuta siti» di «Aziende | Controllo siti»). Pagine di blocco o d'errore (CloudFront, Cloudflare, 403, dominio in vendita,
  pagina di prova di Apache, anti-robot, «no SSL certificate configured», errore critico di WordPress), traslochi verso un altro
  dominio (solo frasi esplicite, mai su pagine provvisorie) e pagine provvisorie: i segnali della homepage diventano «non
  determinabile» con `evidence.invalid_page = true` (sulle provvisorie resta `under_construction`, e `outdated_cms`).
  Migrazione `20261130000055_invalid_page_signals.sql`: `store_company_checks` (dalla 050) toglie la vecchia prova anche su
  «non determinabile» con `invalid_page`. «Apri sito» (`n8n/annunci/build.mjs`) apre l'indirizzo con il protocollo e il www del
  sito salvato (golfclub-boutique.com: senza www risponde la pagina di prova di Apache). Regole in `docs/07-segnali.md`.
- **Perché:** Data Quality su 10 homepage e 281 siti reali: prove false su macron, palmabit, radiciviaggi, kellanova,
  immobiliarevenezia, globalmediaservice, globalsmile, golfclub-boutique. La regola del trasloco con «nuovo sito» da solo dava
  2 falsi negativi (borgoverde.eu, lineatende.it): ristretta. Non si usa «ora ci trovi su» (Code Reviewer: homepage vere).
- **Cosa (Settore aziende):** `n8n/annunci/nodes/07-prepara-settore.js` toglie i surrogati orfani lasciati dal taglio del testo
  (emoji spezzata = JSON non valido verso Claude). Scritto con un ciclo sui codici, senza sequenze `\u` nel codice: inviandolo
  a n8n verrebbero trasformate nei caratteri (Code Reviewer: PRONTO). Stesso rischio, non corretto, nei tagli di `02-normalizza-annunci.js` (600) e
  `09-verifica-annuncio.js` (160): finora nessun errore.
- **Adzuna:** nessun problema; la raccolta gira ogni 2 giorni per scelta, quindi il 20/10 non c'era. Il limite di Adzuna è
  **2.500 chiamate al mese** (il «5.000» nella checklist era sbagliato).
- **Test:** `n8n/annunci/test/run.mjs` (blocchi, traslochi, provvisorie, casi di Data Quality, emoji), SQL
  `supabase/tests/32_invalid_page_test.sql`.
- **Revisione:** QA (prove vecchie che restavano: segno `invalid_page` e migrazione 055; pagina di manutenzione più lunga),
  Data Quality (281 siti reali: 2 falsi negativi del trasloco, 4 blocchi non riconosciuti; corretti), Code Reviewer NON PRONTO:
  «in vendita» e «plesk» scartavano homepage vere corte, un 503 momentaneo cancellava le prove. Corretto: frase nel titolo o in
  pagina senza menu, «in vendita» solo col dominio, errori 404/5xx non determinabili senza cancellare. Seconda revisione: PRONTO CON RISERVE; applicata la riserva («dominio agricolo … in vendita», «plesk»). Ricontrollo sulle 281
  pagine: 15 cambi, tutti pagine di blocco, d'errore o provvisorie; nessuna prova vera persa.
- **Indietro:** nodi n8n dalla versione precedente nella cronologia dei workflow; `store_company_checks` dalla 050.

## 21/10/2026 — email per le aziende controllate prima del 20/10 (migrazione 054) e segnale «annuncio» · in produzione (migrazione eseguita il 21/10)
- **Cosa:** `supabase/migrations/20261129000054_site_email_backfill.sql` ridefinisce `pending_site_checks` (dalla 035): dopo le
  aziende dovute mette in coda quelle controllate prima del 20/10 12:25 UTC, con il sito leggibile e senza email. Si esaurisce
  da sola (il ricontrollo aggiorna la data anche senza email). Circa 9.000 aziende, 150 l'ora: circa 60 ore, senza esecuzioni
  n8n in più (i giri oggi sono a vuoto). Effetti: email, no_privacy e prove rinnovate o cancellate come in un ricontrollo
  normale; scadenze di metà novembre più distribuite. Test `supabase/tests/31_site_email_backfill_test.sql`; commento della
  route `src/app/api/engine/site-checks/route.ts` aggiornato.
- **Revisione:** Code Reviewer, PRONTO CON RISERVE; applicate: registro, commento della route, test più robusto. Da sapere:
  a giro finito la condizione resta e la tabella si legge tutta ogni ora (millisecondi); si può togliere in futuro.
- **Indietro:** rieseguire `pending_site_checks` dalla 035.
- **Annunci (Data Quality):** le 14 prove job_ad non sono un difetto. In `company_signals` job_ad nasce solo con i lead
  consegnati con l'annuncio; le ricerche opportunità leggono direttamente `job_ads` (`opportunity_pool`), quindi le 1.244
  aziende collegate sono già usabili. Corretto il conteggio: nuova query Q3b in `supabase/queries/popolamento_settimanale.sql`.
  Da decidere: il magazzino (`warehouse_candidates`) non vede gli annunci di `job_ads` (impatto piccolo, query per misurarlo nel
  rapporto del 21/10); la prova dell'annuncio dalla riserva ha la data di oggi e non controlla che l'annuncio sia ancora visibile
  (`last_seen_at`): proposta di richiedere `last_seen_at` negli ultimi 7 giorni dopo un controllo a mano di 20–30 annunci.

## 21/10/2026 — numeri del database (query Q1–Q8 eseguite dall'utente)
- **Aziende:** 11.956 (OSM 10.485, Adzuna 1.217, target 180), con settore 11.337; tutte controllate, coda vuota; 2.154
  irraggiungibili (18%); **solo 710 con email dal sito**, perché l'estrazione dell'email nel controllo siti esiste dal 20/10
  12:25 e le aziende controllate prima la prendono solo al ricontrollo (25 giorni).
- **Prove fresche:** no_booking_engine 8.120, single_language 4.749, stale_copyright 1.275, outdated_cms 1.072, no_mobile 646,
  no_https 231, no_privacy 125, under_construction 99, job_ad 14 (non è un difetto: vedi sopra, la fonte degli annunci è `job_ads`).
- **Per regione:** Lombardia 3.207 (rifacimento 627), Puglia 2.867 (696), Campania 2.137 (477), Sicilia 1.296 (280),
  **Emilia-Romagna 743 (154)**, Veneto 61. L'Emilia-Romagna, regione della beta, entra nella rotazione OSM il 22–23/10.
- **Ricerche della settimana:** tutte dell'admin (34; 3 opportunità fallite, «Sicurezza del sito» hotel in Toscana con 39
  aziende in regione). Nessuna ricerca di clienti.
- **Proposte (punto 60):** usare i giri a vuoto del controllo siti per ricontrollare subito le aziende controllate prima del
  20/10 senza email (circa 9.000: email e no_privacy in 2–3 giorni); capire i soli 14 segnali job_ad.

## 21/10/2026 — recupero delle province perse il 21/10 · in produzione (workflow pubblicato il 21/10)
- **Cosa:** `n8n/annunci/nodes/10-prepara-osm.js` («Prepara richieste OSM» di «Aziende | Popolamento OSM»): lista `RECUPERO`
  per tre notti, dopo le riprove e prima della rotazione: 22/10 Sondrio, Belluno; 23/10 Rovigo, Como, Treviso, Varese; 24/10
  Padova, Monza, Pavia; dal 25/10 niente. Non dipende dalla lista delle riprove (dopo un'esecuzione in errore potrebbe non
  essere salvata). Varese era uscita dalle riprove per il limite di 4 al giorno. Brescia e Milano restano nelle riprove.
  Test in `n8n/annunci/test/run.mjs` (con la lista del 21/10 salvata e con quella del 20/10).
- **Revisione:** Code Reviewer, due giri, PRONTO CON RISERVE. Accettato: Monza e Pavia (o Como) possono essere scaricate in due
  notti diverse (riprova e recupero); il salvataggio è ripetibile, costa solo un po' di carico. Notte del 22/10 circa il doppio
  di una normale (28 richieste a Overpass): guardare la mattina del 22/10 durata, salvataggio e log di Vercel.
- **Indietro:** versione precedente nella cronologia di n8n, o lasciare scadere (dal 25/10 il recupero non aggiunge niente).

## 21/10/2026 — controllo settimanale del popolamento (Business Analyst)
- **Numeri (14–21/10):** 280 esecuzioni n8n, a regime 44–48 al giorno (circa 1.400 al mese, tetto 2.100); circa 66 giri a vuoto a
  settimana (Controllo siti 30%, Siti aziende 44%). OSM: almeno 5.023 aziende nuove salvate, 7.303 perse la notte del 21/10;
  Overpass fallisce sulle province grandi (MI, BS, MB, PV, VA). Controllo siti: circa 12.000 controlli, 20,8% irraggiungibili,
  email al 40%; no_https al 2,7% dopo la correzione (312 positivi venivano da 4 giri prima della correzione). Settore aziende:
  circa 240 classificate al giorno contro 800–2.000 senza settore a notte: la coda cresce. Nessuna raccolta Adzuna il 20/10.
- **Valutazione:** le aziende non sono troppe: l'offerta supera di oltre 20 volte la domanda della beta; il vincolo è il consumo
  per cliente in una zona e servizio (un'azienda non torna allo stesso cliente) e, con 50–100 clienti, le esecuzioni n8n
  (si supera 2.100): il carico di servizio va ridotto prima che arrivino i clienti.
- **Proposte (punto 59):** recuperare le 6 province perse; meno giri a vuoto (Siti aziende una volta al giorno, Controllo siti ogni
  2 ore dopo il primo giro d'Italia, irraggiungibili ricontrollati dopo 60–90 giorni, OSM più lento dopo il primo giro);
  concentrare su Sud ed Emilia-Romagna per la beta; alzare il lotto del Settore aziende.
- Query in `supabase/queries/popolamento_settimanale.sql` (Q1–Q8). Nessuna modifica ai workflow.

## 21/10/2026 — popolamento OSM fallito: salvataggio a pezzi · in produzione dopo il push (nessuna migrazione)
- **Cosa:** `src/app/api/engine/companies-import/route.ts` chiama `store_imported_companies` a pezzi di 250 invece che con
  l'intero blocco da 2.000 di n8n; somma i conteggi; `maxDuration = 120`; in caso di errore risponde 500 con `saved_before` e
  scrive nel log di Vercel pezzo, dimensione ed errore. Documentato in `docs/03-contratto-motore.md`.
- **Perché:** esecuzione 3927 del 21/10 (Brescia, Como, Milano, Monza, Pavia, Sondrio, Varese, Belluno, Padova, Rovigo,
  Treviso): 7.303 aziende pronte, salvataggio in errore 500 per tre tentativi da circa 10 s. Causa più probabile: tempo massimo
  delle query di Supabase superato dal blocco da 2.000 (la notte prima lo stesso blocco era al limite e n8n l'aveva ripetuto).
  Il log aggiunto lo confermerà (codice `57014` = tempo massimo).
- **Revisione:** Code Reviewer, PRONTO CON RISERVE (solo il registro mancante): ripetibile senza danni anche a metà, conteggi
  coerenti con la 048, circa 1,3 s per pezzo.
- **Da ricordare:** la rotazione delle province va per data: Como, Sondrio, Belluno, Padova, Rovigo e Treviso (salvate da
  Overpass ma non nel database) tornano al prossimo giro, tra circa due settimane, se non si recuperano prima; Brescia,
  Milano, Monza, Pavia e Varese sono nella lista delle riprove (4 al giorno).
- **Indietro:** `git revert` del commit (torna la singola chiamata).

## 21/10/2026 — primo resoconto del Business Analyst e controllo del Data Quality sui siti veri
- **Resoconto (ultime 24 ore):** nessuna ricerca di clienti; 5 esecuzioni del motore, tutte dell'admin, costo AI 0,49 €
  (tariffe della migrazione 020). Problemi: **popolamento OSM fallito** (esecuzione 3927: 7.303 aziende pronte, salvataggio
  su `/api/engine/companies-import` in errore 500 dopo 3 tentativi; 5 province lombarde senza risposta da Overpass);
  **controllo siti a vuoto** dalle 00:25 UTC (coda finita); **giro Settore aziende**: 38 aziende su 301 fallite per JSON
  non valido verso Claude (ipotesi: testo tagliato a metà di una sequenza `\u` in `07-prepara-settore.js`). Controllo
  siti: 2.632 aziende, 40% con email, no_privacy 6,3%. Limite Adzuna nel codice 2.500 al mese, non 5.000: da chiarire.
- **Data Quality (no_privacy sui siti veri):** 7 pass su 10 corretti; 2 falsi positivi perché il controllo legge una pagina
  diversa dal sito (macron.com: pagina 403 anti-bot di CloudFront; golfclub-boutique.com: host senza www con certificato
  autofirmato) e 1 pagina di trasloco (palmabit.com). Gli stessi casi danno anche no_mobile e single_language falsi. I fail
  sono corretti. Le web agency scartate per «nessuna_email» avevano solo Gmail o un indirizzo personale: scarti giusti.
  Confermate le proposte del punto 54 c) e d), più: aprire l'host giusto e salvare l'URL letto davvero; pagine di trasloco
  come provvisorie; motivo di scarto più preciso («solo email gratuita / personale»).
- Nessuna modifica fatta: da decidere (punti 57–58 della checklist).

## 21/10/2026 — sito per le agenzie invitate alla beta (punto 56) · in produzione dopo il push
- **Cosa:** costante `BETA` in `src/lib/config.ts` (interruttore: `open: false` a fine beta); fascia «Beta gratuita per le web
  agency invitate…» in `SiteHeader` e nel layout della registrazione (`src/components/site-chrome.tsx`, `src/app/(auth)/layout.tsx`);
  `/registrati?beta=1` con il testo della beta; «Prova» nell'intestazione anche su telefono; /prezzi con riquadro beta, badge
  «Consigliato» (era «Il più scelto»), tolta la promessa «API dedicate»; hero più corto; rassicurazioni su telefono in
  registrazione e casella dei termini più grande; `--color-muted` da #6b7280 a #5b6370 (contrasto); `scroll-mt-32` per le
  ancore sotto l'intestazione più alta; pagina 404 in italiano (`src/app/not-found.tsx`).
- **Pagamenti:** `stripeLive` e `checkoutAllowed` in `src/lib/server/stripe.ts`; `buyPlan` e `openPortal` (`src/app/app/actions.ts`),
  /app/crediti e /app/account/fatturazione li usano: con la chiave di test solo gli admin; agli altri «durante la beta i crediti li
  aggiungiamo noi». /prezzi: con la chiave di test i pulsanti dicono «Prova gratis» e portano a /registrati.
- **Perché:** proposte del Designer; il rischio dei pagamenti di prova l'ha intuito il Designer e confermato il Code Reviewer.
- **Revisione:** Code Reviewer, PRONTO CON RISERVE; applicate: avviso in /app/crediti senza vicolo cieco, pulsanti di /prezzi,
  ancore, chiavi `rk_live_`. Da controllare: che nessun account non admin abbia già comprato in modalità test (rinnovi).
- **Da ricordare:** «entro qualche ora aggiungiamo i crediti della beta» vale solo se l'admin guarda le nuove registrazioni ogni
  giorno. Al passaggio a Stripe live gli acquisti si riaprono da soli.
- **Indietro:** `git revert` del commit; per i soli pagamenti, `checkoutAllowed` torna `stripeEnabled`.

## 21/10/2026 — controlli automatici su GitHub · attivi dal push
- **Cosa:** `.github/workflows/ci.yml` (GitHub Actions, a ogni push e pull request): job «App e motore» (eslint, tipi,
  vitest, test del motore n8n) e job «Test SQL» (Postgres 16 di servizio, tutte le migrazioni e i test di `supabase/tests`).
  Sola lettura (`permissions: contents: read`), nessun segreto, niente produzione.
- **Revisione:** Code Reviewer, PRONTO CON RISERVE: provati su un clone pulito senza variabili d'ambiente e con quattro
  errori artificiali (test fallito, migrazione rotta, messaggio di errore, test muto): il job fallisce in tutti. Applicate le
  riserve: permessi in sola lettura, pipefail esplicito, controllo che il log esista, azioni alla versione 5.
- **Indietro:** cancellare il file o disattivare il workflow su GitHub (Actions → Controlli → Disable).

## 21/10/2026 — sesto agente: Business Analyst · creato; resoconto giornaliero affidato a lui
- **Cosa:** `.claude/agents/business-analyst.md`: resoconto giornaliero e settimanale (ricerche, qualità, database, costi
  AI e per lead, esecuzioni n8n del mese, beta rispetto alle soglie del 30/10); ogni numero misurato / stimato / mancante;
  i dati che stanno solo su Supabase li chiede con una query in sola lettura da far eseguire all'utente. Solo lettura su n8n.
- **Attività programmata** «Webora Leads – analisi giornaliera» (ogni giorno alle 7:52, in questa sessione): il testo ora fa
  preparare il resoconto al `business-analyst` (e un controllo breve al `data-quality` se ci sono segnali nuovi).
- **Indietro:** cancellare il file; nell'attività programmata rimettere il testo del 14/10 (analisi fatta dalla chat).

## 21/10/2026 — quinto agente: UI/UX Designer · creato
- **Cosa:** `.claude/agents/ui-ux-designer.md`: product designer per un SaaS B2B; apre le pagine con Playwright (sito pubblico
  in produzione in sola navigazione, o in locale), screenshot da computer e telefono, controlla comprensione in 5 secondi,
  gerarchia, telefono, accessibilità, attrito nel percorso registrazione → primi lead, fiducia. Rispetta colori e componenti
  esistenti (`globals.css`, `ui.tsx`). Propone modifiche motivate da usabilità e conversione; non modifica il repository.
  Prima prova (sito pubblico, 21/10): nessuno scorrimento orizzontale, nessun errore in console. Problemi, da decidere (punto 56):
  la beta non compare da nessuna parte (l'invitato trova «15 crediti» e un listino a pagamento); /registrati dice «Inizia
  con 15 crediti gratuiti» e non spiega che i crediti beta li aggiunge l'admin; su telefono manca «Prova gratis»
  nell'intestazione; /prezzi con «Acquista» mentre Stripe è in modalità test, e «Il più scelto» su Growth non è dimostrabile;
  hero troppo generico per le web agency; rassicurazioni nascoste su telefono in registrazione; contrasto di `muted` e del
  testo bianco all'80% sotto 4,5:1; pagina 404 in inglese senza grafica (e /per-chi-e non esiste: è un'ancora).
- **Indietro:** cancellare il file.

## 21/10/2026 — quarto agente: Sales & Copy · creato
- **Cosa:** `.claude/agents/sales-copywriter.md`: bozze per homepage, listino, onboarding, inviti, email e proposte, con
  al massimo 2 varianti motivate e un controllo delle regole a fine risposta (niente funzioni inventate, niente promesse sul
  consenso né confronti con concorrenti, niente accuratezze non dimostrate, «Solo azienda», prezzi veri, −30% della beta,
  niente esclusiva, testi legali da far rileggere). Non modifica il repository, non invia, non pubblica.
  Prima prova: email d'invito della beta e follow-up, ora in `docs/10-beta.md`. Ha trovato un errore nel testo del 19/10
  già inviato alle 3 agenzie: «i lead che ricevi non li vede nessun altro cliente» non è vero (i dati pubblici delle aziende
  vanno nel database comune). Da chiarire con le 3 agenzie se aderiscono.
- **Indietro:** cancellare il file.

## 21/10/2026 — terzo agente: Data Quality · creato
- **Cosa:** `.claude/agents/data-quality.md`: su un campione (20–30 lead più 10 scarti; per un segnale nuovo tutte le prove
  «pass» fino a 30) verifica azienda, target, contatto, prove dei segnali e motivi di scarto; corretto / errore confermato /
  non determinabile. Legge solo le esecuzioni n8n (strumenti di lettura) e i siti con WebFetch; nessun accesso al database di
  produzione; i dati delle aziende mai nel repository. Prima prova: segnale no_privacy e web agency dell'Emilia-Romagna.
- **Prima prova:** dal contenitore nessun sito esterno si apre (regole di rete dell'ambiente): giudizi solo dai dati n8n.
  Web agency Emilia-Romagna: 33 su 33 coerenti nei dati. no_privacy: 28 pass su 532 controlli, 3 sospetti (pagina anti-bot su
  un grande marchio, una web agency, una pagina provvisoria). Proposte (punto 54): niente segnali sulle pagine che sembrano
  barriere anti-bot; no_privacy non scatta se il sito è «in costruzione»; segnalare nome e dominio molto diversi; pagina
  contatti prima di scartare per «nessuna_email». Il 21/10 l'utente ha aperto l'accesso completo alla rete: ora i siti si aprono.
- **Indietro:** cancellare il file.

## 21/10/2026 — secondo agente: QA Tester · creato
- **Cosa:** `.claude/agents/qa-tester.md`: prova i percorsi del cliente e i casi anomali nel database di prova locale (scenari
  SQL nella scratchpad), con i test del motore, con l'app in locale e Playwright (solo pagine senza accesso: non c'è un
  Supabase locale) e sulle esecuzioni n8n che gli si passano. Produzione in sola lettura: per le prove lì scrive la
  procedura per l'utente. Esito FUNZIONA / FUNZIONA CON PROBLEMI / NON FUNZIONA; i casi non eseguiti vanno in «Non provato».
- **Prima prova (punti 52–53): FUNZIONA CON PROBLEMI.** Migrazioni 052 e 053 corrette in sei scenari (web agency, senza
  parola chiave, opportunità «tutti i settori», settore senza termini utili, magazzino, crediti). Problemi trovati, da
  decidere (punto 54): città unite da «e» («Modena e Reggio Emilia») e «Napoli e provincia» danno 0 aziende dal database;
  «web agency» confrontata alla lettera («Agenzia Web», «WebAgency» fuori); «/» e «&» non separano le zone.
- **Indietro:** cancellare il file.

## 21/10/2026 — primo agente: Code Reviewer · creato
- **Cosa:** `.claude/agents/code-reviewer.md`: revisore in sola lettura (strumenti Read, Grep, Glob, Bash solo per comandi
  di lettura e controlli), aree critiche di Webora, esito PRONTO / PRONTO CON RISERVE / NON PRONTO, dettagli delle
  vulnerabilità mai nel repository. Si carica all'avvio di una sessione: nella sessione in cui è nato si prova con un
  agente generico che legge lo stesso file. Prima prova sul punto 52 (commit 2bc6ccb).
- **Prima revisione (punto 52): PRONTO CON RISERVE.** Trovato un problema Medio vero: un settore senza termini utili
  («Studio», «PMI», «I.T.») toglieva ogni filtro nella riserva in target (lead del settore sbagliato). Corretto con la
  **migrazione 053 · in produzione (eseguita il 21/10)** (`sector_matches`: settore scritto senza termini utili = nessuna corrispondenza; test 30
  ampliato). Seguito anche il dubbio sul wizard: la conferma «nessuna regione» ora solo nelle ricerche in target. Non seguito:
  ignorare le parole chiave inutili senza settore (toglierebbe ogni filtro, stesso problema). Da tenere d'occhio: velocità
  del contatore del wizard (`target_availability`), se diventa lenta guardare un `EXPLAIN ANALYZE`.
- **Indietro:** cancellare il file.

## 21/10/2026 — da fare: squadra di agenti (punto 53)
- Proposta dell'utente (6 agenti) valutata e accettata con correzioni: niente staging (QA in locale, Stripe test, account
  admin di collaudo in produzione); Data Quality senza accesso al database di produzione (legge le esecuzioni n8n e i siti);
  il Business Analyst è la voce del resoconto giornaliero già programmato; gli agenti li richiama il Claude principale.
- Ordine: controlli automatici su GitHub (oggi non esistono), Code Reviewer in sola lettura, QA, Data Quality, Sales & Copy
  (prepara, non invia email né pubblica), Designer, Business Analyst. File in `.claude/agents/`. Nessuna modifica fatta.

## 21/10/2026 — ricerche in target: parole chiave, zone, regione vuota (punto 52)

### Parole chiave del settore che restringono — migrazione 052 · in produzione (eseguita il 21/10)
- **Cosa:** nuova funzione `sector_matches` (settore E almeno una parola chiave, cercata in etichette, nome e descrizione;
  senza settore le parole chiave restano alternative). La usano `target_pool` (riserva e contatore delle ricerche in target),
  `warehouse_candidates` (magazzino) e `opportunity_pool`, ridefinite identiche a 029/037/038 tranne questo controllo.
  Testo nel wizard: «Restringono la ricerca». Test SQL `30_sector_keywords_test.sql`.
- **Perché:** «Informatica e software» + «web agency» dava negozi di computer e grandi gruppi. Ora la riserva dal database
  dà solo le aziende con «web agency» nel nome o nelle etichette; per il resto parte la ricerca AI con le parole nel brief.
- **Effetto da sapere:** le ricerche già salvate con settore + parole chiave (anche le ripetute) trovano meno aziende nel
  database e usano di più la ricerca AI.
- **Indietro:** rieseguire `target_pool` dalla 029, `warehouse_candidates` dalla 037, `opportunity_pool` dalla 038.
- **Verifica (21/10):** «Informatica e software» + «web agency», Emilia-Romagna, 25 lead: riserva dal database vuota, 2 lotti
  di ricerca AI, 44 candidati validi, 33 lead con email, tutti web agency (prima: negozi di computer e grandi gruppi).

### Zone e regione vuota · in produzione dopo il push
- **Cosa:** `splitZones` in `src/lib/domain/search-input.ts` (usata dal wizard e da `src/app/app/actions.ts`): oltre a virgola
  e a capo divide anche su punto e virgola e su « e » / « ed » quando ogni parte è una regione italiana («Campania e Sicilia»
  → due zone; «Reggio Emilia», «Bari e provincia» intere; dal 21/10 sera «Bari e provincia» → «Bari», vedi voce dei punti 54a/b). Wizard: conferma prima di partire senza regione, riepilogo con
  «Tutto il paese (nessuna regione)» in evidenza. Test in `tests/zones.test.ts`.
- **Indietro:** `git revert` del commit.

## 20/10/2026 (sera) — da ricordare: tre limiti delle ricerche in target visti cercando le agenzie
- **Regione vuota = tutta Italia senza avviso.** Ricerca «Informatica e software» per l'Emilia-Romagna partita senza regione
  (dimenticata nel wizard): 38 lead quasi tutti in Lombardia (il database lì è pieno dal 20/10). Proposta: conferma nel wizard se la regione è vuota
  («Cerchi in tutta Italia?»).
- **«Campania e Sicilia» è una zona sola.** Il wizard divide solo per virgola; `target_pool` vuole tutte le parole della
  zona, quindi nessuna azienda corrisponde. Proposta: dividere anche su « e » / « ed » tra nomi di regione.
- **Le «parole chiave del settore» allargano, non restringono.** In `target_pool` (migrazione 029) settore OPPURE parola
  chiave: «web agency» non filtra, e la riserva dal database dà negozi di computer e software house. Per restringere oggi
  si usano le «parole chiave aggiuntive» (ricerca AI, +1 credito). Proposta: chiarire il testo nel wizard o farle
  diventare un filtro sul nome e sulla descrizione.
- Corretti il 21/10 (vedi sopra).

## 20/10/2026 (sera) — beta allargata (punto 5e)

### Soglie della beta in percentuale · in produzione dopo il push
- **Cosa:** `src/lib/domain/beta.ts` (`BETA_THRESHOLDS`: `minActive` 3, `minExporterShare` 0,5, `minExporters` 2,
  `goResponders` 1, `maxReportShare` 0,1; `betaVerdict` restituisce anche `exporterShare` ed `enoughData`), pagina
  `src/app/admin/beta/page.tsx` («dati ancora insufficienti» sotto i 3 attivi), test in `tests/beta.test.ts`.
  `docs/10-beta.md`: decisione al 30/10, criteri per scegliere le agenzie, invito senza «cerco 5 agenzie».
- **Perché:** l'utente vuole invitare una decina di agenzie in più; «2 su 3» non ha senso con 13 invitati.
- **Indietro:** `git revert` del commit; nessun dato toccato.
- **Nota:** l'offerta ai nuovi invitati resta il −30% per 12 mesi; il prezzo fondatore dipende dal nuovo listino (5f).

## 20/10/2026 (sera) — da ricordare: proposta di nuovo listino (da valutare)
- Proposta esterna: pacchetti 59/249/790 €, abbonamenti Starter 49 / Pro 129 / Agency 249 € con monitoraggio come
  differenza, Scale tolto, lead con solo modulo a 1 credito, niente supplemento AI, 20 crediti di benvenuto, prezzo
  fondatore per la beta. Valutazione in chat del 20/10: direzione giusta; il monitoraggio (punto 36) è la condizione per
  vendere abbonamenti; da togliere le promesse di funzioni che non esistono (utenti, API) e il confronto con Apollo sul
  consenso (vedi decisione sul legale); il −30% già promesso alle 3 agenzie resta. Nessuna modifica fatta.

## 20/10/2026 (sera) — da ricordare: campione della beta troppo piccolo
- L'utente ritiene troppo ottimistico aver invitato solo 3 agenzie (deciso la sera stessa, vedi sopra). Proposta iniziale:
  altre 5–7 agenzie nelle stesse regioni, soglie del 28/10 in percentuale, eventuale rinvio della decisione.
  Punto 5e della checklist. Nessuna modifica fatta.

## 20/10/2026 (sera) — segnale «Sito senza informativa privacy o cookie» (punto 48)

### Nuovo segnale indicativo `no_privacy` — migrazione 051 · in produzione (migrazione eseguita e workflow pubblicati il 20/10)
- **Cosa:** regola in `n8n/engine/nodes/lib-controlli-sito.js` (nessuna traccia di privacy/cookie né gestore dei consensi
  nella homepage leggibile); codice aggiunto alle liste di motore (01, 08, 14) e controllo siti (09); catalogo dell'app
  (`src/lib/domain/signals.ts`: indicativo, affidabilità 40) e frase di apertura; migrazione 051 aggiorna
  `site_check_codes()` e `stock_lead`. Documentato in `07-segnali.md`. Test in tutte e quattro le suite.
- **Decisione:** indicativo (mai decisivo né addebitato), solo nel servizio «Sicurezza del sito». «Rifacimento del sito»
  resta con i suoi 3 segnali: un servizio ne ha al massimo 3 (il motore ne legge 3) e la beta non cambia.
- **Nota:** se l'admin ha modificato «Sicurezza del sito» in Servizi opportunità, vale la sua versione.
- **n8n (20/10):** caricati «Valida richiesta», «Classifica e prepara risultati», «Valuta segnali sito», «Controlli tecnici
  sito» nel motore (versioni «Segnale no_privacy (1/2)» e «(2/2)», verificato: 22 nodi di codice uguali al repository) e
  «Valuta siti» in «Aziende | Controllo siti». Ordine: prima la migrazione 051, poi la pubblicazione (senza migrazione
  gli esiti no_privacy verrebbero ignorati).
- **Indietro:** togliere `no_privacy` dalle liste e dal catalogo; rieseguire `site_check_codes()` dalla migrazione 021 e
  `stock_lead` dalla 018 (le prove salvate possono restare, non vengono più mostrate come richieste).

## 20/10/2026 (sera) — checklist riscritta
- Checklist riscritta per intero; aggiunti i punti 48–51 dall'analisi esterna (segnale privacy/cookie, worker per il
  controllo siti, seconda fonte per gli annunci, ricerche AI notturne mirate) e il prezzo a metà credito dei lead con il
  solo modulo (punto 35).

## 20/10/2026 (sera) — tre miglioramenti dall'analisi esterna

### Metriche della beta · in produzione dopo il push
- **Cosa:** pagina **Admin → Beta** (`src/app/admin/beta/page.tsx`, logica in `src/lib/domain/beta.ts`, test in
  `tests/beta.test.ts`): per cliente ricerche, lead, export, righe esportate, contattati, risposte, segnalati, ultima attività;
  soglie della decisione del 28/10 (`BETA_THRESHOLDS`). Esclusi gli account degli amministratori.
- **Perché:** decidere la seconda ondata sui numeri e non a sensazione.
- **Indietro:** togliere la pagina e la voce «Beta» in `src/app/admin/layout.tsx`. Nessun dato toccato.

### Spunto per il primo messaggio · in produzione dopo il push
- **Cosa:** `src/lib/domain/opening-line.ts` costruisce dalla prova del segnale una frase («Buongiorno, controllando il vostro
  sito il 19/10/2026 ho notato che il sito usa WordPress 5.3.26, una versione del 2019…»). Nei dettagli del lead con il pulsante
  «Copia» (`src/components/leads-table.tsx`) e nell'export, colonna «Spunto per il primo messaggio» (`src/lib/domain/leads.ts`).
- **Decisione:** senza AI (costo zero, niente dettagli inventati). L'AI solo se le agenzie lo chiedono.
- **Indietro:** togliere la colonna `spunto` da `EXPORT_COLUMNS` e il riquadro nella tabella.

### Email aziendali dal controllo siti — migrazione 050 · in produzione (migrazione eseguita e workflow pubblicato il 20/10)
- **Cosa:** il controllo siti estrae dalla homepage l'email aziendale (`n8n/engine/nodes/lib-email-azienda.js`, stesse regole
  del motore ridotte a «Solo azienda») e la manda all'app (`/api/engine/site-checks`, campo `company.email`).
  `store_company_checks` la salva in `companies.site_email` (solo del dominio o di un dominio fratello) e toglie la memoria
  «email non trovata»; `target_reserve` e `opportunity_reserve` mettono **prima** le aziende con l'email nota.
- **Perché:** dal 40 al 57% delle aziende provate dal motore non aveva email: la riserva ora parte da chi ce l'ha.
- **Nota:** le aziende già controllate prendono l'email al prossimo controllo (ogni 25 giorni); le nuove (es. la Lombardia
  in coda) subito. L'ordine «migrazione prima o dopo la pubblicazione» non conta: senza migrazione l'email viene ignorata.
- **Indietro:** rieseguire le funzioni dalle migrazioni 039 (`store_company_checks`) e 047 (le due riserve); le colonne
  possono restare. Sul workflow: versione precedente nella cronologia di n8n.

## 20/10/2026

### Listino senza «Fino a 3 utenti» — migrazione 049 · in produzione
- **Cosa:** tolta la frase dalle caratteristiche del piano Growth (database e copia di riserva in `src/lib/server/catalog.ts`).
- **Perché:** l'invito di altri utenti in un account non esiste.
- **Indietro:** `update plans set features = features || '["Fino a 3 utenti"]' where id = 'growth'` (solo quando l'invito esisterà).

### Contatore dell'import OSM — migrazione 048 · in produzione
- **Cosa:** `store_imported_companies` conta come «nuova» anche un'azienda della stessa fonte vista per la prima volta negli ultimi 30 minuti.
- **Perché:** le chiamate ripetute da n8n dopo un errore di rete contavano come aggiornate 1.038 aziende nuove.
- **Indietro:** rieseguire la definizione della funzione dalla migrazione 035. I dati non cambiano.

### Captcha e limiti su accesso e recupero password · in produzione (commit bdc6d1a)
- **Cosa:** Turnstile su `/accedi` e `/recupera-password`; 10 accessi sbagliati per account e 30 per connessione ogni
  15 minuti; recupero: 3 richieste per indirizzo e 10 per connessione all'ora (`src/lib/server/rate.ts`, `src/app/(auth)/`).
- **Perché:** le chiamate a Supabase partono tutte dal nostro server, il suo limite per IP non distingue i visitatori.
- **Indietro:** `git revert bdc6d1a`.

### Motore: memoria delle aziende senza email — migrazione 047 · in produzione (commit 3cfc7be)
- **Cosa:** colonna `companies.email_missed_at`; `target_reserve` e `opportunity_reserve` mettono in fondo per 90 giorni le
  aziende senza email né modulo; la callback (`src/app/api/engine/callback/route.ts`) le segna.
- **Perché:** dal 40 al 57% delle aziende provate non ha email; ogni ricerca riprovava le stesse.
- **Indietro:** rieseguire le due funzioni dalle migrazioni 035 (target) e 039 (opportunità); la colonna può restare.

### Motore: tolti 3 nodi OpenAI spenti · pubblicato su n8n
- **Cosa:** rimossi «OpenAI (pianificazione)», «OpenAI + Web Search», «Ricerca prospect AI»; nota e descrizione aggiornate.
  Collegamenti verificati identici prima e dopo (81 → 78 nodi).
- **Indietro:** versione precedente nella cronologia del workflow su n8n, oppure `AI_PROVIDER = "openai"` in `n8n/engine/build.py`.

### Segnale «Senza HTTPS», seconda correzione · pubblicato su n8n
- **Cosa:** «certificato non valido per questo sito» conta solo sull'host che il sito usa davvero e se il certificato non è
  del marchio su un altro dominio (`n8n/engine/nodes/lib-controlli-sito.js`). Ricontrollate 160 aziende
  (`supabase/queries/https_ricontrollo.sql`, parte 3).
- **Perché:** 22 falsi positivi su domini secondari di grandi gruppi e circa 50 su domini nudi.

### Pagina «Sicurezza e privacy» · in produzione (commit bd13353)
- `/sicurezza`, link nel piè di pagina. Solo fatti verificati. Da far rileggere al legale.

### Documenti
- `docs/archivio/11-analisi-motore.md` (numeri del motore), `docs/12-panoramica-sistema.md` (panoramica da incollare in altre chat),
  questo registro.

---

## 19/10/2026

### Segnale «Senza HTTPS», prima correzione · pubblicato su n8n
- **Cosa:** controllo sull'host del sito salvato (www se lo usa); contano solo certificato scaduto, autofirmato o di un
  altro sito; catena incompleta ed errori di handshake diventano «non determinabile». 341 prove ricontrollate.

### Email con la grafica Webora · in produzione (commit a9b356f, a325b47)
- **Cosa:** modello unico HTML + testo (`src/lib/email/layout.ts`), logo in `public/email/logo.png`, 5 modelli per Supabase
  in `supabase/templates/` (incollati nel pannello), schermata «Controlla la tua email».

### Ripasso di sicurezza — migrazione 046 · in produzione
- Limiti ai codici della verifica in due passaggi, admin solo con verifica in due passaggi, eliminazione dei lead completa,
  controlli sugli indirizzi nel motore. Dettagli solo in `06-audit-sicurezza.md`.

### Altro del 19/10
- Homepage rifatta, «Per chi è», wizard con «Vendi altro?»; settore: i clienti dopo «per» non diventano etichette
  (migrazione 045); «Traduzioni ed export» solo per i settori che esportano; popolamento OSM dal Nord, 8 province a notte;
  chiave Anthropic dedicata con limite di spesa; inviti della beta inviati.
