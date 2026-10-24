# Note per Claude

- Rispondere sempre in italiano.
- Checklist del progetto: `docs/00-checklist.md`. Quando l'utente chiede «riscrivimi la checklist», riscriverla tutta
  in quel formato (sezioni con colore e titolo, ruolo **Tu** / **Io** / **Insieme**, numeri), comprese le cose già
  fatte, barrate con la data. Aggiornare il file a ogni cambiamento.
- **Checklist per date, regola dal 24/10:** `docs/00b-checklist-calendario.md` ha le stesse voci ordinate per quando vanno
  fatte (oggi, domani, giorni, 30/10, prima del lancio, dopo la beta, scadenze). Si aggiorna insieme a `00-checklist.md`,
  nello stesso commit; se l'utente chiede «riscrivimi la checklist» si riscrivono tutte e due.
- **Registro (`docs/13-registro.md`), regola dal 20/10:** ogni modifica (codice, migrazione, workflow n8n, dati) e ogni
  decisione o cosa da ricordare va scritta lì, nello stesso commit: cosa, perché, dove, come tornare indietro, stato
  (in produzione / in attesa di migrazione o pubblicazione). Le decisioni in vigore stanno nella tabella in alto.
  Prima di toccare qualcosa già cambiato in passato, consultare il registro.
- **Documenti, regola dal 21/10:** indice in `docs/README.md`. A ogni modifica si aggiorna anche il documento vivo che la
  descrive (panoramica, contratto del motore, segnali, beta, pubblicazione), nello stesso commit. I documenti in
  `docs/archivio/` sono storici e non si aggiornano.
- Mai scrivere chiavi o segreti in chat o nel repository (pubblico): le chiavi vanno solo nelle credenziali n8n o
  nelle variabili di Vercel.
- **Squadra di agenti, regola dal 21/10, rivista il 22/10 (meno chiamate, stessa sicurezza):** la chat principale è il
  «cervello»: coordina, decide con l'utente e scrive il codice. Gli agenti stanno in `.claude/agents/` e si richiamano
  con lo strumento Agent. Gli agenti non si chiamano tra loro, non inviano email, non pubblicano e non toccano la
  produzione: lo fa la chat principale, con l'OK dell'utente dove serve.
  - **Il controllo va prima della produzione, non prima di ogni push.** Il branch `claude/*` non va online (Vercel lo
    ignora): si pubblica sul branch dopo test, lint e typecheck. La revisione serve prima di: push su main, link di una
    migrazione all'utente, caricamento di nodi n8n. Più commit dello stesso lavoro si rivedono insieme, una volta sola.
  - **Livello della modifica** (decide la chat principale, nel dubbio il livello più alto):

    | Livello | Esempi | Agenti prima della produzione |
    |---|---|---|
    | 0 | documenti, query di sola lettura in `supabase/queries`, commenti, solo test | nessuno |
    | 1 | testi, stile, piccole correzioni locali senza logica nuova (fino a circa 30 righe), niente SQL | nessuno; il code-reviewer li vede insieme al primo lavoro di livello 2–3 o, al più tardi, prima del push su main |
    | 2 | logica dell'app, nodi del motore o dei workflow, SQL che non tocca soldi né permessi | code-reviewer (solo sul diff) |
    | 3 | crediti, pagamenti, consegne, rimborsi, autenticazione, RLS, permessi, `security definer`, callback, segreti, migrazioni che cambiano dati | code-reviewer + qa-tester |

  - **Agenti di dominio, solo quando servono davvero:** ui-ux-designer per pagine nuove o cambi di struttura e di flusso
    (non per testi, colori o spaziature); sales-copywriter quando cambiano testi rivolti al cliente; data-quality per un
    segnale nuovo o regole del motore che cambiano cosa si consegna; business-analyst per resoconto e numeri.
  - **«NON PRONTO» blocca la pubblicazione.** Con «pronto con riserve» la chat principale applica le correzioni proposte e
    le verifica con i test; una seconda revisione serve solo se la correzione cambia logica oltre quanto proposto o tocca
    il livello 3.
  - **Brief corti, risposte corte:** al massimo un brief per agente, con il diff da guardare (`git show <commit>`), i
    controlli già fatti (da non ripetere salvo dubbi) e un limite alla risposta (circa 300–400 parole, problemi in ordine
    di gravità). Agenti indipendenti in parallelo, in background.
  - Un agente creato in questa sessione si carica solo da quella successiva: nel frattempo si usa un agente generico
    che legge il suo file in `.claude/agents/`.

  Agenti esistenti (21/10): `code-reviewer`, `qa-tester`, `data-quality`, `sales-copywriter`, `ui-ux-designer`,
  `business-analyst`. Il resoconto giornaliero programmato (7:52) lo prepara il `business-analyst`.

@AGENTS.md
