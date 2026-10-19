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
- [x] Casella Hostinger leads@weborastudio.it (19/10, provata). Piano «Starter Business Email» in prova gratuita fino al
      19/02/2027 con rinnovo automatico: controllare il prezzo del rinnovo prima della scadenza.
- [ ] Logo accanto al mittente: account Google creato con leads@weborastudio.it («Usa il tuo indirizzo email attuale»)
      e logo Webora come foto profilo (lo vedono i destinatari Gmail). BIMI (tutte le caselle, serve DMARC
      quarantine/reject e un certificato del marchio a pagamento): solo più avanti, con più volume.
- [ ] Firma con il logo per leads@ nella webmail di Hostinger (email della beta scritte a mano).
- [ ] Email dell'app più belle: oggi sono solo testo (`src/lib/server/email.ts`). Versione HTML con logo e grafica
      Webora (con la versione testo per chi non legge l'HTML), e stessi modelli per le email di accesso nel pannello
      di Supabase (conferma, reset password, magic link).

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
- [x] Limiti Adzuna verificati sul pannello (18/10, piano «API Access» 8 £/mese): 50/minuto, 500/giorno, 2.000/settimana, 5.000/mese, come assume il codice. L'accordo scritto per l'uso commerciale resta aperto (sotto)
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

- [x] 17/10: controllo siti ogni ora (150 aziende a giro, 3.600 al giorno) perché OSM porta 2.000-3.000 aziende a notte; circa +360 esecuzioni al mese. Tornare a ogni 2 ore quando il popolamento OSM avrà finito l'Italia

### Non da fare (valutati)
- Overpass self-hosted: con 4 query al giorno siamo molto sotto i limiti d'uso dei server pubblici
- Idempotenza callback e anti-SSRF del motore: già coperti (token monouso per giro, callback solo verso il nostro dominio)
- Distinzione fatto / esigenza: già presente (segnali verificati e indicativi, avviso nel wizard, prova su ogni lead)

## Collaudo del 17/10 (hotel in Puglia, 5 lead, Mista)

- [x] Ricerca A: 2/5. Referente trovato in 2 hotel su 15; la ricerca si chiudeva dopo un giro senza lead con 34 hotel ancora da provare. Corretto: più referenti per giro dalla riserva e niente chiusura con aziende da provare.
- [x] Ricerca A bis: 3/5 in 3 giri. 14 dei primi 15 hotel erano gli stessi già falliti nella A. Corretto: memoria dei referenti non trovati (`companies.referente_missed_at`, migrazione 031), queste aziende vanno in fondo alla riserva per 90 giorni.
- [x] Deciso il 17/10 (opzione 1): in «Email generiche incluse» senza referente si consegna l'azienda con l'email generica, senza nome (niente Icypeas, niente email ipotizzate). Mista e Solo nominative invariate.
- [ ] Costo collaudi hotel: 1,58 $ di Claude (6,48 → 4,90, compreso il lavoro di fondo) e 2 crediti Icypeas per 5 lead.
- [ ] Hotel: referente trovato nel ~10% delle aziende (titolare quasi mai sul sito; uno trovato da visura su ufficiocamerale.it). Decidere: consegnare nella modalità «Email generiche incluse» anche lead senza nome (solo info@ verificata) e/o un prezzo diverso per i settori «difficili».
- [x] Pianificatore AI saltato quando i lotti sono 0 (bivio «Serve pianificazione?»).
- [x] Diagnosi completa (ricerca B, 17/10): sui siti di 56 micro-imprese il decisore è nominato in 7 (12%); 32 non hanno nessun nome. Il passaggio dal sito trovava 0 referenti su 20 per una regola troppo stretta sul ruolo; la ricerca web (2 a tentativo) era ~70% della spesa; un'azienda scartata alla verifica email veniva ripagata a ogni giro; il limite di 3 giri chiudeva le ricerche con centinaia di aziende disponibili.
- [x] Soluzione (approvata il 17/10): nome del referente come valore aggiunto (+1 credito sulle generiche con il nome); «Mista» e «Generiche incluse» consegnano anche senza nome; regola ampia sul sito (titolare, fondatore, gestore… anche senza la parola esatta); 1 sola ricerca web mirata ai registri imprese (niente web in «Generiche incluse»); email scartate alla verifica ricordate nel giro; stop sul budget della ricerca (0,20 € a lead, minimo 1 €, fino a 5 giri) invece che dopo 3 giri; piattaforme (thefork, booking, accor…) escluse dalla riserva. Migrazione 032.
- [x] Verifica reale (17/10, Rifacimento del sito · Puglia, 5 lead, Mista): 5/5 in 1 giro (7 trovati, 2 nel magazzino), 4 nomi su 9 dal sito senza ricerca web, 5 ricerche web, ~32k token, pianificatore saltato. Costo Claude 0,12 $ (4,31 → 4,19, compreso il lavoro di fondo): ~0,02 $ a lead contro ~0,20 $ prima.
- [x] «La Chicca» (Ruvo di Puglia): il suo «sito» era il menù digitale ospitato da creoadv.com (web agency). Nome ed email erano del ristorante, ma dominio e segnale «sito datato» erano dell'agenzia. Migrazione 033: le pagine ospitate su domini altrui (percorso oltre la radice e nessuna parola del nome nel dominio) e le piattaforme di ordinazione escono dalla riserva. Da fare poi: scartarle già all'importazione da OpenStreetMap.
- [x] Prova hotel con «Email generiche incluse» (17/10, Hotel · Puglia, 3 lead): 3/3 in 1 giro (26 s), 7 lead trovati (4 nel magazzino), 0 ricerche web, ~22k token. Costo Claude 0,04 $ (4,19 → 4,15): ~0,013 $ a lead.
- [x] «Email generiche incluse»: tetto dei referenti a 1,6 volte i lead + 2 nei giri dalla riserva (prima 2,5 + 2, pensato per quando il nome era obbligatorio). Mista e Solo nominative invariate.
- [x] Prova C (17/10, Hotel · Puglia · 11-50, Mista, 3 lead, ricerca AI): 1/3 in 2 giri, ~240k token e 14 ricerche web (~0,5–0,7 $). Causa: nelle ricerche target l'AI cercava azienda E titolare insieme (1 sola azienda per lotto) e la deduplica scartava «Legale rappresentante» per «Titolare / CEO». Corretto: due passaggi per tutte le ricerche (l'AI cerca solo aziende, 30 per lotto; referente e email li cerca il motore), nome con ruolo non coerente = referente da cercare, legale rappresentante/amministratore unico/gestore come titolare, le aziende dell'AI oltre il tetto restano in riserva per il giro dopo. Da rimisurare.
- [x] Prova C bis (dopo i due passaggi): 3/3 in 1 giro, 26 hotel da 1 lotto AI (7 ricerche web), costo 0,44 $ (3,50 → 3,06): ~0,135 EUR a lead. Le aziende non usate ora entrano nel database (origine «ai»).
- [x] Listino (deciso il 17/10): prezzi dei piani invariati; +1 credito a lead per le ricerche che usano la ricerca AI sul web (target con dimensione, fatturato, parole chiave o note, o fuori dall'Italia). Margine nel caso peggiore (Scale, 0,20 EUR/credito, lead senza nome) dal 32% al 66%. Migrazione 034. Da rimisurare in beta con ricerche da 20-50 lead.
- [x] 18/10 (analisi giornaliera): database più pulito. Esclusi all'importazione, dal controllo siti, dal settore e dalla riserva: associazioni sportive, enti e servizi pubblici, centri commerciali, porti turistici, sedi di grandi gruppi (`is_non_target_company`), marchi nazionali con scheda Wikidata e pagine ospitate (OSM). Settore dal nome quando è evidente (`industry_from_name`, ~50 regole) all'importazione e quando Haiku non riesce. Migrazione 035.
- [ ] Email nominative su Gmail/iCloud pubblicate dal titolare: da valutare con il legale (privacy), insieme agli altri punti.
- [ ] Referente trovato ma nessuna email (Echi di Puglia: Icypeas NOT_FOUND e nessuna generica sul sito): capire perché la generica non c'era.

## Legale e fiscale
- [ ] Apertura partita IVA (prima di incassare) e scelta del regime con un commercialista
- [ ] Validazione di informativa privacy, termini, LIA/DPIA con un consulente
- [ ] Passaggio di Stripe in modalità live
- [ ] Chiusura dell'account: oggi è una richiesta via email dalla pagina «Il mio account». Decidere con il
      consulente se renderla automatica (crediti residui, fatture da conservare, lead acquistati)
- [ ] Dati di fatturazione italiani (ragione sociale, P.IVA, codice SDI/PEC): oggi li raccoglie il portale
      Stripe. Verificare con il commercialista se bastano per la fattura elettronica o se servono campi nostri

## 18/10 – Posizionamento: intelligence commerciale sulle aziende

- [x] Deciso: «Trova aziende in target e scopri nuove opportunità commerciali verificate». La ricerca per
      opportunità è l'elemento distintivo; l'email generica è un'informazione in più. I referenti si tolgono
      per scelta di prodotto (non un altro database di contatti), non solo per risparmiare.
- [x] Modalità «Solo azienda» (`company_only`, migrazione 037): 1 credito a lead (+segnale, +ricerca estesa),
      nessun nome né email di persona né casella gratuita, consegna e magazzino senza persone. Motore: niente
      ricerca del referente (Haiku sul sito e sul web) e niente Icypeas; Haiku resta per settore e siti.
- [x] Interruttore `app_settings.people_enabled` (falso): il wizard mostra solo «Solo azienda», il database
      rifiuta le altre modalità (MODE_DISABLED), le ricerche ricorrenti diventano «Solo azienda».
      Per riaccendere i referenti dopo il parere legale: `update app_settings set value = 'true' where key = 'people_enabled'`
      (e rivedere i testi del sito).
- [x] Testi del sito riscritti (home, demo, prezzi, termini, informativa, wizard, lead, dashboard, export).
- [x] Prova «Rifacimento del sito» · Lombardia · 3 lead (Solo azienda): 17 lead da 40 aziende della riserva in 1 giro,
      0 token Claude, 0 Icypeas. 23 senza email: ~10 grandi aziende (solo moduli), ~7 siti in JavaScript, 4 caselle
      non vendibili. Corretti: grandi aziende fuori dalle ricerche con opportunità (migrazione 038: elenco
      large_companies, 201+ dipendenti, banche e assicurazioni, 6+ annunci o annunci in 3+ regioni in 120 giorni);
      quarta pagina (note legali/privacy, cookie per ultimi) solo se le prime tre non bastano; in «Solo azienda» ci si
      ferma alla prima email generica del dominio.
- [x] Seconda valutazione esterna (18/10, 8,2/10). Fatti: regola «annunci» delle grandi aziende diventata priorità
      bassa (migrazione 039); moduli di contatto rilevati dal motore e salvati in companies.contact_form_url (per ora
      non cambiano la consegna); riquadro «Database aziende» nell'admin (raccolte → sito e settore → contatto →
      opportunità); caso Lusha segnato come non definitivo; «costo AI zero» al posto di «costo zero».

