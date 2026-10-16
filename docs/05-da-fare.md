# 5. Da fare prima dell'apertura al pubblico

Lista aggiornata delle attività aperte (spuntare man mano).

## Configurazione
- [x] Supabase: migrazioni eseguite, Site URL e Redirect URL impostati
- [x] Vercel: progetto creato, variabili d'ambiente, produzione da `main`
- [x] Dominio `leads.weborastudio.it` collegato a Vercel (record DNS)
- [x] n8n: credenziali "Lead Engine" create e workflow attivato
- [x] Prima ricerca reale end-to-end (09/10: 3/3 lead, ~2 minuti)
- [ ] Prove con "Mista" e "Solo nominative", volumi più alti, taratura dei prompt (rimandata: prima scegliere il primo mercato)
- [x] Email: Resend (dominio verificato, record su sottodomini), SMTP in Supabase, testi in italiano, notifiche app
- [x] Stripe in modalità test (chiavi, webhook, portale clienti): acquisto di prova accreditato
- [x] Motore: ruoli con alternative e sinonimi (es. «Titolare / CEO»)
- [ ] Facoltativo: casella Hostinger leads@weborastudio.it per ricevere le risposte

## Prodotto
- [x] Scadenza automatica dei crediti (si usano prima quelli che scadono prima; migrazione `20261010000004_credit_expiry.sql`)
- [x] Magazzino dei lead: i contatti già trovati vengono consegnati subito ad altri clienti con lo stesso target (migrazione `20261011000005_lead_warehouse.sql`)
- [x] Ricerche grandi a tappe (fino a 15 giri, stop a mercato esaurito) e budget mensile RocketReach in *Prezzi e costi* (migrazione `20261012000006_large_searches.sql`)
- [x] RocketReach: piano Essentials (229 $/anno, 1.200 export/anno; 1 ricerca API = 1 export, anche se non trova) -> costo ~0,18 €/export, budget piattaforma ~80/mese
- [x] Controllo delle caselle prima della consegna: dominio che riceve posta (sempre) + verifica della casella con MillionVerifier se c'è `MILLIONVERIFIER_API_KEY` (migrazione `20261013000007_phase2.sql`)
- [ ] Facoltativo: account MillionVerifier e chiave `MILLIONVERIFIER_API_KEY` su Vercel; aggiornare il costo `email_verifier` in *Prezzi e costi*
- [x] Export Excel (.xlsx formattato, con filtri)
- [x] Stato del contatto, note e liste sui lead
- [x] Ricerche ricorrenti (settimanali o mensili, avviate dal cron giornaliero delle 3:00 UTC)
- [ ] Più utenti per account, API (fase 2)

