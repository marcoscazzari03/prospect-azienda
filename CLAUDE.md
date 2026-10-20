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

@AGENTS.md
