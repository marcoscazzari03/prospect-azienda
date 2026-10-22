# Checklist di Webora Leads

Formato (deciso il 19/10): sezioni con colore e titolo, ruolo in grassetto (**Tu**, **Io**, **Insieme**), numeri
progressivi. Le cose fatte restano nella lista, barrate (~~così~~), con la data. Quando l'utente chiede «riscrivimi
la checklist» si riscrive tutto da qui, fatti compresi. Lo storico delle modifiche e delle decisioni è in
`13-registro.md` (prima del 19/10 in `archivio/05-da-fare.md`).

Ultimo aggiornamento: 21/10/2026 sera (ordine di priorità in cima; migrazioni 059–062; punti 65–80).

## 🧭 Ordine di priorità delle cose aperte (21/10 sera)
Riepilogo per ordine di urgenza; il dettaglio di ogni voce è nella sua sezione qui sotto.
1. **Stasera e domattina (Io):** 80 (controllo siti ripartito dopo la 061, verifica alle 18:40), 79 (pubblicazione su
   Vercel alle 23:30, altrimenti alle 9:30), 57b (resoconto: OSM, «HTTPS presente», nuovi portali esclusi).
2. **Tecnico 22–25/10:** 40 wizard (Io), 39 coda con priorità misurata sui dati veri (Io), 73 controlli a mano (Tu) con 18 e 17,
   19 pulizia dei dati di collaudo (Insieme), 21 aziende con il solo modulo (Tu), 62 e 60 da decidere (Insieme), 59 query
   settimanale (Tu), 30 logo accanto al mittente (Tu).
3. **Verso il 25/10:** se un'agenzia risponde, 5b e 20; altrimenti 66 dominio avvisto.it (Tu) e 67 passaggio ad Avvisto
   (Insieme), con 16 repository privato. Ogni giorno 56b (Tu).
4. **Il 30/10 (o il 6/11):** 9 decisione della beta, poi 5g ed eventuale seconda ondata.
5. **Prima del lancio a pagamento:** 11, 12, 13, 14, 15, 29, 5f e 35.
6. **Dopo la beta:** 49 worker sul VPS (con 26b, 54e seconda parte, 59 controllo ogni 2 ore), 36b, 34, 37, 38, 41, 43, 44, 45,
   46, 47, 50, 51; 68 rinnovi Hostinger (gennaio–febbraio 2027); 69 VPS Hetzner.

## 🔴 Beta in corso: questa settimana
5g. **In pausa dal 21/10 sera** (decisione dell'utente: 3–4 giorni per vedere se rispondono le 13 agenzie invitate; se nessuno
    risponde si passa al nome nuovo, punto 67; intanto si sistema tutto il lato tecnico e di sicurezza, sezione 🛡️).
    Prima: **Tu, 22–24/10** – 15 inviti al giorno da leads@ (ne mancano 37 per arrivare a 50; 13 fatti al 21/10), prima le
    agenzie con l'email, poi quelle con il solo modulo. Lista aggiornata in chat (`agenzie_beta.csv`, fuori dal repository).
5b. **Insieme** – A ogni «sì», in giornata: account, +150 crediti e piano Growth dall'admin, email di benvenuto
    (`10-beta.md`, link /registrati?beta=1).
