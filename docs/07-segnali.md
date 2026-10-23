# 7. Segnali: cercare aziende che hanno bisogno di te

Fase 0 (13/10/2026). Il catalogo in forma di dati è in `src/lib/domain/signals.ts`; le pagine
di prova con gli esiti attesi sono in `n8n/engine/test/fixtures/signals/` (`expected.json`).

## Obiettivo
Il cliente scrive **cosa offre** (es. «sono un sistemista»). Webora trova le aziende con un
**segnale verificabile** di quel bisogno e su ogni lead mostra **perché** è in target, con la prova.

Due famiglie di segnali:
- **Annunci di lavoro** (principale): «a chi serve una figura?» → sistemisti, programmatori,
  consulenti HR, marketing, commerciali, amministrativi.
- **Segnali dal sito** (complementare): «a chi serve qualcosa sul digitale?» → agenzie web,
  manutenzione, sicurezza, traduzioni, booking per hotel.

## Principi (valgono per tutti)
1. **Descriviamo il fatto osservato, non il bisogno dedotto.** «Annuncio per Sistemista IT
   pubblicato il 02/10», non «ha bisogno di un sistemista».
2. **Non determinabile = non superato.** Se non possiamo dimostrarlo, il lead non viene venduto
   come lead con segnale.
3. **Ogni segnale ha una prova** salvata (link, data, dettaglio) e copiata sul lead consegnato.
4. **Freschezza:** annunci 60 giorni, segnali dal sito 30 giorni; poi vanno ricontrollati
   (anche per i lead del magazzino).
5. **Controllo prima dell'arricchimento:** chi non ha il segnale non costa Icypeas né MillionVerifier.
6. Massimo **3 segnali** per ricerca, con «basta uno» o «servono tutti».
7. I segnali **indicativi** si mostrano come informazione in più: non si possono usare da soli
   come filtro a pagamento.
8. La **tecnologia** del sito (WordPress, WooCommerce, Joomla, Wix, Shopify) è un filtro di
   segmentazione, non un segnale di bisogno.

## Prezzo e rimborsi
- **+1 credito** per lead consegnato con almeno un segnale verificato: generica 2, nominativa 3,
  nominativa verificata 4. Il registro crediti resta a numeri interi.
- Nuovo motivo di segnalazione **«Segnale non corretto»** entro **14 giorni**: rimborso
  automatico entro il tetto del 10% per ricerca (come gli altri motivi), oltre decide l'admin
  guardando la prova salvata.
- Il rimborso vale se la prova era falsa **al momento della consegna** (un sito rifatto dopo
  non conta).

## Schede

**Pagine che non sono il sito (dal 21/10, `n8n/engine/nodes/lib-controlli-sito.js`).** Prima di valutare i segnali della
homepage si scartano le pagine che non dicono niente del sito vero:
- **blocco anti-bot o pagina del server** («Request blocked», «Access denied», «Just a moment…», 403, dominio in vendita o
  parcheggiato, pagina di prova di Apache o nginx, verifica anti-robot, «no SSL certificate configured»), con la frase nel titolo
  oppure nel testo di una pagina senza menu (al massimo 2 link interni), sotto i 1.500 caratteri (3.000 per le pagine di prova e
  anti-robot): tutti i segnali della homepage sono **non determinabili**. «Appartamenti in vendita» in una homepage con il menu
  non conta;
- **errore momentaneo** (404, 500, 502, 503, 504, manutenzione di WordPress, «errore critico» di WordPress): non determinabili,
  ma le prove già salvate restano;
- **trasloco** verso un altro dominio (meno di 2.000 caratteri, al massimo 2 link interni, almeno un link `<a>` verso un altro
  dominio che non sia un social o un servizio, frase esplicita come «vai al nuovo sito», «ci siamo trasferiti», «we've moved»;
  non basta «nuovo sito» da solo, e una pagina provvisoria non è mai un trasloco): idem;
- **pagina provvisoria** («in costruzione», «sito in manutenzione»… nel titolo o nell'h1, oppure in una pagina sotto gli 800
  caratteri senza menu): vale `under_construction`; `no_mobile`, `single_language`, `stale_copyright`, `no_booking_engine` e
  `no_privacy` sono non determinabili; `outdated_cms` e `no_https` restano valutati (riguardano il software e il server).

