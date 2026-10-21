# Registro delle modifiche e delle decisioni

Da interrogare per tornare su passi precedenti: **cosa** è cambiato, **perché**, **dove** (file, migrazioni,
workflow) e **come tornare indietro**. Regola dal 20/10/2026: ogni modifica e ogni decisione si scrive qui,
nello stesso commit della modifica. Le voci più recenti stanno in alto.

Fonti complementari: `git log` (storia completa del codice, dal 09/10) · `00-checklist.md` (stato dei lavori) ·
`05-da-fare.md` (storico fino al 19/10) · versioni dei workflow su n8n (cronologia di ogni workflow).

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

## 21/10/2026 — recupero delle province perse il 21/10 · nodo caricato su n8n, da pubblicare
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
  → due zone; «Reggio Emilia», «Bari e provincia» intere). Wizard: conferma prima di partire senza regione, riepilogo con
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
- `docs/11-analisi-motore.md` (numeri del motore), `docs/12-panoramica-sistema.md` (panoramica da incollare in altre chat),
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
