# Avvisto: panoramica completa del sistema

Documento da incollare in una nuova conversazione per ragionare su miglioramenti.
Aggiornato al 21/10/2026. Descrive come funziona oggi: prodotto, sito, app, database, workflow n8n, numeri.
Non contiene chiavi né dettagli di sicurezza sensibili (quelli restano fuori dal repository).

---

## 1. Il prodotto in breve

- **Cosa fa:** trova aziende italiane in target per chi vende servizi B2B. Le consegna con sito, settore, zona e
  un contatto aziendale (email generica come info@ o, se manca, il modulo di contatto del sito), sempre con la
  fonte.
- **Punto di forza («opportunità»):** può consegnare solo aziende con un **segnale verificato** collegato al
  servizio che il cliente vende. Ogni segnale ha una prova con la data, per esempio:
  - un annuncio di lavoro recente;
  - un sito con WordPress vecchio;
  - un sito senza HTTPS.
- **Posizionamento: «solo azienda».** Nessun dato di persone: niente nomi, ruoli o email nominative. I referenti
  sono spenti finché non c'è un parere legale.
- **Pubblico:** agenzie, imprese e professionisti con partita IVA che lavorano da soli (web agency, web designer e grafici,
  IT, marketing, HR, commerciale, consulenti). Dal 21/10 il sito nomina esplicitamente anche i freelance.
  Beta gratuita su invito: prime 3 agenzie il 19/10 (Gopher, Mutart, Studio360), poi inviti a circa 50 agenzie,
  10–15 al giorno (13 al 21/10); decisione sulla seconda ondata il 30/10.
- **Sito:** avvisto.it. Casella del servizio: ciao@avvisto.it.

## 2. Tecnologia

| Parte | Strumento | Note |
|---|---|---|
| Sito e app | Next.js 16 su Vercel | server a Francoforte (fra1) |
| Database e accesso | Supabase (Postgres) | Francoforte; regole di accesso per riga (RLS); verifica in due passaggi per gli utenti |
| Motore e lavori automatici | n8n Cloud | 7 workflow di Avvisto (sezione 7) |
| Intelligenza artificiale | Anthropic Claude | Sonnet per la ricerca, Haiku per settore e siti (Haiku 5.5: 0,10 $ / 0,50 $ per milione di token, prezzi nel registro del 22/10); spazio di lavoro dedicato con limite di spesa |
| Pagamenti | Stripe | in modalità di prova: finché la chiave non è live, acquisti e portale solo per gli admin; i crediti della beta li aggiunge l'admin |
| Email del servizio | Resend | modelli con la grafica precedente |
| Captcha | Cloudflare Turnstile | registrazione, accesso, recupero password |
| Fonti di dati | OpenStreetMap (ODbL), Adzuna (annunci), siti ufficiali delle aziende | |

Il codice è un unico repository. Contiene l'app in `src/`, il database in `supabase/migrations/` (60 migrazioni,
fino alla 060, con i loro test; a ogni push GitHub Actions esegue lint, tipi, test dell'app, del motore e SQL,
`.github/workflows/ci.yml`) e i workflow in `n8n/`, generati da script (`build.py` e `build.mjs`) con i loro test.

## 3. Piani, crediti e prezzi

- **1 credito = 1 lead consegnato** («Solo azienda»).
- **Lead con segnale verificato:** +1 credito, quindi 2 in totale.
- **Ricerca in target che usa la ricerca AI sul web:** +1 credito. Succede con filtri che il database non sa
  verificare (dimensione, fatturato, parole chiave, note) o fuori dall'Italia.
- **Benvenuto:** 15 crediti gratis alla registrazione, validi 12 mesi, senza carta.

| Piano | Prezzo | Crediti |
|---|---|---|
| Pacchetto 100 | 49 € | 100 crediti, validi 12 mesi |
| Pacchetto 500 | 199 € | 500 crediti, validi 12 mesi |
| Pacchetto 2.000 | 690 € | 2.000 crediti, validi 12 mesi |
| Starter | 49 €/mese | 150 crediti al mese |
| Growth | 149 €/mese | 600 crediti al mese |
| Scale | 399 €/mese | 2.000 crediti al mese |