## Piano dal 19/10 (dopo la seconda valutazione)

Obiettivo: chiudere i blocchi e passare alla beta con 5–10 agenzie web. Nessuna nuova grande modifica
all'architettura; il resto si decide con i clienti.

### A. Blocchi prima della beta (obbligatori)
- [x] Nomi raccolti nei collaudi (18/10): 152 referenti, 29 email nominative e 96 lead di prova con nome cancellati
      (un solo account, quello di prova). Controllo finale: tre zeri. La tabella dei lead nasconde da sola la colonna
      «Referente» quando nessun lead ha un nome.
- [x] Esecuzioni salvate su n8n (18/10): cancellate le 53 del motore dal 13 al 17/10 (collaudi con referenti).
      Conservazione invariata: con i referenti spenti le nuove esecuzioni non contengono dati di persone.
- [ ] Adzuna: piano «API Access» 8 £/mese (solo limiti di chiamate, nessuna clausola sull'uso commerciale nel pannello). Chiedere conferma scritta che copra il nostro uso (annunci come
      segnale mostrato a clienti B2B, con link all'annuncio, senza ripubblicarli). Mail inviata il 18/10 ad api-partnerships@adzuna.com: in attesa di risposta.
      Conservare la risposta per il legale.
- [x] Testi del sito e dell'export (19/10): email pubblicata ≠ consenso alla pubblicità (Garante 2026). Avviso
      «Come usare questi contatti» sopra i lead (pagina Lead e pagina della ricerca), foglio «Come usarli» nell'export
      Excel, termini e FAQ aggiornati (anche per il modulo di contatto). Testo unico in `CONTACT_NOTICE` (leads.ts).
- [ ] Legale e commercialista (`09-domande-consulenti.md`): stato del caso Lusha, LIA, art. 130, ODbL, Adzuna, P.IVA.
- [ ] Sicurezza (`08-messa-in-produzione.md`, Fase 1): 2FA sugli account, chiave Anthropic dedicata a Webora Leads.
      (Utente: Supabase, Vercel, n8n, GitHub, Stripe, Anthropic, Resend; chiave nuova da inserire nelle credenziali n8n.)

### B. Test: email facoltativa con modulo di contatto
- [x] Test del 19/10 (Hotel Emilia-Romagna, Architettura Lombardia, Metalmeccanica Veneto, 20 lead ciascuna):
      125 aziende, 51 senza email, di cui 22 con modulo (43%); moduli rilevati in 42 aziende. Costo 0,77 $: architettura
      e metalmeccanica non erano nel database e sono partite con la ricerca AI (prima dei test controllare la disponibilità).
- [ ] Giudicare a mano le 24 aziende con solo modulo (valida, in target, modulo funzionante). Rossi S.p.A. (distributore
      per hotel) uscita in una ricerca di hotel: qualità del settore da rivedere.
- [x] Deciso (19/10): opzione nel wizard «Contatto richiesto»: «Email aziendale o modulo di contatto» (predefinita) o
      «Solo con email aziendale». Stesso prezzo (1 credito). Colonna «Contatto» nei risultati, «Pagina modulo di
      contatto» nell'export. Migrazione 040 (consegna `email_type = 'form'`); il callback trasforma in lead gli scarti
      «nessuna_email» con il modulo.
- [x] Migrazione 040: ricostruito il magazzino «Solo azienda» (schede senza nome dalle email generiche): la pulizia del
      18/10 aveva cancellato tutta la tabella people, comprese le schede senza nome.
- [x] Collaudo dell'opzione (19/10, Hotel Emilia-Romagna, 10 lead): 5 lead con il solo modulo; 0,30 $ per un giro AI
      (hotel della regione nel database già tutti consegnati al cliente di prova). Wizard: «Contatto» in un passo a sé.
- [x] Sui 5 moduli c'erano email non riconosciute: reservations@ e albergo…@ (caselle d'ufficio nuove) e domini fratelli
      (zoello.it / info@zoello.com, magnagallo-hotel.com / info@magnagallo.it). Motore aggiornato + migrazione 041
      (email_on_domain con la stessa regola: stesso nome 4+ lettere, nome contenuto 6+ lettere).

