# Checklist di Webora Leads

Formato (deciso il 19/10): sezioni con colore e titolo, ruolo in grassetto (**Tu**, **Io**, **Insieme**), numeri
progressivi. Le cose fatte restano nella lista, barrate (~~così~~), con la data. Quando l'utente chiede «riscrivimi
la checklist» si riscrive tutto da qui, fatti compresi. Lo storico delle modifiche e delle decisioni è in
`13-registro.md` (prima del 19/10 in `05-da-fare.md`).

Ultimo aggiornamento: 21/10/2026.

## 🔴 Bloccanti per la prima ondata della beta (Sud ed Emilia-Romagna)
1. ~~**Tu** – Verifica in due passaggi su Supabase, Vercel, GitHub, Stripe, n8n~~ (19/10). Scelta dell'utente: niente
   verifica in due passaggi su Anthropic, Resend, Hostinger, Cloudflare e Icypeas.
2. ~~**Tu** – Chiave Anthropic dedicata con limite di spesa, credenziale «Webora Leads - Anthropic», chiave vecchia
   eliminata~~ (19/10). «Prospect | Search» e «Prospect Avvocati | Search» sono di un altro progetto attivo: non
   toccarli. ~~Verificato: usano ChatGPT, non la chiave di Webora~~ (20/10).
3. ~~**Tu** – Pubblicato «Aziende | Popolamento OSM» (Nord prima, 8 province a notte)~~ (19/10)
4. ~~**Tu** – Sconto per i beta tester: −30% per 12 mesi~~ (19/10)
5. ~~**Tu** – Invitate 3 agenzie (Gopher, Mutart, Studio360) con email personalizzate e PDF di esempi reali~~ (19/10)
5b. **Insieme** – Alle risposte: account, +150 crediti, piano Growth dall'admin, email di benvenuto (`10-beta.md`).
    Se non rispondono, un solo promemoria verso il 27/10.
5e. ~~**Io** – Beta allargata: soglie in percentuale nella pagina Admin → Beta, decisione spostata al 30/10, criteri e
    testi dell'invito aggiornati in `10-beta.md`~~ (20/10). **Tu:** invitare circa 50 agenzie al Sud e in Emilia-Romagna nei
    prossimi giorni, 10–15 al giorno da leads@ (`10-beta.md`). Lista di 62 agenzie pronta (21/10: 48 con email, 14 dal
    modulo; file mandato in chat, non nel repository). Alle risposte, stessa procedura del 5b.
5f. **Insieme, il 21/10** – Nuovo listino (proposta e valutazione nel registro, 20/10 sera). Prima del lancio a
    pagamento: pacchetti 59/249/790 €, Scale tolto, 20 crediti di benvenuto con i primi lead «forti», lead con solo
    modulo a 1 credito, niente supplemento AI (migrazione). Abbonamenti a pagamento solo con il monitoraggio (punto 36).
    Niente promesse di funzioni assenti né confronto con Apollo sul consenso; il −30% alle 3 agenzie resta, prezzo
    fondatore per le nuove (punto 5e). Numeri definitivi con i dati della beta (punto 35).
5c. ~~**Io** – Metriche della beta (Admin → Beta) con le soglie del 28/10; «Spunto per il primo messaggio» nei lead e
    nell'export~~ (20/10)
5d. ~~**Io** – Email aziendali salvate dal controllo siti, riserva che parte da chi ha l'email (migrazione 050)~~ (20/10).
    ~~Migrazione eseguita e workflow pubblicato~~ (20/10).
6. ~~**Io** – Clausola «Riservatezza delle ricerche» nei termini~~ (19/10)
7. ~~**Io** – Piano della beta e testi dell'invito (`10-beta.md`)~~ (19/10)
8. ~~**Tu** – Casella leads@weborastudio.it attiva e provata~~ (19/10)

## 🟠 Bloccanti per la seconda ondata (Nord)
9. **Insieme, il 30/10** (era il 28/10) – Decidere con le soglie della pagina Admin → Beta: almeno 3 agenzie attive,
   esporta almeno la metà (e almeno 2), almeno 1 ha una risposta, segnalati sotto il 10%. Poi rilanciare `supabase/queries/opportunita_per_regione.sql` e invitare
   solo dove il servizio ha almeno 40–50 aziende pronte.
10. ~~**Io** – Popolamento OSM dal Nord, 8 province a notte~~ (19/10). Prima notte: 2.922 aziende lombarde nuove (20/10).

## 🔴 Bloccanti per il lancio a pagamento (non per la beta)
11. **Tu** – Partita IVA, regime fiscale, fatturazione elettronica (SDI), con il commercialista.
12. **Tu** – Parere del legale (`09-domande-consulenti.md`): caso Lusha, art. 130 (vale anche per le caselle
    aziendali?), LIA/DPIA, ODbL, Adzuna, DPA, revisione di informativa, termini e pagina «Sicurezza e privacy»,
    chiusura dell'account. Niente promesse di «contatto senza consenso» finché non risponde per iscritto.
