> **Storico (19/10/2026), non aggiornato: le voci ancora aperte sono nella checklist (`docs/00-checklist.md`, sezione «Bloccanti per il lancio a pagamento»).**

# 8. Messa in produzione – checklist

Preparata il 17/10, da seguire passo per passo a partire dal 18/10.
Ogni voce indica chi la fa: **Tu** (account, contratti, pagamenti), **Io** (codice, database,
n8n), **Insieme** (decisioni o prove). Le voci già fatte restano spuntate in `05-da-fare.md`.

Stato di partenza (17/10): motore collaudato su tre tipi di ricerca (database ~0,012 € a lead,
opportunità ~0,022 €, ricerca AI ~0,135 €), listino deciso, migrazioni fino alla 034 eseguite.

---

## Fase 0 – Consulenze (da avviare subito: sono le più lunghe)

**Bloccante anche per la beta** (deciso il 18/10, dopo il caso Lusha: provvedimento del Garante
n. 542/2026, 2 milioni di euro a un data broker B2B, poi rimosso temporaneamente dal sito del Garante
in attesa del giudizio: non definitivo; legittimo interesse respinto anche per i dati
professionali). Finché non arriva il parere: beta solo con la modalità **«solo azienda»** (azienda,
sito, settore, email generica, segnale; nessun nome di persona). I nomi si riattivano dopo il
parere, se lo consente.

- [ ] **Tu** – Commercialista: apertura partita IVA, regime fiscale, fatturazione elettronica (SDI)
      per le vendite con Stripe (bastano i dati raccolti dal portale Stripe o servono campi nostri?)
- [ ] **Tu** – Legale privacy. Domande da portare (le preparo io in un documento a parte):
  - art. 130 Codice privacy: invio di email commerciali a caselle aziendali generiche e nominative
  - raccolta da fonti pubbliche e **rivendita** di email nominative (anche Gmail/iCloud pubblicate dal titolare)
  - lead senza nome (solo azienda + info@): rischio più basso? modalità da privilegiare?
  - licenza ODbL di OpenStreetMap (database derivato, attribuzione)
  - informativa, termini, LIA/DPIA, opposizione e cancellazione (già presenti: da validare)
- [ ] **Tu** – Adzuna: verificare sul pannello i limiti reali (di base 25/minuto, 250/giorno,
      2.500/mese) e chiedere l'accordo scritto per l'uso commerciale degli annunci come segnali
      (le condizioni ammettono solo 14 giorni di prova)
- [x] **Io** – Raccolta Adzuna ogni 2 giorni (annunci degli ultimi 3), una chiamata ogni 2,5 s:
      ~1.100 chiamate al mese invece di ~2.100
- [x] **Io** – Modalità «Solo azienda» (migrazione 037, motore, sito): nessun nome di persona consegnato né
      conservato, solo email generiche del dominio aziendale, niente Icypeas né ricerca del referente.
      Le modalità con i referenti restano nel codice, spente con `app_settings.people_enabled`
- [ ] **Insieme** – Cancellare i nomi e le email nominative raccolti nei collaudi (con la pulizia della Fase 2)
- [x] **Io** – Documento con le domande per il legale e per il commercialista (descrizione del
      servizio, dati trattati, fonti, flussi): `09-domande-consulenti.md`

## Fase 1 – Sicurezza degli account (Tu, ~1 ora)

- [ ] 2FA su: GitHub, Vercel, Supabase, n8n, Stripe, Cloudflare, Resend, Icypeas, Anthropic,
      Adzuna, Hostinger/registrar del dominio, email personale usata per questi account
- [ ] Repository GitHub **privato** (Settings → General → Danger zone → Change visibility).
      Vercel e questa sessione continuano a funzionare
- [ ] **Chiave Anthropic dedicata** a Webora Leads con **limite di spesa mensile** (es. 50 $)
      e avviso via email; poi **Io** la collego a tutti i nodi Claude dei workflow n8n
