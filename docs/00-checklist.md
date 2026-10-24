# Checklist di Avvisto

Formato (deciso il 19/10): sezioni con colore e titolo, ruolo in grassetto (**Tu**, **Io**, **Insieme**), numeri
progressivi. Le cose fatte restano nella lista, barrate (~~così~~), con la data. Quando l'utente chiede «riscrivimi
la checklist» si riscrive tutto da qui, fatti compresi. Lo storico delle modifiche e delle decisioni è in
`13-registro.md` (prima del 19/10 in `archivio/05-da-fare.md`).

Ultimo aggiornamento: 24/10/2026 sera (analisi privacy: 13 urgente, nuovo 98; 89b fatto; riepilogo delle priorità aggiornato; nuova vista per date in
`00b-checklist-calendario.md`, da aggiornare insieme a questa).

## 🧭 Ordine di priorità delle cose aperte (24/10)
Riepilogo per ordine di urgenza; il dettaglio di ogni voce è nella sua sezione qui sotto. Le stesse voci ordinate per date
sono in `00b-checklist-calendario.md`.
1. **Oggi e domani 24–25/10:** ~~89b chiamate Adzuna~~ (24/10); 67d ricerca di prova che passi dal motore (Tu); 66 inoltro della
   casella vecchia e 30 logo del mittente (Tu); 56b registrazioni (Tu, ogni giorno).
2. **26–28/10:** 96 copertura del database (Tu), 85a prove delle ricerche consigliate (Insieme), 91b Data Quality sui segnali
   del VPS e fase 2 (Io), 92 `avvia-cc` quando l'arretrato del controllo siti è smaltito (circa il 27/10), 60 e 62 da decidere
   (Insieme), 67e con 83, 85b e 16 (repository privato).
3. **Il 30/10 (o il 6/11):** 9 decisione della beta e `agenzie_beta.sql`, poi 5g ed eventuale seconda ondata.
4. **Prima del lancio a pagamento:** 11, 12, 13, 14, 15, 18, 29, 73, 5f e 35.
5. **Dopo la beta:** 26b, 36b, 34, 37, 38, 41, 43, 44, 45, 46, 47, 50, 51; 68 rinnovi Hostinger (gennaio–febbraio 2027).

## 🔴 Beta in corso
5g. **In pausa dal 21/10 sera** (decisione dell'utente: 3–4 giorni per vedere se rispondono le 13 agenzie invitate; se nessuno
    risponde si passa al nome nuovo, punto 67). Prima: **Tu** – 15 inviti al giorno da leads@ (13 fatti al 21/10, ne mancano 37
    per arrivare a 50), prima le agenzie con l'email, poi quelle con il solo modulo (`agenzie_beta.csv`, fuori dal repository).
5b. **Insieme** – A ogni «sì», in giornata: account, +150 crediti e piano Growth dall'admin, email di benvenuto
    (`10-beta.md`, link /registrati?beta=1).
5i. **Sospeso dal 21/10 sera** (come gli inviti). Prima: **Tu** – Un solo promemoria a Gopher, Mutart e Studio360 (testo in
    `10-beta.md`).
56b. **Tu, ogni giorno** – Guardare le nuove registrazioni per aggiungere i crediti beta; controllare in Stripe (test) che
    nessun cliente non admin abbia comprato.
5h. ~~**Io + Tu** – Ricerca di prova nella zona di ogni agenzia invitata~~ (21/10: non si fa, decisione dell'utente; si fa
    alla prima risposta, punto 20).
57b. ~~**Io** – Nel resoconto: notte del recupero OSM, prove false tolte, primo giro di «Siti aziende» dopo Adzuna~~ (22/10).
79. ~~**Io** – Pubblicare su Vercel la versione di main bloccata dal limite di 100 pubblicazioni al giorno~~ (21/10, 23:30).
80. ~~**Io** – Controllare che «Aziende | Controllo siti» sia ripartito dopo la migrazione 061~~ (21/10: giro delle 18:25 riuscito).