## Piano di lancio (deciso il 10/10)
Fonti email per qualità: 1) nominativa trovata sul sito  2) Icypeas (al posto di RocketReach, si paga solo se trova)  3) MillionVerifier controlla ogni casella prima della consegna. Le email ricostruite (indirizzi probabili) NON si vendono: restano "ipotizzate".
- [x] Account MillionVerifier (2.000 verifiche) + `MILLIONVERIFIER_API_KEY` su Vercel: prova ok il 10/10 ("Casella verificata: esiste")
- [x] Account Icypeas + credenziale n8n "Icypeas API" (Header Auth `Authorization` = chiave; il secret non serve)
- [x] Test Icypeas (10/10): 1/1 email nota corretta; 7/18 trovate dove avevamo solo generica o niente (RocketReach 0/4 sugli stessi); tutte "ultra_sure"; credito scalato solo se trova
- [x] Icypeas nel motore al posto di RocketReach (migrazione `20261014000008_icypeas.sql`, costo `email_finder`)
- [x] Workflow pubblicato e piano Icypeas acquistato (budget mensile ~900 in Prezzi e costi)
- [x] Workflow "TEST | Icypeas email finder" archiviato
- [x] Motore AI: Claude Sonnet 5.5 (pianificazione + ricerca web lato server) al posto di OpenAI; modello in `01-valida-richiesta.js`, nodi OpenAI disattivati nel workflow per tornare indietro
- [x] Costo reale di Claude dai token (input/output) e dalle ricerche web, in *Prezzi e costi* (migrazione `20261026000020_engine_costs_errors.sql`)
- [ ] Chiave Anthropic dedicata a Webora Leads (oggi si usa la credenziale «US VIRAL - Anthropic»)
- [x] Motore: email d'ufficio (segreteria.cognome@gmail.com, studiodentisticorossi@…, info-rossi@…) classificate come generiche
- [ ] Budget mensile di arricchimento da rivedere
- [ ] Testo dell'invito per la beta
- [x] Motore: workflow di errore n8n «Lead Engine | Errori» → `POST /api/engine/error`: la ricerca si chiude subito e i crediti tornano (pubblicato e impostato come errorWorkflow del motore)
- [x] Prova completa "solo nominative" (4/5, 3 da Icypeas) e "mista" (10/10)
- [x] Ritocchi grafici: bianco e grigi al posto del crema, verde smeraldo più chiaro, riepilogo "Dall'ultimo accesso" in panoramica (migrazione `20261015000009_activity.sql`)
- [x] Collaudo 14/10 (3 ricerche opportunità): costo quasi tutto nella lettura delle pagine web; ricerca in due passaggi, tetto ai referenti, riserva tra i giri, referente prima dal sito
- [x] Collaudo dei due passaggi (14/10): 31 lead per 6,76 $ (0,22 $/lead); il 46% del costo per trovare aziende con l'AI (65% senza segnale), il 46% per il titolare via web
- [x] Decisione (14/10): ricerca opportunità «database first + API first», due workflow separati (Target / Opportunità), popolamento iniziale per i segnali dal sito, prove di Adzuna e TheirStack
- [x] Fase 1 – fondamenta: ogni azienda controllata salvata con l'esito di ogni controllo (`company_checks`, migrazione `20261027000021_company_checks.sql`); controlli tecnici gratuiti anche nella ricerca in target
- [x] Fase 2a – ricerca opportunità «database first»: le aziende del database con prova recente (annunci Adzuna 60 gg, segnali dal sito 30 gg) entrano nella riserva del motore; l'AI parte solo per i lead mancanti (migrazione 024, `opportunity_reserve`)
- [x] Fase 2b – collaudo 14/10 (sistemisti, Emilia-Romagna, 5 lead): 5/5 lead, tutti dal database, 0,88 $ (0,37 $ di ricerca AI inutile, 0,43 $ di referente via web). Corretto: niente AI se la riserva è almeno 1,4 volte i lead (2 con solo nominative); email col cognome dell'azienda (maggiolispa@) ora generiche
- [x] Referente via web con Claude Haiku (prova 14/10 sulle 7 aziende del collaudo: 5 referenti come Sonnet, 4 identici, 1 in meno e 1 in più; 0,023 $ invece di 0,061 $ a chiamata). Token Haiku registrati a prezzo Sonnet equivalente (× 0,05) nei costi del giro
- [ ] Da valutare: referente dal sito e ricerca aziende con Haiku (prima una prova di confronto)
- [x] Ricerche con annuncio di lavoro decisivo: solo aziende del database, niente ricerca AI (14/10: 3 tentativi AI per ~0,9 $ senza lead). Finite le aziende, la ricerca si chiude e i crediti tornano
- [x] Collaudo 3 (14/10, sviluppo software, Lombardia, 3 lead, motore nuovo): 3/3 lead in 2 giri, tutti dal database (37 aziende in riserva), nessuna ricerca AI di aziende. Costo misurato dai token ~0,16 $ (saldo -0,24 $): ~0,05-0,08 $ a lead. Voce principale: ricerche web del referente (0,01 $ l'una, 2 per azienda). Corretto: caselle privacy composte (contact.dataprivacy@) ora mai vendute
- [ ] In sospeso (domande dell'utente prima): 1 sola ricerca web per il referente invece di 2 (dimezza la voce principale; misurare al prossimo collaudo, < 0,30 $, quanti referenti si perdono)
- [x] Wizard opportunità: contatore delle aziende disponibili nel database (stesso calcolo della riserva, `opportunity_pool` / `opportunity_availability`, migrazione 026). Offerte solo annunci: con zero aziende la ricerca non si può avviare
- [ ] Dopo ogni modifica al motore: ricordarsi di far PUBBLICARE il workflow su n8n (le modifiche restano in bozza)
- [x] Settore delle aziende degli annunci: workflow «Annunci | Settore aziende» (homepage → Claude Haiku a lotti di 20: settore e parole chiave nelle etichette), migrazione 025. Nel settore scritto dal cliente le parole di collegamento («che», «sono»...) ora vengono ignorate
- [ ] Settore: controllare i primi giri (qualità dei settori, costo) e la disponibilità nelle ricerche con un settore
- [ ] In sospeso (domande dell'utente prima): fase 5 – listino definitivo con i costi misurati (annunci ~0,05-0,08 $ a lead; segnali dal sito da misurare dopo i primi giri del controllo siti)
- [ ] In sospeso: separare il workflow «Opportunità» dal Target (fase 5) – proposta: dopo il lancio, oggi le opportunità passano quasi tutte dal database
- [x] Archiviati su n8n i workflow di prova «Adzuna | Prova» e «Referente | Prova Haiku» (14/10)
- [x] Fase 3 – annunci da API: piano Adzuna (8 $/mese, chiave su n8n), tabella `job_ads` (migrazione 022), endpoint `/api/engine/job-ads`, workflow «Annunci | Raccolta Adzuna» (ogni mattina, Emilia-Romagna, una ricerca nel titolo per ogni figura del catalogo, 67 chiamate; sorgenti in `n8n/annunci/`). Primo riempimento 14/10: 363 annunci tenuti su 1.633 (703 di agenzie, 341 fuori tema)
- [x] Annunci: workflow «Raccolta Adzuna» e «Siti aziende» pubblicati (14/10)
- [x] Annunci: raccolta estesa a tutta Italia (14/10): stesse 67 ricerche senza regione, salvataggio a blocchi da 1.000; siti cercati per 300 aziende al giorno
- [ ] Annunci: controllare dopo una settimana le chiamate Adzuna del mese (limite 5.000)
- [x] Annunci: sito delle aziende, livello 2 gratuito (domini probabili verificati sulla pagina): migrazione 023, workflow «Annunci | Siti aziende». Misura 14/10: 67 aziende su 150 (45%), 127 annunci collegati, costo zero
- [x] Annunci: sito delle aziende, livello 3 (14/10): ricerca web con Claude Haiku per le aziende non trovate dal livello 2, massimo 40 al giorno (~0,50 $), sito verificato con le stesse regole
- [ ] Accordo commerciale con Adzuna; TheirStack rimandato
- [x] Fase 4 – controllo dei siti del database: workflow «Aziende | Controllo siti» (ogni ora 60 aziende mai controllate o da più di 25 giorni, gratis, stesse regole del motore grazie a `lib-controlli-sito.js` condiviso), migrazione 027, endpoint `/api/engine/site-checks`. Le prove restano sempre fresche (valgono 30 giorni)
- [x] Fase 4 – popolamento del database da OpenStreetMap: workflow «Aziende | Popolamento OSM» (una regione a notte, solo aziende con sito, settore dalla categoria OSM), migrazione 028, endpoint `/api/engine/companies-import`. Controllo siti portato a 120 aziende l'ora, settore a 80 ogni 2 ore
- [x] Esecuzioni n8n sotto il tetto del piano (2.500/mese, obiettivo < 2.100): workflow di servizio a giri più grandi e meno frequenti (controllo siti ogni 2 ore × 150, settore ogni 4 ore × 120, siti aziende ogni 4 ore × 120, Adzuna e OSM 1 al giorno) ≈ 780/mese. 14/10: giro da 120 siti in crash per memoria (pagina scaricata due volte): HTTPS ora con HEAD + altri progetti ~120: restano ~1.200 esecuzioni per il motore
- [x] 14/10: falso positivo «WordPress vecchio» corretto (la versione di jQuery in wp-includes veniva letta come versione di WordPress, es. «WordPress 3.7.1»): ora solo dai file con la versione di WordPress; prove sbagliate cancellate e siti da ricontrollare
- [x] Ricerca in target «database first», versione prudente: solo ricerche semplici (settore e zona), aziende con settore corrispondente e sito controllato da meno di 60 giorni; l'AI cerca solo i lead mancanti; il wizard mostra quante aziende sono già pronte (migrazione 029, `target_reserve` / `target_availability`)
- [x] Nuova grafica del wizard «Nuova ricerca» (esempi di settore, paesi con bandiere, filtri avanzati chiusi, riepilogo con icone); nessuna dimensione preselezionata (con la dimensione la ricerca in target non usa il database); suggerimenti del settore dai settori del database (migrazione 030, `industry_suggestions`)
- [x] Nuova pagina Ricerche: schede di sintesi (totali, completate, lead, crediti), ricerca per nome o zona, filtri per tipo, stato e periodo, colonna Tipo, zona sotto il nome, stati con icona, menu con Ripeti / Esporta CSV / Ferma la ripetizione. Confronti con il mese scorso rimandati a quando ci saranno almeno due mesi di dati
- [x] Settori bloccati nel wizard e sul server (attività per adulti, gioco d'azzardo, armi, droghe): `src/lib/domain/blocked-sectors.ts`
- [ ] Collaudo del 15/10: misurare quanti lead nominativi arrivano da Icypeas rispetto al sito (se pochi, piano Icypeas più piccolo). MillionVerifier da attivare con la beta solo se i rimbalzi segnalati superano 2-3 ogni 100 lead
- [ ] Più avanti: servizi «Sito nuovo» (segnale «in costruzione») e «Prenotazioni online per hotel» (nessun booking engine, solo strutture ricettive), entrambi solo dal database; serve rendere decisivi i due segnali solo per quei servizi
- [ ] OSM: citare la fonte («© OpenStreetMap contributors», licenza ODbL) nell'informativa / pagina fonti
- [ ] Ricontrollo gratuito delle persone del magazzino ogni 90 giorni (il nome è ancora sul sito?)
- [ ] Fase 5 – togliere dal workflow Target i rami opportunità; prezzi definitivi sui costi misurati
- [ ] Beta gratuita su invito (5-10 aziende, crediti regalati dall'admin): misurare rimbalzi e segnalazioni
- [ ] Lancio a pagamento: partita IVA, Stripe live, revisione legale

## Sicurezza (audit dell'11/10, report non pubblicato)
- [x] Fase 1: V1, V2, V3 (captcha Turnstile), V4, V5 (motore), V8
- [ ] 2FA su tutti gli account (Supabase, Vercel, GitHub, n8n, Stripe, Cloudflare, Resend, Icypeas, MillionVerifier, OpenAI)
- [x] V7: tetto dei rimborsi automatici in SQL (migrazione `20261018000012_auto_refund_lock.sql`)
- [x] V12: limiti su export, ricerche e segnalazioni (migrazione `20261019000013_rate_limit_indexes.sql`)
- [x] V9 + V11: CSP, controllo dei link mostrati, `/app` e `/admin` esclusi dai motori di ricerca
- [x] V6: magazzino ripulito dopo 24 mesi (cron notturno) e subito dopo un'opposizione (migrazione `20261020000014_retention_optout.sql`)
- [ ] Facoltativo: captcha anche su accesso e recupero password (captcha di Supabase)
- [x] Fase 3: monitoraggio errori con email all'admin (migrazione `20261021000015_error_events.sql`), V13, V14
- [ ] Fase 3: conservazione esecuzioni n8n
- [ ] Più avanti: backup (Supabase Pro), repository privato

## Nuova funzione: segnali di bisogno (dopo la sicurezza)
Piano e regole in `docs/07-segnali.md`. Fasi: 0 regole · 1 motore annunci · 2 motore segnali dal sito · 3 database e crediti · 4 app · 5 collaudo · 6 beta.
- [x] Fase 0: catalogo (`src/lib/domain/signals.ts`), schede, pagine di prova con esiti attesi
- [x] Fase 1: motore, annunci di lavoro (nodo «Verifica annuncio», pubblicato; annunci in due passaggi da provare con Adzuna al collaudo)
- [x] Fase 2: motore, segnali dal sito (nodo «Valuta segnali sito», pubblicato)
- [x] Fase 3: database e crediti (migrazione `20261022000016_signals.sql`: +1 credito, segnale obbligatorio, prove per azienda, magazzino con prove fresche, rimborso «segnale non corretto»)
- [x] Fase 4: app (due modalità: «aziende in target» e «aziende con opportunità», anteprima e costo, «Perché è in target» sui lead, etichetta «Opportunità», termini e privacy)
- [x] Homepage con le due modalità (in target / opportunità) e demo
- [x] Prezzo dei segnali modificabile dall'admin (sito e annunci)
- [x] Magazzino completo: si salva ogni lead valido trovato, anche non consegnato
- [x] Pagina «Il mio account» (profilo, sicurezza, piano e fatturazione, assistenza)
- [ ] Prova reale dall'app: una ricerca normale e una opportunità (crediti, consegna, prove, export)
- [ ] Fase 5: collaudo sulle 10 ricerche di prova
- [ ] Annunci di lavoro: prova di Adzuna al collaudo (con la sola ricerca web si trovano pochi candidati)
- [ ] Prezzo finale: costo reale per lead (in target, segnali dal sito, annunci) dal collaudo, poi crediti dei segnali e pacchetti
- [ ] Dopo il lancio: nuove sedi, espansione all'estero, appalti pubblici (ANAC)

## Revisione esterna del 14/10 (punti da gestire e controllare)

Analisi di un'altra AI sul documento «come funziona il sistema», filtrata sul codice reale.
Le stime della revisione non sono dati misurati.

### Bloccanti per il lancio
- [ ] Parere legale privacy, prima del listino: art. 130 Codice privacy (email promozionali anche a caselle aziendali), raccolta e rivendita di email nominative, cessione a terzi, licenza ODbL di OpenStreetMap (regole sui database derivati, non solo l'attribuzione). Il parere decide cosa si può vendere
- [ ] Limiti Adzuna: la revisione indica 250 chiamate/giorno e 2.500/mese, il nostro codice ne assume 500/5.000. Verificare sul pannello Adzuna e ridurre la raccolta se serve; accordo scritto per l'uso commerciale degli annunci come segnali
- [ ] Collaudo dei costi (15/10) e poi misura su almeno 100 lead per modalità: costo per lead accettato, percentuale di richieste soddisfatte, quota di lead nominativi da Icypeas
- [ ] Beta su invito con 5-10 aziende (agenzie web, società IT, consulenti HR): aziende davvero in target, email valide, segnali confermati, lead giudicati interessanti dai clienti
- [ ] Backup del database con prova di ripristino (già in lista sicurezza)
- [ ] Testi e termini coerenti con gli usi consentiti: niente promesse di «email pronte per campagne»

### Brevi, senza costi API (dopo il collaudo)
- [ ] Contatore del wizard realistico: «aziende da elaborare», poi stima dei lead dalla resa misurata (aziende disponibili ≠ lead consegnabili)
- [ ] Costo stimato in euro nel wizard (dal prezzo per credito del piano) e lead acquistabili con il saldo; cursore della quantità limitato a quanto si può comprare
- [ ] Dimensione e fatturato dei lead indicati come «stimati» quando non hanno una fonte
- [ ] Una sola ricerca web del referente invece di due, se il collaudo mostra che la seconda rende poco
- [ ] Sinonimi per i 30-50 settori più cercati (es. dentista / odontoiatra / studio dentistico), solo SQL, senza AI per ricerca

### Dopo (quando il database cresce o dopo la beta)
- [ ] Controllo siti con priorità: 150 ogni 2 ore ≈ 54.000 al mese, 60.000 aziende ogni 25 giorni ne richiedono ≈ 72.000. Prima zone e settori cercati dai clienti, intervallo più lungo per le altre (esecuzioni n8n invariate)
- [ ] Modalità «solo azienda» (azienda + email generica + segnale, senza referente): costo più basso, più lead, meno dati personali. Da decidere dopo il parere legale
- [ ] Nuovi segnali: errori tecnici evidenti sul sito, pagine «Lavora con noi» delle aziende del database, sito lento su mobile
- [ ] Campi di qualità nel magazzino: ultima verifica dell'azienda, del referente e dell'email, scadenza del segnale, contestazioni
- [ ] Abbonamenti come monitoraggio continuo: ricerca salvata che segnala nuove aziende compatibili
- [ ] Capacità: con circa 1.200 giri al mese per il motore, oltre 50-100 clienti attivi alzare il piano n8n; verso 300+ clienti coda e worker separati da n8n

### Estero (deciso il 16/10: prima solo Italia)
- [x] Ricerche con annunci di lavoro solo per l'Italia (la raccolta Adzuna è italiana); avviso nel wizard per i paesi esteri (solo ricerca AI)
- [ ] Dopo il lancio: un paese alla volta nel database (OSM + Adzuna), probabilmente Spagna o Svizzera; prima il parere legale sul paese (in Germania serve di regola il consenso anche per le email B2B)

### Non da fare (valutati)
- Overpass self-hosted: con 4 query al giorno siamo molto sotto i limiti d'uso dei server pubblici
- Idempotenza callback e anti-SSRF del motore: già coperti (token monouso per giro, callback solo verso il nostro dominio)
- Distinzione fatto / esigenza: già presente (segnali verificati e indicativi, avviso nel wizard, prova su ogni lead)

## Legale e fiscale
- [ ] Apertura partita IVA (prima di incassare) e scelta del regime con un commercialista
- [ ] Validazione di informativa privacy, termini, LIA/DPIA con un consulente
- [ ] Passaggio di Stripe in modalità live
- [ ] Chiusura dell'account: oggi è una richiesta via email dalla pagina «Il mio account». Decidere con il
      consulente se renderla automatica (crediti residui, fatture da conservare, lead acquistati)
- [ ] Dati di fatturazione italiani (ragione sociale, P.IVA, codice SDI/PEC): oggi li raccoglie il portale
      Stripe. Verificare con il commercialista se bastano per la fattura elettronica o se servono campi nostri
