# Passaggio ad Avvisto

Documento vivo del rebranding da «Webora Leads» (leads.weborastudio.it) ad **Avvisto** (avvisto.it), iniziato il 23/10.
Decisioni dell'utente (23/10): sito e app su **avvisto.it** (www.avvisto.it rimanda lì), email di mittente e assistenza
**ciao@avvisto.it**, **logo provvisorio** fatto da Claude (da sostituire con quello definitivo). Il titolare resta Webora
Studio («Avvisto è un servizio di Webora Studio») finché non c'è la società o la partita IVA nuova (punto 11).

## Come si fa senza fermare il servizio
1. **Prima (codice pronto, nome vecchio online):** tutto il codice sa già essere «Avvisto», ma lo diventa solo con
   `NEXT_PUBLIC_BRAND=avvisto` su Vercel. Fino ad allora il sito resta «Webora Leads».
2. **Il giorno del passaggio:** dominio e casella pronti, servizi esterni configurati, poi la variabile su Vercel e una
   nuova pubblicazione. Il vecchio indirizzo rimanda per sempre al nuovo (i link già inviati continuano a funzionare).
3. **Dopo:** controlli da cliente, comunicazione alle agenzie della beta.

## Fase A — Codice pronto (Io, 23–24/10, nessun effetto online)
- A1. `BRAND` con due versioni (Webora e Avvisto), scelta da `NEXT_PUBLIC_BRAND`; nome, dominio, email, titolare.
- A2. Logo provvisorio Avvisto: simbolo (`src/components/logo.tsx`), icona del browser, `public/email/logo-avvisto.png`.
- A3. Testi con il nome: homepage, prezzi, FAQ, registrazione, email dell'app, pagine legali («servizio di Webora Studio»),
  file Excel, identificativo dei robot (`AvvistoBot`). Revisione del Sales Copywriter.
- A4. Modelli email di Supabase in versione Avvisto (`supabase/templates/avvisto/`), da incollare il giorno del passaggio.
- A5. Motore n8n: `HOST_APP` accetta **già** anche avvisto.it (callback verso l'app), così il passaggio non lo rompe.
- A6. Worker sul VPS: `APP_URL` letto dal file di configurazione del server, non scritto nel codice.
- A7. Code Reviewer sul diff (testi e configurazione: livello 1–2; callback del motore: livello 2).

## Fase B — Dominio e casella (Tu, appena possibile)
- B1. Comprare **avvisto.it** su Hostinger e aggiungerlo al Business Web Hosting (nessun server nuovo).
- B2. Creare la casella **ciao@avvisto.it** (Hostinger) e provarla (invio e ricezione).
- B3. Inoltro di leads@weborastudio.it verso ciao@avvisto.it (le risposte alle vecchie email arrivano lo stesso).

## Fase C — Servizi esterni (Insieme, il giorno del passaggio, circa 1–2 ore)
Ogni passo con la guida passo passo in chat.
- C1. **Vercel:** aggiungere avvisto.it e www.avvisto.it al progetto; record DNS su Hostinger (A / CNAME indicati da Vercel);
  attendere il certificato.
- C2. **Resend:** aggiungere il dominio avvisto.it, record SPF/DKIM (e DMARC) su Hostinger, verifica.
- C3. **Vercel, variabili:** `APP_URL=https://avvisto.it`, `EMAIL_FROM="Avvisto <ciao@avvisto.it>"`,
  `NEXT_PUBLIC_BRAND=avvisto`; nuova pubblicazione.
- C4. **Supabase → Authentication:** Site URL `https://avvisto.it`, Redirect URLs con avvisto.it (tenere anche il vecchio per
  qualche settimana), modelli email Avvisto incollati, SMTP con il mittente nuovo.
- C5. **Cloudflare Turnstile:** aggiungere avvisto.it ai domini ammessi.
- C6. **Stripe (test):** webhook verso `https://avvisto.it/api/stripe/webhook` (nuovo segreto su Vercel se cambia),
  nome e logo nel profilo pubblico.
- C7. **n8n:** `APP` nei workflow degli annunci (`n8n/annunci/build.mjs`) e callback del motore verso avvisto.it; caricamento
  dei nodi e pubblicazione.
- C8. **VPS:** `APP_URL=https://avvisto.it` nel file di configurazione, `bash worker.sh aggiorna`.
- C9. **Rinvio permanente:** leads.weborastudio.it → avvisto.it (308, stesso percorso) da Vercel.

## Fase D — Verifica (Insieme, subito dopo)
- D1. Registrazione nuova con email vera: conferma, accesso, verifica in due passaggi.
- D2. Ricerca di prova: callback del motore, lead consegnati, export Excel con il nome nuovo.
- D3. Email: benvenuto, reimpostazione password, avviso settimanale (mittente, logo, link).
- D4. Vecchi link (`leads.weborastudio.it/app/...`) che portano alla pagina giusta.
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
- Prossimo passo dell'utente: fase B (dominio e casella).
