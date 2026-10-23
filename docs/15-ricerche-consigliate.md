# Ricerche consigliate (punti 83–85)

Documento vivo della funzione «Di cosa si occupa la tua attività?» e delle ricerche consigliate. Decisione del 22/10 nel
registro (tabella in alto). Stato: **in produzione dal 23/10 solo per l'admin** (interruttore «Solo admin»); prove in corso.

## Decisioni (22/10)
- La domanda compare alla **prima apertura dell'app**, in un riquadro della dashboard che si può saltare; non nella
  registrazione. Si modifica dal profilo.
- Haiku propone fino a **3 ricerche verso aziende**, solo se il database ha i lead (stesso conteggio del wizard, punto 40).
- Chi vende **solo a privati**: messaggio onesto e «Prova comunque una ricerca» (wizard vuoto). Descrizione **vaga**: domanda
  di riserva «A chi vendi di solito?».
- Il clic su una scheda apre il **wizard già compilato**; l'avvio resta del cliente e costa crediti come ogni ricerca.
- **Interruttore nell'Admin**: prima solo l'admin, per tutti con Avvisto dopo il 25/10.

## Proposta del designer (22/10, da verificare su schermata reale)
1. **Posizione:** riquadro a tutta larghezza tra l'intestazione e le 4 statistiche, bordo chiaro (non pieno). Prima volta:
   titolo, sottotitolo «Ti proponiamo ricerche pronte da avviare. Non è obbligatorio.», campi descrizione (con esempio) e
   zona («provincia o regione»), pulsante «Mostra le ricerche», link «Salta per ora» (il riquadro si riduce a una riga, non
   sparisce). Con la descrizione già data: riassunto su una riga («Studio di architettura · Modena») e «Modifica» nello
   stesso riquadro. Interruttore spento: il riquadro non esiste.
2. **Schede (max 3):** titolo, «circa X lead» (sempre «circa», stesso numero del wizard), motivazione su una riga, pulsante
   «Apri la ricerca →»; tutta la scheda è un link; ordine per numero di lead. Sotto: «Si apre la ricerca già compilata. Paghi
   solo i lead consegnati.» Nessun prezzo nella scheda.
3. **Stati:** caricamento con 3 schede scheletro e «Stiamo preparando le ricerche…» (`aria-live`, riquadro caricato a parte
   con Suspense); errore con avviso giallo, «Riprova» e «Nuova ricerca»; nessuna proposta con «Modifica la zona» e «Prova
   comunque una ricerca»; solo privati con messaggio onesto; vaga con scelte rapide (Imprese edili, Studi professionali,
   Negozi, Ristoranti e hotel, Aziende industriali, Altro).
4. **Telefono:** una colonna, campi alti almeno 44 px, schede impilate (niente carosello), motivazione ridotta per tenere le
   tre schede in una schermata; da `lg` tre colonne.
5. **Da decidere:** togliere «Trova aziende con opportunità» dall'intestazione mentre le schede sono visibili; niente emoji
   nuove.

## Grafica (23/10, bozza dell'utente)
Icona accanto al titolo; icone nei campi («Cosa fai?» con l'edificio, «Dove lavori?» con il segnaposto); suggerimento con la
lampadina e contatore dei caratteri (massimo 300); a destra, solo da `lg`, il riquadro «Ti suggeriremo:» con tre spunte
(ricerche già pronte, solo aziende del database, filtri già compilati); pulsante «Mostra le ricerche» con la lente. Esempio
del campo a rotazione tra 6 attività che vendono ad aziende (`BUSINESS_EXAMPLES`), scelto sul server a ogni apertura.

## Zona (23/10 sera, osservazione dell'utente)
Il campo era «Dove lavori?», ma il suo valore diventa la zona delle ricerche proposte e del conteggio: chi lavora a Milano
e vuole clienti in tutta la Lombardia vedeva solo Milano. Ora è «Dove cerchi clienti?» (anche più zone, «Milano e Monza»;
vuoto o «tutta Italia» = tutta Italia), un solo campo invece di due (dove lavori non serve alle proposte). Haiku riceve
«Zona in cui cerca clienti». Testo da far rivedere al Sales Copywriter prima dell'apertura a tutti.

## Come è fatto (23/10)
- **Dati:** migrazione `20261211000067_business_profile.sql`, colonne sull'organizzazione: `business_description` (≤500),
  `business_area` (≤120), `business_suggestions` (proposte già filtrate e contate), `business_suggested_at`,
  `business_skipped_at`. Si scrivono solo dal server (azioni `saveBusinessProfile` e `skipBusinessProfile` in
  `src/app/app/actions.ts`, sull'organizzazione dell'utente collegato).
- **Interruttore:** `app_settings` «suggested_searches» = `off` / `admin` (predefinito) / `all`; si cambia in Admin → Servizi.
- **Haiku:** `src/lib/server/suggestions.ts`, modello `claude-haiku-5-5`, risposta JSON validata (`haikuAnswerSchema` in
  `src/lib/domain/suggestions.ts`): `sells_to` (aziende, entrambi, privati, non chiaro) e fino a 4 proposte (titolo, motivo,
  settore, parole chiave, servizio solo se tra quelli attivi). Al massimo 10 proposte al giorno per account. Chiave
  `ANTHROPIC_API_KEY` solo sul server (Vercel).
- **Conteggio:** ogni proposta passa da `availability_contacts` e dalla stima `expectedLeads` come il wizard (dal 23/10,
  valore basso della forbice: contatti noti più una quota delle aziende da provare); si mostrano solo quelle con almeno 10
  lead, le più ricche prima, al massimo 3. Tutte le proposte di Haiku con il conteggio restano in `business_suggestions.tried`.
- **Interfaccia:** `src/components/suggested-searches.tsx` nella dashboard (`src/app/app/page.tsx`); il link della scheda apre
  `/app/ricerche/nuova?settore=…&parole=…&zona=…&servizio=…&nome=…`, valori iniziali che il server ricontrolla all'avvio.
- **Test:** `tests/suggestions.test.ts` (pulizia della risposta, scelta delle proposte, link, arrotondamento).

## Da fare
Prove con descrizioni diverse (falegname, fotografo, commercialista, parrucchiere), poi il modulo anche nel profilo e
«Tutti» con Avvisto.
