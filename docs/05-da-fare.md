# 5. Da fare prima dell'apertura al pubblico

Lista aggiornata delle attività aperte (spuntare man mano).

## Configurazione
- [x] Supabase: migrazioni eseguite, Site URL e Redirect URL impostati
- [x] Vercel: progetto creato, variabili d'ambiente, produzione da `main`
- [x] Dominio `leads.weborastudio.it` collegato a Vercel (record DNS)
- [x] n8n: credenziali "Lead Engine" create e workflow attivato
- [x] Prima ricerca reale end-to-end (09/10: 3/3 lead, ~2 minuti)
- [ ] Prove con "Mista" e "Solo nominative", volumi più alti, taratura dei prompt
- [x] Email: Resend (dominio verificato, record su sottodomini), SMTP in Supabase, testi in italiano, notifiche app
- [x] Stripe in modalità test (chiavi, webhook, portale clienti): acquisto di prova accreditato
- [x] Motore: ruoli con alternative e sinonimi (es. «Titolare / CEO»)
- [ ] Facoltativo: casella Hostinger leads@weborastudio.it per ricevere le risposte

## Prodotto
- [x] Scadenza automatica dei crediti (si usano prima quelli che scadono prima; migrazione `20261010000004_credit_expiry.sql`)
- [ ] Verifica SMTP delle email trovate sui siti
- [ ] Ricerche ricorrenti, più utenti per account, export Excel, API (fase 2)

## Legale e fiscale
- [ ] Apertura partita IVA (prima di incassare) e scelta del regime con un commercialista
- [ ] Validazione di informativa privacy, termini, LIA/DPIA con un consulente
- [ ] Passaggio di Stripe in modalità live
