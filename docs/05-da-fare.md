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
- [x] RocketReach: piano Essentials (229 $/anno, 1.200 export/anno; 1 ricerca API = 1 export, anche se non trova) -> costo ~0,18 €/export, budget piattaforma ~80/mese
- [x] Controllo delle caselle prima della consegna: dominio che riceve posta (sempre) + verifica della casella con MillionVerifier se c'è `MILLIONVERIFIER_API_KEY` (migrazione `20261013000007_phase2.sql`)
- [ ] Facoltativo: account MillionVerifier e chiave `MILLIONVERIFIER_API_KEY` su Vercel; aggiornare il costo `email_verifier` in *Prezzi e costi*
- [x] Export Excel (.xlsx formattato, con filtri)
- [x] Stato del contatto, note e liste sui lead
- [x] Ricerche ricorrenti (settimanali o mensili, avviate dal cron giornaliero delle 3:00 UTC)
- [ ] Più utenti per account, API (fase 2)

## Piano di lancio (deciso il 10/10)
Fonti email per qualità: 1) nominativa trovata sul sito  2) Icypeas (al posto di RocketReach, si paga solo se trova)  3) MillionVerifier controlla ogni casella prima della consegna. Le email ricostruite (indirizzi probabili) NON si vendono: restano "ipotizzate".
- [x] Account MillionVerifier (2.000 verifiche) + `MILLIONVERIFIER_API_KEY` su Vercel: prova ok il 10/10 ("Casella verificata: esiste")
- [x] Account Icypeas + credenziale n8n "Icypeas API" (Header Auth `Authorization` = chiave; il secret non serve)
- [x] Test Icypeas (10/10): 1/1 email nota corretta; 7/18 trovate dove avevamo solo generica o niente (RocketReach 0/4 sugli stessi); tutte "ultra_sure"; credito scalato solo se trova
- [x] Icypeas nel motore al posto di RocketReach (migrazione `20261014000008_icypeas.sql`, costo `email_finder`)
- [x] Workflow pubblicato e piano Icypeas acquistato (budget mensile ~900 in Prezzi e costi)
- [x] Workflow "TEST | Icypeas email finder" archiviato
- [ ] Motore: workflow di errore n8n che avvisa il backend se un'esecuzione si interrompe (oggi la ricerca si chiude dopo 45 minuti senza notizie)
- [x] Prova completa "solo nominative" (4/5, 3 da Icypeas) e "mista" (10/10)
- [x] Ritocchi grafici: bianco e grigi al posto del crema, verde smeraldo più chiaro, riepilogo "Dall'ultimo accesso" in panoramica (migrazione `20261015000009_activity.sql`)
- [ ] Beta gratuita su invito (5-10 aziende, crediti regalati dall'admin): misurare rimbalzi e segnalazioni
- [ ] Lancio a pagamento: partita IVA, Stripe live, revisione legale

## Legale e fiscale
- [ ] Apertura partita IVA (prima di incassare) e scelta del regime con un commercialista
- [ ] Validazione di informativa privacy, termini, LIA/DPIA con un consulente
- [ ] Passaggio di Stripe in modalità live