- [ ] **Insieme** – Rotazione del segreto del motore (la chiave del webhook compare nelle
      esecuzioni n8n): nuovo valore in Vercel (variabile d'ambiente) e nella credenziale n8n,
      poi una ricerca di prova
- [ ] **Io** – Conservazione delle esecuzioni n8n: salvare i dati solo per le esecuzioni in errore
      (meno dati personali conservati su n8n)

## Fase 2 – Dati e backup

- [ ] **Tu** – Supabase **Pro** (backup giornalieri; 25 $/mese)
- [ ] **Insieme** – Prova di ripristino di un backup su un progetto di prova (senza toccare la produzione)
- [ ] **Insieme** – Pulizia dei dati di collaudo: account e ricerche di prova, crediti regalati,
      lead di prova (decidere cosa tenere nel magazzino)
- [ ] **Io** – Account amministratore: verificare ruoli e accessi a `/admin`

## Fase 3 – Pagamenti (dopo la partita IVA)

- [ ] **Tu** – Stripe in modalità live: dati aziendali, conto, verifica identità
- [ ] **Io** – Prodotti e prezzi live (pacchetti e abbonamenti come nel listino), chiavi live su
      Vercel, webhook live, portale clienti
- [ ] **Insieme** – Acquisto reale piccolo (Pacchetto 100) con la tua carta, controllo dei crediti
      accreditati, rimborso da Stripe
- [ ] **Tu** – Fatture elettroniche: collegamento Stripe → strumento di fatturazione indicato dal commercialista

## Fase 4 – Prodotto (Io, nessun costo API)

- [x] Quantità del wizard limitata dai crediti disponibili, costo stimato anche in euro
- [x] «Stimati» accanto a dimensione e fatturato quando non hanno una fonte (colonna dell’export; la tabella non mostra la dimensione e il fatturato non si consegna)
- [x] Sinonimi dei settori più cercati (hotel/albergo, dentista/odontoiatra/studio dentistico…): migrazione 036
- [x] Pagine ospitate su siti altrui e piattaforme scartate già all'importazione (migrazione 035)
- [x] «Email generiche incluse»: tetto dei referenti a 1,6 volte i lead + 2 (giri dalla riserva)
- [x] Fonti citate: «© OpenStreetMap contributors (ODbL)» nella pagina fonti/informativa
- [ ] Testi del sito coerenti con il parere legale (niente promesse di «email pronte per campagne»)
- [x] **Tu** – Casella leads@weborastudio.it per ricevere risposte e richieste di assistenza (19/10)

## Fase 5 – Controllo e allarmi

- [ ] **Io** – Resoconto giornaliero (già attivo) con: spesa del giorno, costo per lead, ricerche
      parziali, errori, esecuzioni n8n del mese
- [ ] **Tu** – Avvisi di spesa: Anthropic (limite), Icypeas (budget), Vercel e Supabase (soglie)
- [ ] **Io** – Controllo siti: tornare a ogni 2 ore quando OSM avrà finito l'Italia (esecuzioni n8n)
- [ ] **Insieme** – Piano n8n: verificare il margine sulle esecuzioni (tetto 2.500/mese)

## Fase 6 – Beta su invito (2–3 settimane)

Obiettivo commerciale, non solo tecnico: agenzie web italiane che usano davvero i risultati e
ricomprano. Misure: ricerche complete ≥ 85%, lead nel target ≥ 90%, rimbalzi < 3%, almeno 3
clienti disposti a pagare, almeno 2 secondi acquisti entro 60 giorni.

- [ ] **Insieme** – 5–10 aziende (agenzie web, società IT, consulenti), crediti regalati dall'admin
- [ ] **Io** – Testo dell'invito e breve guida d'uso
- [ ] **Insieme** – Ricerche reali da 20–50 lead; misure: costo per lead per tipo di ricerca,
      % di ricerche complete, rimbalzi segnalati, lead giudicati interessanti
- [ ] **Insieme** – MillionVerifier solo se i rimbalzi superano 2–3 ogni 100 lead
- [ ] **Insieme** – Ritocco del listino con i costi della beta

## Fase 7 – Lancio

Criteri per aprire (tutti sì):
- [ ] parere legale ricevuto e testi aggiornati
- [ ] partita IVA aperta, Stripe live provato, fatturazione elettronica funzionante
- [ ] backup attivo e ripristino provato
- [ ] 2FA su tutti gli account, repository privato, chiave Anthropic dedicata con limite
- [ ] beta conclusa: rimbalzi sotto il 3%, nessun problema bloccante aperto

Poi: apertura delle registrazioni (piano Gratis da 15 crediti), annuncio, controllo quotidiano
dei primi 30 giorni.

---

### Ordine consigliato per il 18/10
1. Fase 1 (sicurezza account) – Tu, mentre io preparo il documento per legale e commercialista
2. Contatti con commercialista e legale – Tu
3. Supabase Pro e prova di ripristino – Insieme
4. Fase 4 – Io, in parallelo
