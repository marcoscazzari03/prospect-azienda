-- Controllo dei siti del database (fase 4 della ricerca opportunità «database first»).
--
-- Il workflow n8n «Aziende | Controllo siti» controlla gratis (solo richieste HTTP) i siti
-- delle aziende del database con le stesse regole del motore e salva gli esiti con
-- store_company_checks. Prima i siti mai controllati, poi quelli controllati da più di 25
-- giorni: le prove dei segnali valgono 30 giorni, così restano sempre fresche.

create or replace function public.pending_site_checks(p_limit integer)
returns table (company_id uuid, domain text, name text, website text)
language sql stable security definer set search_path = public as $$
  select c.id, c.domain, c.name, c.website
    from companies c
   where (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
   order by c.site_checked_at nulls first, c.first_seen_at
   limit least(greatest(coalesce(p_limit, 80), 1), 300)
$$;
revoke all on function public.pending_site_checks(integer) from public, anon, authenticated;