13. **Tu** – Conferma scritta di Adzuna sull'uso commerciale degli annunci (mail del 18/10, in attesa).
14. **Insieme** – Stripe con pagamenti reali e un acquisto vero di prova. Controllare che le descrizioni dei prodotti
    non promettano più utenti.
15. **Tu, poi Insieme** – Supabase Pro (backup giornalieri) e prova di ripristino.
16. **Tu** – Repository GitHub privato.
17. **Insieme** – Rotazione del segreto del motore.
18. **Tu** – Avvisi di spesa su Anthropic, Vercel, Supabase.
19. **Insieme** – Pulizia dei dati di collaudo, compreso l'account di prova delle email.

## 🟡 Durante la beta
19b. ~~**Io** – Falsi «Senza HTTPS», prima correzione: indirizzo vero del sito, solo certificati scaduti, autofirmati o
    di un altro sito~~ (19/10)
19c. ~~**Tu** – Ricontrollo di 341 aziende: 68 scaduti, 4 autofirmati, 141 «non valido per questo sito»~~ (19/10)
19d. ~~**Io + Tu** – Seconda correzione (domini secondari di gruppi, domini nudi) e ricontrollo di 160 aziende~~ (20/10).
    **Resta:** l'esito nell'analisi giornaliera.
20. **Insieme** – Alla prima ricerca vera: controllare le regole delle email (reservations@, albergo…@, domini fratelli).
21. **Tu** – Giudicare a mano le 24 aziende con il solo modulo di contatto (query `moduli.sql`).
22. **Insieme** – Seguire la pagina Admin → Beta: export, risposte, segnalazioni, costo dell'AI. Chiedere alle agenzie
    se usano lo «Spunto per il primo messaggio».
23. **Insieme** – Seguire il riquadro «Database aziende» e le chiamate Adzuna (limite 5.000 al mese).
24. **Insieme** – MillionVerifier solo se i rimbalzi superano 2–3 ogni 100 lead.
25. **Insieme** – La domanda chiave: senza il nome del referente, lo pagherebbero?

## 🔵 Analisi e miglioramenti tecnici
26. ~~**Io** – Ripasso di sicurezza, migrazione 046, workflow pubblicati~~ (19/10)
26b. **Io, dopo la beta** – Motore: seguire a mano i rimandi da un sito all'altro, ricontrollando ogni volta l'indirizzo.
27. ~~**Io** – Motore: analisi delle ricerche reali, memoria delle aziende senza email (migrazione 047), tolti 3 nodi
    morti~~ (20/10). Dettagli in `11-analisi-motore.md`.
27b. ~~**Tu** – Migrazione 047 eseguita, motore pubblicato~~ (20/10)
28. ~~**Io** – Pagina «Sicurezza e privacy» (`/sicurezza`)~~ (20/10). Da far rileggere al legale.
29. **Tu, con il legale** – Contratto sul trattamento dei dati (DPA) pronto da firmare per i clienti.
29b. ~~**Io** – Registro delle modifiche e delle decisioni (`13-registro.md`) e panoramica del sistema
    (`12-panoramica-sistema.md`)~~ (20/10)
52. ~~**Io** – Ricerche in target: parole chiave del settore che restringono (migrazione 052), «Campania e Sicilia»
    divisa in due, conferma con regione vuota~~ (21/10). ~~Migrazione 052 eseguita~~ (21/10). ~~Migrazione 053 eseguita~~
    (21/10, correzione trovata dal Code Reviewer).
53. **Io, il 21/10** – Squadra di agenti. ~~Code Reviewer creato e provato~~ (21/10). ~~QA Tester, Data Quality, Sales & Copy, Designer e Business Analyst creati~~ (21/10). **Resta:**
    i controlli automatici su GitHub. (decisa il 21/10, dettagli nel registro): prima i controlli automatici su GitHub
    (test app, motore e SQL, lint, tipi a ogni push), poi Code Reviewer (sola lettura), QA Tester, Data Quality, poi
    Sales & Copy (prepara, non invia), infine Designer e Business Analyst (voce del resoconto giornaliero).
54. **Io, prossima sessione** – Correzioni proposte dagli agenti il 21/10 (dettagli nel registro):
    a) zone: città unite da «e» («Modena e Reggio Emilia»), «… e provincia», «/» e «&» come separatori (QA);
    b) «web agency» con i sinonimi «agenzia web», «webagency» (QA);
    c) niente segnali sulle pagine che sembrano barriere anti-bot (testo corto, niente viewport né copyright) (Data Quality);
    d) no_privacy non scatta se il sito è «in costruzione» (Data Quality);
    e) segnalare le aziende con nome e dominio molto diversi (Data Quality);
    f) pagina contatti prima di scartare per «nessuna_email» (Data Quality).
    Prima di c)–f): far verificare al Data Quality sui siti veri (ora la rete è aperta) che i problemi ci siano davvero.
