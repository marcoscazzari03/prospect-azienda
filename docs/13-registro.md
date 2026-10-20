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