- **Crediti degli abbonamenti:** scadono un mese dopo la fine del periodo. Si usano sempre prima quelli più
  vicini alla scadenza.
- **Prenotazione dei crediti:** all'avvio di una ricerca si prenota il massimo dei crediti; alla fine si addebitano
  solo i lead consegnati e il resto torna disponibile.
- **Garanzia:** si possono segnalare tre problemi:
  - email che rimbalza (entro 30 giorni);
  - lead fuori dai filtri (entro 14 giorni);
  - segnale non corretto (entro 14 giorni).

  Il rimborso è automatico fino al 10% dei lead di una ricerca; oltre, serve una verifica.
- **Beta:** +150 crediti e piano Growth assegnati dall'admin; −30% per 12 mesi a chi continua.

## 4. Il sito pubblico

- **Homepage:**
  - opportunità in primo piano e demo simulata della ricerca;
  - sezione «Per chi è» (7 casi);
  - prezzi letti dal listino e domande frequenti.
- **Altre pagine:** «Prezzi», «Sicurezza e privacy», «Informativa privacy», «Termini» (le ultime due sono
  ancora bozze da far validare dal legale).
- **«Rimuovi i tuoi dati»:** chi non vuole comparire inserisce l'email e conferma dal link ricevuto. Il suo
  indirizzo, o tutto il dominio, entra in una lista di esclusione permanente, salvata come impronta non leggibile.
- **Accesso:** registrazione, accesso, recupero password e verifica in due passaggi facoltativa.
  - Il captcha protegge registrazione, accesso e recupero password.
  - Limiti: 3 registrazioni al giorno dalla stessa connessione; 10 accessi sbagliati per account ogni 15 minuti.

## 5. L'app del cliente

- **Dashboard:** crediti, ricerche recenti, collegamenti rapidi.
- **Nuova ricerca (wizard)**, che prima chiede il tipo di ricerca:
  - **Opportunità:** il cliente sceglie **cosa vende**, tra 13 servizi in 6 aree (tabella in sezione 6), poi zona
    ed eventualmente settore. Le regole di ogni servizio (segnali e combinazione) si modificano dall'admin.
    - Il wizard nasconde dimensione, fatturato, parole chiave e note, perché il database non sa filtrarli.
  - **In target:** settore (anche più settori), zona e filtri facoltativi.
  - **«Vendi altro?»** porta alla ricerca in target, per i settori senza segnali.
- **Il resto del wizard:**
  - quantità di lead;
  - anteprima con il riepilogo «Cercheremo…» e i lead attesi dal database (dal 22/10: le aziende con email o modulo
    più il 30–50% di quelle ancora da provare, resa misurata), con la spesa in euro;
  - ripetizione automatica facoltativa.