55. ~~**Tu** – Accesso completo alla rete nell'ambiente cloud: il Data Quality può aprire i siti delle aziende~~ (21/10).
56. **Insieme, prima degli inviti** – Proposte del Designer per chi arriva dall'invito (registro, 21/10), in ordine:
    a) fascia «Beta gratuita per le agenzie invitate» su sito e registrazione; b) /registrati?beta=1 con testo della beta
    (link nell'email di benvenuto); c) «Prova gratis» visibile su telefono; d) /prezzi: «Il più scelto» → «Consigliato» o
    via, riquadro beta, e verificare cosa succede con «Acquista» mentre Stripe è in test; e) hero più corto; f) rassicurazioni
    su telefono in registrazione e casella dei termini più grande; g) contrasto (`--color-muted`, testo bianco pieno);
    h) pagina 404 in italiano.

## ⚪ Email e immagine
30. **Tu, nei prossimi giorni** – Logo accanto al mittente: account Google con leads@ e logo come foto profilo
    (file pronto).
31. **Tu** – Firma con il logo per leads@ nella webmail di Hostinger.
32. ~~**Io** – Email dell'app con la grafica Webora e modelli per le email di accesso~~ (19/10)
32b. ~~**Tu** – Modelli incollati in Supabase, avvisi di sicurezza attivi, registrazione e recupero password
    provati~~ (19/10)
33. **Tu** – Prezzo del rinnovo della casella Hostinger prima del 19/02/2027.

## ⚪ Dopo la beta
34. **Io** – Tarare i pesi del punteggio delle opportunità con i giudizi dei clienti.
35. **Insieme** – Listino definitivo con i costi misurati; valutare i lead con il solo modulo di contatto a metà
    credito.
36. **Io** – Monitoraggio continuo delle opportunità («nuove opportunità ogni settimana», partendo dalla ripetizione
    automatica delle ricerche): la funzione che giustifica l'abbonamento. Prima di API e più utenti.
37. **Io** – Nuovi servizi: «Sito nuovo» e «Prenotazioni online per hotel».
38. **Insieme** – Segnale «nuova apertura / nuova sede».
39. **Io** – Coda del controllo siti con priorità.
39b. ~~**Io** – Import OSM: contatore «nuove / aggiornate» robusto alle chiamate ripetute (migrazione 048)~~ (20/10)
40. **Io** – Wizard: stima realistica dei lead e costo in euro.
41. **Insieme** – Lead con il solo modulo di contatto dopo aver esaurito quelli con email?
42. ~~**Io** – Captcha e limite ai tentativi su accesso e recupero password~~ (20/10). ~~Chiavi e dominio verificati~~
    (20/10).
43. **Io** – Più utenti per account e API. ~~«Fino a 3 utenti» tolto dal listino di Growth (migrazione 049)~~ (20/10).
44. **Insieme** – Capacità di n8n oltre 50–100 clienti attivi.
45. **Insieme** – Estero, un paese alla volta (prima il parere legale).
46. **Insieme** – Referenti: restano spenti, solo dopo il parere legale.
47. **Insieme** – BIMI (logo del mittente su tutti i programmi di posta): DMARC restrittivo e certificato a pagamento.
48. ~~**Io** – Segnale indicativo «Sito senza informativa privacy o cookie» (migrazione 051), nel servizio «Sicurezza del
    sito»~~ (20/10). ~~Nodi caricati su n8n, migrazione 051 eseguita, motore e controllo siti
    pubblicati~~ (20/10).
49. **Io** – Controllo siti su un piccolo worker fuori da n8n: libera ~720 esecuzioni al mese e permette i segnali
    PageSpeed e «certificato in scadenza entro 30 giorni».
50. **Insieme** – Seconda fonte per gli annunci (leggere i termini di Jooble e Careerjet) e pagine «Lavora con noi»
    come fonte, per non dipendere solo da Adzuna.
51. **Insieme** – Ricerche AI notturne mirate sulle province e i settori dei clienti (circa 15–20 € ogni 1.000
    aziende), per irrobustire il database oltre OpenStreetMap.

## ✅ Fatto il 20/10
- ~~Seconda correzione dei falsi «Senza HTTPS» e ricontrollo di 160 aziende~~
- ~~Pagina «Sicurezza e privacy»~~
- ~~Motore: memoria delle aziende senza email, 3 nodi morti tolti, analisi delle ricerche reali~~
- ~~Captcha e limiti su accesso e recupero password~~
- ~~Contatore dell'import OSM e listino senza «Fino a 3 utenti»~~
- ~~Metriche della beta, spunto per il primo messaggio, email aziendali dal controllo siti~~
- ~~Registro delle modifiche, panoramica del sistema, analisi giornaliera automatica~~
- ~~Segnale indicativo «Sito senza informativa privacy o cookie» (migrazione 051)~~

## ✅ Fatto il 19/10
- ~~Homepage rifatta, «Per chi è», wizard con «Vendi altro?», regole sul settore (migrazione 045)~~
- ~~Ripasso di sicurezza (migrazione 046), chiave Anthropic dedicata, inviti della beta inviati~~
- ~~Email con la grafica Webora e schermata «Controlla la tua email»~~
