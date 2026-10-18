# 9. Domande per il legale e per il commercialista

Preparato il 18/10 (checklist `08-messa-in-produzione.md`, Fase 0). Da inviare o portare
all'incontro così com'è: la prima parte descrive il servizio, poi le domande.

---

## Il servizio in breve

**Webora Leads** (leads.weborastudio.it) è una piattaforma B2B a crediti: un'azienda cliente
(agenzia web, società IT, consulente) indica settore, zona, dimensione e ruolo cercato e riceve
un elenco di aziende con un contatto email, da usare per proporre i propri servizi.

**Cosa consegniamo (un «lead»):** nome dell'azienda, sito, città, settore, dimensione stimata,
email aziendale verificata (es. info@) e, quando disponibile, nome e ruolo di un referente
(titolare, amministratore, responsabile) con la sua email professionale. Ogni lead riporta la
fonte (link alla pagina da cui è stato ricavato). Facoltativi i «segnali»: fatti sull'azienda
come «sta assumendo un sistemista» (annuncio di lavoro) o «sito senza HTTPS / non adatto ai
cellulari».

**Tre modalità di email scelte dal cliente:**
1. *Email generiche incluse* – azienda + email generica; nome del referente solo se è sul sito.
2. *Mista* – cerchiamo il referente anche nei registri delle imprese; se non c'è, generica.
3. *Solo nominative* – solo email riferibili a una persona (trovate sul sito o verificate).

**Fonti:**
- siti ufficiali delle aziende (home, contatti, chi siamo, note legali);
- registri e portali pubblici delle imprese consultati tramite ricerca web (es. visure
  riassuntive su portali camerali);
- OpenStreetMap (elenco di attività con nome, sito, città; licenza ODbL);
- Adzuna (API annunci di lavoro) e pagine «Lavora con noi» dei siti;
- ricerca web automatica con un modello di AI (Anthropic Claude) per trovare aziende e referenti;
- Icypeas (servizio di terzi) per trovare/verificare email nominative a partire da nome e dominio.

**Come funziona tecnicamente:** il sito (Vercel, Next.js) e il database (Supabase, UE) gestiscono
utenti, crediti e lead; un motore di automazione (n8n Cloud) svolge le ricerche. Le aziende e i
lead trovati vengono **conservati in un «magazzino»** e possono essere **forniti a più clienti**
interessati allo stesso settore e zona; vengono riverificati o cancellati entro 24 mesi. Esiste
una pagina pubblica di opposizione (/opposizione) che inserisce l'indirizzo in una lista di
esclusione permanente.

**Pagamenti:** Stripe (pacchetti di crediti una tantum da 49 € / 199 € / 690 € e abbonamenti
mensili da 49 € in su; piano gratuito da 15 crediti). Un lead costa da 1 a 3 crediti secondo la
modalità e i dati inclusi. Clienti solo professionisti/imprese, Italia e UE in prima battuta.

**Volumi attesi all'avvio:** beta su invito con 5–10 aziende, qualche migliaio di lead al mese.

---

## Domande per il legale (privacy e contratti)

### A. Base giuridica e liceità della raccolta
1. La raccolta da fonti pubbliche di dati **professionali** di referenti aziendali (nome, ruolo,
   email professionale) basata sul legittimo interesse (art. 6.1.f GDPR) è sostenibile per
   un servizio che li **rivende**? Serve un LIA (bilanciamento) scritto? Ce lo può impostare?
2. Differenza di rischio tra:
   - email generiche (info@, sales@) senza nome → sono dati personali?
   - nome del titolare + email generica;
   - email nominativa (mario.rossi@azienda.it);
   - email nominativa su dominio personale (Gmail/iCloud) **pubblicata dal titolare sul sito
     dell'impresa** (frequente nelle ditte individuali): possiamo trattarla o va esclusa?
3. Ditte individuali e liberi professionisti: il nome dell'impresa coincide con quello della
   persona. Cautele specifiche?
4. Dati presi da visure/portali camerali tramite ricerca web: limiti d'uso di queste fonti?
5. Uso dell'AI per estrarre i dati dalle pagine (Anthropic, USA): trasferimento extra-UE, serve
   altro oltre alle clausole del fornitore?

### A-bis. Il caso Lusha (provvedimento n. 542/2026 del 14/07/2026)
Il Garante ha sanzionato Lusha (data broker B2B) con 2 milioni di euro, vietato il trattamento
dei dati delle persone in Italia e ordinato la cancellazione. Secondo il comunicato: il
legittimo interesse non è base giuridica adeguata; i dati professionali non sono leciti in
sé; pesano la cessione a clienti terzi, l'origine eterogenea, l'imprevedibilità degli usi e
l'aggiornamento nel tempo dei profili (considerato «tracciamento»).
- A. In cosa il nostro modello si distingue (dimensioni, fonti solo pubbliche e citate per
  ogni lead, niente social né acquisto da altri broker, solo aziende e ruoli aziendali,
  opposizione permanente) e se basta a reggere il legittimo interesse.