5i. **Sospeso il 21/10 sera** (decisione dell'utente, come gli inviti). Prima: **Tu, 24–25/10** – Un solo promemoria a Gopher, Mutart e Studio360 (testo in `10-beta.md`, scritto il 21/10).
56b. **Tu, ogni giorno** – Guardare le nuove registrazioni per aggiungere i crediti beta; controllare in Stripe (test) che
    nessun cliente non admin abbia comprato.
80. ~~**Io** – Controllare che «Aziende | Controllo siti» sia ripartito dopo la migrazione 061~~ (21/10: giro delle 18:25 riuscito).
79. ~~**Io** – Pubblicare su Vercel la versione di main bloccata dal limite di 100 pubblicazioni al giorno (testi per i
    freelance, limiti, registrazione, menu, nome in un solo punto) e controllarla online~~ (21/10, 23:30: online, verificato).
57b. **Io, 22/10 mattina** – Nel resoconto: notte del recupero OSM (Sondrio, Belluno) e salvataggio a pezzi; prove false tolte
    dal controllo siti (punto 58); primo giro di «Siti aziende» dopo Adzuna (se il giro delle 11:40 è pieno, un terzo giro).
5h. ~~**Io + Tu** – Ricerca di prova nella zona di ogni agenzia invitata~~ (21/10: non si fa, decisione dell'utente: troppo
    ottimistico finché non risponde qualcuno; si fa alla prima risposta, punto 20).

## 🛡️ Tecnico e sicurezza: 22–25/10 (deciso il 21/10 sera)
70. ~~**Io, 21/10** – Nuovo ripasso di sicurezza di tutto ciò che è cambiato dal 19/10 (migrazioni 047–057, avviso settimanale,
    wizard, Admin → Beta, nodi del motore) e stato delle voci aperte del ripasso del 19/10; dipendenze (`npm audit`).~~ (21/10: app e SQL senza problemi gravi, un problema medio corretto; motore con un problema medio aperto, punto 74;
    dettagli in `06-audit-sicurezza.md`, fuori dal repository)
71. **Io** – Correzione di quello che esce dal punto 70, con revisione e test, poi le voci del Tecnico aperto (63, 39, 40, 54e,
    19e) e la pulizia dei dati di collaudo (punto 19).
72. ~~**Io** – Nome in un solo punto del codice (`config.ts`): «Webora Leads» e gli indirizzi diventano impostazioni, così il
    passaggio ad Avvisto è un cambio di configurazione più logo e testi.~~ (21/10: elenco dei passaggi in `04-pubblicazione.md`, sezione 7)
73. **Tu** – Controlli a mano: avvisi di spesa (punto 18), Deployment Protection su Vercel, conservazione breve delle
    esecuzioni su n8n, rotazione del segreto del motore (punto 17, insieme). Supabase Pro rinviato alla messa in produzione (punto 15).
74. **Io, poi Tu** – ~~Motore e workflow n8n: nomi DNS «jolly» bloccati, porte e indirizzi IP scartati anche nel Settore e nella
    pagina del referente, domini validati anche nelle route dell'app, callback solo verso leads.weborastudio.it~~ (21/10).
    ~~**Tu:** pubblicare i 3 workflow (motore, Siti aziende, Settore)~~ (21/10). Redirect, IP e certificati: con il worker (punto 49).
75. ~~**Io** – Testi del sito anche per i professionisti con partita IVA (decisione del 21/10): «anche da solo» sopra il titolo,
    «Per chi è», domanda nelle FAQ, riga nei prezzi, «Azienda o attività» nella registrazione~~ (21/10)
76. ~~**Tu** – Eseguire la migrazione 058 (limiti sui tentativi sotto lock, permessi delle tabelle dell'avviso)~~ (21/10)
77. ~~**Io** – Registrazione: stessa risposta per gli indirizzi già registrati, con email «hai già un account» o nuovo link di
    attivazione~~ (21/10)
78. ~~**Io** – Menu del sito che non sborda sui telefoni stretti (320px)~~ (21/10)
81. ~~**Io** – Ricerca delle email più veloce (blocchi notturni di «Valuta siti») e province OSM divise in 7 richieste~~ (22/10:
    controllo siti, OSM e motore pubblicati).
82. ~~**Io** – Disponibilità nel wizard come la riserva (065), prova del certificato con errore sul nome, motore allineato al
    controllo siti (porte e regole HTTPS del 21/10), prezzi di Haiku nel registro~~ (22/10: migrazione eseguita e workflow pubblicati).

## 🟠 Decisione della beta
9. **Insieme, il 30/10** – Decidere con le soglie della pagina Admin → Beta: almeno 3 agenzie attive, esporta almeno la metà
   (e almeno 2), almeno 1 ha una risposta, segnalati sotto il 10%. Poi rilanciare `supabase/queries/opportunita_per_regione.sql`
   e invitare il Nord solo dove il servizio ha almeno 40–50 aziende pronte. Se le agenzie attive sono meno di 3: rinvio già
   fissato al **6/11** (deciso il 21/10).

## 🔴 Bloccanti per il lancio a pagamento (non per la beta)
11. **Tu** – Partita IVA, regime fiscale, fatturazione elettronica (SDI), con il commercialista.
12. **Tu** – Parere del legale (`09-domande-consulenti.md`): caso Lusha, art. 130 (vale anche per le caselle aziendali?),
    LIA/DPIA, ODbL, Adzuna, DPA, revisione di informativa, termini e pagina «Sicurezza e privacy», chiusura dell'account,
    riga «rispondete no» e firma delle email. Niente promesse di «contatto senza consenso» finché non risponde per iscritto.
13. **Tu** – Conferma scritta di Adzuna sull'uso commerciale degli annunci (mail del 18/10, in attesa).
14. **Insieme** – Stripe con pagamenti reali e un acquisto vero di prova; poi togliere il blocco «acquisti solo admin».
15. **Tu, poi Insieme, alla messa in produzione definitiva** – Supabase Pro (backup giornalieri) e prova di ripristino
    (rinviato il 21/10 sera, decisione dell'utente).
16. **Tu** – Repository GitHub privato.
17. ~~**Insieme** – Rotazione del segreto del motore~~ (22/10: i due segreti, n8n → app e app → n8n, cambiati e verificati).
18. **Tu** – Avvisi di spesa su Anthropic, Vercel, Supabase.
19. ~~**Insieme** – Pulizia dei dati di collaudo, compreso l'account di prova delle email~~ (22/10: cancellati gli account di
    prova «Scazza» e «Prova»; «Webora» tenuta con lo storico dei collaudi).
29. **Tu, con il legale** – Contratto sul trattamento dei dati (DPA) pronto da firmare per i clienti.
5f. **Insieme, dopo la beta** – Nuovo listino (proposta nel registro, 20/10 sera): pacchetti 59/249/790 €, Scale tolto,
    20 crediti di benvenuto, lead con solo modulo a 1 credito, niente supplemento AI; abbonamenti a pagamento con l'avviso
    settimanale (punto 36). Prezzo fondatore per le nuove agenzie, −30% per 12 mesi a chi ha fatto la beta. Numeri
    definitivi con i dati della beta (punto 35).

## 🟡 Durante la beta
20. **Insieme** – Alla prima agenzia che accetta: una ricerca di prova nella sua zona e nel suo servizio; controllare le
    regole delle email (reservations@, albergo…@, domini fratelli).
21. **Tu** – Giudicare a mano le 24 aziende con il solo modulo di contatto (query `moduli.sql`).
22. **Insieme** – Seguire la pagina Admin → Beta: export, risposte, segnalazioni, costo dell'AI. Chiedere alle agenzie se
    usano lo «Spunto per il primo messaggio».
23. **Insieme** – Seguire il riquadro «Database aziende» e le chiamate Adzuna (limite 2.500 al mese, raccolta ogni 2 giorni).
24. **Insieme** – MillionVerifier solo se i rimbalzi superano 2–3 ogni 100 lead.
25. **Insieme** – La domanda chiave: senza il nome del referente, lo pagherebbero?
19e. ~~**Io** – Esito delle correzioni dei falsi «Senza HTTPS» nell'analisi giornaliera~~ (21/10: 12% falsi su 139, ridotti a
    circa 3% con le correzioni; i siti con HTTPS ora risultano «no»). ~~**Tu:** pubblicare «Aziende | Controllo siti»~~ (21/10).
61. ~~**Io** – Riordino della cartella `docs`: storici in `docs/archivio/`, indice `docs/README.md`, panoramica, pubblicazione,
    domande ai consulenti e README aggiornati~~ (21/10).

## 🔵 Tecnico aperto
54e. ~~**Io** – Segnalare le aziende con nome e dominio molto diversi (Data Quality)~~ (21/10: 28 portali e 6 siti di altre
    aziende su 234; portali e business.site esclusi con la 062). ~~**Tu:** `verifica_062.sql`, poi la migrazione 062~~ (21/10: 107 business.site e 14 portali esclusi). **Dopo:**
    sospendere email e segnali quando il nome non compare nella homepage.
59. **Insieme** – Giri a vuoto e province: ~~Siti aziende 2 giri al mattino~~ (21/10); controllo siti ogni 2 ore dopo il 2/11
    (finito il ricontrollo della 054); irraggiungibili ricontrollati dopo 60–90 giorni; OSM più lento dopo il primo giro;
    lotto del Settore aziende; recuperare Como, Sondrio, Belluno, Padova, Rovigo, Treviso (in corso, notti 22–24/10).
    **Tu:** query `supabase/queries/popolamento_settimanale.sql` ogni settimana.
60. **Insieme, da decidere** – Magazzino con gli annunci di `job_ads`; prova dell'annuncio solo se ancora visibile su Adzuna
    (`last_seen_at`).
62. **Insieme, da decidere** – «CMS vecchio» sulle pagine provvisorie: resta valutato o diventa non determinabile?
63. ~~**Io** – Stesso trucco della 057 (radici calcolate una volta) per le ricerche in target (`target_pool`, contatore e
    riserva)~~ (21/10, migrazione 059: da 1,5 a 5 volte più veloce, stessi risultati). ~~**Tu:** eseguire
    `supabase/queries/verifica_059.sql` (atteso 0 differenze), poi la migrazione 059~~ (21/10: 0 differenze, eseguita).
26b. **Io, dopo la beta** – Motore: seguire a mano i rimandi da un sito all'altro, ricontrollando ogni volta l'indirizzo.
39. **Io** – Coda del controllo siti con priorità: la 060 era troppo lenta sui dati veri (controllo siti fermo alle 17:25),
    tolta con la 061. ~~**Tu:** eseguire la 061 subito~~ (21/10). ~~**Io:** capire il tempo sui dati veri e riproporla~~ (22/10:
    la 060 ricalcolava zone e settori per ogni azienda; la 064 impiega 1,7 s in produzione). ~~**Tu:** eseguire la migrazione 064~~ (22/10). ~~**Io:** controllare il primo giro~~ (22/10: riuscito, 150 aziende in 92 s).
40. **Io** – ~~Wizard: stima realistica dei lead e costo in euro~~ (22/10: codice pronto sul branch).
    ~~**Tu:** eseguire la migrazione 063 (`availability_contacts`)~~ (22/10). ~~**Io:** pubblicare su main dopo il QA~~ (22/10).

## 🟣 Nome nuovo «Avvisto» e costi di Hostinger (deciso il 21/10)
65. **Insieme** – ~~Scegliere il nome di una parola, staccato da Webora (scelto in prova il 21/10: **Avvisto**, avvisto.it libero su
    Hostinger; avvisto.com occupato). Prima di comprare: marchio libero su UIBM ed EUIPO (classi 35 e 42), nessuna azienda nota con lo stesso nome nel
    settore, profili social liberi. Nota: prosperia.com è già registrato.~~ (21/10: Avvisto, marchio verificato libero dall'utente)
66. **Tu, scelto il nome** – Comprare il dominio .it su Hostinger (circa 16 €/anno) e aggiungerlo al Business Web Hosting
    (regge più domini): niente server nuovo. L'app resta su Vercel.
67. **Insieme, dal 25/10 circa** – Passaggio al nome nuovo se le agenzie invitate non rispondono (decisione del 21/10 sera). **Tu:** record DNS verso Vercel dal
    pannello Hostinger, casella email sul dominio nuovo, leads@weborastudio.it attiva o inoltrata alla nuova. **Io:** dominio
    su Vercel, rinvio permanente da leads.weborastudio.it (i link già inviati continuano a funzionare), dominio su Resend,
    indirizzi in Supabase (accesso), Stripe, Turnstile e callback di n8n, logo, firma, testi, email e documenti.
68. **Tu, prima dei rinnovi** – Costi Hostinger di oggi: circa 234 €/anno (circa 250 con il dominio nuovo).
    - dominio weborastudio.it 15,99 €, rinnovo il 20/01/2027;
    - Business Web Hosting 203,88 €, rinnovo il 02/02/2027: controllare il prezzo vero del rinnovo (quello di oggi potrebbe
      essere in promozione);
    - Starter Business Email (prova) 14,16 €, rinnovo il 19/02/2027: vedere se leads@ sta su questo prodotto o sulle caselle
      incluse nell'hosting; nel secondo caso togliere il rinnovo automatico (sostituisce il punto 33).
69. **Tu** – VPS Hetzner (circa 14 €/mese): spegnerlo finché non serve al worker del punto 49 (circa 170 €/anno risparmiati).

## 🟢 Per tutti i mestieri che vendono alle aziende (idea del 22/10, da valutare)
Solo B2B; ricerca generalista, opportunità solo con prova. Prima di promettere «qualsiasi settore»: misurare settori e zone
ben coperti dal database.
Pareri del 22/10: copywriter (sì, ma dopo il 25/10 insieme ad Avvisto, senza promettere segnali a chi non li ha), designer
(domanda in dashboard alla prima visita, saltabile; 3 schede che aprono il wizard compilato), analista (dopo il 30/10 per non
confondere i numeri della beta; costo Haiku circa 0,03 centesimi per utente). **Tu:** eseguire
`supabase/queries/copertura_settori.sql` (sola lettura) per sapere quali settori e regioni il database copre bene.
83. **Insieme** – Posizionamento «Trova i tuoi prossimi clienti», con esempi di mestieri diversi (falegname, impresa di
    pulizie, fotografo, commercialista, consulente IT). Da fare insieme al passaggio ad Avvisto (punti 66–67).
84. **Io** – «Di cosa si occupa la tua attività?» al primo accesso (non nella registrazione), modificabile nel profilo.
85. **Io** – Ricerche consigliate: dalla descrizione, Haiku propone 3 ricerche già impostate (circa 0,1 centesimi); l'app
    le accetta solo se il database le può soddisfare (conteggio «circa X lead» del punto 40) e il wizard parte già compilato.
    Si avviano con i crediti, come ogni ricerca.

## ⚪ Email e immagine
30. **Tu, nei prossimi giorni** – Logo accanto al mittente: account Google con leads@ e logo come foto profilo (file pronto).
33. ~~**Tu** – Prezzo del rinnovo della casella Hostinger prima del 19/02/2027~~ (21/10: assorbito dal punto 68).
47. **Insieme** – BIMI (logo del mittente su tutti i programmi di posta): DMARC restrittivo e certificato a pagamento.

## ⚪ Dopo la beta
34. **Io** – Tarare i pesi del punteggio delle opportunità con i giudizi dei clienti.
35. **Insieme** – Listino definitivo con i costi misurati; valutare i lead con il solo modulo di contatto a metà credito.
36b. **Io** – Avviso settimanale aperto a tutti: link di disattivazione nell'email, soglia a scelta del cliente, riepilogo ogni
    4 settimane, più di 50 avvisi a notte, tempi su ricerche molto larghe.
37. **Io** – Nuovi servizi: «Sito nuovo» e «Prenotazioni online per hotel».
38. **Insieme** – Segnale «nuova apertura / nuova sede».
41. **Insieme** – Lead con il solo modulo di contatto dopo aver esaurito quelli con email?
43. **Io** – Più utenti per account e API.
44. **Insieme** – Capacità di n8n oltre 50–100 clienti attivi.
45. **Insieme** – Estero, un paese alla volta (prima il parere legale).
46. **Insieme** – Referenti: restano spenti, solo dopo il parere legale.
49. **Io** – Controllo siti su un worker fuori da n8n, sul VPS Hetzner dell'utente da reinstallare (deciso il 21/10): libera
    ~720 esecuzioni al mese e permette i segnali «certificato in scadenza entro 30 giorni» e PageSpeed. Dopo il 30/10.
    Preparazione: server già ridimensionato a CX23 (6,70 €/mese, 21/10). ~~**Insieme, 22/10:** rebuild pulito con Ubuntu 24.04
    e `scripts/vps/setup.sh`~~ (22/10: server pronto; Hetzner ha inserito la chiave SSH del progetto, quindi accesso solo con
    `ssh worker@2.31.7.149` dal computer dell'utente, root e password via SSH spenti; Node 22, firewall, fail2ban,
    aggiornamenti automatici; riavviato). ~~**Io:** il worker del controllo siti~~ (22/10: `worker/`, revisione).
    **Tu:** `SITE_CHECKS_SECRET` su Vercel; **Insieme:** installazione sul server (`docs/04-pubblicazione.md`, sezione 8).
50. **Insieme** – Seconda fonte per gli annunci (termini di Jooble e Careerjet) e pagine «Lavora con noi».
51. **Insieme** – Ricerche AI notturne mirate su province e settori dei clienti (circa 15–20 € ogni 1.000 aziende).

## ✅ Fatto il 21/10
- 5e. ~~**Io** – Beta allargata: soglie in percentuale, decisione al 30/10, criteri e testi dell'invito~~ (20/10);
  ~~**Tu** – 10 inviti del 21/10 (esclusa Webapp s.r.l., non fa siti)~~ (21/10)
- 5i. ~~**Io** – Promemoria per le agenzie del 19/10 e benvenuto aggiornato (Sales & Copy)~~
- 31. ~~**Tu** – Firma con il logo per leads@ nella webmail di Hostinger~~
- 36. ~~**Io** – Avviso settimanale gratuito delle nuove opportunità, solo admin in beta (migrazione 056)~~; ~~migrazioni 056 e
  057 eseguite~~; ~~testi «su invito» e «se ci sono aziende nuove»~~
- 52. ~~**Io** – Ricerche in target: parole chiave del settore che restringono (migrazioni 052 e 053)~~
- 53. ~~**Io** – Squadra di agenti (Code Reviewer, QA Tester, Data Quality, Sales & Copy, Designer, Business Analyst) e
  controlli automatici su GitHub~~
- 54. ~~**Io** – Zone del wizard («Modena e Reggio Emilia», «… e provincia», «/», «&», macroaree, sigle di provincia), sinonimi
  del settore («web agency», «software house», «e-commerce»), pagine anti-bot e provvisorie; pagina contatti già nel motore~~
- 55. ~~**Tu** – Accesso completo alla rete nell'ambiente cloud~~
- 56. ~~**Io** – Sito per le agenzie invitate: fascia beta, /registrati?beta=1, prezzi, 404 in italiano; acquisti solo admin
  finché Stripe è in test~~
- 57. ~~**Io** – Popolamento OSM: salvataggio a pezzi di 250, recupero delle province perse (notti 22–24/10)~~
- 58. ~~**Io** – Niente segnali sulle pagine d'errore, anti-bot, di trasloco o provvisorie; www del sito salvato; vecchie prove
  tolte (migrazione 055); Settore aziende senza JSON non valido~~; ~~migrazione 055 e 3 workflow pubblicati~~
- 59a. ~~**Io** – Tagli di testo negli annunci senza mezze emoji; «Siti aziende» due giri al mattino; Adzuna ogni 2 giorni
  (limite 2.500 al mese)~~
- 60a. ~~**Io** – Email per le aziende controllate prima del 20/10 (migrazione 054); verificati i 14 segnali «annuncio»~~
- 64. ~~**Io** – Ricerche opportunità circa 7 volte più veloci (migrazione 057, verificata sui dati veri: 0 differenze)~~

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
- 3. ~~**Tu** – «Aziende | Popolamento OSM» pubblicato~~
- 4. ~~**Tu** – Sconto per i beta tester: −30% per 12 mesi~~
- 5. ~~**Tu** – Invitate 3 agenzie (Gopher, Mutart, Studio360) con PDF di esempi reali~~
- 6. ~~**Io** – Clausola «Riservatezza delle ricerche» nei termini~~
- 7. ~~**Io** – Piano della beta e testi dell'invito (`10-beta.md`)~~
- 8. ~~**Tu** – Casella leads@weborastudio.it attiva e provata~~
- 19b–19c. ~~Falsi «Senza HTTPS», prima correzione, e ricontrollo di 341 aziende~~
- 26. ~~Ripasso di sicurezza (migrazione 046)~~
- 32–32b. ~~Email dell'app con la grafica Webora; modelli di accesso incollati in Supabase~~
- ~~Homepage rifatta, «Per chi è», wizard con «Vendi altro?», regole sul settore (migrazione 045)~~
