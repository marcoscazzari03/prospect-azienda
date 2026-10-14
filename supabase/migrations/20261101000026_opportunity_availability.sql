-- Disponibilità delle ricerche opportunità, mostrata nel wizard prima di avviare.
--
-- La selezione delle aziende con prova recente (prima dentro opportunity_reserve) diventa
-- opportunity_pool, che lavora su un target qualsiasi: la usano la riserva del motore
-- (ricerca già creata) e il contatore del wizard (ricerca ancora da creare).

create or replace function public.opportunity_pool(p_org uuid, p_target jsonb, p_contacts integer, p_exclude text[])
returns table (id uuid, domain text, name text, website text, country text, city text, industry text, size_hint text,
               technologies text[], signals jsonb, latest timestamptz, ad_url text)
language sql stable security definer set search_path = public as $$
  with s as (
    select p_target as target,
           term_stems(p_target ->> 'industry') as industry,
           array(select upper(x) from jsonb_array_elements_text(coalesce(p_target -> 'countries', '[]')) x) as countries,
           search_signal_codes(p_target) as codes,
           array(select f ->> 'code' from jsonb_array_elements(
                   case when jsonb_typeof(p_target #> '{signals,job_families}') = 'array'
                        then p_target #> '{signals,job_families}' else '[]'::jsonb end) f) as families
  )
  select c.id, c.domain, c.name, c.website, c.country, c.city, c.industry, c.size_hint, c.technologies,
         sig.signals, sig.latest, ad.url
    from s
    join companies c on true
    -- Ultimo annuncio recente di una famiglia richiesta.
    left join lateral (
      select j.url, j.title, j.posted_at, j.family, j.region, j.city
        from job_ads j
       where 'job_ad' = any (s.codes)
         and j.company_id = c.id
         and j.posted_at >= current_date - 60
         and (cardinality(s.families) = 0 or j.family = any (s.families))
       order by j.posted_at desc
       limit 1
    ) ad on true
    cross join lateral (
      select coalesce(jsonb_agg(x.sig order by x.code), '[]'::jsonb) as signals,
             coalesce(array_agg(x.code), '{}') as codes,
             max(x.at) as latest
        from (
          select cs.code, cs.checked_at as at, jsonb_build_object('code', cs.code, 'evidence', cs.evidence) as sig
            from company_signals cs
           where cs.company_id = c.id
             and cs.code = any (s.codes)
             and cs.code <> 'job_ad'
             and signal_is_fresh(cs.code, cs.evidence, cs.checked_at)
          union all
          select 'job_ad', ad.posted_at,
                 jsonb_build_object('code', 'job_ad', 'evidence', jsonb_build_object(
                   'url', ad.url, 'title', ad.title, 'date', to_char(ad.posted_at, 'YYYY-MM-DD'),
                   'family', ad.family, 'source', 'job_board', 'checked_at', to_char(now(), 'YYYY-MM-DD')))
           where ad.url is not null
        ) x
    ) sig
   where cardinality(s.codes) > 0
     and signals_satisfy(s.target, sig.codes)
     and not (c.domain = any (coalesce(p_exclude, '{}')))
     and (coalesce(p_contacts, 1) > 1
          or not exists (select 1 from deliveries x where x.org_id = p_org and x.company_domain = c.domain))
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
     -- Paese: le aziende degli annunci hanno il nome del paese, non il codice.
     and (c.country_code = any (s.countries)
          or (c.country_code is null and 'IT' = any (s.countries) and lower(c.country) in ('italia', 'italy', 'it')))
     -- Settore: come il magazzino. Senza settore («tutti i settori») nessun filtro.
     and ((cardinality(s.industry) = 0
           and jsonb_array_length(coalesce(s.target -> 'industry_keywords', '[]')) = 0)
          or (cardinality(s.industry) > 0 and c.tags @> s.industry)
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
revoke all on function public.opportunity_pool(uuid, jsonb, integer, text[]) from public, anon, authenticated;

create or replace function public.opportunity_reserve(p_search uuid, p_exclude text[], p_limit integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'company_name', p.name, 'website', p.website, 'country', p.country, 'city', p.city,
           'industry', p.industry, 'size_hint', p.size_hint, 'technologies', to_jsonb(p.technologies),
           'source_url', coalesce(p.ad_url, p.website), 'contact_page', '',
           'signals', p.signals, 'origin', 'database')), '[]'::jsonb)
    from (select pool.* from searches se,
                 opportunity_pool(se.org_id, se.target, se.contacts_per_company, p_exclude) pool
           where se.id = p_search
           order by pool.latest desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;
revoke all on function public.opportunity_reserve(uuid, text[], integer) from public, anon, authenticated;

-- Quante aziende con prova recente ci sono per questo target (al massimo 500: oltre,
-- il wizard mostra «più di 500»).
create or replace function public.opportunity_availability(p_org uuid, p_target jsonb, p_contacts integer)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from (select 1 from opportunity_pool(p_org, p_target, p_contacts, '{}') limit 501) x
$$;
revoke all on function public.opportunity_availability(uuid, jsonb, integer) from public, anon, authenticated;