Su queste pagine la prova porta `invalid_page: true` e il salvataggio toglie la vecchia prova del segnale, come per «fail»
(migrazione 055); un «non determinabile» per altri motivi (sito spento, errore momentaneo, pagina vuota) la lascia.

Il controllo siti apre l'indirizzo con il protocollo e il www del sito salvato (sempre sul dominio validato), così la pagina letta
è quella dell'indirizzo riportato nella prova.

### Annuncio di lavoro (`job_ad`) · verificato
- **Cosa dice al cliente:** «Sta assumendo una figura»: annuncio negli ultimi 60 giorni per la
  figura scelta (famiglie in `JOB_FAMILIES`: sistemista/IT, sviluppatore, sicurezza, marketing
  digitale, commerciale, HR, amministrazione, grafica; dal 22/10, punto 89, anche operai e produzione, manutentori e
  tecnici di impianto e qualità, magazzino e logistica, per il servizio «Selezione di operai e tecnici»). I mestieri di
  officina (CNC, PLC, CAD, saldatore, tornitore) vanno sempre alla manifattura, mai a programmatori o grafici.
- **Fonti:**
  1. pagina «Lavora con noi / Careers» del sito ufficiale;
  2. pagine di annunci pubbliche trovate dalla ricerca web (portali, siti di settore), che il
     motore **riapre e verifica**. Niente scraping sistematico di LinkedIn o Indeed: se una
     pagina non si può leggere, l'annuncio è non determinabile.
- **Vale se (tutte):**
  - la pagina si apre (HTTP 200) e contiene l'annuncio;
  - il **titolo** contiene una delle parole della famiglia scelta, nella lingua del paese o in
    inglese (confronto per parole intere, senza accenti, minuscolo);
  - l'**azienda** è indicata ed è la stessa del lead (nome o dominio del sito ufficiale);
  - la **data** di pubblicazione è negli ultimi 60 giorni, oppure la scadenza (`validThrough`)
    è futura e la pubblicazione non è anteriore a 120 giorni.
- **Prova più solida:** i dati strutturati `JobPosting` (schema.org) nella pagina: `title`,
  `datePosted`, `validThrough`, `hiringOrganization`. Se mancano: titolo dalla pagina e data da
  `<time datetime>` o da una data esplicita vicino al titolo.
- **Si scarta:**
  - agenzie per il lavoro che non dicono l'azienda vera («per azienda cliente», `hiringOrganization`
    = agenzia nota: Randstad, Adecco, Manpower, Gi Group, Synergie, Openjobmetis, Etjca, Umana…);
  - annunci scaduti o più vecchi di 60 giorni;
  - titolo fuori famiglia (es. «Magazziniere» per sistemista).
- **Non determinabile:** nessuna data; pagina bloccata; azienda non riconoscibile.
- **Prova salvata:** URL, titolo, data, fonte (sito aziendale / portale), data del controllo.
- **Frase sul lead:** «Annuncio per «Sistemista IT junior» pubblicato il 28/09 · link».
- **Paesi al lancio:** quelli con lingua coperta (IT, EN, ES, FR, DE, PT): Italia, Spagna,
  Portogallo, Francia, Belgio, Lussemburgo, Svizzera, Germania, Austria, Regno Unito, Irlanda,
  Malta, USA, Canada, Australia. Altri paesi dopo il lancio.
- **Attenzione per il cliente:** chi assume cerca un dipendente; per chi offre lo stesso servizio
  dall'esterno è «il momento giusto per proporsi», non una richiesta di fornitori.

### Sito senza connessione sicura (`no_https`) · verificato
- **Vale se:** il sito risponde solo in HTTP (nessun redirect a HTTPS), oppure il certificato
  HTTPS è scaduto, autofirmato o per un altro dominio. Se l'errore parla del nome (certificato di un altro sito), conta
  solo la regola del nome, non «scaduto» o «autofirmato» (22/10).
- **Dove:** sull'host del sito salvato (con il www se il sito lo usa), sempre sul dominio
  dell'azienda: il dominio nudo spesso ha un certificato diverso da quello del sito vero (19/10).
