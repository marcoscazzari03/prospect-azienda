-- Ricontrollo anticipato delle aziende senza email (punto 60, 21/10).
-- L'email aziendale dal controllo siti esiste dal 20/10 alle 12:25 UTC (migrazione 050): le circa 9.000 aziende
-- controllate prima la prenderebbero solo al ricontrollo dopo 25 giorni. La coda del controllo siti è vuota e il
-- workflow gira a vuoto ogni ora: quando non c'è niente di dovuto, si ricontrollano quelle controllate prima di
-- quell'ora, con il sito leggibile e senza email. Prima sempre le dovute. Si esaurisce da sola: una volta
-- ricontrollata, l'azienda ha la data nuova e non rientra più.
-- Stessa definizione della 035, cambiano solo la condizione e l'ordine.
-- Indietro: rieseguire pending_site_checks dalla 035.
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
