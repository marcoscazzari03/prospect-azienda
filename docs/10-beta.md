# 10. Beta con le agenzie (piano del 19/10)

## Come funziona

- **Chi:** agenzie web piccole (2–15 persone), in due ondate:
  1. 3 agenzie del Sud e dell'Emilia-Romagna invitate il 19/10 (Gopher, Mutart, Studio360), più **una decina** invitate
     dal 20/10 nelle stesse regioni (decisione del 20/10: con 3 agenzie il campione era troppo piccolo e una risposta è
     difficile da ottenere);
  2. dopo il 30/10 3–5 agenzie del Nord (popolamento OSM dal Nord dal 20/10). Prima rilanciare
     `supabase/queries/opportunita_per_regione.sql` e invitare solo dove il servizio dell'agenzia ha almeno
     40–50 aziende pronte nella sua regione.
- **Accesso:** registrazione normale su leads.weborastudio.it (15 crediti di benvenuto). Dall'admin (Clienti →
  scheda): +150 crediti beta (circa 75 aziende con opportunità) e piano Growth (niente tetto di 10 aziende per
  ricerca, nessun pagamento). Nessuna funzione nuova da sviluppare.
- **Durata:** 4 settimane.
- **Cosa chiediamo:** almeno 3 ricerche vere sul loro servizio e nella loro zona; contattare le aziende e segnare
  l'esito nell'app (stato del contatto, note); segnalare i lead sbagliati dall'app; due chiamate da 20 minuti
  (seconda e quarta settimana).
- **Cosa offriamo:** crediti gratuiti per tutta la beta; prezzo bloccato più basso al passaggio a pagamento
  (−30% per 12 mesi, deciso il 19/10); voce sulle prossime funzioni.
- **Cosa misuriamo:** tasso di risposta per servizio e per tipo di contatto (email o modulo); segnali che
  funzionano (per tarare il punteggio); la domanda chiave: «senza il nome del referente, lo pagheresti?»;
  lato nostro costi della ricerca AI, errori, segnalazioni (admin: Ricerche, Costi, Segnalazioni; resoconto
  giornaliero).
- **Dopo:** con partita IVA, Stripe live e parere legale, offerta del piano a pagamento con lo sconto promesso.

## Come decidiamo il 30/10 (fissato il 20/10, in percentuale dal 20/10 sera)

Pagina **Admin → Beta**: per ogni agenzia ricerche, lead, export, righe esportate, contattati, risposte
(stati «ha risposto», «appuntamento», «cliente» impostati sui lead) e lead segnalati.

Conta solo chi usa davvero il servizio (almeno una ricerca): con meno di **3 agenzie attive** i dati non bastano e
la decisione si rimanda. Via libera alla seconda ondata (Nord) se:
- **almeno metà delle agenzie attive esporta** lead, e comunque almeno 2 (l'export è il segnale d'intenzione più forte);
- almeno **1 agenzia ha una risposta** da un'azienda contattata (dall'app, o chiesta a voce dopo una settimana);
- i lead segnalati restano **sotto il 10%**.

Decisione spostata dal 28 al **30/10** per dare almeno una settimana d'uso alle agenzie invitate dal 20/10.

Se nessuna esporta, il problema non è il referente: il lead non è abbastanza pronto. Nella beta ogni lead con segnale ha
anche lo **«Spunto per il primo messaggio»** (frase scritta dalla prova, da adattare): chiedere alle agenzie se lo usano.

## Come troviamo le agenzie

**Criteri per la seconda tornata di inviti (20/10):** agenzie web o di comunicazione con 2–15 persone, sito proprio
curato e un servizio chiaro tra rifacimento siti, WordPress/manutenzione, siti per hotel o sicurezza del sito; sede al
Sud o in Emilia-Romagna (dove il database ha già aziende pronte); un'email o un modulo di contatto con un nome a cui
scrivere. Mescolare le dimensioni (freelance strutturati, studi da 3–5 persone, agenzie da 10–15). Evitare le grandi
agenzie e chi fa solo social, branding o stampa (non vendono siti).