- **Non determinabile:** sito irraggiungibile in entrambi i modi; errori di rete temporanei
  (si riprova una volta); catena del certificato incompleta («unable to verify the first
  certificate») ed errori di handshake (EPROTO), che i browser di solito accettano; certificato
  per il solo www del dominio; dominio in vendita o parcheggiato (per esempio su Nidoma) o pagina di trasloco (la vecchia
  prova viene tolta; le pagine d'errore dell'hosting no: lì l'errore del certificato è vero); sito che dichiara come indirizzo vero un https su un altro dominio (`canonical` o `og:url`), perché
  l'HTTPS va giudicato lì (21/10).
- **No (assente):** la richiesta HTTPS riesce. Nel Controllo siti è una HEAD, che restituisce una risposta vuota: fino al 21/10
  veniva letta come «non determinabile» e le vecchie prove sbagliate non si toglievano mai.
- **Misura del 21/10 (Data Quality):** 139 segnali dati dopo le correzioni del 19–20/10, ricontrollati dal vivo: 118 veri (85%),
  17 falsi (12%), 4 non determinabili. Le correzioni del 21/10 ne tolgono 13; restano 4 falsi di siti che con http rimandano a
  un altro dominio, da risolvere leggendo il rimando (con il worker, punto 49).
- **Prova:** tipo di problema («nessun HTTPS» / «certificato scaduto il …»), data del controllo.

### Sito non adatto ai cellulari (`no_mobile`) · verificato
- **Vale se:** homepage scaricata correttamente (HTTP 200, HTML) e nell'`<head>` manca
  `<meta name="viewport">`.
- **Non vale se:** c'è un rimando a una versione mobile separata (`<link rel="alternate"
  media="…max-width…">` o redirect a `m.dominio`).
- **Non determinabile:** errore, pagina bloccata, redirect a un altro dominio.
- **Prova:** URL della homepage, assenza del tag, data.

### Sito con software non aggiornato (`outdated_cms`) · verificato
- **Vale se:** il sito dichiara la versione di WordPress, Joomla o WooCommerce (meta `generator`
  o parametro `?ver=` dei file di WordPress in `/wp-includes/`) e quella versione è **uscita da
  più di 2 anni**.
- **Regola prudente:** V è vecchia se la sua data di rilascio nota (`CMS_RELEASES`) è oltre i
  2 anni, oppure se in tabella esiste una versione successiva a V già uscita da oltre 2 anni.
  Versioni più recenti dell'ultima in tabella non vengono mai segnalate.
- **Non determinabile:** versione non dichiarata (molti siti la nascondono).
- **Prova:** prodotto, versione, data di rilascio, data del controllo.
- Le date di WooCommerce vanno ricontrollate sul changelog ufficiale in fase 2.

### Sito in una sola lingua (`single_language`) · verificato
- **Vale se:** homepage con contenuto (almeno ~200 caratteri di testo) e nessuno di: `hreflang`,
  link a percorsi di lingua (`/en/`, `/de/`, `?lang=`), sottodomini di lingua (`en.`), selettore
  di lingua riconoscibile (EN/DE/FR… nel menu).
- **Non determinabile:** pagina quasi vuota (sito tutto in JavaScript).
- **Prova:** lingua rilevata, data.

### Sito fermo da tempo (`stale_copyright`) · indicativo
- **Vale se:** nel piè di pagina il copyright più recente (© 2019, «2015-2020» → 2020) è di
  almeno 3 anni fa. Da solo non dimostra un bisogno: è un'informazione in più.

### Sito in costruzione (`under_construction`) · indicativo
- **Vale se:** titolo o testo principale contengono «in costruzione», «coming soon»,
  «under construction», «en construcción», «bientôt», «in Kürze»… e la pagina ha poco contenuto.

### Nessun sistema di prenotazione riconosciuto (`no_booking_engine`) · indicativo
- **Solo** per hotel e strutture ricettive.
- **Non vale se:** nella homepage c'è un booking engine noto (SimpleBooking, Vertical Booking,
  Octorate, Bedzzle, Ericsoft, Cloudbeds, SynXis, Booking Expert, Passepartout, BookingSuite…).
- **Vale (indicativo) se:** nessuno di questi e la prenotazione avviene solo via email/telefono.
  È indicativo perché il booking può stare in un'altra pagina.

### Sito senza informativa privacy o cookie (`no_privacy`) · indicativo (dal 20/10)
- **Vale (indicativo) se:** nella homepage leggibile non c'è nessuna traccia di informativa privacy o cookie: né le parole
  (privacy, cookie, informativa, GDPR, dati personali, consenso…) né un gestore dei consensi noto (iubenda, Cookiebot,
  CookieYes, Complianz, OneTrust, Usercentrics…).
- **Non determinabile:** pagina senza testo leggibile (siti costruiti dal browser).
- **Usato da:** «Sicurezza del sito». Mai decisivo da solo e mai addebitato. Descrive un fatto osservato, non
  un'irregolarità: l'informativa può stare in una pagina non collegata dalla homepage.

### Rimandati a dopo il lancio
Prenotazioni per ristoranti, e-commerce assente, analytics, modulo contatti
(servono più pagine o un browser vero); nuove sedi ed espansione all'estero (notizie); appalti
pubblici vinti (dati aperti ANAC); finanziamenti e bandi.

## «Cosa offri?» → segnali
Elenco in `SERVICES`: l'AI della fase 4 può proporre solo queste combinazioni, e l'app mostra
sempre cosa farà davvero (es. «Non possiamo sapere chi cerca un fornitore. Cercheremo: aziende
manifatturiere in Lombardia con annunci per ruoli IT negli ultimi 60 giorni»).

| Servizio del cliente | Segnali |
|---|---|
| Sistemistica e assistenza IT | Annunci: sistemista / tecnico IT |
| Sviluppo software | Annunci: sviluppatore |
| Sicurezza informatica | Annunci: sicurezza, IT · HTTPS · software non aggiornato |
| Siti web e restyling | Non adatto ai cellulari · HTTPS · fermo da tempo · in costruzione |
| Manutenzione WordPress / WooCommerce | Software non aggiornato · HTTPS (+ filtro tecnologia) |
| Marketing digitale | Annunci: marketing digitale |
| Consulenza commerciale | Annunci: commerciale |
| Consulenza HR e selezione | Annunci: HR |
| Contabilità e consulenza amministrativa | Annunci: amministrazione |
| Traduzioni ed export | Sito in una sola lingua |
| Prenotazioni online per hotel | Nessun booking engine · non adatto ai cellulari |

## Database e crediti (fase 3)
- `searches.target.signals`: codici, «basta uno»/«servono tutti», famiglie con i titoli in tutte le
  lingue (costruito da `toSignalsTarget`). Il form della fase 4 invia `signalCodes`, `signalMatch`,
  `jobFamilies`; lo schema rifiuta indicativi da soli, annunci senza famiglia o in paesi non coperti.
- Prezzo dei segnali modificabile dall'admin in «Prezzi e costi» (`app_settings.signal_extra_credits`:
  crediti in più per i segnali dal sito e per gli annunci, da 0 a 10, predefinito 1 e 1). Ogni ricerca
  salva i prezzi validi alla creazione in `searches.signal_prices`; il lead paga il prezzo più alto tra
  i segnali verificati che ha davvero (`signal_extra`). Homepage e termini mostrano i prezzi correnti.
- `create_search` riserva `(massimo modalità + prezzo più alto dei segnali scelti) × lead` se c'è almeno
  un segnale verificato.
- `deliver_leads` consegna solo i lead che soddisfano i segnali richiesti (difesa in profondità:
  il motore li ha già scartati), addebita +1, copia le prove in `deliveries.data.signals` e le salva
  in `company_signals` (una riga per azienda e segnale) con le tecnologie in `companies.technologies`.
- Magazzino: con segnali richiesti, solo aziende con prove **fresche** (`signal_is_fresh`: annuncio
  pubblicato da ≤ 60 giorni e della famiglia scelta; sito controllato da ≤ 30 giorni).
- Segnalazione `wrong_signal` («Segnale non corretto», solo sui lead con segnale, entro 14 giorni):
  rimborso automatico entro il tetto del 10%; se approvato, la prova contestata viene cancellata.
- Export: colonne «Perché è in target» e «Prova del segnale».

## Ricerca opportunità per servizio (14/10)
- Il cliente non sceglie più i segnali: sceglie l'**area** e il **servizio** che vende (`OFFER_AREAS`,
  `OFFERS` in `signals.ts`). Ogni servizio ha la sua regola interna: segnali (max 3), figure degli
  annunci, «basta uno»/«servono tutti», e la frase `lookFor` mostrata nel riepilogo.
- Regola del catalogo: un servizio esiste solo se ha almeno un segnale **verificato** che lo distingue.
  Nuovi servizi arrivano con nuove fonti (Adzuna per gli annunci) o nuovi controlli sulla homepage.
- Il backend ricava i segnali dal servizio (`offerChoice`): quelli inviati dal browser vengono ignorati.
  `target.signals.offer` resta sulla ricerca (riepilogo, «Ripeti con nuovi lead»).
- Sul lead restano visibili le prove («Perché è in target»).
- «In quali aziende»: di default **tutti i settori** (settore facoltativo solo nella ricerca opportunità).
  Il motore cerca PMI di ogni settore e salva il settore reale di ognuna; il magazzino, senza settore,
  consegna aziende di qualsiasi settore (migrazione `20261025000019_any_sector.sql`).
- Regole modificabili dall'admin in «Servizi opportunità» (`app_settings.offer_rules`): per ogni servizio
  segnali, figure, combinazione, frase del riepilogo e visibilità. Stessi vincoli del catalogo
  (`validateOfferRule`); una regola non valida viene ignorata. Valgono per le ricerche nuove: ogni
  ricerca salva la sua regola in `target.signals` (codici, figure, `look_for`).

## App (fase 4)
- Nuova ricerca con due modalità in cima al form: «Trova aziende in target» (invariata) e «Trova
  aziende con opportunità» (`/app/ricerche/nuova?tipo=opportunita`, anche dalla dashboard e da
  «Ricerche»). Passo «Opportunità»: servizio venduto → segnali consigliati (modificabili, max 3),
  figura degli annunci, «basta un segnale» / «servono tutti».
- Riepilogo con anteprima (`describeOpportunity`: solo i segnali che decidono; gli indicativi come
  informazione in più) e costo reale con il +1. «Ripeti con nuovi lead» conserva i segnali.
- Lead: etichette dei segnali sotto l'azienda, riquadro «Perché è in target» con frase, data e link
  alla prova; segnalazione «Segnale non corretto» solo sui lead con segnale.
- Termini (sezione «Ricerche con segnali» e garanzia) e privacy (cosa conserviamo degli annunci).

## Obiettivi del collaudo (fase 5)
- ≥ **95%** di prove corrette su un controllo manuale di ~50 lead.
- < **20%** di casi «non determinabile» per segnale (sopra, la regola va rivista).
- Costo reale per lead per segnale; prezzo confermato o corretto.
- Ricerche di prova: le 10 dell'utente (13/10) + consulenza HR e commerciale.

## Testi legali da aggiungere (fase 4)
- **Termini:** «I segnali descrivono fatti pubblici osservati alla data indicata (annunci di
  lavoro, caratteristiche tecniche del sito). Non costituiscono una garanzia che l'azienda abbia
  bisogno di un servizio o sia interessata a un'offerta.»
- **Privacy:** i segnali riguardano aziende, non persone; gli annunci vengono conservati solo come
  link, titolo e data (niente dati di candidati o referenti dell'annuncio).

## Segnali misurati dal VPS (punto 91, fase 1 dal 23/10: si salvano, non si vendono)
Il worker del controllo siti sul VPS (`worker/site-checks.mjs`, `segnaliVps`) misura due cose che i workflow n8n non vedono.
Si salvano in `company_checks` e `company_signals` (migrazione 068) ma **non sono nel catalogo dell'app né nel motore**:
nessuna ricerca li chiede finché Data Quality non li ha controllati su un campione vero (fase 2, da decidere).

### Certificato HTTPS in scadenza (`cert_expiring`) · in prova
- **Vale se:** la connessione HTTPS al sito riesce con il certificato verificato e il certificato scade **entro 14 giorni**.
  Non 30: Let's Encrypt si rinnova da solo quando mancano 30 giorni, quindi sotto i 14 il rinnovo è fallito da più di due
  settimane. Un certificato già scaduto è il segnale «Senza HTTPS», non questo.
- **Non vale (fail):** scadenza oltre 14 giorni. **Non determinabile:** HTTPS in errore o certificato non letto.
- **Prova:** data di scadenza, emittente, giorni mancanti, data del controllo.

### Sito lento (`slow_site`) · in prova
- **Vale se:** la homepage (letta, non una pagina d'errore) dà la prima risposta in **4 secondi o più**, redirect compresi,
  misurata dal VPS in Germania.
- **Non vale (fail):** entro 1,5 secondi. **Non determinabile:** tra 1,5 e 4 secondi, o pagina non letta: una misura sola
  non basta per un caso dubbio.
- **Prova:** secondi misurati e data del controllo.
