# Documenti di Webora Leads

Indice dei documenti, con lo stato di ognuno. Regola (dal 21/10): a ogni modifica si aggiornano il registro, la checklist e il
documento vivo che la descrive, nello stesso commit.

## Vivi (aggiornati)

| Documento | A cosa serve |
|---|---|
| [00-checklist.md](00-checklist.md) | Cosa c'è da fare e chi lo fa (**Tu** / **Io** / **Insieme**), con le cose fatte barrate e datate |
| [13-registro.md](13-registro.md) | Storia di ogni modifica e decisione (cosa, perché, dove, come tornare indietro); in alto le decisioni in vigore |
| [12-panoramica-sistema.md](12-panoramica-sistema.md) | Come funziona il sistema oggi: app, database, motore, workflow, segnali, crediti |
| [03-contratto-motore.md](03-contratto-motore.md) | Contratto tra l'app e il motore n8n (chiamate, callback, workflow degli annunci e delle aziende) |
| [07-segnali.md](07-segnali.md) | Regole di ogni segnale (cosa dice, come si dimostra, quando non è determinabile) |
| [10-beta.md](10-beta.md) | Piano della beta, criteri della decisione del 30/10, testi degli inviti, promemoria e benvenuto |
| [04-pubblicazione.md](04-pubblicazione.md) | Guida per rimettere in piedi tutto da zero: Supabase, Vercel, n8n, Stripe, dominio |
| [09-domande-consulenti.md](09-domande-consulenti.md) | Domande aperte per il legale e il commercialista |
| [16-common-crawl.md](16-common-crawl.md) | Aziende dai domini .it di Common Crawl (punto 92): come funziona, misure del campione, ritmo, cosa manca |
| [15-ricerche-consigliate.md](15-ricerche-consigliate.md) | «Di cosa si occupa la tua attività?» e ricerche consigliate: decisioni, progetto del designer, cosa manca |

Fuori dal repository (pubblico): `06-audit-sicurezza.md`, con il dettaglio delle vulnerabilità.

## Storici (non aggiornati) — [archivio/](archivio/)

| Documento | Cos'era |
|---|---|
| [archivio/01-analisi-workflow.md](archivio/01-analisi-workflow.md) | Analisi del workflow n8n di partenza (9/10) |
| [archivio/02-proposta.md](archivio/02-proposta.md) | Proposta iniziale del prodotto (9/10) |
| [archivio/05-da-fare.md](archivio/05-da-fare.md) | Cose da fare e storia fino al 19/10 (poi checklist e registro) |
| [archivio/08-messa-in-produzione.md](archivio/08-messa-in-produzione.md) | Checklist di messa in produzione del 19/10 (le voci aperte sono nella checklist) |
| [archivio/11-analisi-motore.md](archivio/11-analisi-motore.md) | Analisi delle ricerche reali e dei costi del motore (20/10) |

Altri file utili: `supabase/queries/` (query da lanciare a mano: popolamento, beta, verifiche), `.claude/agents/` (la squadra
di agenti, regola in `CLAUDE.md`).