- **Risultati della ricerca:**
  - tabella dei lead con azienda, sito, settore, zona, email o modulo, segnali con prova e data, punteggio
    dell'opportunità e qualità;
  - stati e note del cliente, liste, segnalazione di un lead;
  - archiviazione ed eliminazione (un lead eliminato non resta leggibile e non viene riproposto);
  - «Spunto per il primo messaggio»: frase costruita dalla prova del segnale, con il pulsante «Copia» (anche nell'export);
  - export CSV o Excel.
- **Tutti i lead:** archivio di tutti i lead ricevuti, con filtri.
- **Crediti:** saldo, movimenti, acquisto di pacchetti e abbonamenti (Stripe; durante la beta solo per gli admin), fatture.
- **Avviso settimanale (solo admin durante la beta):** su una ricerca opportunità, «Avvisami ogni settimana»: il lunedì
  un'email gratuita con il numero di aziende nuove (almeno 3) e il pulsante per aprire la ricerca.
- **Account:** profilo, sicurezza (password, uscita da tutti i dispositivi, verifica in due passaggi),
  fatturazione, assistenza.
- **Email automatiche:** ricerca pronta o non riuscita, ripetizione non avviata, avvisi di sicurezza. Hanno tutte
  la grafica precedente.

## 6. Segnali, servizi e punteggio

**Segnali** (prova sempre con fonte e data):

| Segnale | Come si verifica | Peso dell'affidabilità |
|---|---|---|
| Sta assumendo una figura (annuncio) | annunci Adzuna e pagine «Lavora con noi», verificati ed entro 60 giorni | 90 |
| Sito senza connessione sicura | richiesta HTTPS sull'indirizzo vero del sito; conta solo un certificato scaduto, autofirmato o di un altro sito (con un errore sul nome decide il nome) | 90 |
| Software non aggiornato | versione di WordPress, Joomla o WooCommerce uscita da più di 2 anni | 85 |
| Sito in costruzione | homepage provvisoria | 70 |
| Non adatto ai cellulari | homepage senza impostazione per cellulari (viewport) | 65 |
| Sito in una sola lingua | nessuna versione in altre lingue | 50 |
| Nessun sistema di prenotazione | per gli hotel: nessun motore di prenotazione riconosciuto | 45 |
| Sito fermo da tempo | copyright fermo da 3 anni o più | 40 (solo indicativo) |
| Informativa privacy non trovata nella homepage (fino al 24/10 «Sito senza informativa privacy o cookie») | nessuna traccia di privacy o cookie né gestore dei consensi in homepage | 40 (solo indicativo) |

Pagine che non sono il sito (blocchi anti-bot, dominio in vendita, pagine del server, traslochi, pagine provvisorie):
segnali della homepage non determinabili e vecchie prove tolte (migrazione 055; regole in `07-segnali.md`).

**Servizi** («Cosa vendi?»):

| Area | Servizio | Segnali usati |
|---|---|---|
| Siti web | Rifacimento del sito | software vecchio, cellulari, copyright |
| Siti web | Manutenzione WordPress | software vecchio |
| Siti web | Sicurezza del sito | HTTPS, software vecchio, privacy (indicativo) |
| IT e sistemistica | Assistenza IT | annuncio per sistemista |
| IT e sistemistica | Sviluppo software | annuncio per sviluppatore |
| IT e sistemistica | Sicurezza informatica | annuncio IT o sicurezza, HTTPS, software vecchio |
| Marketing e comunicazione | Marketing digitale | annuncio |
| Marketing e comunicazione | Grafica e comunicazione | annuncio |
| Marketing e comunicazione | Traduzioni ed export | una sola lingua; solo per industria, agroalimentare, vino e turismo |
| HR e selezione | Selezione del personale | annuncio |
| HR e selezione | Consulenza HR | annuncio |
| Commerciale | Rete vendita | annuncio |
| Amministrazione | Contabilità | annuncio |

**Punteggio dell'opportunità (0–100):**
- per il segnale migliore si moltiplicano tre fattori:
  - **affidabilità** (colonna della prima tabella);
  - **attinenza al servizio:** 1 se è il segnale principale del servizio, 0,85 se è secondario, 0,7 se non è tra
    i suoi;
  - **freschezza:** 1 fino a 14 giorni, 0,9 fino a 30, 0,75 fino a 60, poi 0,6;
- ogni altro segnale aggiunge 8 punti;
- livelli: **forte** da 75, **probabile** da 50, sotto è **potenziale**.

## 7. Il database delle aziende e i workflow che lo riempiono

Il cuore del prodotto è un **database comune delle aziende**: circa 12.000 aziende al 21/10 (OSM 10.485, Adzuna 1.217), 73.416 al 23/10 dopo OSM da Geofabrik, in crescita ogni
notte. Le ricerche lo usano per primo (giro detto «database first»); la ricerca AI parte solo per la parte che il
database non copre.

**Tabelle principali:**
- `companies`: azienda, dominio, sito, città, settore, etichette, luoghi, tecnologie del sito, date dei
  controlli, memoria di «referente non trovato» e «email non trovata», partita IVA (`vat_number`, dalla migrazione 069:
  dal controllo siti e da Common Crawl; serve a non creare doppioni tra fonti diverse; `vat_sightings` conta su quanti domini
  compare, dalla terza volta è di un fornitore e si toglie).
- `company_checks` / `company_signals`: esito di ogni controllo e prove dei segnali.
- `job_ads`: annunci di lavoro.
- Magazzino dei lead già trovati: rivenduti ad altri clienti con criteri simili, ma mai due volte allo stesso
  cliente e mai indicando chi altro li ha ricevuti.
- Lista di esclusione e lista delle grandi aziende, che vengono escluse.

**Workflow n8n di Avvisto** (gli orari sono italiani):

| Workflow | Quando | Cosa fa |
|---|---|---|
| Aziende \| Popolamento OSM | ogni notte (4:20; dal punto 87 sostituito dal worker sul VPS, `worker/osm.mjs`: tutta Italia dal file Geofabrik ogni lunedì, stesse regole, più manifattura e aree industriali; ogni ora `worker/siti-osm.mjs` cerca il sito delle attività senza, con le regole dei domini indovinati degli annunci) | 8 province al giorno, prima il Nord: attività con sito da OpenStreetMap, con il settore ricavato dalla categoria |
| Aziende \| Controllo siti | **spento dal 24/10** (sostituito dal worker sul VPS, `worker/site-checks.mjs`: 300 siti ogni 10 minuti, stesse regole, coda della migrazione 071; sullo stesso VPS `worker/contacts.mjs` cerca email e modulo nelle pagine «Contatti», «Note legali» e «Chi siamo» delle aziende senza contatto, 150 ogni 30 minuti) | 150 siti (prima quelli nelle zone e nei settori delle ricerche degli ultimi 30 giorni e degli avvisi, migrazione 064; la 060 tolta perché troppo lenta): HTTPS, software, cellulari, lingue, copyright, «in costruzione», prenotazioni; salva prove, tecnologie e l'email aziendale della homepage (gratis, senza AI); fino a esaurimento ricontrolla anche le circa 9.000 aziende controllate prima del 20/10 senza email (migrazione 054) |
| Annunci \| Raccolta Adzuna | ogni 2 giorni alle 6:10 | 86 ricerche per titolo in tutta Italia (ultimi 3 giorni; dal punto 89 anche operai, manutentori e magazzinieri, con pochi titoli per stare nelle 2.500 chiamate al mese); scarta le agenzie per il lavoro |
| Annunci \| Siti aziende | alle 7:40 e alle 11:40 | trova il sito di 120 aziende degli annunci: prima prova i domini probabili (gratis), poi al massimo 3 ricerche web con Claude Haiku |
| Annunci \| Settore aziende | ogni 4 ore | classifica il settore dalla homepage con Claude Haiku; esclude chi vende *al* settore («per hotel» non vuol dire hotel) |
| Aziende da Common Crawl (VPS, non n8n) | ogni 3 ore alle :25, quando acceso (`avvia-cc`) | punto 92, `worker/cc.mjs`: 3.000 domini .it dall'elenco pubblico di Common Crawl; tiene solo i siti con partita IVA valida, nome, città e provincia dalla pagina, settore da Haiku tramite l'app (`/api/engine/companies-classify`); origine `cc` |
| Lead Engine \| Search (v1) | a ogni ricerca | il motore (sezione 8) |
| Lead Engine \| Errori | quando il motore si blocca | chiude la ricerca e restituisce i crediti |

Su n8n ci sono anche due workflow di un **altro progetto** («Prospect | Search», «Prospect Avvocati | Search»):
non vanno toccati.

**Copertura:** il Sud e l'Emilia-Romagna sono ricchi di aziende con segnali; il Nord è in arrivo (Lombardia
importata il 20/10, circa 2.900 aziende nuove). Il 30/10 si decide la seconda ondata della beta (soglie in percentuale), con rinvio al 6/11 se le agenzie attive
sono meno di 3.

