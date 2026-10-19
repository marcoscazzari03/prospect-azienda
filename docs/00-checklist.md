# Checklist di Webora Leads

Formato (deciso il 19/10): sezioni con colore e titolo, ruolo in grassetto (**Tu**, **Io**, **Insieme**), numeri
progressivi. Le cose fatte restano nella lista, barrate (~~così~~), con la data. Quando l'utente chiede «riscrivimi
la checklist» si riscrive tutto da qui, fatti compresi. Il dettaglio storico resta in `05-da-fare.md`.

Ultimo aggiornamento: 19/10/2026.

## 🔴 Bloccanti per la prima ondata della beta (Sud ed Emilia-Romagna)
1. **Tu** – Verifica in due passaggi sugli account dei servizi:
   - ~~Supabase~~ · ~~Vercel~~ · ~~GitHub~~ · ~~Stripe~~ (19/10)
   - n8n · Anthropic · Resend · Hostinger · Cloudflare (se lo usi) · Icypeas
2. **Tu** – Chiave Anthropic: il progetto US VIRAL è chiuso, quindi la credenziale «US VIRAL - Anthropic» resta e
   diventa solo di Webora Leads (19/10). Da fare: chiave nuova (rotazione, la vecchia è passata per l'altro
   progetto) incollata nella stessa credenziale n8n, vecchia chiave eliminata, limite di spesa mensile (es. 50 $)
   e avviso via email; facoltativo rinominare la credenziale in «Webora Leads - Anthropic» (poi **Io** aggiorno il
   nome nei file del repository).
3. **Tu** – Pubblicare su n8n «Aziende | Popolamento OSM» (Nord prima, 8 province a notte).
4. **Tu** – Decidere lo sconto per i beta tester (proposta: −30% per 12 mesi).
5. **Tu** – Scegliere 2–3 agenzie del Sud o dell'Emilia-Romagna (fonti in `10-beta.md`).
6. ~~**Io** – Clausola «Riservatezza delle ricerche» nei termini~~ (19/10)
7. ~~**Io** – Piano della beta e testi dell'invito: email, LinkedIn, benvenuto (`10-beta.md`)~~ (19/10)
8. ~~**Tu** – Casella leads@weborastudio.it attiva e provata~~ (19/10)

## 🟠 Bloccanti per la seconda ondata (Nord)
9. **Insieme, verso il 28/10** – Rilanciare `supabase/queries/opportunita_per_regione.sql` e invitare solo dove il
   servizio dell'agenzia ha almeno 40–50 aziende pronte.
10. ~~**Io** – Popolamento OSM dal Nord, 8 province a notte~~ (19/10, da pubblicare: punto 3)

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
20. **Insieme** – Alla prima ricerca vera: controllare le nuove regole delle email (reservations@, albergo…@, domini
    fratelli).
21. **Tu** – Giudicare a mano le 24 aziende con il solo modulo di contatto (query `moduli.sql`).
22. **Insieme** – Misurare tasso di risposta, segnali che funzionano, rimbalzi, segnalazioni, costo della ricerca AI.
23. **Insieme** – Seguire i quattro numeri del riquadro «Database aziende» nell'admin e le chiamate Adzuna del mese
    (limite 5.000).
24. **Insieme** – MillionVerifier solo se i rimbalzi superano 2–3 ogni 100 lead.
25. **Insieme** – La domanda chiave: senza il nome del referente, lo pagherebbero?

## 🔵 Analisi da fare
26. **Io** – Sicurezza: ripassare l'audit dell'11/10 con tutto quello che è cambiato dopo.
27. **Io** – Motore: ottimizzazioni e parti non usate (nodi scollegati, rami referenti e RocketReach/Icypeas).
28. **Io** – Pagina «Sicurezza e privacy» sul sito (dopo il punto 26).
29. **Tu, con il legale** – DPA pronto da firmare per i clienti.

## ⚪ Email e immagine
30. **Tu** – Logo accanto al mittente: account Google con leads@ e logo come foto profilo.
31. **Tu** – Firma con il logo per leads@ nella webmail di Hostinger.
32. **Io** – Email dell'app in HTML con logo e grafica Webora (anche quelle di accesso di Supabase).
33. **Tu** – Prezzo del rinnovo della casella Hostinger prima del 19/02/2027.

## ⚪ Dopo la beta
34. **Io** – Tarare i pesi del punteggio delle opportunità con i giudizi dei clienti.
35. **Insieme** – Listino definitivo con i costi misurati.
36. **Io** – Monitoraggio continuo delle opportunità, solo se i clienti lo chiedono.
37. **Io** – Nuovi servizi: «Sito nuovo» (in costruzione) e «Prenotazioni online per hotel».
38. **Insieme** – Segnale «nuova apertura / nuova sede» (prima la ricerca «nuova apertura» su adzuna.it).
39. **Io** – Coda del controllo siti con priorità, quando i controlli si accumulano.
40. **Io** – Wizard: stima realistica dei lead e costo in euro.
41. **Insieme** – Consegnare i lead con il solo modulo dopo aver esaurito le aziende con email?
42. **Io** – Captcha anche su accesso e recupero password.
43. **Io** – Più utenti per account e API.
44. **Insieme** – Capacità di n8n oltre 50–100 clienti attivi.
45. **Insieme** – Estero, un paese alla volta (prima il parere legale).
46. **Insieme** – Referenti: restano spenti, solo dopo il parere legale e su richiesta dei clienti.

## ✅ Fatto di recente (19/10)
- ~~Homepage rifatta: opportunità in primo piano, demo simulata, «Per chi è», prezzi dal listino~~
- ~~Wizard: «Vendi altro?» verso la ricerca in target; nella ricerca opportunità tolti i filtri che il database non applica~~
- ~~Settore: i clienti dopo «per» non diventano etichette (migrazione 045) e regola nel prompt AI~~
- ~~«Traduzioni ed export» limitato ai settori che esportano~~
- ~~Query della copertura per servizio e regione~~
- ~~Archiviazione ed eliminazione di lead e ricerche (migrazione 043)~~
- ~~Account su più pagine e verifica in due passaggi per gli utenti (migrazione 044)~~
- ~~Punteggio dell'opportunità, regioni dai dati dell'azienda (migrazione 042), favicon nei risultati~~
- ~~Lead con il solo modulo di contatto (migrazione 040), email d'ufficio e domini fratelli (migrazione 041)~~
