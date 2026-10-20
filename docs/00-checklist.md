# Checklist di Webora Leads

Formato (deciso il 19/10): sezioni con colore e titolo, ruolo in grassetto (**Tu**, **Io**, **Insieme**), numeri
progressivi. Le cose fatte restano nella lista, barrate (~~così~~), con la data. Quando l'utente chiede «riscrivimi
la checklist» si riscrive tutto da qui, fatti compresi. Il dettaglio storico resta in `05-da-fare.md`.

Ultimo aggiornamento: 20/10/2026.

## 🔴 Bloccanti per la prima ondata della beta (Sud ed Emilia-Romagna)
1. ~~**Tu** – Verifica in due passaggi su Supabase, Vercel, GitHub, Stripe, n8n~~ (19/10). Decisione dell'utente
   (19/10): niente 2FA su Anthropic, Resend, Hostinger, Cloudflare e Icypeas.
2. ~~**Tu** – Chiave Anthropic: workspace dedicato con limite di spesa, chiave nuova creata lì e messa nella
   credenziale n8n esistente~~ (19/10). Resta: eliminare la chiave vecchia dopo la prima prova riuscita;
   ~~credenziale rinominata in «Webora Leads - Anthropic», file del repository aggiornati~~ (19/10).
   Nota: «Prospect | Search» e «Prospect Avvocati | Search» su n8n sono di un altro progetto, ATTIVO (20/10): non
   toccarli e non proporre di disattivarli. ~~Verificato: usano ChatGPT, non la chiave Anthropic di Webora~~ (20/10).
3. ~~**Tu** – Pubblicare su n8n «Aziende | Popolamento OSM» (Nord prima, 8 province a notte)~~ (19/10)
4. ~~**Tu** – Sconto per i beta tester: −30% per 12 mesi~~ (19/10)
5. ~~**Tu** – Scegliere e invitare 3 agenzie: Gopher (Torremaggiore, FG), Mutart (Napoli), Studio360 (Molfetta, BA),
   con email personalizzate e PDF di esempi reali della loro provincia~~ (19/10, inviate da leads@).
5b. **Insieme** – Alle risposte: account, +150 crediti beta e piano Growth dall'admin, email di benvenuto
   (`10-beta.md`). Se non rispondono, un solo promemoria dopo 5–7 giorni lavorativi (verso il 27/10).
6. ~~**Io** – Clausola «Riservatezza delle ricerche» nei termini~~ (19/10)
7. ~~**Io** – Piano della beta e testi dell'invito: email, LinkedIn, benvenuto (`10-beta.md`)~~ (19/10)
8. ~~**Tu** – Casella leads@weborastudio.it attiva e provata~~ (19/10)

## 🟠 Bloccanti per la seconda ondata (Nord)
9. **Insieme, verso il 28/10** – Rilanciare `supabase/queries/opportunita_per_regione.sql` e invitare solo dove il
   servizio dell'agenzia ha almeno 40–50 aziende pronte.
10. ~~**Io** – Popolamento OSM dal Nord, 8 province a notte~~ (19/10, pubblicato)

## 🔴 Bloccanti per il lancio a pagamento (non per la beta)
11. **Tu** – Partita IVA, regime fiscale, fatturazione elettronica (SDI) e dati di fatturazione italiani, con il
    commercialista.
12. **Tu** – Parere del legale (`09-domande-consulenti.md`): caso Lusha, art. 130, LIA/DPIA, ODbL, Adzuna, DPA per i
    clienti, revisione di informativa e termini, chiusura dell'account.
13. **Tu** – Conferma scritta di Adzuna sull'uso commerciale degli annunci (mail del 18/10, in attesa).
14. **Insieme** – Stripe live: prodotti e prezzi live, un acquisto vero di prova.
15. **Tu, poi Insieme** – Supabase Pro (backup giornalieri) e prova di ripristino.
16. **Tu** – Repository GitHub privato (oggi è pubblico).
17. **Insieme** – Rotazione del segreto del motore.
18. **Tu** – Avvisi di spesa su Anthropic, Vercel, Supabase.
19. **Insieme** – Pulizia dei dati di collaudo (account e ricerche di prova, crediti regalati).

## 🟡 Durante la beta
19b. ~~**Io** – Segnale «Senza HTTPS»: falsi positivi (controllo sul dominio nudo invece che sul www, catena
    incompleta ed errori di handshake contati come difetto). Ora controlla l'host del sito e conta solo
    certificato scaduto, autofirmato o di un altro sito~~ (19/10, workflow aggiornati).
19c. ~~**Tu** – Pubblicati motore e «Aziende | Controllo siti»; eseguita `https_ricontrollo.sql`: 341 prove vecchie
    ricontrollate~~ (19/10). Esito: 68 scaduti, 4 autofirmati, 141 «non valido per questo sito», di cui ~46 falsi
    (domini secondari di gruppi, domini nudi).
19d. ~~**Tu** – Seconda correzione pubblicata ed eseguita la parte 3: 160 prove in ricontrollo~~ (20/10).
    Resta: guardare l'esito nell'analisi giornaliera del 21/10.
20. **Insieme** – Alla prima ricerca vera: controllare le nuove regole delle email (reservations@, albergo…@, domini
    fratelli).
21. **Tu** – Giudicare a mano le 24 aziende con il solo modulo di contatto (query `moduli.sql`).
22. **Insieme** – Misurare tasso di risposta, segnali che funzionano, rimbalzi, segnalazioni, costo della ricerca AI.
23. **Insieme** – Seguire i quattro numeri del riquadro «Database aziende» nell'admin e le chiamate Adzuna del mese
    (limite 5.000).
