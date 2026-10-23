# Aziende da Common Crawl (punto 92)

Documento vivo. Stato: **codice pronto il 23/10, corretto dopo la prima revisione (regex lente, tempi del giro, tetto di
spesa), migrazione 069 per la partita IVA da eseguire; non installato sul VPS.** Si accende quando il controllo siti
ha smaltito l'arretrato (circa 55.850 aziende in attesa al 23/10).

## Perché
OpenStreetMap e gli annunci coprono bene turismo, ristorazione e negozi, poco manifattura, uffici e studi professionali.
Molte aziende hanno un sito ma non sono in nessun elenco aperto. Common Crawl, un archivio pubblico e gratuito del web,
pubblica ogni trimestre il **grafo dei domini** che ha visitato: da lì si prende l'elenco dei domini .it e si apre la
homepage di ognuno. Niente Google Maps, PagineGialle o Registro Imprese: solo i siti delle aziende, come per gli altri
controlli.

## Come funziona (`worker/cc.mjs`)
1. **Elenco** (una volta per trimestre): file `…-domain-vertices.txt.gz` del grafo `cc-main-2026-aug-sep-oct` (circa 1 GB,
   letto in streaming fino alla fine dei .it). Solo i domini di secondo livello (`rossi.it`, non `comune.modena.mo.it` né
   `regione.abruzzo.it`), niente IDN. Ordine mescolato sempre uguale (hash del dominio): ogni lotto è un campione di tutta
   l'Italia. File `/var/lib/webora-cc/domini-it.txt`; il grafo nuovo si sceglie con `CC_RELEASE`.
2. **Homepage**: `https://dominio`, poi `https://www.dominio`, poi `http://dominio`; vale solo se la pagina finale resta sullo
   stesso dominio (un rimando a un portale non è il sito dell'azienda). Stesso modulo di rete degli altri worker (niente
   indirizzi interni, al massimo 1,5 MB).
3. **Partita IVA valida** (cifra di controllo e ufficio provinciale) vicino a un'etichetta («P.IVA», «Partita IVA», «VAT»,
   «C.F.»): per legge le attività la mostrano sul sito, quindi è la prova che c'è un'impresa o un professionista. Escluse:
   le partite IVA nei crediti («Realizzato da…», «Powered by…»: sono della web agency), i codici fiscali che iniziano per 8 o
   9 (associazioni ed enti senza partita IVA), i domini in vendita o in costruzione. Le regole su enti, portali e pagine
   ospitate restano quelle di `store_imported_companies`.
4. **Nome**: `og:site_name`, poi il pezzo del titolo che somiglia al dominio, poi la ragione sociale vicino alla partita IVA,
   infine il dominio.
5. **Luogo**: l'indirizzo più vicino alla partita IVA («41121 Modena (MO)», «20121 MILANO MI», «Ischia (Na)», «Acireale 95024
   (CT)», «00187 Roma» se è un capoluogo); la sigla dà provincia e regione.
6. **Partita IVA e doppioni** (migrazione 069, decisione dell'utente del 23/10): la partita IVA si salva in
   `companies.vat_number` (ricontrollata dal database con `vat_valid`). La stessa partita IVA su più domini (stessa azienda
   con più siti) vale una volta sola. Lo decide solo il database (il worker gli manda tutte le aziende trovate), che tiene ogni
   coppia partita IVA–dominio vista (`vat_sightings`): su un dominio solo la partita IVA è dell'azienda; su due è
   probabilmente la stessa azienda con due siti (la seconda, se nuova, non si importa); su tre o più è di un fornitore
   (web agency o hosting nel piè di pagina): si toglie da tutte e non blocca più nessuna. Anche il controllo siti legge la
   partita IVA dalla homepage di tutte le aziende, con la stessa regola: così i doppioni si vedono anche con OSM e annunci.
7. **Settore**: l'app chiede a Claude Haiku settore e parole chiave (`/api/engine/companies-classify`, lotti di 20) con lo
   stesso testo del workflow «Aziende | Settore» (titolo, descrizione, intestazioni e inizio della homepage). La chiave di
   Anthropic resta su Vercel; tetto di 1.000 chiamate al giorno (circa 2 €). Se la chiamata fallisce o il tempo del giro è
   finito, l'azienda entra lo stesso, con il settore dal nome quando è evidente.
8. **Tempi**: pagine aperte fino a 30 minuti dall'avvio, settore fino a 40, poi l'import (il servizio ne ha 50). Il testo
   delle pagine si legge con funzioni lineari (niente regex che rileggono la pagina da ogni punto): su pagine di 1,5 MB
   costruite apposta, meno di 300 ms (test in `worker/test.mjs`).
9. **Import**: `/api/engine/companies-import` con origine `cc`. Le aziende già presenti non vengono sovrascritte (si
   riempiono solo i campi vuoti). Poi seguono il percorso di tutte le altre: controllo siti, contatti, segnali.

## Misure del campione (23/10)
- Grafo di agosto–ottobre 2026: **1.528.974 domini .it**, di cui **1.487.050** di secondo livello.
- 600 domini del campione (i primi dell'elenco mescolato), homepage scaricata con un solo tentativo (`https://dominio`):
  300 aperti, **124 con partita IVA valida (21%)**, nessun doppione, **87 con città e provincia (70%)**. Esempi: impianti
  termoidraulici, carpenteria metallica, stampi, fonderie, studi dentistici, agenzie immobiliari, hotel, ristoranti.
  Dodici codici fiscali di associazioni (Pro Loco, bande, società sportive) esclusi con la regola dell'8 e del 9.
- **Stima, da confermare con il primo giro sul VPS** (che prova anche www e http): circa 250.000–300.000 attività con
  partita IVA su tutto l'elenco; quelle nuove per il database sono meno, perché una parte c'è già da OSM e dagli annunci
  (la misura arriva dal conteggio `new` / `updated` dell'import).

## Ritmo e costi
- **Ritmo proposto:** 3.000 domini ogni 3 ore (`avvia-cc`), cioè circa 24.000 domini e 5.000 aziende al giorno: tutto
  l'elenco in circa 2 mesi. Si può accelerare quando il controllo siti tiene il passo (ogni azienda nuova va controllata e
  cercata nei contatti).
- **Costo:** VPS già pagato; Haiku circa 0,01 centesimi per azienda (misura del Settore del 22/10: 360 aziende circa 0,03 €),
  cioè circa 0,50 € al giorno al ritmo proposto e circa 30 € per tutto l'elenco.

## Comandi sul VPS (`scripts/vps/worker.sh`)
`installa` (crea il servizio `webora-cc`, non lo avvia), `prova-cc` (scarica l'elenco la prima volta e prova 300 domini
senza salvare, con esempi e settori), `giro-cc` (un giro vero in sottofondo), `stato-cc`, `avvia-cc` (ogni 3 ore alle :25),
`ferma` (spegne anche questo).

## Da fare
1. Seconda revisione (migrazione 069 e correzioni), poi **Tu:** migrazione 069 su Supabase, poi main.
2. Sul VPS: `installa`, `prova-cc`, controllo degli esempi, `giro-cc`; misura di nuove e già presenti.
3. `avvia-cc` quando il controllo siti non ha più arretrato.
4. Da decidere: mostrare la partita IVA nei lead e nell'export; saltare i domini già nel database; Data Quality su un
   campione delle aziende `cc` (settore, città, nome; i professionisti senza ragione sociale hanno come nome il proprio, come
   già succede con OSM).
