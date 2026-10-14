-- Ricerche in target «database first», versione prudente.
--
-- Le aziende del database (popolamento OpenStreetMap, annunci, ricerche precedenti) entrano
-- nella riserva del motore anche per le ricerche in target, ma solo quando la ricerca è
-- «semplice»: settore e zona, senza vincoli che il database non sa verificare (dimensione,
-- fatturato, parole chiave, note). Il settore deve corrispondere per intero alle etichette
-- e il sito deve essere vivo (controllato negli ultimi 60 giorni con un esito leggibile).
-- Il motore cerca solo il referente e l'email; l'AI cerca aziende solo per i lead mancanti.

create or replace function public.target_is_simple(p_target jsonb)
returns boolean language sql stable as $$
  select cardinality(search_signal_codes(p_target)) = 0
     and (coalesce(btrim(p_target ->> 'industry'), '') <> ''
          or jsonb_array_length(coalesce(p_target -> 'industry_keywords', '[]')) > 0)
     and jsonb_array_length(coalesce(p_target -> 'company_size', '[]')) = 0
     and coalesce(btrim(p_target ->> 'revenue_range'), '') = ''
     and jsonb_array_length(coalesce(p_target -> 'keywords', '[]')) = 0
     and coalesce(btrim(p_target ->> 'notes'), '') = ''
$$;

create or replace function public.target_pool(p_org uuid, p_target jsonb, p_contacts integer, p_exclude text[])
returns table (id uuid, domain text, name text, website text, country text, city text, industry text, size_hint text,
               technologies text[], checked_at timestamptz)
language sql stable security definer set search_path = public as $$
  with s as (
    select p_target as target,
           term_stems(p_target ->> 'industry') as industry,
           array(select upper(x) from jsonb_array_elements_text(coalesce(p_target -> 'countries', '[]')) x) as countries
  )
  select c.id, c.domain, c.name, c.website, c.country, c.city, c.industry, c.size_hint, c.technologies, c.site_checked_at
    from s
    join companies c on true
   where target_is_simple(s.target)
     and not (c.domain = any (coalesce(p_exclude, '{}')))
     and (coalesce(p_contacts, 1) > 1
          or not exists (select 1 from deliveries x where x.org_id = p_org and x.company_domain = c.domain))
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
     -- Sito vivo: controllato di recente con almeno un esito leggibile.
     and exists (select 1 from company_checks cc
                  where cc.company_id = c.id and cc.status in ('pass', 'fail')
                    and cc.checked_at > now() - interval '60 days')
     and (c.country_code = any (s.countries)
          or (c.country_code is null and 'IT' = any (s.countries) and lower(c.country) in ('italia', 'italy', 'it')))
     -- Settore: tutte le parole del settore richiesto, o una delle parole chiave del settore.
     and ((cardinality(s.industry) > 0 and c.tags @> s.industry)
          or exists (select 1 from jsonb_array_elements_text(coalesce(s.target -> 'industry_keywords', '[]')) k
                      where cardinality(term_stems(k)) > 0 and c.tags @> term_stems(k)))
     -- Zona: luoghi dell'azienda, città o regione dei suoi annunci.
     and (jsonb_array_length(coalesce(s.target -> 'regions', '[]')) = 0
          or exists (
            select 1 from jsonb_array_elements_text(s.target -> 'regions') g
             where cardinality(term_stems(g)) > 0
               and (c.places || term_stems(c.city)
                    || coalesce((select array_agg(distinct w) from job_ads j2, unnest(term_stems(j2.region) || term_stems(j2.city)) w
                                  where j2.company_id = c.id), '{}')) @> term_stems(g)))
     and not exists (select 1 from jsonb_array_elements_text(coalesce(s.target -> 'exclude_keywords', '[]')) k
                      where cardinality(term_stems(k)) > 0
                        and (c.tags || term_stems(c.name) || term_stems(c.industry)) @> term_stems(k))
$$;
revoke all on function public.target_pool(uuid, jsonb, integer, text[]) from public, anon, authenticated;

create or replace function public.target_reserve(p_search uuid, p_exclude text[], p_limit integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'company_name', p.name, 'website', p.website, 'country', p.country, 'city', p.city,
           'industry', p.industry, 'size_hint', p.size_hint, 'technologies', to_jsonb(p.technologies),
           'source_url', p.website, 'contact_page', '', 'signals', '[]'::jsonb, 'origin', 'database')), '[]'::jsonb)
    from (select pool.* from searches se,
                 target_pool(se.org_id, se.target, se.contacts_per_company, p_exclude) pool
           where se.id = p_search
           order by pool.checked_at desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;
revoke all on function public.target_reserve(uuid, text[], integer) from public, anon, authenticated;

create or replace function public.target_availability(p_org uuid, p_target jsonb, p_contacts integer)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from (select 1 from target_pool(p_org, p_target, p_contacts, '{}') limit 501) x
$$;
revoke all on function public.target_availability(uuid, jsonb, integer) from public, anon, authenticated;