- B. La riverifica periodica dei contatti nel magazzino è «tracciamento»? Conviene non
  conservare i dati personali dopo la consegna (solo l'azienda nel magazzino) e ricercare il
  referente ad ogni ricerca?
- C. Una modalità **solo azienda** (nome, sito, settore, email generica, segnale; nessun nome
  di persona) è fuori da questi rischi? Le email generiche (info@) di una ditta individuale
  sono dati personali?
- D. Se si consegnano nomi: quali condizioni minime (informativa entro un mese, limite di
  clienti per contatto, nessuna conservazione oltre N mesi, contratto con il cliente)?

### B. Informativa agli interessati (art. 14)
6. Basta l'informativa pubblicata sul sito (con la pagina di opposizione), o dobbiamo
   **informare ogni persona** entro un mese dalla raccolta (art. 14.3)? L'eccezione
   «sforzo sproporzionato» (art. 14.5.b) è applicabile? Se no, come farlo a costo sostenibile
   (una email informativa automatica al primo inserimento?).
7. La nostra informativa e i termini attuali (pagine /privacy e /termini) vanno bene? Cosa manca?

### C. Rivendita e ruoli
8. Il cliente che compra i lead diventa **titolare autonomo**: è corretto? Cosa deve dire il
   contratto/termini (obblighi del cliente, divieto di rivendita, uso solo B2B, rispetto
   dell'opposizione)?
9. Fornire lo stesso contatto a più clienti è ammesso? Limiti consigliati (es. massimo N clienti
   per contatto in un periodo)?
10. Conservazione nel magazzino per 24 mesi con riverifica: periodo accettabile?
11. Serve una **DPIA**? Serve un registro dei trattamenti (lo prepariamo noi su un modello)?

### D. Invio di email commerciali da parte dei clienti
12. Art. 130 Codice privacy (consenso per comunicazioni commerciali con mezzi automatizzati):
    si applica alle email inviate a **caselle aziendali generiche** e **nominative** di
    imprese? Che responsabilità abbiamo noi come fornitore dei contatti?
13. Cosa possiamo promettere nei testi del sito (es. evitare «email pronte per campagne»)? Una
    frase tipo che consiglia al cliente come usarli correttamente.
14. Opposizione: chi si oppone tramite noi va escluso anche dalle liste già vendute? Dobbiamo
    avvisare i clienti che lo hanno ricevuto?

### E. Altre fonti e licenze
15. **OpenStreetMap (ODbL)**: il nostro elenco aziende è un «database derivato»? Basta
    l'attribuzione «© OpenStreetMap contributors» nella pagina fonti, o la licenza ci obbliga a
    rendere pubblico il database derivato (share-alike)? Come strutturarci (es. tenere i dati
    OSM separati e usarli solo per trovare il sito)?
16. **Adzuna**: l'uso degli annunci come «segnale» venduto ai clienti è compatibile con i loro
    termini? Le condizioni dell'API ammettono l'uso commerciale solo per 14 giorni di prova, poi
    serve un consenso scritto (stiamo chiedendo l'accordo). Conserviamo solo link, titolo e data.
17. Lettura automatica dei siti (scraping leggero di poche pagine pubbliche per azienda): rischi
    legati ai termini d'uso dei siti o al diritto sui database (direttiva 96/9/CE)?

### F. Contratti e responsabilità
18. Termini di servizio B2B: limitazione di responsabilità, foro, legge applicabile, recesso
    (escluso per professionisti?), scadenza dei crediti (12 mesi pacchetti, 1 mese extra
    abbonamenti): clausole valide?
19. Nomine a responsabile del trattamento dei nostri fornitori (Supabase, Vercel, n8n,
    Anthropic, Icypeas, Stripe, Resend): bastano i DPA standard che accettiamo online?

---

## Domande per il commercialista

1. **Forma e apertura:** partita IVA individuale o società? Codice ATECO adatto (es. 63.11
   elaborazione dati / 62.0x software / 73.1x marketing)? Regime forfettario possibile e
   conveniente con questi costi (servizi cloud e AI in dollari, ~2–5% dei ricavi stimati)?
2. **Fatturazione elettronica:** con Stripe incassiamo da aziende (anche estere UE). Per ogni
   vendita dobbiamo emettere fattura elettronica SDI? Bastano i dati raccolti da Stripe
   (ragione sociale, partita IVA, indirizzo, codice destinatario/PEC) o servono campi nostri al
   checkout? Strumento consigliato collegabile a Stripe (es. Fatture in Cloud, Aruba, altri)?
3. **IVA:** clienti B2B italiani (22%), B2B UE (inversione contabile, verifica VIES) ed
   eventuali extra-UE. Vendiamo crediti prepagati: l'IVA va all'acquisto dei crediti o al loro
   utilizzo? I crediti che scadono non usati come si trattano?
4. **Abbonamenti mensili:** una fattura al mese automatica, anche annullabile in qualsiasi
   momento: va bene?
5. **Costi esteri:** Anthropic, Vercel, n8n, Supabase, Icypeas fatturano dall'estero (USA/UE),
   spesso in dollari: obblighi (integrazione/autofattura, reverse charge, esterometro)?
6. **Rimborsi** tramite Stripe (es. prova di acquisto reale e rimborso in fase di collaudo):
   note di credito necessarie?
7. **Contabilità dei crediti regalati** (piano gratuito da 15 crediti e crediti di beta agli
   invitati): implicazioni?
8. Commissioni Stripe e conversioni valuta: come registrarle?
9. Tempi e costi per essere operativi (apertura, PEC, firma, cassetto fiscale, INPS).

---

### Cosa portare all'incontro
- Questo documento
- Link a /privacy, /termini, /opposizione e /prezzi
- Un esempio di export CSV di lead (dati di prova)
