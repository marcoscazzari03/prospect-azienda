# Ricerche consigliate (punti 83–85)

Documento vivo della funzione «Di cosa si occupa la tua attività?» e delle ricerche consigliate. Decisione del 22/10 nel
registro (tabella in alto). Stato: **progetto**, codice dal 23/10.

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

## Da fare
Testi (sales-copywriter), colonne `business_description` e `business_area` sull'organizzazione, interruttore in
`app_settings`, azione server con Haiku (risposta JSON validata, tetto di chiamate per organizzazione), conteggio con
`availability_contacts`, componente della dashboard e del profilo, test; revisione (code-reviewer) prima della pubblicazione.
