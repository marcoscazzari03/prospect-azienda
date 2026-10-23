-- Segnali misurati solo dal worker sul VPS (punto 91, 23/10, fase 1): «certificato HTTPS in scadenza» (cert_expiring, entro
-- 14 giorni) e «sito lento» (slow_site, prima risposta della homepage in 4 secondi o più). Qui entrano solo tra i controlli
-- che store_company_checks accetta e salva (company_checks, company_signals); non sono nel catalogo dell'app né nel motore,
-- quindi nessuna ricerca li chiede finché Data Quality non li ha controllati su un campione vero (fase 2).
-- Indietro: ripristinare l'elenco della 051 (le righe già salvate restano e non sono usate da nessuna ricerca).
create or replace function public.site_check_codes() returns text[] language sql immutable as $$
  select array['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright', 'under_construction', 'no_booking_engine', 'no_privacy',
               'cert_expiring', 'slow_site']
$$;
