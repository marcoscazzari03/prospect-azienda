-- Coda del controllo siti con priorità (punto 39, 21/10). Il controllo orario prendeva le aziende solo in ordine di
-- anzianità: con decine di migliaia di aziende da controllare, quelle delle zone e dei settori che i clienti cercano davvero
-- potevano aspettare settimane. Ora, tra le aziende da controllare, vengono prima quelle nella zona e nel settore di una
-- ricerca degli ultimi 30 giorni o di un avviso settimanale attivo, poi quelle nella zona di una ricerca, poi le altre.
-- Le regole su chi va controllato (25 giorni, ricontrollo della 054, esclusioni) non cambiano.
-- Indietro: rieseguire pending_site_checks dalla 054.

create or replace function public.pending_site_checks(p_limit integer)
returns table (company_id uuid, domain text, name text, website text)
language sql stable security definer set search_path = public as $$
  -- Domanda: zone e settori delle ricerche recenti e degli avvisi attivi, con le radici calcolate una volta sola.
  -- Le zone sono insiemi di radici («Reggio Emilia» = due radici, servono tutte); le parole chiave del settore sono
  -- alternative. Al massimo le 200 ricerche più recenti, senza doppioni: il costo cresce con il numero di ricerche (Code
  -- Reviewer, 21/10: 2,5 s con 200 ricerche, 17 s con 2.000).
  with domanda as (
    select distinct zone, settore, parole from (
    select array(select array_to_string(term_stems(g), ' ') from jsonb_array_elements_text(coalesce(se.target -> 'regions', '[]')) g
                  where cardinality(term_stems(g)) > 0) as zone,
           term_stems(se.target ->> 'industry') as settore,
           array(select array_to_string(term_stems(k), ' ') from jsonb_array_elements_text(coalesce(se.target -> 'industry_keywords', '[]')) k
                  where cardinality(term_stems(k)) > 0) as parole
      from searches se
     where se.deleted_at is null
       and (se.created_at > now() - interval '30 days' or exists (select 1 from search_alerts a where a.search_id = se.id))
     order by se.created_at desc
     limit 200) recenti
  ),
  da_fare as (
    select c.id, c.domain, c.name, c.website, c.site_checked_at, c.first_seen_at,
           coalesce(c.places, '{}') || term_stems(c.city) as luoghi, coalesce(c.tags, '{}') as tags,
           (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days') as scaduta
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
  )
  select f.id, f.domain, f.name, f.website
    from da_fare f
    -- 2: zona e settore di una ricerca, settore di una ricerca su tutto il paese, oppure zona di una ricerca senza settore
    -- (opportunità «tutti i settori»); 1: zona di una ricerca con un altro settore; 0: le altre. Una ricerca senza zona e senza
    -- settore non dà priorità.
    cross join lateral (
      select coalesce(max(case when x.zona and x.settore then 2 when x.zona and cardinality(d.zone) > 0 then 1 else 0 end), 0) as livello
        from domanda d
        cross join lateral (
          select (cardinality(d.zone) = 0 or exists (select 1 from unnest(d.zone) z where f.luoghi @> string_to_array(z, ' '))) as zona,
                 case when cardinality(d.settore) = 0 and cardinality(d.parole) = 0 then cardinality(d.zone) > 0
                      else (cardinality(d.settore) > 0 and f.tags @> d.settore)
                           or exists (select 1 from unnest(d.parole) p where f.tags @> string_to_array(p, ' ')) end as settore
        ) x
    ) pr
   order by f.scaduta desc, pr.livello desc, f.site_checked_at nulls first, f.first_seen_at
   limit least(greatest(coalesce(p_limit, 80), 1), 300)
$$;
revoke all on function public.pending_site_checks(integer) from public, anon, authenticated;
grant execute on function public.pending_site_checks(integer) to service_role;
