# 10. Beta con le agenzie (piano del 19/10)

## Come funziona

- **Chi:** agenzie web piccole (2–15 persone), in due ondate:
  1. 3 agenzie del Sud e dell'Emilia-Romagna invitate il 19/10 (Gopher, Mutart, Studio360), più **una decina** invitate
     dal 21/10 nelle stesse regioni (decisione del 21/10: con 3 agenzie il campione era troppo piccolo e una risposta è
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

## Come decidiamo il 30/10 (fissato il 20/10, in percentuale dal 21/10)

Pagina **Admin → Beta**: per ogni agenzia ricerche, lead, export, righe esportate, contattati, risposte
(stati «ha risposto», «appuntamento», «cliente» impostati sui lead) e lead segnalati.

Conta solo chi usa davvero il servizio (almeno una ricerca): con meno di **3 agenzie attive** i dati non bastano e
la decisione si rimanda. Via libera alla seconda ondata (Nord) se:
- **almeno metà delle agenzie attive esporta** lead, e comunque almeno 2 (l'export è il segnale d'intenzione più forte);
- almeno **1 agenzia ha una risposta** da un'azienda contattata (dall'app, o chiesta a voce dopo una settimana);
- i lead segnalati restano **sotto il 10%**.

Decisione spostata dal 28 al **30/10** per dare almeno una settimana d'uso alle agenzie invitate il 21/10.

Se nessuna esporta, il problema non è il referente: il lead non è abbastanza pronto. Nella beta ogni lead con segnale ha
anche lo **«Spunto per il primo messaggio»** (frase scritta dalla prova, da adattare): chiedere alle agenzie se lo usano.

## Come troviamo le agenzie

**Criteri per la seconda tornata di inviti (21/10):** agenzie web o di comunicazione con 2–15 persone, sito proprio
curato e un servizio chiaro tra rifacimento siti, WordPress/manutenzione, siti per hotel o sicurezza del sito; sede al
Sud o in Emilia-Romagna (dove il database ha già aziende pronte); un'email o un modulo di contatto con un nome a cui
scrivere. Mescolare le dimensioni (freelance strutturati, studi da 3–5 persone, agenzie da 10–15). Evitare le grandi
agenzie e chi fa solo social o pubblicità. Un'agenzia per città dove possibile, per non metterle in concorrenza sulle
stesse aziende.

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

### Email (primo contatto)

**Oggetto:** [Nome], cerco qualche agenzia per provare uno strumento per trovare clienti

Ciao [Nome],

sono [Tuo nome] di Webora Studio. Ho costruito **Webora Leads**, uno strumento che trova aziende con un motivo
concreto per aver bisogno di un'agenzia come [Agenzia]: per esempio un sito con WordPress fermo al 2017, un sito
senza HTTPS o non adatto ai cellulari. Per ogni azienda ti dà il segnale con il link alla prova e la data del
controllo, il sito e il contatto aziendale (email o modulo di contatto del sito).

Ho visto che lavorate su [servizio] in [città/regione], e il database ha già un buon numero di aziende in
quella zona: per questo ti scrivo.

Cerco un piccolo gruppo di agenzie per una **beta gratuita di 4 settimane**:
- crediti gratuiti per circa 75 aziende con opportunità, più quelli di benvenuto;
- in cambio: almeno 3 ricerche vere, contattare le aziende che ti interessano e dirmi com'è andata
  (due chiamate da 20 minuti);
- a beta finita, se vorrai continuare, il 30% di sconto per 12 mesi, riservato ai beta tester.

Due cose da sapere subito:
- non ti diamo i nomi dei referenti, solo canali aziendali (info@, commerciale@, modulo di contatto): è una
  scelta, per lavorare solo con dati d'azienda;
- le tue ricerche e i lead che ricevi restano riservati: non li vede nessun altro cliente e Webora Studio
  non li usa per la sua attività commerciale (è scritto nei termini di servizio).

Se ti interessa, rispondimi qui e ti mando l'accesso. Se preferisci, ci sentiamo 10 minuti e te lo mostro.

Grazie,
[Tuo nome]
Webora Leads – leads.weborastudio.it

### Messaggio LinkedIn (breve)

Ciao [Nome], ho costruito Webora Leads: trova aziende con un segnale concreto per un'agenzia come [Agenzia]
(sito vecchio, senza HTTPS, non adatto ai cellulari), con la prova e il contatto aziendale. Cerco qualche agenzia
per una beta gratuita di 4 settimane in [regione]: crediti gratuiti in cambio di un parere sincero. Ti interessa?
Ti mando i dettagli.

### Riga facoltativa se li abbiamo trovati con Webora Leads

P.S. Vi ho trovati proprio con Webora Leads: cercando agenzie [della vostra zona / che stanno assumendo].

### Dopo il sì (email di benvenuto)

Ciao [Nome], grazie! Ecco come partire:
1. registrati su https://leads.weborastudio.it/registrati con questa email: ti aggiungo i crediti della beta
   appena vedo l'iscrizione;
2. «Nuova ricerca» → «Trova aziende con opportunità» → scegli il tuo servizio e la tua zona: il contatore ti dice
   quante aziende sono già pronte;
3. sui lead che contatti segna lo stato (contattata, ha risposto, appuntamento): è il dato che mi serve di più;
4. se un lead è sbagliato (email che rimbalza, fuori zona, segnale non corretto) segnalalo dall'app: i crediti
   tornano.

Ti scrivo tra due settimane per la prima chiamata. Per qualsiasi cosa: leads@weborastudio.it.
