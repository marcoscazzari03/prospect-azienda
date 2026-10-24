# Checklist di Avvisto, per date

Le stesse voci di `00-checklist.md`, ordinate per **quando** vanno fatte invece che per argomento. Stessi numeri, stessi ruoli
(**Tu**, **Io**, **Insieme**); le cose fatte restano barrate con la data. Le due checklist si aggiornano insieme, nello stesso
commit (regola del 24/10): il dettaglio di ogni voce è in `00-checklist.md`, qui c'è solo il quando.

Ultimo aggiornamento: 24/10/2026 pomeriggio (89b fatto).

## 📅 Oggi, sabato 24/10
- 94. ~~**Insieme** – VPS: `rinomina`, giro di prova, `prova-cc`~~ (24/10 mattina).
- 94b. ~~**Tu** – Vecchio indirizzo staccato da Vercel, Supabase e Turnstile~~ (24/10).
- 97. ~~**Tu** – Migrazione 071, coda del controllo siti veloce~~ (24/10: 0,63 s).
- 95. ~~**Tu** – «Aziende | Controllo siti» su n8n spento, worker del VPS ogni 10 minuti~~ (24/10: 750 aziende l'ora).
- ~~**Io** – Recupero della password con la verifica in due passaggi~~ (24/10).
- ~~**Io** – Aggiornamento di sicurezza di Next.js (16.4.2) e zod~~ (24/10).
- 89b. ~~**Io** – Chiamate Adzuna con la manifattura~~ (24/10: 157 a giro, al tetto di 2.500 al mese; ora al massimo 3
  pagine per ricerca, circa 2.000 al mese).
- 67d. **Insieme** – Fase D del passaggio ad Avvisto: ~~registrazione ed email~~ (24/10), ~~ricerca di prova servita dal
  magazzino~~ (24/10); manca una ricerca che passi dal motore (vedi domani).

## 📅 Domani, domenica 25/10
- 67d. **Tu** – Ricerca di prova che passi dal motore (opportunità con un segnale raro o zona poco coperta), per provare il
  giro completo con il callback su avvisto.it.
- 66. **Tu** – Inoltro della casella vecchia verso ciao@avvisto.it.
- 30. **Tu** – Logo accanto al mittente: account Google con la casella del mittente e logo come foto profilo.

## 📅 Lunedì 26 – mercoledì 28/10
- 96. **Tu** – `copertura_settori.sql` e `resa_giornaliera.sql`: quanto manca alla soglia di copertura.
- 85a. **Insieme** – Prove delle ricerche consigliate con descrizioni diverse (fotografo, commercialista, parrucchiere,
  falegname).
- 91b. **Io** – Data Quality su `cert_expiring` e `slow_site`, poi fase 2 (segnali nell'app).
- 92. **Insieme, verso il 27/10** – `avvia-cc` sul VPS quando l'arretrato del controllo siti è smaltito (53.306 aziende al
  24/10, a 750 l'ora circa 3 giorni). Controllo con `controllo_siti_orario.sql` (**Tu**).
- 60. **Insieme** – Decidere: magazzino con gli annunci di `job_ads`.
- 89b. **Io, 25–27/10** – Controllare i primi giri con 3 pagine (circa 131 chiamate ciascuno).
- 62. **Insieme** – Decidere: «CMS vecchio» sulle pagine provvisorie (proposta: lasciarlo così).
- 67e. **Insieme** – Fase E: email alle agenzie della beta col nome nuovo, posizionamento (83), modulo nel profilo (85b),
  social e Google Search Console, logo definitivo.
- 16. **Tu** – Repository GitHub privato, dopo aver dato al VPS una chiave per leggerlo (**Io**: i passi).

## 📅 Venerdì 30/10 (se non basta, venerdì 6/11)
- 9. **Insieme** – Decisione della beta con le soglie di Admin → Beta; poi `opportunita_per_regione.sql` e
  `agenzie_beta.sql` (**Tu**).
- 5g. **Tu** – Se si riparte: 15 inviti al giorno fino a 50 (ne mancano 37).
- 5i. **Tu** – Se si riparte: un solo promemoria a Gopher, Mutart e Studio360.

## 🔁 Ogni giorno e ogni settimana
- 56b. **Tu, ogni giorno** – Nuove registrazioni (crediti beta) e Stripe di prova (nessun acquisto di chi non è admin).
- 5b. **Insieme, in giornata** – A ogni «sì»: account, +150 crediti, piano Growth, email di benvenuto.
- 22–23. **Insieme, ogni giorno** – Admin → Beta, «Database aziende», chiamate Adzuna (resoconto delle 7:52).
- 59. **Tu, ogni lunedì** – `popolamento_settimanale.sql`.

## ⏳ Quando succede qualcosa
- 20. **Insieme** – Alla prima agenzia che accetta: ricerca di prova nella sua zona e nel suo servizio.
- 24. **Insieme** – MillionVerifier solo se i rimbalzi superano 2–3 ogni 100 lead.
- 13. **Tu** – Conferma scritta di Adzuna sull'uso commerciale (in attesa dal 18/10).
- 12, 29, 93. **Tu** – Quando risponde il legale (documento pronto): parere, DPA, albi professionali.
- 11. **Tu, poi Io** – Quando apri la partita IVA: dati veri del titolare in privacy, termini e firma delle email.
- 21, 25. **Insieme, durante la beta** – Campione delle aziende col solo modulo; «senza il nome del referente, lo pagherebbero?».

## 🔴 Prima del lancio a pagamento (novembre, dopo la beta)
- 14. **Insieme** – Stripe con pagamenti reali e un acquisto vero di prova.
- 15. **Tu, poi Insieme** – Supabase Pro e prova di ripristino.
- 18, 73. **Tu** – Avvisi di spesa (Anthropic, Vercel, Supabase), Deployment Protection, conservazione breve su n8n.
- 5f, 35. **Insieme** – Listino nuovo e definitivo con i numeri della beta.
- 88. **Insieme** – Decidere la ricerca web con Haiku per le attività senza sito.

## ⚪ Dopo la beta (senza data)
- **Io:** 26b, 34, 36b, 37, 43, 54e (seconda parte).
- **Insieme:** 38, 41, 44, 45, 46, 47, 50, 51; 90 backup sul VPS solo se servisse prima del punto 15.

## 🗓️ Scadenze del 2027 (punto 68, Tu)
- **20/01/2027** – Rinnovo del dominio vecchio dello studio (15,99 €): decidere se tenerlo.
- **02/02/2027** – Rinnovo del Business Web Hosting (203,88 €): controllare il prezzo vero.
- **19/02/2027** – Rinnovo della casella del dominio vecchio (14,16 €): decidere se serve ancora.
- **Ottobre 2027** – Rinnovo di avvisto.it (15,99 €) e prezzo della casella ciao@avvisto.it dopo i 12 mesi gratuiti.