## 🖥️ VPS e worker
94. ~~**Insieme, 23/10 a mezzanotte**~~ (fatto il 24/10 mattina: `rinomina`, giro da 300 in 82 s, prova di Common Crawl con
    settore corretto) – Sul VPS, un passo alla volta: riscaricare
    `worker.sh` da main; leggere il log del worker del controllo siti fermo dal 22/10 alle 15:35 UTC (servizio ancora col nome
    vecchio); `bash ~/worker.sh rinomina` (rilancia installa; NON lanciare prima `installa`); `bash ~/worker.sh giro` e controllo
    dell'esito; `bash ~/worker.sh prova-cc` (senza accendere `avvia-cc`).
94b. ~~**Insieme, subito dopo** – Fine del passaggio ad Avvisto: nessuna ricerca in corso; **Tu:** staccare il vecchio indirizzo da
    Vercel (Domains), togliere la vecchia Redirect URL su Supabase e il vecchio hostname su Turnstile~~ (24/10).
94c. ~~**Io, poi Tu** – Ricerche consigliate per tutti: tolta la diagnosi `db` dai tentativi, poi «Ricerche consigliate» su
    «Tutti» in Amministrazione → Servizi opportunità~~ (23/10). ~~Organizzazione dell'amministratore rinominata, credenziale
    Anthropic su n8n rinominata in «Avvisto - Anthropic»~~ (23/10, Tu).
95. ~~**Tu, 24/10** – Query oraria di `site_checked_at`: se il worker fa circa 600 siti all'ora, spegnere «Aziende | Controllo
    siti» su n8n (libera circa 720 esecuzioni al mese). Finché il worker non lo fa, n8n resta acceso.~~ (24/10: 750 l'ora,
    n8n spento, worker ogni 10 minuti; poi `avvia-cc` quando l'arretrato di 53.000 aziende è smaltito)
89b. ~~**Io, 24/10** – Controllare le chiamate Adzuna dopo i giri con le figure della manifattura (limite 2.500 al mese)~~
    (24/10: 157 chiamate a giro, circa 2.400 al mese; al massimo 3 pagine per ricerca, circa 2.000 al mese, pubblicato su n8n).
49. ~~**Io** – Controllo siti su un worker fuori da n8n, sul VPS Hetzner~~ (22/10: VPS reinstallato con Ubuntu 24.04, accesso
    solo con chiave, firewall e fail2ban; worker in produzione, 300 aziende in 79 s; giri alle :05 e alle :35 UTC).
    ~~**Tu:** `SITE_CHECKS_SECRET` su Vercel~~ (22/10). ~~**Insieme:** installazione sul server~~ (22/10).
49b. ~~**Io** – Worker del controllo siti fermo dopo l'import OSM: correzione~~ (23/10: blocchi salvati subito, limite di tempo,
    pagine enormi ridotte, avviso «valutazione lenta»; su main, da installare al punto 94).
69. ~~**Tu** – Spegnere il VPS Hetzner finché non serve~~ (22/10: superato, il VPS ora lavora tutti i giorni; costo 6,70 €/mese
    con CX23).