## 8. Il motore di ricerca (Lead Engine | Search)

1. **L'app prepara la richiesta:**
   - prima consegna i lead dal **magazzino**;
   - poi manda al motore i criteri, le esclusioni (aziende già ricevute dal cliente) e una **riserva** fino a 40
     aziende del database adatte alla ricerca.
   - L'ordine della riserva mette in fondo per 90 giorni le aziende già provate senza email o senza referente.
2. **Valida richiesta** (controlla mittente e indirizzo di ritorno) e calcola i lotti:
   - se la riserva basta, **niente AI**;
   - altrimenti 1–12 lotti da 30 aziende (circa 1,8 candidati per lead richiesto).
3. **Pianificazione:** Claude divide la ricerca in lotti che non si sovrappongono e propone le query locali.
4. **Ricerca web per lotto:** Claude Sonnet con lo strumento di ricerca web; cerca solo aziende, mai persone.
5. **Deduplica:** toglie doppioni, aziende già viste, siti non ufficiali (social, elenchi, portali), grandi aziende
   e piattaforme.
6. **Segnali** (ricerche opportunità):
   - verifica dell'annuncio;
   - controlli tecnici sulla homepage e richiesta HTTPS;
   - chi non ha il segnale viene scartato prima di qualunque altro costo.
7. **Email dal sito ufficiale:**
   - homepage, poi fino a 4 pagine (prima i contatti, poi chi siamo, note legali…);
   - solo email del dominio dell'azienda, mai ipotizzate;
   - regole per caselle d'ufficio e domini fratelli;
   - se manca l'email, il modulo di contatto.