- [ ] Verificare alla prossima ricerca reale le nuove regole delle email (reservations@, albergo…@, domini fratelli).
- [x] Settore: aziende fuori target finite nelle ricerche (Rossi S.p.A., «Distribuzione alimentare per ristorazione e
      hotel», in «Hotel»). Migrazione 045: quello che segue «per / for / rivolto a / destinato a» nel settore descrive i
      clienti e non diventa etichetta (anche i sinonimi), salvo le categorie OSM con «per» nel nome. Prompt della ricerca
      AI («Prepara lotti»): niente fornitori, distributori, consulenti o software house del settore cercato.
      Limiti: «Forniture alberghiere» (senza «per») resta etichettata come hotel; «Software per hotel» non esce più
      cercando «Software per hotel» nel database (la trova la ricerca AI).
- [ ] Da valutare: consegnare i lead con il solo modulo solo quando le aziende con email sono finite (oggi l'ordine è
      per giro). Più resa di email ma più giri AI: decidere dopo la beta.
- Regola per i collaudi: prima di una ricerca di prova controllare che settore e zona siano nel database (il contatore
  del wizard), altrimenti parte la ricerca AI a pagamento.

### C. Qualità delle opportunità
- [x] Punteggio dell'opportunità 0–100 (19/10, `opportunityScore` in signals.ts, regole in `OPPORTUNITY_RULES`):
      affidabilità della prova (annuncio e HTTPS 90, CMS 85, in costruzione 70, cellulari 65, una lingua 50,
      prenotazioni 45, copyright 40) × attinenza al servizio (principale 100%, secondario 85%, altro 70%) × freschezza
      (≤14 gg 100%, ≤30 90%, ≤60 75%, oltre 60%); +8 per ogni segnale in più, massimo 100.
