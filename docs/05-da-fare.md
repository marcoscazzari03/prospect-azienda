# 5. Da fare prima dell'apertura al pubblico

Lista aggiornata delle attività aperte (spuntare man mano).

## Configurazione
- [x] Supabase: migrazioni eseguite, Site URL e Redirect URL impostati
- [x] Vercel: progetto creato, variabili d'ambiente, produzione da `main`
- [x] Dominio `leads.weborastudio.it` collegato a Vercel (record DNS)
- [x] n8n: credenziali "Lead Engine" create e workflow attivato
- [x] Prima ricerca reale end-to-end (09/10: 3/3 lead, ~2 minuti)
- [ ] Prove con "Mista" e "Solo nominative", volumi più alti, taratura dei prompt (rimandata: prima scegliere il primo mercato)
- [x] Email: Resend (dominio verificato, record su sottodomini), SMTP in Supabase, testi in italiano, notifiche app
- [x] Stripe in modalità test (chiavi, webhook, portale clienti): acquisto di prova accreditato
- [x] Motore: ruoli con alternative e sinonimi (es. «Titolare / CEO»)
- [ ] Facoltativo: casella Hostinger leads@weborastudio.it per ricevere le risposte

## Prodotto
- [x] Scadenza automatica dei crediti (si usano prima quelli che scadono prima; migrazione `20261010000004_credit_expiry.sql`)
- [x] Magazzino dei lead: i contatti già trovati vengono consegnati subito ad altri clienti con lo stesso target (migrazione `20261011000005_lead_warehouse.sql`)
- [x] Ricerche grandi a tappe (fino a 15 giri, stop a mercato esaurito) e budget mensile RocketReach in *Prezzi e costi* (migrazione `20261012000006_large_searches.sql`)
- [ ] RocketReach in *Prezzi e costi*: costo reale per export (prezzo del piano / export inclusi, oggi stima 0,45 €) e budget mensile coerente con la quota del piano (oggi 900; quota vista: 1.063 export rimasti)
- [ ] Verifica SMTP delle email trovate sui siti
- [ ] Export Excel
- [ ] Liste e note sui lead
- [ ] Ricerche ricorrenti
- [ ] Più utenti per account, API (fase 2)

## Legale e fiscale
- [ ] Apertura partita IVA (prima di incassare) e scelta del regime con un commercialista
- [ ] Validazione di informativa privacy, termini, LIA/DPIA con un consulente
- [ ] Passaggio di Stripe in modalità live
