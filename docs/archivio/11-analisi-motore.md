> **Storico (20/10/2026), non aggiornato: analisi delle ricerche reali di quel giorno. Le modifiche successive sono in `docs/13-registro.md`.**

# Analisi del motore (20/10)

Punto 27 della checklist: ottimizzazioni e parti non usate di «Lead Engine | Search (v1)».
Dati: le ultime 8 esecuzioni ancora conservate da n8n (18–19/10), tutte «Solo azienda».

## Numeri delle ricerche reali

| Ricerca | Lead richiesti | Lead trovati | Tempo | Token Claude (ingresso / uscita) | Ricerche web |
|---|---|---|---|---|---|
| Hotel, Emilia-Romagna (target) | 2 | 25 | 69 s | 94.848 / 5.506 | 6 |
| Metalmeccaniche, Veneto (target) | 20 | 23 | 68 s | 133.808 / 7.727 | 9 |
| Studi di architettura, Lombardia (target) | 20 | 28 | 56 s | 87.164 / 6.154 | 9 |
| Opportunità, Lombardia (solo database) | 3 | 17 | 42 s | 0 / 0 | 0 |

- La ricerca AI (Claude) è la parte più lenta: 20–31 s per lotto. Il resto è scaricare le pagine dei siti
  (40–115 pagine a ricerca) e il ritorno al backend (6–15 s).
- Il costo AI per lead è basso: circa 0,02–0,03 € nelle ricerche in target. Le ricerche dal database
  non costano nulla.
- Lo spreco vero è un altro: **dal 40% al 57% delle aziende provate non ha un'email sul sito**
  (motivo «nessuna_email»). Nella ricerca dal database, 23 aziende su 40.

## Fatto il 20/10

1. **Memoria delle aziende senza email** (migrazione 047). Quando il motore non trova né email né
   modulo di contatto, l'azienda passa in fondo alla riserva per 90 giorni, come già per i referenti.
   Prima ogni ricerca, anche di clienti diversi, riprovava per prime le stesse aziende.
   Effetto atteso: più lead per giro dalla riserva e meno pagine scaricate.
2. **Tolti 3 nodi morti**: «OpenAI (pianificazione)», «OpenAI + Web Search», «Ricerca prospect AI»
   (spenti e scollegati dal flusso dal passaggio a Claude). Collegamenti verificati identici prima e dopo.
3. **Nota del workflow e descrizione aggiornate** («Solo azienda», niente più riferimenti a RocketReach).

## Lasciato com'è, di proposito

- **Rami Referente (gruppo 2c) e Arricchimento Icypeas (gruppo 4)**: con «Solo azienda» non si attivano
  e non costano nulla (i filtri li saltano). Toglierli vorrebbe dire ricollegare 6 nodi di unione: rischio
  di rompere il flusso prima della beta, per nessun risparmio. Restano finché si decide sui referenti
  (punto 46).
- **Pianificatore AI anche con un solo lotto**: costa ~3 s e pochi centesimi, ma suggerisce le query
  locali. Da valutare solo dopo aver misurato la qualità senza.

## Proposte per dopo la beta

1. **Email trovate salvate nel database** dal controllo siti (che scarica già la homepage di 150 aziende
   l'ora): la riserva potrebbe dare la precedenza alle aziende con l'email già nota, e il motore non
   dovrebbe riscaricare le pagine. È il guadagno più grande, ma tocca tre workflow e il database.
2. **Ricerche piccole** (2–5 lead): oggi un lotto chiede sempre 30 aziende all'AI. Le aziende in più
   finiscono nel database e servono ad altri, quindi non è uno spreco puro; da rivedere con i costi
   reali della beta.
3. **Ritorno al backend** (6–15 s): misurare `apply_engine_results` con ricerche grandi.