8. **Classificazione e ritorno all'app:**
   - verifica rapida che le caselle esistano;
   - consegna, addebito, salvataggio nel database delle aziende viste e dei loro controlli.
9. **Giri successivi:** se mancano lead, parte un nuovo giro finché c'è budget (circa 0,20 € a lead, minimo 1 €)
   e finché i giri rendono.

Rami presenti ma spenti con «Solo azienda»: ricerca del referente (dal sito, poi dal web) e verifica a pagamento
delle email (Icypeas).

**Numeri reali** (18–19/10):

| Tipo di ricerca | Durata | Lead per ricerca | Costo AI per lead | Pagine scaricate |
|---|---|---|---|---|
| Target con AI | 55–70 s | 23–28 per 20 richiesti | circa 0,02–0,03 € | 40–90 |
| Opportunità dal database | circa 40 s | 17 per 3 richiesti | zero | circa 115 |

- Tra il 40 e il 57% delle aziende provate non ha un'email sul sito: dal 20/10 il motore se lo ricorda.
- Dettagli in `docs/archivio/11-analisi-motore.md`.

## 9. Admin (solo con verifica in due passaggi)

- **Beta:** per cliente ricerche, lead, export, contattati, risposte e segnalati, con le soglie della decisione del 30/10.
- **Andamento:** ricavi, costi dei fornitori e margine degli ultimi 30 giorni, più il riquadro «Database aziende».
- **Clienti:** crediti, piano, crediti regalati.
- **Ricerche e motore:** giri, errori, costi per ricerca.
- **Servizi opportunità:** modificare segnali e regole di ogni servizio.
- **Prezzi e costi:** costi unitari dei fornitori e crediti per tipo di lead.
- **Segnalazioni e GDPR:** lead segnalati, lista di opposizione, richieste di rimozione.

## 10. Lavori automatici dell'app

Cron giornaliero (5:00 con l'ora legale, 4:00 d'inverno):
- chiude i giri senza notizie e restituisce i crediti;
- fa scadere i crediti scaduti;
- avvia le ricerche ricorrenti;
- il lunedì manda l'avviso settimanale delle opportunità (solo ricerche degli admin durante la beta; email se ci sono
  almeno 3 aziende nuove; migrazione 056, `src/lib/server/alerts.ts`);
- cancella dal magazzino i dati non riverificati da 24 mesi;
- pulisce il registro degli errori dopo 90 giorni.

Gli errori del server arrivano via email all'admin.

## 11. Privacy e regole

Analisi fatta in proprio il 24/10 (documento «Avvisto – analisi privacy» su Claude, fuori dal repository; checklist 98).

- **Dati delle aziende:** solo pubblici, con fonte e data; niente persone e niente caselle gratuite. Riverifica
  o cancellazione entro 24 mesi. I dati delle società sono fuori dal GDPR (considerando 14); ditte individuali e
  studi sono dati personali, trattati con il legittimo interesse e le garanzie della valutazione scritta (LIA).