90. **Insieme, rimandato** – Backup notturno cifrato del database sul VPS (22/10: codice pronto e rivisto, non installato per
    decisione dell'utente: si useranno i backup di Supabase Pro, punto 15; se servisse prima, `bash worker.sh installa-backup`).

## 🛡️ Tecnico e sicurezza
70. ~~**Io** – Nuovo ripasso di sicurezza di tutto ciò che è cambiato dal 19/10 e dipendenze~~ (21/10: nessun problema grave,
    un problema medio corretto, uno aperto nel motore chiuso con il punto 74; dettagli in `06-audit-sicurezza.md`, fuori dal
    repository).
71. ~~**Io** – Correzione di quello che esce dal punto 70, poi 63, 39, 40, 54e, 19e e pulizia dei dati di collaudo~~ (22/10).
72. ~~**Io** – Nome in un solo punto del codice (`config.ts`)~~ (21/10: elenco dei passaggi in `04-pubblicazione.md`, sezione 7).
73. **Tu** – Controlli a mano: avvisi di spesa (punto 18), Deployment Protection su Vercel, conservazione breve delle
    esecuzioni su n8n. ~~Rotazione del segreto del motore~~ (22/10, punto 17).
74. ~~**Io** – Motore e workflow n8n: DNS «jolly», porte e IP scartati, domini validati, callback solo verso
    avvisto.it~~ (21/10); ~~**Tu:** pubblicare i 3 workflow~~ (21/10). Redirect, IP e certificati: ~~con il worker
    (punto 49)~~ (22/10).
75. ~~**Io** – Testi del sito anche per i professionisti con partita IVA~~ (21/10).
76. ~~**Tu** – Eseguire la migrazione 058~~ (21/10).
77. ~~**Io** – Registrazione: stessa risposta per gli indirizzi già registrati~~ (21/10).
78. ~~**Io** – Menu del sito che non sborda sui telefoni stretti (320px)~~ (21/10).
81. ~~**Io** – Ricerca delle email più veloce e province OSM divise in 7 richieste~~ (22/10).
82. ~~**Io** – Disponibilità nel wizard come la riserva (065), certificato con errore sul nome, motore allineato al controllo
    siti, prezzi di Haiku nel registro~~ (22/10: migrazione eseguita e workflow pubblicati).
97. ~~**Io** – Pagine dell'app troppo larghe su iPhone (griglie che si allargavano con i testi lunghi)~~ (23/10: regola CSS
    globale, verificato dall'utente su iPhone 16 Pro).

## 🟠 Decisione della beta
9. **Insieme, il 30/10** – Decidere con le soglie della pagina Admin → Beta: almeno 3 agenzie attive, esporta almeno la metà
   (e almeno 2), almeno 1 ha una risposta, segnalati sotto il 10%. Poi rilanciare `supabase/queries/opportunita_per_regione.sql`
   e invitare il Nord solo dove il servizio ha almeno 40–50 aziende pronte. Se le agenzie attive sono meno di 3: rinvio al
   **6/11** (deciso il 21/10).

## 🔴 Bloccanti per il lancio a pagamento (non per la beta)
11. **Tu** – Partita IVA, regime fiscale, fatturazione elettronica (SDI), con il commercialista. **Poi (Io):** dati veri del
    titolare in privacy, termini e firma delle email (dal 23/10 c'è scritto solo «Avvisto», `BRAND.owner` in `src/lib/config.ts`).
12. **Tu** – Parere del legale (`09-domande-consulenti.md`): caso Lusha, art. 130 (vale anche per le caselle aziendali?),
    LIA/DPIA, ODbL, Adzuna, DPA, informativa, termini, pagina «Sicurezza e privacy», chiusura dell'account, riga «rispondete
    no» e firma delle email. Niente promesse di «contatto senza consenso» finché non risponde per iscritto.
    **Tu, dal 26/10:** documento aggiornato il 24/10 (domanda principale, clausole tra titolari autonomi al posto del DPA per i
    clienti); chiedere un preventivo fisso a due studi scelti dall'utente (Polimeni.Legal e l'avv. Anna Maria Lorito di DGRS). Il
    listino (5f) si fissa dopo la risposta sull'art. 130.
13. **Tu, subito** – Conferma scritta di Adzuna sull'uso commerciale degli annunci (mail del 18/10, in attesa). Dal 24/10 è
    verificato: i termini dell'API dicono che «sales prospecting or lead generation requires our written agreement». Sollecitare
    chiedendo una licenza. **Insieme, da decidere:** fino all'accordo, spegnere la raccolta Adzuna e non consegnare il segnale
    «annuncio di lavoro» preso da Adzuna.
98. **Io, poi Tu** – Interventi dell'analisi privacy del 24/10 (documento «Avvisto – analisi privacy» su Claude, fuori dal
    repository): avviso sull'art. 130 in wizard, risultati, export e termini; testi senza promesse di campagne email; ditte
    individuali e studi riconosciuti e trattati a parte; opposizione comunicata a chi ha già ricevuto il dato (art. 19);
    testo del segnale privacy; robots.txt e attribuzione OSM; privacy e termini; registro dei trattamenti. Poi controllo
    limitato del legale su 5 punti (punto 12).
14. **Insieme** – Stripe con pagamenti reali e un acquisto vero di prova; poi togliere il blocco «acquisti solo admin».
15. **Tu, poi Insieme, alla messa in produzione definitiva** – Supabase Pro (backup giornalieri, sostituisce il punto 90) e
    prova di ripristino.