**Invio (deciso dall'utente il 20/10 sera):** invio largo, circa **50 agenzie** nei prossimi giorni, anche più agenzie
nella stessa città. Accorgimenti: un'email per destinatario (mai in copia), da leads@ e non da Resend (che serve alle email
dell'app), 10–15 al giorno, prima riga personalizzata, testo semplice senza tracciamento, una riga per non ricevere altre
email. Ci si aspetta un 5–10% di risposte. Se le adesioni superano la decina, dare meno crediti beta ai successivi
(es. 50 invece di 150) per non esaurire le aziende pronte nelle stesse zone. Il rischio art. 130 resta quello già
annotato (parere del legale, punto 12).

1. Con Webora Leads stesso: ricerca in target («Agenzia di pubblicità», «Grafica e design», «Informatica e
   software») nella regione giusta, o opportunità «Marketing digitale» / «Grafica e comunicazione» (agenzie che
   assumono). Nell'invito: «vi ho trovati con lo strumento che vi propongo».
2. Rete personale: colleghi, fornitori, freelance.
3. LinkedIn: titolari di piccole agenzie nelle regioni coperte, messaggio personale.
4. Directory (Sortlist, Clutch, DesignRush, Google Maps «agenzia web + città») per la lista; contatto a mano.
5. Community: gruppi WordPress Italia, web designer e freelance, meetup locali.

Riservatezza: Webora Leads è «un servizio di Webora Studio». Nei termini (19/10, «Riservatezza delle ricerche»):
criteri, aziende ricevute, note e liste del cliente sono riservati e Webora Studio non li usa per la propria attività
commerciale; i dati pubblici delle aziende trovate entrano invece nel database comune e possono andare anche ad
altri clienti. Non promettere nell'invito più di così (es. «esclusiva» sulle aziende).

## Prima di inviare (bloccanti)

- [x] 2FA su Supabase, Vercel, GitHub, Stripe, n8n e chiave Anthropic dedicata con limite (19/10). Niente 2FA su Anthropic, Resend, Hostinger, Cloudflare, Icypeas (scelta dell'utente).
- [x] Workflow «Aziende | Popolamento OSM» pubblicato (Nord prima, dal 20/10).
- [x] Termini: clausola «Riservatezza delle ricerche» (19/10).
- [x] Sconto per i beta tester: −30% per 12 mesi (19/10).
- [ ] Logo accanto al mittente e firma con il logo per leads@ (facoltativi ma utili).

## Testi dell'invito

Da personalizzare: [Nome], [Agenzia], [città/regione], [servizio] e la riga su come li abbiamo trovati.

### Email (primo contatto) — riscritta il 21/10 dall'agente Sales & Copy

Al «voi» (molte agenzie hanno solo info@). [PRIMA_RIGA] è la riga personalizzata del file delle agenzie. Un'email per
agenzia, da leads@, senza link tracciati né allegati.

**Oggetto:** Aziende con il sito da aggiornare, per [AGENZIA]
(alternativa: «[AGENZIA], vi propongo 4 settimane di prova gratuita»; la prima suona meno promozionale)

**Variante breve (consigliata per l'invio largo)**

Buongiorno,

[PRIMA_RIGA], per questo scrivo a [AGENZIA].

Sono [Tuo nome] di Webora Studio. Webora Leads vi trova aziende della vostra zona con un motivo documentato per rifare o
mettere in sicurezza il sito: per esempio un WordPress fermo a una versione del 2019 o un certificato HTTPS scaduto. Per
ogni azienda: la prova con il link e la data del controllo, il sito e il contatto aziendale (info@ o modulo del sito).

Cerco alcune agenzie per una prova di 4 settimane. Durante la prova non costa niente e non serve la carta; se poi
continuate, avete il 30% di sconto per 12 mesi.
In cambio vi chiedo di contattare qualche azienda e raccontarmi com'è andata in due chiamate da 20 minuti.

Vi interessa? Rispondete «sì» e vi mando l'accesso.

[Tuo nome]
Webora Leads, un servizio di Webora Studio · leads.weborastudio.it

Se non vi interessa, rispondete «no» e non vi scriverò più.

**Variante lunga (per chi vuole i dettagli)**

Buongiorno,

[PRIMA_RIGA], per questo scrivo a [AGENZIA].

Sono [Tuo nome] di Webora Studio. Ho costruito Webora Leads: trova aziende della vostra zona con un motivo documentato per
aver bisogno di un'agenzia web.

Cosa ricevete, per ogni azienda:
- il motivo, con la prova: il link e la data del controllo. Per esempio «WordPress 5.3, versione del 2019» oppure
  «certificato HTTPS scaduto»;
- il sito e il contatto aziendale: info@, commerciale@ o il modulo di contatto del sito;
- una frase già pronta per il primo messaggio, scritta a partire dalla prova.

Cosa costa: niente per 4 settimane, senza carta. Se poi continuate, il 30% di sconto per 12 mesi, riservato a chi
partecipa alla prova.

Cosa vi chiedo:
- fare almeno 3 ricerche sul vostro servizio e nella vostra zona;
- segnare nell'app quali aziende avete contattato e chi ha risposto;
- due chiamate da 20 minuti, alla seconda e alla quarta settimana.

Due cose da sapere subito:
- non vi diamo nomi di persone, solo i canali dell'azienda. È una scelta: lavoriamo solo con dati d'azienda;
- le vostre ricerche, le vostre note e le vostre liste restano riservate: Webora Studio non le usa per la sua attività
  commerciale.

Se vi interessa, rispondete «sì» e vi mando l'accesso. Se preferite, ci sentiamo 10 minuti e ve lo mostro.

Grazie,
[Tuo nome]
Webora Leads, un servizio di Webora Studio · leads.weborastudio.it

Se non vi interessa, rispondete «no» e non vi scriverò più.

**Follow-up per l'invio largo (uno solo, dopo 5–6 giorni, nella stessa conversazione; mai a chi ha risposto «no»)**

Oggetto: Re: [oggetto originale]

Buongiorno,

vi riscrivo una sola volta per la prova gratuita di Webora Leads: aziende della vostra zona con un motivo documentato per
rifare o mettere in sicurezza il sito, con la prova e il contatto aziendale.

Se vi è utile, rispondete «sì» e vi mando l'accesso. Se non è il momento, non serve rispondere: non vi scriverò più.

[Tuo nome]
Webora Leads, un servizio di Webora Studio · leads.weborastudio.it

**Promemoria per le agenzie del 19/10 (Gopher, Mutart, Studio360), il 24–25/10** — scritto il 21/10 dall'agente Sales & Copy.
Avevano ricevuto un'email personalizzata con il PDF di esempi: il promemoria parte da lì. Uno solo; poi non si ricontattano.

Oggetto: Re: [oggetto originale]

Buongiorno,

vi riscrivo una sola volta per la prova di Webora Leads che vi ho proposto il 19/10, con il PDF di esempi.

Gli esempi del PDF sono aziende vere. Nella prova ne cercate altre come quelle, sul vostro servizio e nella vostra zona: per
ognuna avete il motivo, con il link e la data del controllo, e il contatto aziendale.

La prova dura 4 settimane ed è gratuita, senza carta. Se poi continuate, avete il 30% di sconto per 12 mesi.

Se vi interessa, rispondete «sì» e vi mando l'accesso. Se non è il momento, non serve rispondere: non vi scriverò più.

Marco Scazzari · Webora Leads · leads.weborastudio.it

Variante corta (per chi ha letto l'invito e se n'è solo dimenticato): «vi avevo scritto il 19/10 con alcuni esempi di aziende
con il sito da aggiornare. La proposta resta valida: 4 settimane di prova gratuita, senza carta, e il 30% di sconto per 12
mesi se continuate. Vi interessa? Basta un «sì». Altrimenti non serve rispondere: è l'ultima email che vi mando.»

**Correzioni rispetto al testo del 19/10:** tolto «non li vede nessun altro cliente» (non è vero: i dati pubblici delle
aziende consegnate entrano nel database comune e possono andare ad altri clienti, come dicono i termini); «sito senza HTTPS»
diventa «certificato HTTPS scaduto» (il controllo conta scaduto, autofirmato o di un altro sito); tolto «circa 75 aziende»
(i crediti beta possono scendere se le adesioni sono tante). Da far rileggere al legale: firma con i dati completi di Webora
Studio e riga «rispondete no».

### Messaggio LinkedIn (breve)

Ciao [Nome], ho costruito Webora Leads: trova aziende con un segnale concreto per un'agenzia come [Agenzia]
(sito vecchio, certificato HTTPS scaduto, non adatto ai cellulari), con la prova e il contatto aziendale. Cerco qualche agenzia
per una beta gratuita di 4 settimane in [regione]: crediti gratuiti in cambio di un parere sincero. Ti interessa?
Ti mando i dettagli.

### Riga facoltativa se li abbiamo trovati con Webora Leads

P.S. Vi ho trovati proprio con Webora Leads: cercando agenzie [della vostra zona / che stanno assumendo].

### Dopo il sì (email di benvenuto) — aggiornata il 21/10 dall'agente Sales & Copy

**Oggetto:** Re: [oggetto originale] (meglio nella stessa conversazione); altrimenti «Il vostro accesso a Webora Leads».

Buongiorno [Nome],

grazie! Ecco come partire:

1. Registratevi qui, con l'email a cui vi ho scritto: https://leads.weborastudio.it/registrati?beta=1. Appena vedo
   l'iscrizione vi aggiungo i crediti della prova. Durante la prova non c'è nulla da pagare e non serve la carta.
2. Cliccate «Trova aziende con opportunità» e scegliete il vostro servizio e la zona. La zona potete scriverla come vi
   viene, per esempio «Modena e Reggio Emilia» o «Napoli e provincia».
3. Sulle aziende che contattate segnate lo stato (contattata, ha risposto, appuntamento). È il dato che mi serve di più.
4. Se un lead è sbagliato (email che rimbalza, fuori zona, motivo non corretto), usate «Segnala» nella scheda del lead:
   se la segnalazione è confermata, i crediti vi tornano.

Tra due settimane vi scrivo per fissare la prima chiamata, 20 minuti. Per qualsiasi cosa rispondete a questa email.

Marco Scazzari · Webora Leads · leads.weborastudio.it

Scelte: link con `?beta=1` (pagina di registrazione della beta); nessun numero di aziende promesso; nessun tempo promesso
per i crediti (li aggiunge l'utente a mano); «voi» come negli inviti, «tu» se ha risposto una persona per nome. Dopo l'invio:
Admin → Clienti → scheda: +150 crediti beta e piano Growth.
