# Passaggio ad Avvisto

Documento vivo del rebranding dal nome vecchio (il vecchio indirizzo) ad **Avvisto** (avvisto.it), iniziato il 23/10.
Decisioni dell'utente (23/10): sito e app su **avvisto.it** (www.avvisto.it rimanda lì), email di mittente e assistenza
**ciao@avvisto.it**, **logo provvisorio** fatto da Claude (da sostituire con quello definitivo). Titolare nelle
pagine legali: «Avvisto» (decisione del 23/10 sera) finché non c'è la partita IVA (punto 11), poi i dati veri.

## Grafica (23/10, decisione dell'utente)
Colore principale viola/indaco e logo della bozza (`docs/design/avvisto/`: Panoramica, riquadro «Non sai da dove iniziare?»,
«Lasciati ispirare», scelte rapide, statistiche, logo). Si applica solo in versione Avvisto. Ordine: proposta dell'UI/UX
Designer, poi tema (colori), logo, menu e barra in alto, Panoramica. Il logo provvisorio con la «A» verde resta solo fino al
logo nuovo.

**Dal 23/10 sera (richiesta dell'utente: «cambia definitivamente tutte le grafiche, ESATTAMENTE così, anche negli spazi»):** colori
e struttura della bozza valgono per tutto il sito (dal 23/10 sera c'è un solo nome, Avvisto: `NEXT_PUBLIC_BRAND` non esiste più;
dominio ed email. Misure prese dalla bozza a 2000 px (menu 312 px, voci da 45 px, titolo 46 px, riquadro con modulo e colonna da
370 px, statistiche da 106 px); sotto i 1700 px la colonna scende a 300 px, sotto i 1500 px le statistiche vanno su due colonne.
Tolto dalla bozza quello che l'app non ha (campanella delle notifiche). Testi presi dalla bozza; «Dove cerchi clienti?» resta
(decisione del 22/10).

## Come si fa senza fermare il servizio
1. **Prima (codice pronto, nome vecchio online):** tutto il codice sa già essere «Avvisto», ma lo diventa solo con
   `NEXT_PUBLIC_BRAND=avvisto` su Vercel (superato il 23/10 sera: un solo nome, senza variabile).
2. **Il giorno del passaggio:** dominio e casella pronti, servizi esterni configurati, poi la variabile su Vercel e una
   nuova pubblicazione. Il vecchio indirizzo rimanda per sempre al nuovo (i link già inviati continuano a funzionare).
3. **Dopo:** controlli da cliente, comunicazione alle agenzie della beta.

## Fase A — Codice pronto (Io, 23–24/10, nessun effetto online)
- A1. `BRAND` con nome, dominio, email, titolare (dal 23/10 sera solo Avvisto).
- A2. Logo provvisorio Avvisto: simbolo (`src/components/logo.tsx`), icona del browser, `public/email/logo-avvisto.png`.
- A3. Testi con il nome: homepage, prezzi, FAQ, registrazione, email dell'app, pagine legali,
  file Excel, identificativo dei robot (`AvvistoBot`). Revisione del Sales Copywriter.
- A4. Modelli email di Supabase (`supabase/templates/`), da incollare in Supabase il giorno del passaggio.
- A5. Motore n8n: `HOST_APP` accetta **già** anche avvisto.it (callback verso l'app), così il passaggio non lo rompe.
- A6. Worker sul VPS: `APP_URL` letto dal file di configurazione del server, non scritto nel codice.
- A7. Code Reviewer sul diff (testi e configurazione: livello 1–2; callback del motore: livello 2).

## Fase B — Dominio e casella (Tu, appena possibile)
- B1. Comprare **avvisto.it** su **Hostinger** (decisione dell'utente del 23/10: 5,99 € il primo anno, poi 15,99 €; casella
  gratuita disponibile; confrontato con Keliweb, dominio gratis e casella 9,90 €), solo il dominio, senza collegarlo a un sito
  dell'hosting. Il registrar deve permettere record A, CNAME, TXT e MX nel suo pannello DNS (Vercel, Resend, posta); con Keliweb non
  serve aggiungerlo all'hosting di Hostinger (il sito resta su Vercel).
- B2. Creare la casella **ciao@avvisto.it** (Hostinger «Free Business Email», gratis 12 mesi; alias **info@avvisto.it**) e
  provarla (invio e ricezione). Poi un account Google con ciao@avvisto.it («usa il tuo indirizzo email attuale») e il logo come
  foto: logo accanto al mittente in Gmail (punto 30) e servizi Google (Search Console): meglio presso lo stesso fornitore del dominio (un
  solo pannello); in alternativa casella su Hostinger con i record MX puntati lì.
- B3. Inoltro di la casella vecchia verso ciao@avvisto.it (le risposte alle vecchie email arrivano lo stesso).

## Fase C — Servizi esterni (Insieme, il giorno del passaggio, circa 1–2 ore)
Ogni passo con la guida passo passo in chat.
- C1. **Vercel:** aggiungere avvisto.it e www.avvisto.it al progetto; record DNS su Hostinger (A / CNAME indicati da Vercel);
  attendere il certificato.
- C2. **Resend:** aggiungere il dominio avvisto.it, record SPF/DKIM (e DMARC) su Hostinger, verifica.
- C3. **Vercel, variabili:** `APP_URL=https://avvisto.it`, `EMAIL_FROM="Avvisto <ciao@avvisto.it>"`; nuova pubblicazione con il
  codice solo Avvisto.
- C4. **Supabase → Authentication:** Site URL `https://avvisto.it`, Redirect URLs con avvisto.it (tenere anche il vecchio per
  qualche settimana), modelli email Avvisto incollati, SMTP con il mittente nuovo.
- C5. **Cloudflare Turnstile:** aggiungere avvisto.it ai domini ammessi.
- C6. **Stripe (test):** webhook verso `https://avvisto.it/api/stripe/webhook` (nuovo segreto su Vercel se cambia),
  nome e logo nel profilo pubblico.
- C7. **n8n:** `APP` nei workflow degli annunci (`n8n/annunci/build.mjs`) e callback del motore verso avvisto.it; caricamento
  dei nodi e pubblicazione.
- C8. **VPS:** `bash worker.sh rinomina` (cartelle e servizi col nome nuovo, `APP_URL=https://avvisto.it`, timer riaccesi).
- C9. **Vecchio indirizzo staccato** da Vercel, senza rinvio (decisione dell'utente del 23/10 sera), per ultimo.

## Fase D — Verifica (Insieme, subito dopo)
- D1. Registrazione nuova con email vera: conferma, accesso, verifica in due passaggi.
- D2. Ricerca di prova: callback del motore, lead consegnati, export Excel con il nome nuovo.
- D3. Email: benvenuto, reimpostazione password, avviso settimanale (mittente, logo, link).
- D4. ~~Vecchi link verso la pagina giusta~~ (non più: vecchio indirizzo staccato senza rinvio).
- D5. Worker sul VPS e workflow n8n che salvano senza errori (giro successivo).
- D6. QA Tester sul percorso cliente, UI/UX Designer su homepage, prezzi, registrazione e app (telefono e computer).

## Fase E — Dopo il passaggio (Insieme)
- E1. Email alle 13 agenzie della beta e firma nuova (testo del Sales Copywriter).
- E2. Posizionamento «Trova i tuoi prossimi clienti» (punto 83) e ricerche consigliate per tutti (Admin → Servizi: «Tutti»).
- E3. Profili social con il nome (se liberi), Google Search Console per avvisto.it.
- E4. Repository GitHub privato (punto 16).
- E5. Dopo 2–4 settimane: togliere il vecchio dominio dalle Redirect URLs di Supabase e da `HOST_APP` (il rinvio resta).
- E6. Logo definitivo quando c'è.

## Stato
- 23/10: fase A scritta (A1, A2, A4, A5, A6), in revisione. A3: i testi prendono già il nome da `BRAND`; il posizionamento
  nuovo (punto 83) si fa con il Sales Copywriter nella fase E. Il motore n8n va caricato dopo la revisione (A5).
- 23/10 pomeriggio: **B1 fatto** (avvisto.it comprato su Hostinger); **B2 in corso** (casella ciao@avvisto.it creata, «Collega il
  dominio» fatto, in attesa della propagazione). **C1 iniziato:** avvisto.it (Production) e www.avvisto.it (308 verso
  avvisto.it) aggiunti su Vercel; DNS su Hostinger: A @ 216.198.79.1 (al posto del parcheggio 2.57.91.91), CNAME www
  834fbe17190cdec4.vercel-dns-017.com, TTL 60; record della posta lasciati com'erano. Dominio attivo nel pomeriggio: avvisto.it
  apre l'app (ancora col nome vecchio), www rimanda con 308, MX e SPF di Hostinger presenti. **C1 fatto.** Prossimo: prova della
  casella, poi C2 (Resend).
- 23/10, 16:41: **C2 fatto** (avvisto.it «Verified» su Resend: DKIM, `send` e `rsend` su Hostinger; ricezione spenta). Prossimo:
  prova della casella ciao@avvisto.it, poi il giorno del passaggio da C3 a C9 (fino ad allora niente variabili nuove su Vercel).
- 23/10 sera, **decisioni dell'utente:** logo «C · Due toni» (A senza barra, gamba sinistra viola chiaro, destra viola scuro con la
  lente); solo il nome Avvisto ovunque, nessuna traccia del nome vecchio (codice, email, n8n, VPS, documenti vivi); titolare
  «Avvisto» nelle pagine legali fino alla partita IVA (checklist 11); vecchio indirizzo **staccato** del tutto, senza rinvio (i link
  già inviati smettono di funzionare). Il codice non ha più due versioni: `NEXT_PUBLIC_BRAND` non serve. Ordine (QA Tester): Redirect URLs di
  Supabase con avvisto.it → Vercel (variabili e pubblicazione) → Supabase (Site URL, modelli, mittente) → Turnstile → webhook di
  Stripe → nodi n8n → VPS (`rinomina` dalla copia nella home) → nessuna ricerca in corso → staccare il vecchio indirizzo per ultimo.
  Le email di conferma inviate prima del cambio diventano link morti.