16. **Tu** – Repository GitHub privato (insieme al passaggio ad Avvisto).
17. ~~**Insieme** – Rotazione del segreto del motore~~ (22/10: i due segreti cambiati e verificati).
18. **Tu** – Avvisi di spesa su Anthropic, Vercel, Supabase (Anthropic ora serve anche alle ricerche consigliate).
19. ~~**Insieme** – Pulizia dei dati di collaudo~~ (22/10: resta solo l'organizzazione dell'amministratore con lo storico dei collaudi).
29. **Tu, con il legale** – Contratto sul trattamento dei dati (DPA) pronto da firmare per i clienti.
5f. **Insieme, dopo la beta** – Nuovo listino (proposta nel registro, 20/10 sera): pacchetti 59/249/790 €, Scale tolto,
    20 crediti di benvenuto, lead con solo modulo a 1 credito, niente supplemento AI; abbonamenti con l'avviso settimanale
    (punto 36). Prezzo fondatore per le nuove agenzie, −30% per 12 mesi a chi ha fatto la beta. Numeri con i dati della beta.

## 🟡 Durante la beta
20. **Insieme** – Alla prima agenzia che accetta: una ricerca di prova nella sua zona e nel suo servizio; controllare le
    regole delle email (reservations@, albergo…@, domini fratelli).
21. **Tu** – Giudicare a mano un campione delle aziende con il solo modulo di contatto (query `moduli.sql`; dal 22/10 sono
    molte di più grazie al punto 86).
22. **Insieme** – Seguire la pagina Admin → Beta: export, risposte, segnalazioni, costo dell'AI. Chiedere alle agenzie se
    usano lo «Spunto per il primo messaggio».
23. **Insieme** – Seguire il riquadro «Database aziende» e le chiamate Adzuna (limite 2.500 al mese, raccolta ogni 2 giorni).
24. **Insieme** – MillionVerifier solo se i rimbalzi superano 2–3 ogni 100 lead.
25. **Insieme** – La domanda chiave: senza il nome del referente, lo pagherebbero?
19e. ~~**Io** – Esito delle correzioni dei falsi «Senza HTTPS»~~ (21/10: da 12% a circa 3% di falsi).
61. ~~**Io** – Riordino della cartella `docs` con indice e archivio~~ (21/10).

## 🔵 Tecnico aperto
26b. **Io, dopo la beta** – Motore: seguire a mano i rimandi da un sito all'altro, ricontrollando ogni volta l'indirizzo.
54e. ~~**Io** – Aziende con nome e dominio molto diversi; portali e business.site esclusi (062)~~ (21/10). **Dopo:** sospendere
    email e segnali quando il nome non compare nella homepage.
59. **Insieme** – Giri a vuoto e province: ~~Siti aziende 2 giri al mattino~~ (21/10); ~~recupero di Como, Sondrio, Belluno,
    Padova, Rovigo, Treviso~~ (22/10: superato, tutta Italia da Geofabrik con il punto 87); irraggiungibili ricontrollati dopo
    60–90 giorni. **Tu:** query `supabase/queries/popolamento_settimanale.sql` ogni settimana.
60. **Insieme, da decidere** – Magazzino con gli annunci di `job_ads`; prova dell'annuncio solo se ancora visibile su Adzuna
    (`last_seen_at`). Dopo 2–3 giri della manifattura (punto 89b).
62. **Insieme, da decidere** – «CMS vecchio» sulle pagine provvisorie: resta valutato o diventa non determinabile? (Proposta:
    lasciarlo così.)
39. ~~**Io** – Coda del controllo siti con priorità~~ (22/10: migrazione 064, 1,7 s in produzione, primo giro riuscito).
40. ~~**Io** – Wizard: stima realistica dei lead e costo in euro (migrazione 063)~~ (22/10: in produzione).
63. ~~**Io** – Radici calcolate una volta per le ricerche in target (migrazione 059)~~ (21/10: da 1,5 a 5 volte più veloce).

## 🟣 Passaggio ad Avvisto (iniziato il 23/10, piano in `17-avvisto.md`)
Decisioni del 23/10: sito e app su **avvisto.it**, email **ciao@avvisto.it**, logo provvisorio (Io). Dalla sera del 23/10: solo il nome Avvisto ovunque, titolare «Avvisto» nelle pagine legali fino alla partita IVA (punto 11).
65. ~~**Insieme** – Scegliere il nome: **Avvisto**, marchio verificato libero (UIBM, EUIPO), avvisto.it libero~~ (21/10).
67a. ~~**Io** – Fase A, codice pronto senza effetti online: `BRAND` in due versioni (`NEXT_PUBLIC_BRAND`), logo e icona
    provvisori, logo delle email, modelli email Avvisto, motore che accetta avvisto.it, `bash worker.sh dominio`~~ (23/10: su
    main, rivisto; nodo «Valida richiesta» caricato su n8n). **Tu:** pubblicare «Lead Engine | Search (v1)» su n8n.