- [x] Livelli: opportunità forte (75+), probabile (50+), potenziale. Il segnale è il fatto con la prova, l'opportunità
      è la nostra stima (detto così nei risultati e nelle FAQ).
- [x] Punteggio e livello sotto l'azienda nei risultati, spiegazione nel dettaglio del lead, due colonne nell'export
      (solo se ci sono segnali). Calcolato dall'app: si può cambiare senza migrazioni.
- [ ] Dopo la beta: tarare i pesi con i giudizi dei clienti (quali opportunità hanno portato a una risposta).
- [x] Collaudo del 19/10 (Rifacimento del sito · Veneto · 8 lead): 16 candidati dal database, costo zero, punteggi
      corretti (93, 85, 55), email dei domini fratelli consegnate (info@krupps.com, info@th-resorts.com).
- [x] Aziende fuori regione (Dinamica, Roma; A.m.A. Mobili, Porcia) in una ricerca sul Veneto: tag_company aggiungeva la
      regione cercata. Migrazione 042: luoghi solo dai dati dell'azienda (OSM, o capoluogo di provincia dalla tabella
      it_provinces), pulizia delle aziende non OSM.
- [x] Colonna «Qualità» (63 per tutti in «Solo azienda») sostituita da «Opportunità» (punteggio e livello), nascosta
      nelle ricerche in target; tolta anche dall'export.

