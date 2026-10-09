# 1. Analisi del workflow "Prospect Avvocati | Search"

File: [`n8n/legacy/prospect-avvocati-search.json`](../n8n/legacy/prospect-avvocati-search.json)
(versione pubblicata con ID credenziali, ID del Google Sheet e istanza n8n rimossi).

## Come funziona oggi

53 nodi, eseguito da uno **Schedule Trigger** alle 06:00 e alle 18:00, con Google Sheets
come database. In sintesi:

| Fase | Nodi principali | Cosa fa |
|---|---|---|
| 1. Archivio e temi | Read Prospect / Scartati / Temi / Esclusioni, *Prepara archivio*, *Genera 5 Lotti* | Legge lo storico per la deduplica e sceglie 5 "temi" (paese + nicchia) a rotazione, bilanciando i paesi |
| 2. Ricerca AI | *Ricerca prospect AI* (agent) + OpenAI con web search, *Normalizza output AI* | 5 ricerche web, 25 candidati ciascuna; recupero dei candidati anche da JSON malformato |
| 3. Deduplica | *Aggiungi da riprovare*, *Deduplica e prepara righe*, *Controllo grandi aziende* | Persona, persona+studio e dominio già visti; esclusione dei grandi studi; scarto di siti non ufficiali e candidati senza fonte |
| 4. Email dal sito | HTTP Homepage / Pagina 2 / Pagina 3 + 3 nodi *Estrai email* | Scarica fino a 3 pagine (homepage, contatti, note legali) ed estrae le email (mailto, Cloudflare, offuscamenti) con un punteggio |
| 5. RocketReach | *Applica tetto*, Lookup, Wait, Status check (x2), *Normalizza RocketReach* | Solo per chi non ha email dal sito; tetto di 60 lookup per esecuzione; solo email `professional` + `smtp_valid = valid` |
| 6. Salvataggio | Append Prospect / Mailup / Scartati / Log, Update Temi | Salva i risultati, gli scarti con motivo, le statistiche di esecuzione |

## Cosa è riutilizzabile così com'è (ed è stato riutilizzato)

Il valore vero del workflow è nelle regole di qualità, che sono buone e mature:

- **Estrazione email** (`Estrai email *`): decodifica Cloudflare `data-cfemail`, entità HTML,
  `[at]`/`(dot)`, `mailto:` come segnale di affidabilità, scarto di `noreply`, segnaposto
  (`nome.cognome@`), domini di piattaforme (wix, sentry...), riconoscimento del familiare con
  lo stesso cognome. → portata nel nuovo motore, generalizzata.
- **Scoperta delle pagine** (contatti → note legali/impressum → team), con percorsi ipotetici
  per lingua sui siti in JavaScript. → riutilizzata.
- **Regola "sito ufficiale obbligatorio"** e lista dei domini non ufficiali (social, directory).
  → riutilizzata ed estesa (registri imprese, marketplace, blog).
- **Chiave azienda = dominio** (con gestione di `sites.google.com`/`linktr.ee`). → riutilizzata.
- **Recupero dell'output AI malformato** (lotti che falliscono senza perdere gli altri). → riutilizzato.
- **RocketReach solo se serve, con tetto e solo email SMTP valid**. → riutilizzato, ma il tetto
  ora lo decide il backend in base al budget del piano.
- **Statistiche per esecuzione** (candidati AI, scarti per motivo, lookup). → diventano il campo
  `stats`/`usage` del callback e alimentano i costi nel pannello admin.

## Cosa va cambiato per una piattaforma SaaS

| Limite attuale | Perché è un problema in un SaaS | Soluzione nel nuovo motore |
|---|---|---|
| Schedule Trigger | Le ricerche partono quando paga un cliente, non a orario | **Webhook autenticato** chiamato dal backend, risposta immediata (asincrono) |
| Prompt cablato su "avvocati penalisti", liste di parole giuridiche | Deve funzionare per qualsiasi settore | Prompt costruito dai filtri del cliente; **pianificatore AI** che divide la ricerca in lotti non sovrapposti nella lingua locale |
| Google Sheets come database | Niente isolamento tra clienti, niente transazioni, limiti di quota | Il motore è **stateless**: riceve le esclusioni dal backend e restituisce i risultati via callback; i dati vivono in Postgres |
| Deduplica globale ("già nel foglio") | In un SaaS conta "già venduto **a questo cliente**" | Il backend invia `exclusions` (domini/persone già consegnati al cliente) e ripete la deduplica prima di addebitare |
| `Email probabile/i` generate dal nome | Rischio di vendere email ipotizzate come vere | Le ipotesi vanno in `email_patterns` con stato **`guessed`**, mai nel campo email del lead |
| Una sola modalità (email qualsiasi) | Il cliente sceglie generiche / nominative / mista, a prezzi diversi | `email_mode` guida dove fermarsi nella ricerca, chi passa da RocketReach e cosa viene accettato |
| Un solo contatto "titolare" fisso | I ruoli li sceglie il cliente | Ruoli dal payload, controllo di coerenza del ruolo (`exact`/`plausible`/scartato) |
| Riprova "Da riprovare" tramite foglio Scartati | Stato distribuito difficile da gestire | Il motore restituisce `rejected` con motivo (`arricchimento_da_riprovare`); è il backend a decidere un nuovo giro (top-up) |
| Nessun avanzamento visibile | Il cliente vuole vedere lo stato | Eventi `progress` al backend (pianificazione → verifica → risultati) |
| Webhook/API key nel workflow | — | Credenziali solo in n8n; callback solo verso il dominio della piattaforma (anti-SSRF) |

## Il nuovo workflow

Creato su n8n come **"Lead Engine | Search (v1)"** (inattivo, 35 nodi, 5 gruppi):
sorgenti dei Code node in [`n8n/engine/nodes/`](../n8n/engine/nodes), test in
[`n8n/engine/test/run.mjs`](../n8n/engine/test/run.mjs), generatore SDK in
[`n8n/engine/build.py`](../n8n/engine/build.py), contratto API in
[`03-contratto-motore.md`](03-contratto-motore.md).

Il workflow originale **resta com'è**: continua a servire il caso "Le Fonti Awards" e non
viene toccato.

### Miglioramenti consigliati per la v2 del motore

1. **Verifica SMTP delle email trovate sul sito** (ZeroBounce, MillionVerifier, Bouncer...;
   circa 0,1-0,4 cent per email): trasforma `found_public` in `found_public + validated`,
   riduce i bounce e permette una garanzia più forte a costo quasi nullo.
2. **Cache dei siti** (stesso dominio in ricerche di clienti diversi = una sola visita).
3. **Fonti alternative a RocketReach** con fallback (es. Hunter, Prospeo, Dropcontact) per
   abbassare il costo per email nominativa e ridurre la dipendenza da un fornitore.
4. **Sub-workflow** per l'estrazione email (oggi lo stesso codice è in 3 nodi per vincolo di
   n8n; il generatore lo tiene comunque in un unico file sorgente).