67b. **Io, dal 23/10** – Grafica Avvisto dalla bozza dell'utente (viola, logo della bozza, «Non sai da dove iniziare?», «Lasciati
    ispirare», scelte rapide, statistiche con grafico): proposta dell'UI/UX Designer, poi tema, logo, menu e barra, Panoramica;
    (in origine solo con `NEXT_PUBLIC_BRAND=avvisto`, superato il 23/10 sera). ~~Passi 1–2: colori e logo~~ (23/10). ~~Menu e barra su telefono, statistiche con
    variazione e grafico, «Lasciati ispirare», scelte rapide, «Non sai da dove iniziare?»~~ (23/10). ~~Grafica definitiva per tutto
    il sito, identica alla bozza anche negli spazi (colori, menu, intestazione, riquadro, statistiche, avatar con menu)~~ (23/10,
    richiesta dell'utente).
66. **Tu, quasi fatto** – Fase B (resta l'inoltro della casella vecchia): ~~dominio comprato~~ (23/10); casella ciao@avvisto.it creata, in propagazione; comprare avvisto.it su Hostinger (solo il dominio, 5,99 €; deciso il 23/10); creare
    e provare ciao@avvisto.it con la casella gratuita; inoltro della casella vecchia verso ciao@avvisto.it. Il piano email
    del vecchio dominio (rinnovo 19/02/2027) resta finché serve la casella vecchia.
67. ~~**Insieme, il 23/10 sera** – Fase C~~ (24/10): ~~dominio su Vercel e DNS~~ (23/10); ~~dominio su Resend (SPF, DKIM, DMARC)~~ (23/10);
    ~~codice solo Avvisto, logo C, nessuna traccia del nome vecchio~~ (23/10, Io); variabili su Vercel (`APP_URL`, `EMAIL_FROM`;
    `NEXT_PUBLIC_BRAND` non serve più); Supabase (Site URL, Redirect URLs, modelli, mittente); Turnstile; webhook di Stripe;
    n8n (nodi caricati e pubblicati); VPS (`rinomina`, `dominio`); ~~**ultimo:** staccare il vecchio indirizzo da Vercel (decisione
    dell'utente: nessun rinvio)~~ (24/10). **Fase C conclusa il 24/10.** Fatto il 23/10: credenziale Anthropic e organizzazione dell'amministratore
    rinominate.
67d. **Insieme, subito dopo** – Fase D: ~~registrazione, email, ricerca di prova dal magazzino, worker~~ (24/10); manca una
    ricerca che passi dal motore (**Tu**, 25/10); QA Tester e UI/UX Designer.
67e. **Insieme, dopo** – Fase E: email alle agenzie della beta e firma; posizionamento (83) e ricerche consigliate per tutti
    (85b); social e Google Search Console; repository privato (16); ~~togliere il vecchio dominio da Supabase
    e dal motore~~ (24/10); logo definitivo.
68. **Tu, prima dei rinnovi** – Costi Hostinger: circa 234 €/anno (circa 250 con il dominio nuovo). Dominio vecchio dello studio
    15,99 € (rinnovo 20/01/2027: decidere se tenerlo, il sottodominio dell'app è staccato dal 23/10); Business Web Hosting 203,88 € (rinnovo 02/02/2027, controllare il
    prezzo vero); Starter Business Email del vecchio dominio 14,16 € (rinnovo 19/02/2027: decidere quando la casella vecchia non
    serve più). Avvisto (dal 23/10): dominio avvisto.it 5,99 € (rinnovo 15,99 €/anno a ottobre 2027); Free Business Email per
    ciao@avvisto.it (alias info@), gratis 12 mesi: controllare il prezzo del rinnovo prima di ottobre 2027.
33. ~~**Tu** – Prezzo del rinnovo della casella Hostinger~~ (21/10: assorbito dal punto 68).

## 🟢 Per tutti i mestieri che vendono alle aziende (idea del 22/10)
Solo B2B; ricerca generalista, opportunità solo con prova. Prima di promettere «qualsiasi settore»: misurare settori e zone
ben coperti dal database (punto 96).
83. **Insieme, con Avvisto** – Posizionamento «Trova i tuoi prossimi clienti», con esempi di mestieri diversi (falegname,
    impresa di pulizie, fotografo, commercialista, consulente IT).
84. ~~**Io** – «Di cosa si occupa la tua attività?» alla prima apertura dell'app, riquadro saltabile in dashboard~~ (23/10: in
    produzione solo per l'admin, migrazione 067 eseguita).
85. ~~**Io** – Ricerche consigliate: Haiku propone fino a 3 ricerche, solo con almeno 10 lead nel database, wizard già
    compilato~~ (23/10: in produzione solo per l'admin, chiave su Vercel; interruttore in Admin → Servizi).
85g. ~~**Io** – Grafica dalla bozza dell'utente, esempio del campo a rotazione tra 6 frasi~~ (23/10).
85c. ~~**Io** – Ricerche consigliate vuote per «Studio commercialista» in tutta Italia~~ (23/10: settori del database, conteggio con
    le aziende con contatto in testa (070), ricerca semplice quando quella con servizio ha pochi lead; verificato dall'admin:
    ristoranti circa 500, abbigliamento 270, agenzie immobiliari 160). **Io, finite le prove:** togliere la diagnosi `db` dai tentativi.
85a. **Insieme, 26–28/10** – Ripetere le prove con descrizioni diverse (fotografo, commercialista, parrucchiere, falegname)
    quando il controllo siti ha smaltito la coda.
85b. **Io, con Avvisto** – Modulo anche nel profilo; poi interruttore su «Tutti».

## 🟠 Copertura del database prima della produzione (decisa il 22/10)
Si va in produzione solo con il database coperto anche per manifattura, uffici e studi professionali, in tutte le regioni.
**Soglia proposta:** almeno 500 aziende con contatto per ogni regione principale e per ciascuno dei 6 macro-settori.
Il lavoro gira sul VPS (gratis), senza Google Maps, PagineGialle o Registro Imprese.
86. ~~**Io** – Contatti per tutto il database: «Contatti», «Note legali» e «Chi siamo» delle aziende senza email né
    modulo~~ (22/10: in produzione sul VPS ogni 30 minuti; primo giro 150 aziende, 18 email e 35 moduli).
87. ~~**Io** – Tutta Italia da OpenStreetMap sul VPS (Geofabrik), con manifattura, uffici e artigiani~~ (22/10: 52.284 aziende
    nuove, 15.132 aggiornate; giro ogni lunedì; workflow n8n del popolamento disattivato).
88. **Io** – Sito delle attività OSM che non ce l'hanno: ~~domini probabili verificati sulla homepage (gratis)~~ (22/10: in
    produzione, 3.000 attività all'ora; 3.577 aziende trovate al 23/10). **Da decidere:** ricerca web con Haiku per i casi
    difficili, con un tetto di spesa giornaliero.
89. ~~**Io** – Annunci di lavoro anche per la manifattura e servizio «Selezione di operai e tecnici»~~ (22/10: nodi pubblicati;
    primo giro 88 chiamate). Controllo delle chiamate al punto 89b.
91. **Io** – Segnali nuovi dal VPS: certificato in scadenza (entro 14 giorni) e sito lento. ~~Fase 1: il VPS misura e salva~~
    (23/10: migrazione 068 eseguita, su main, attiva dopo `installa`, punto 94).
91b. **Io, 3–5 giorni dopo** – Data Quality su un campione di `cert_expiring` e `slow_site`; poi fase 2: segnali nel catalogo
    dell'app (`cert_expiring` solo con scadenza futura).
92. **Io** – Aziende da Common Crawl per quelle che non sono in nessun elenco (`docs/16-common-crawl.md`): ~~worker con
    partita IVA valida, nome, città e settore da Haiku tramite l'app~~ (23/10: codice pronto, campione di 600 domini con il
    21% di attività e il 70% con città). ~~**Insieme:** `installa` e `prova-cc` sul VPS~~ (24/10: 300 domini, 62 aziende con
    partita IVA, settore 20 su 20). **Insieme, verso il 27/10:** `avvia-cc` quando il controllo siti non ha più arretrato
    (53.306 aziende al 24/10, circa 750 l'ora; controllo con `controllo_siti_orario.sql`). ~~Salvare la partita IVA~~ (23/10: migrazione 069
    pronta, anche dal controllo siti per tutte le aziende). **Tu, dopo la seconda revisione:** eseguire la migrazione 069.
93. **Tu, con il legale** – Albi professionali (commercialisti, avvocati): si possono usare? Contengono dati di persone.
97. ~~**Tu – eseguire la migrazione 071**~~ (24/10) – Coda del controllo siti più veloce (`pending_site_checks`, oggi circa 8 s perché prepara tutte le aziende da
    controllare prima del limite; al limite del database: n8n e il worker del VPS passano solo riprovando). Migrazione + revisione.
96. **Tu, 26–28/10** – `copertura_settori.sql` e `resa_giornaliera.sql` (nuova del 23/10: aziende nuove, lead pronti al
    giorno e campi coperti) per vedere quanto si avvicina la soglia.

## ⚪ Email e immagine
30. **Tu, nei prossimi giorni** – Logo accanto al mittente: account Google con leads@ e logo come foto profilo (file pronto).
47. **Insieme** – BIMI (logo del mittente su tutti i programmi di posta): DMARC restrittivo e certificato a pagamento.

## ⚪ Dopo la beta
34. **Io** – Tarare i pesi del punteggio delle opportunità con i giudizi dei clienti.
35. **Insieme** – Listino definitivo con i costi misurati; valutare i lead con il solo modulo di contatto a metà credito.
36b. **Io** – Avviso settimanale aperto a tutti: link di disattivazione, soglia a scelta, riepilogo ogni 4 settimane, più di
    50 avvisi a notte, tempi su ricerche molto larghe.
37. **Io** – Nuovi servizi: «Sito nuovo» e «Prenotazioni online per hotel».
38. **Insieme** – Segnale «nuova apertura / nuova sede».
41. **Insieme** – Lead con il solo modulo di contatto dopo aver esaurito quelli con email?
43. **Io** – Più utenti per account e API.
44. **Insieme** – Capacità di n8n oltre 50–100 clienti attivi.
45. **Insieme** – Estero, un paese alla volta (prima il parere legale).
46. **Insieme** – Referenti: restano spenti, solo dopo il parere legale.
50. **Insieme** – Seconda fonte per gli annunci (termini di Jooble e Careerjet) e pagine «Lavora con noi».
51. **Insieme** – Ricerche AI notturne mirate su province e settori dei clienti (circa 15–20 € ogni 1.000 aziende).

## ✅ Fatto il 23/10
- 49b. ~~Worker del controllo siti: correzione dopo il blocco del 22/10~~ (da installare stasera, punto 94)
- 84–85. ~~Ricerche consigliate in dashboard, solo admin; grafica della bozza con 6 frasi a rotazione~~
- 91. ~~Segnali del VPS, fase 1 (migrazione 068)~~
- 97. ~~Pagine dell'app su iPhone senza sbordare~~
- ~~Query `resa_giornaliera.sql` e approfondimento del punto 92~~

## ✅ Fatto il 22/10
- 17. ~~Rotazione dei due segreti del motore~~
- 19. ~~Pulizia dei dati di collaudo~~
- 39–40. ~~Coda con priorità (064) e stima realistica nel wizard (063)~~
- 49. ~~VPS Hetzner reinstallato e worker del controllo siti in produzione~~
- 57b. ~~Resoconto della notte OSM e dei controlli~~
- 81–82. ~~Email più veloci, province OSM divise, disponibilità come la riserva (065)~~
- 86–89. ~~Contatti per tutto il database (066), OSM da Geofabrik, siti delle attività senza sito, annunci della manifattura~~
- 90. ~~Backup cifrato scritto e rivisto~~ (non installato per scelta)

## ✅ Fatto il 21/10
- 5e. ~~**Io** – Beta allargata: soglie in percentuale, decisione al 30/10, criteri e testi dell'invito~~ (20/10);
  ~~**Tu** – 10 inviti del 21/10~~
- 5i. ~~**Io** – Promemoria per le agenzie del 19/10 e benvenuto aggiornato (Sales & Copy)~~
- 31. ~~**Tu** – Firma con il logo per leads@ nella webmail di Hostinger~~
- 36. ~~**Io** – Avviso settimanale gratuito delle nuove opportunità, solo admin in beta (migrazioni 056 e 057)~~
- 52. ~~**Io** – Ricerche in target: parole chiave del settore che restringono (migrazioni 052 e 053)~~
- 53. ~~**Io** – Squadra di agenti e controlli automatici su GitHub~~
- 54. ~~**Io** – Zone del wizard, sinonimi del settore, pagine anti-bot e provvisorie~~
- 55. ~~**Tu** – Accesso completo alla rete nell'ambiente cloud~~
- 56. ~~**Io** – Sito per le agenzie invitate: fascia beta, /registrati?beta=1, prezzi, 404 in italiano; acquisti solo admin~~
- 57. ~~**Io** – Popolamento OSM: salvataggio a pezzi di 250, recupero delle province perse~~
- 58. ~~**Io** – Niente segnali sulle pagine d'errore, anti-bot, di trasloco o provvisorie (migrazione 055)~~
- 59a. ~~**Io** – Annunci senza mezze emoji; «Siti aziende» due giri al mattino; Adzuna ogni 2 giorni~~
- 60a. ~~**Io** – Email per le aziende controllate prima del 20/10 (migrazione 054)~~
- 64. ~~**Io** – Ricerche opportunità circa 7 volte più veloci (migrazione 057)~~
- 70, 72, 74–78. ~~Ripasso di sicurezza, nome in un solo punto, motore più sicuro, testi per le partite IVA, registrazione, menu~~

## ✅ Fatto il 20/10
- 5c. ~~Metriche della beta (Admin → Beta) e «Spunto per il primo messaggio» nei lead e nell'export~~
- 5d. ~~Email aziendali salvate dal controllo siti, riserva che parte da chi ha l'email (migrazione 050)~~
- 10. ~~Popolamento OSM dal Nord, 8 province a notte~~ (prima notte: 2.922 aziende lombarde)
- 19d. ~~Seconda correzione dei falsi «Senza HTTPS» e ricontrollo di 160 aziende~~
- 27. ~~Motore: analisi delle ricerche reali, memoria delle aziende senza email (migrazione 047), 3 nodi morti tolti~~
- 28. ~~Pagina «Sicurezza e privacy» (`/sicurezza`)~~ (da far rileggere al legale)
- 29b. ~~Registro delle modifiche e panoramica del sistema~~
- 39b. ~~Contatore dell'import OSM robusto (migrazione 048)~~
- 42. ~~Captcha e limiti su accesso e recupero password~~
- 43a. ~~«Fino a 3 utenti» tolto dal listino di Growth (migrazione 049)~~
- 48. ~~Segnale indicativo «Sito senza informativa privacy o cookie» (migrazione 051)~~

## ✅ Fatto il 19/10
- 1. ~~**Tu** – Verifica in due passaggi su Supabase, Vercel, GitHub, Stripe, n8n~~ (scelta: non su Anthropic, Resend,
  Hostinger, Cloudflare, Icypeas)
- 2. ~~**Tu** – Chiave Anthropic dedicata con limite di spesa~~ («Prospect | Search» e «Prospect Avvocati | Search» sono di un
  altro progetto attivo: non toccarli)
- 3. ~~**Tu** – «Aziende | Popolamento OSM» pubblicato~~ (disattivato il 22/10, sostituito dal punto 87)
- 4. ~~**Tu** – Sconto per i beta tester: −30% per 12 mesi~~
- 5. ~~**Tu** – Invitate 3 agenzie (Gopher, Mutart, Studio360) con PDF di esempi reali~~
- 6. ~~**Io** – Clausola «Riservatezza delle ricerche» nei termini~~
- 7. ~~**Io** – Piano della beta e testi dell'invito (`10-beta.md`)~~
- 8. ~~**Tu** – Casella ciao@avvisto.it attiva e provata~~
- 19b–19c. ~~Falsi «Senza HTTPS», prima correzione, e ricontrollo di 341 aziende~~
- 26. ~~Ripasso di sicurezza (migrazione 046)~~
- 32–32b. ~~Email dell'app con la grafica precedente; modelli di accesso incollati in Supabase~~
- ~~Homepage rifatta, «Per chi è», wizard con «Vendi altro?», regole sul settore (migrazione 045)~~
