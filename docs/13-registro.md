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
- **Da fare il 22/10 mattina:** pubblicare main (push o «Create Deployment» su Vercel) e controllare online i testi nuovi.
  D'ora in poi il codice va su main a gruppi.
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