- [x] Archiviazione ed eliminazione (19/10, migrazione 043): lead singoli o selezionati e ricerche intere. Archiviare
      nasconde e si annulla («Archiviati» nella pagina Lead, «Archiviate» nella pagina Ricerche; la ricerca archivia anche
      i suoi lead). Eliminare cancella i dati per sempre ma tiene la chiave dell'azienda (non riproposta né riaddebitata);
      le ricerche in corso non si eliminano.

- [x] Account su quattro pagine (Profilo, Sicurezza, Piano e fatturazione, Assistenza e dati) e verifica in due
      passaggi facoltativa (app di autenticazione, TOTP di Supabase): attivazione con QR in Sicurezza, codice chiesto
      dopo la password (/accedi/verifica), proxy che non apre /app e /admin senza il codice, migrazione 044 (le tabelle
      del cliente non si leggono con la sola password se il 2FA è attivo). L'admin può toglierla a chi perde il telefono
      (scheda del cliente). Il cambio password non abbassa più il livello della sessione.
- [x] 2FA provata dall'utente il 19/10 (migrazione 044 eseguita): attivazione e accesso con il codice funzionano.

- Deciso (19/10): prezzi e crediti invariati per la beta. Nessun avviso quando il database si esaurisce (ricerca AI
  silenziosa): l'obiettivo delle prossime settimane è un database abbastanza grande da servire 3-4 clienti Scale sulla
  stessa zona. Dopo la beta: valutare opportunità a più crediti e un abbonamento di monitoraggio.

### D. Database
- [x] Copertura del 19/10 (`supabase/queries/opportunita_per_regione.sql`): Sud ed Emilia-Romagna ben coperti per i
      segnali dei siti (Rifacimento del sito: Puglia 461, Campania 334), Nord scarso (Lombardia 48, Veneto 14).
      Popolamento OSM dal 20/10: prima Lombardia, Veneto, Emilia-Romagna, Piemonte, poi il resto del Centro-Nord;
      8 province al giorno (Nord coperto in ~8 giorni). Rilanciare la query verso il 28/10 prima degli inviti.
- [x] «Traduzioni ed export» limitato ai settori che esportano (industria, agroalimentare, vino, turismo): da solo il
      segnale «sito in una sola lingua» valeva per 3.342 aziende, quasi tutte piccole attività locali.
- [ ] Rimandato (analisi del 19/10): coda del controllo siti con priorità (segnali attivi in scadenza, settori e zone
      più cercati, poi le altre). Oggi la coda si svuota in ~3 ore dopo l'importazione OSM notturna (4 province al
      giorno); riprendere quando i controlli cominciano ad accumularsi.