- **Minimizzazione:** degli annunci di lavoro non si salva la descrizione (dal 24/10, migrazione 072).
- **robots.txt:** i worker del VPS (controllo siti, contatti, siti OSM, Common Crawl, `worker/robots.mjs`) non aprono
  le pagine escluse; il motore su n8n non lo legge ancora.
- **Opposizione:** cancella subito dal database (migrazione 014) e segna i lead già consegnati con quell'email o
  dominio (`deliveries.opted_out_at`, migrazione 073, art. 19): in app ed export «Si è opposta: non contattare»,
  senza email né modulo.
- **Riservatezza delle ricerche:** le ricerche del cliente (cosa cerca, filtri, esiti) non le vede nessun altro, e
  Avvisto non le usa per sé. I dati pubblici delle aziende consegnate restano nel database comune e possono
  andare anche ad altri clienti (come dicono i termini).
- **Ruolo e responsabilità del cliente:** titolare autonomo. Email, SMS e chiamate automatiche promozionali
  richiedono il consenso anche verso le aziende (art. 130); telefonate con operatore solo dopo il Registro delle
  opposizioni: è scritto nei termini, nel wizard, sopra i lead e nell'export Excel.
- **Da chiudere:** controllo limitato del legale su 5 punti, licenza Adzuna, partita IVA e dati del titolare,
  Stripe con pagamenti reali, backup giornalieri (Supabase Pro), repository privato.

## 12. Limiti noti e cose aperte

- Quasi metà delle aziende non ha un'email sul sito; con il solo modulo di contatto il lead vale meno.
- Senza il nome del referente non sappiamo se i clienti pagheranno: è la domanda chiave della beta.
- Il Nord è ancora poco coperto da segnali; la seconda ondata della beta dipende da questo.
- L'annuncio di lavoro dipende da Adzuna, con un limite di 2.500 chiamate al mese e la conferma sull'uso
  commerciale ancora in attesa.
- Il controllo siti gira 150 siti l'ora: dopo un import grande la coda si allunga di un giorno o più.
- Esecuzioni n8n: circa 1.400 al mese misurate (44–48 al giorno) contro un tetto di 2.100 (piano 2.500); con 50–100
  clienti si supera. Il controllo siti passerà su un worker sul VPS Hetzner dopo il 30/10 (circa 720 esecuzioni in meno).
- Un account ha un solo utente: l'invito di colleghi non esiste ancora (la promessa è stata tolta dal listino il 20/10).
- Proposte già annotate:
  - ~~salvare le email trovate dal controllo siti~~ (fatto dal 20/10);
  - stima dei lead e del costo in euro nel wizard;
  - più utenti per account e API;
  - ~~monitoraggio continuo delle opportunità~~ (avviso settimanale dal 21/10, per ora solo admin);
  - nuovi servizi («Sito nuovo», «Prenotazioni online per hotel»);
  - segnale «nuova apertura».

## 13. Documenti di riferimento nel repository

`00-checklist.md` (stato dei lavori) · `03-contratto-motore.md` (contratto app–motore) · `07-segnali.md` (regole
dei segnali) · `10-beta.md` (piano della beta) · `archivio/11-analisi-motore.md` (numeri del motore) ·
`09-domande-consulenti.md` (domande per legale e commercialista) · `13-registro.md` (registro delle modifiche e delle
decisioni) · `README.md` (indice dei documenti).

## 14. Come lavoriamo

- Ogni modifica e decisione va in `docs/13-registro.md`, nello stesso commit; le cose da fare in `docs/00-checklist.md`.
- Squadra di agenti in `.claude/agents/` (code-reviewer, qa-tester, data-quality, sales-copywriter, ui-ux-designer,
  business-analyst): il code-reviewer rivede ogni push con codice, SQL o n8n (regola in `CLAUDE.md`).
- Le migrazioni le esegue l'utente; l'app va su main solo dopo le migrazioni da cui dipende. I workflow n8n li pubblica
  l'utente dopo che il codice è stato caricato e verificato.
