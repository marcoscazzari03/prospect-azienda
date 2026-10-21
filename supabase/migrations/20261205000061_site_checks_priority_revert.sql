-- Ritorno alla coda del controllo siti della 054 (21/10 sera). La 060 (priorità per zone e settori delle ricerche) sui dati
-- veri superava gli 8 secondi di Supabase: «Aziende | Controllo siti» falliva con «lettura non riuscita» (esecuzione 3953).
-- Sul banco di prova impiegava 0,5 s: la differenza va capita prima di riproporla.
-- Indietro: rieseguire la 060.

create or replace function public.pending_site_checks(p_limit integer)
returns table (company_id uuid, domain text, name text, website text)
language sql stable security definer set search_path = public as $$
  select c.id, c.domain, c.name, c.website
    from companies c
   where ((c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
          or (c.site_checked_at < timestamptz '2026-10-20 12:25:00+00'
              and coalesce(c.site_email, '') = ''
              and exists (select 1 from company_checks cc
                           where cc.company_id = c.id and cc.status in ('pass', 'fail'))))
     and not is_non_target_company(c.name)
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
   order by (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days') desc,
            c.site_checked_at nulls first, c.first_seen_at
   limit least(greatest(coalesce(p_limit, 80), 1), 300)
$$;
revoke all on function public.pending_site_checks(integer) from public, anon, authenticated;
grant execute on function public.pending_site_checks(integer) to service_role;