- [ ] Seguire i quattro numeri del riquadro «Database aziende» nell'admin (raccolte → sito e settore → contatto →
      opportunità).

### E. Beta
- [x] Homepage rifatta (19/10): opportunità in primo piano (scheda d'esempio, catalogo dei segnali, demo simulata
      come strumento di registrazione), ricerca in target come alternativa, obiezioni, prezzi dal listino, sezione
      «Per chi è» (anche edilizia, pulizie, logistica, fornitori: in target). Wizard: «Vendi altro?» porta alla
      ricerca in target; nella ricerca con opportunità non si chiedono più dimensione, fatturato, parole chiave
      aggiuntive e note (il database non li applica).
- [x] Piano della beta e testi dell'invito (email, LinkedIn, benvenuto): `10-beta.md` (19/10). Due ondate: Sud ed
      Emilia-Romagna subito, Nord dopo il 28/10 (copertura da rimisurare). Crediti beta e piano Growth dall'admin.
- [ ] Lista delle 5–10 agenzie da contattare (fonti in `10-beta.md`).
- [ ] Bloccanti prima di inviare: elenco in `10-beta.md` (2FA e chiave Anthropic, popolamento pubblicato, clausola di
      riservatezza nei termini: fatta il 19/10, sconto dei beta tester).
- [ ] Domanda da verificare: un'agenzia paga con regolarità per aziende con bisogni documentati, senza il nome di
      un referente?
- [ ] Prezzi: invariati per la beta.

### F. Analisi da fare (chieste il 19/10)
- [ ] Sicurezza: siamo a posto? Ripassare l'audit dell'11/10 (report non pubblicato) e quello che è cambiato dopo
      (2FA, archiviazione ed eliminazione, moduli di contatto, nuove migrazioni 040–045, homepage), più la Fase 1 di
      `08-messa-in-produzione.md` (2FA sugli account dei servizi, chiave Anthropic dedicata).
- [ ] Pagina «Sicurezza e privacy» sul sito (dopo l'analisi di sicurezza qui sopra, per scrivere solo cose verificate):
      fonti dei dati e niente dati di persone, dove stanno i server (controllare la regione di Supabase: UE è un
      argomento forte), pagamenti con Stripe, verifica in due passaggi, come chiedere la cancellazione, DPA su
      richiesta. Certificazioni (ISO 27001, SOC 2, GDPR): non ora (19/10), da rivalutare con clienti medio-grandi.
- [ ] DPA (accordo sul trattamento dei dati) pronto da firmare per i clienti: domanda 11-bis in
      `09-domande-consulenti.md`, insieme a una sintesi del parere legale da mostrare.
- [ ] Motore: si può ottimizzare? Ci sono parti inutilizzate? Già visto: nel workflow «Lead Engine | Search (v1)»
      i nodi «OpenAI (pianificazione)» e «Ricerca prospect AI» non sono collegati a niente; i rami dei referenti
      (spenti dal 18/10) e RocketReach/Icypeas restano nel flusso. Contare costi e tempi per nodo dalle esecuzioni.

### Dopo la beta (non ora)
- [ ] Monitoraggio continuo delle opportunità («nuove aziende e nuovi segnali per il tuo target»): solo se i
      clienti della beta lo chiedono.
- [ ] Referenti: restano spenti; si riaccendono solo dopo il parere legale e su richiesta dei clienti.
- [ ] Espansione fuori dall'Italia: rimandata.
- [ ] Segnale «nuova apertura / nuova sede» dagli annunci (per pulizie, facility, arredo, logistica,
      sicurezza). Misurato il 19/10 sugli annunci salvati (solo figure d'ufficio): 19 aziende su ~2.900 con
      una nuova apertura o sede vera (es. «per nuovo punto vendita»); «crescita / ampliamento» (330 aziende)
      scartato perché è linguaggio pubblicitario o ripete l'annuncio stesso. Troppo poco per un servizio.
      Prima di riprenderlo: cercare «nuova apertura» su adzuna.it (quanti annunci, se aziende vere o agenzie
      per il lavoro e catene). Solo se convince, valutare nuove figure nell'import (addetto vendita,
      magazziniere, operaio) rispetto ai limiti del piano Adzuna.
