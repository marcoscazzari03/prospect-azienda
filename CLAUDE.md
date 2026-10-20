# Note per Claude

- Rispondere sempre in italiano.
- Checklist del progetto: `docs/00-checklist.md`. Quando l'utente chiede «riscrivimi la checklist», riscriverla tutta
  in quel formato (sezioni con colore e titolo, ruolo **Tu** / **Io** / **Insieme**, numeri), comprese le cose già
  fatte, barrate con la data. Aggiornare il file a ogni cambiamento.
- **Registro (`docs/13-registro.md`), regola dal 20/10:** ogni modifica (codice, migrazione, workflow n8n, dati) e ogni
  decisione o cosa da ricordare va scritta lì, nello stesso commit: cosa, perché, dove, come tornare indietro, stato
  (in produzione / in attesa di migrazione o pubblicazione). Le decisioni in vigore stanno nella tabella in alto.
  Prima di toccare qualcosa già cambiato in passato, consultare il registro.
- Mai scrivere chiavi o segreti in chat o nel repository (pubblico): le chiavi vanno solo nelle credenziali n8n o
  nelle variabili di Vercel.
- **Squadra di agenti, regola dal 21/10:** la chat principale è il «cervello»: coordina, decide con l'utente e scrive il
  codice. Gli agenti stanno in `.claude/agents/` e si richiamano con lo strumento Agent:
  - per ogni domanda o lavoro, interpellare gli agenti pertinenti (tabella sotto) e riportare all'utente cosa hanno
    trovato e cosa si fa o non si fa, con il motivo;
  - **`code-reviewer` prima di ogni push**, su main e sul branch, per qualsiasi modifica di codice, migrazioni o workflow
    n8n (non serve per commit di soli documenti). Con esito «NON PRONTO» non si pubblica: si corregge e si richiede la
    revisione, oppure si chiede all'utente;
  - gli agenti non si chiamano tra loro, non inviano email, non pubblicano e non toccano la produzione: lo fa la chat
    principale, con l'OK dell'utente dove serve;
  - un agente creato in questa sessione si carica solo da quella successiva: nel frattempo si usa un agente generico
    che legge il suo file in `.claude/agents/`.

  | Quando | Agenti |
  |---|---|
  | Prima di ogni push con codice, SQL o n8n | code-reviewer |
  | Modifica di API, SQL, crediti, pagamenti | code-reviewer, qa-tester |
  | Modifica del motore o nuovo segnale | code-reviewer, qa-tester, data-quality |
  | Homepage, wizard, pagine | ui-ux-designer, qa-tester, sales-copywriter |
  | Listino, inviti, testi commerciali | sales-copywriter, business-analyst |
  | Resoconto giornaliero e numeri della beta | business-analyst |

  Agenti esistenti: `code-reviewer`, `qa-tester`, `data-quality`, `sales-copywriter`, `ui-ux-designer` (21/10). Da creare
  (punto 53): `business-analyst`. Finché un agente non esiste, il suo lavoro lo fa la chat principale.

@AGENTS.md