24. **Insieme** – MillionVerifier solo se i rimbalzi superano 2–3 ogni 100 lead.
25. **Insieme** – La domanda chiave: senza il nome del referente, lo pagherebbero?

## 🔵 Analisi da fare
26. ~~**Io** – Sicurezza: ripasso dell'audit dopo le modifiche 11–19/10~~ (19/10): nessun problema grave; corretti
    limite ai codici 2FA, admin solo con 2FA, eliminazione dei lead completa, favicon, moduli e siti solo sul dominio
    dell'azienda, controlli degli indirizzi nel motore, limiti sul contatore. ~~Migrazione 046 eseguita e workflow
    pubblicati~~ (19/10), app in produzione.
26b. **Io, dopo la beta** – Motore: seguire a mano i reindirizzamenti dei siti con ricontrollo dell'indirizzo
    (oggi il filtro guarda il nome, non dove porta il rimando; impatto su n8n Cloud da verificare).
27. ~~**Io** – Motore: analisi su ricerche reali, memoria delle aziende senza email (migrazione 047), tolti 3 nodi
    OpenAI morti~~ (20/10). Dettagli e proposte in `11-analisi-motore.md`.
27b. ~~**Tu** – Migrazione 047 eseguita e motore pubblicato; app su main~~ (20/10).
28. ~~**Io** – Pagina «Sicurezza e privacy» sul sito (`/sicurezza`, link nel piè di pagina)~~ (20/10). Da far rileggere
    al legale insieme a informativa e termini.
29. **Tu, con il legale** – DPA pronto da firmare per i clienti.

## ⚪ Email e immagine
30. **Tu, nei prossimi giorni** – Logo accanto al mittente: account Google con leads@ («usa il tuo indirizzo email attuale») e
    logo 800×800 come foto profilo (file già pronto). Vale soprattutto per chi usa Gmail.
31. **Tu** – Firma con il logo per leads@ nella webmail di Hostinger.
32. ~~**Io** – Email dell'app in HTML con logo e grafica Webora, e modelli per le email di accesso di
    Supabase (`supabase/templates/`)~~ (19/10).
32b. ~~**Tu** – Incollati i 5 modelli in Supabase e attivati gli avvisi di sicurezza (password, 2FA aggiunta e
    tolta); provate registrazione e «Password dimenticata»: funzionano~~ (19/10). Schermata «Controlla la tua
    email» dopo registrazione e recupero password (19/10).
33. **Tu** – Prezzo del rinnovo della casella Hostinger prima del 19/02/2027.

## ⚪ Dopo la beta
34. **Io** – Tarare i pesi del punteggio delle opportunità con i giudizi dei clienti.
35. **Insieme** – Listino definitivo con i costi misurati.
36. **Io** – Monitoraggio continuo delle opportunità, solo se i clienti lo chiedono.
37. **Io** – Nuovi servizi: «Sito nuovo» (in costruzione) e «Prenotazioni online per hotel».
38. **Insieme** – Segnale «nuova apertura / nuova sede» (prima la ricerca «nuova apertura» su adzuna.it).
39. **Io** – Coda del controllo siti con priorità, quando i controlli si accumulano.
39b. **Io** – Import OSM: il contatore «nuove / aggiornate» sbaglia (20/10: 1.038 nuove contate come aggiornate).
40. **Io** – Wizard: stima realistica dei lead e costo in euro.
41. **Insieme** – Consegnare i lead con il solo modulo dopo aver esaurito le aziende con email?
42. **Io** – Captcha anche su accesso e recupero password.
43. **Io** – Più utenti per account e API.
44. **Insieme** – Capacità di n8n oltre 50–100 clienti attivi.
45. **Insieme** – Estero, un paese alla volta (prima il parere legale).
46. **Insieme** – Referenti: restano spenti, solo dopo il parere legale e su richiesta dei clienti.
47. **Insieme** – BIMI (logo del mittente su tutti i client): DMARC restrittivo e certificato VMC/CMC a pagamento.

## ✅ Fatto di recente (20/10)
- ~~Seconda correzione dei falsi «Senza HTTPS» (domini secondari di gruppi, domini nudi) e ricontrollo di 160 aziende~~
- ~~Pagina «Sicurezza e privacy»~~
- ~~Motore: memoria delle aziende senza email (migrazione 047), tolti 3 nodi morti, analisi su ricerche reali~~
- ~~Analisi giornaliera automatica dei workflow~~

## ✅ Fatto il 19/10
- ~~Homepage rifatta: opportunità in primo piano, demo simulata, «Per chi è», prezzi dal listino~~
- ~~Wizard: «Vendi altro?» verso la ricerca in target; nella ricerca opportunità tolti i filtri che il database non applica~~
- ~~Settore: i clienti dopo «per» non diventano etichette (migrazione 045) e regola nel prompt AI~~
- ~~«Traduzioni ed export» limitato ai settori che esportano~~
- ~~Query della copertura per servizio e regione~~
- ~~Archiviazione ed eliminazione di lead e ricerche (migrazione 043)~~
- ~~Account su più pagine e verifica in due passaggi per gli utenti (migrazione 044)~~
- ~~Punteggio dell'opportunità, regioni dai dati dell'azienda (migrazione 042), favicon nei risultati~~
- ~~Lead con il solo modulo di contatto (migrazione 040), email d'ufficio e domini fratelli (migrazione 041)~~
