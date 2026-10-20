-- Ricerche: le «parole chiave del settore» restringono invece di allargare (punto 52, 21/10).
-- Prima: settore OPPURE parola chiave. Con «Informatica e software» + «web agency» arrivavano tutti i negozi di
-- computer e le software house. Ora, se c'è un settore, servono il settore E almeno una parola chiave (cercata nelle
-- etichette, nel nome e nella descrizione dell'azienda). Senza settore (ricerche opportunità «tutti i settori» con i
-- settori del servizio) le parole chiave restano alternative, come prima.
-- Indietro: rieseguire target_pool dalla 029, warehouse_candidates dalla 037, opportunity_pool dalla 038.

create or replace function public.sector_matches(p_target jsonb, p_industry text[], p_tags text[], p_name text, p_industry_text text)
returns boolean language sql stable set search_path = public as $$
  with k as (
    select term_stems(x) as stems
      from jsonb_array_elements_text(coalesce(p_target -> 'industry_keywords', '[]')) x
     where cardinality(term_stems(x)) > 0
  )
  select case
    when cardinality(coalesce(p_industry, '{}')) = 0 then
      not exists (select 1 from jsonb_array_elements_text(coalesce(p_target -> 'industry_keywords', '[]')))
      or exists (select 1 from k where coalesce(p_tags, '{}') @> k.stems)
    else
      coalesce(p_tags, '{}') @> p_industry
      and (not exists (select 1 from k)
           or exists (select 1 from k
                       where (coalesce(p_tags, '{}') || term_stems(p_name) || term_stems(p_industry_text)) @> k.stems))
  end
$$;
revoke all on function public.sector_matches(jsonb, text[], text[], text, text) from public, anon, authenticated;

-- target_pool: definizione della migrazione 029, cambia solo il controllo del settore.
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
     -- Settore: tutte le parole del settore richiesto e, se ci sono, una delle parole chiave (sector_matches, 052).
     and sector_matches(s.target, s.industry, c.tags, c.name, c.industry)
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

-- warehouse_candidates: definizione della migrazione 037, cambia solo il controllo del settore.
create or replace function public.warehouse_candidates(
  p_search uuid, p_max_age_days integer default 180, p_limit integer default 500, p_only uuid[] default null
) returns table (person_id uuid, job_title text, lead jsonb)
language sql stable security definer set search_path = public as $$
  with s as (
    select se.org_id, se.email_mode, se.contacts_per_company, se.target,
           term_stems(se.target ->> 'industry') as industry,
           array(select upper(x) from jsonb_array_elements_text(coalesce(se.target -> 'countries', '[]')) x) as countries,
           search_signal_codes(se.target) as signal_codes,
           job_families.codes as job_families
      from searches se
      cross join lateral (
        select array(select f ->> 'code' from jsonb_array_elements(
                 case when jsonb_typeof(se.target #> '{signals,job_families}') = 'array'
                      then se.target #> '{signals,job_families}' else '[]'::jsonb end) f) as codes
      ) job_families
     where se.id = p_search
  ),
  pool as (
    select p.id as person_id, p.job_title, p.person_key, p.lead as data,
           e.id as email_id, e.address, e.type, e.status,
           least(p.last_verified_at, e.verified_at) as verified_at,
           sig.signals
      from s
      join people p on p.lead is not null
      join companies c on c.id = p.company_id
      join emails e on e.id = p.email_id
      -- Prove fresche dei segnali richiesti (annunci solo della famiglia scelta).
      cross join lateral (
        select coalesce(jsonb_agg(jsonb_build_object('code', cs.code, 'evidence', cs.evidence) order by cs.code), '[]'::jsonb) as signals,
               coalesce(array_agg(cs.code), '{}') as codes
          from company_signals cs
         where cs.company_id = c.id
           and cs.code = any (s.signal_codes)
           and signal_is_fresh(cs.code, cs.evidence, cs.checked_at)
           and (cs.code <> 'job_ad' or coalesce(cs.evidence ->> 'family', '') = any (s.job_families))
      ) sig
     where (p_only is null or p.id = any (p_only))
       and signals_satisfy(s.target, sig.codes)
       -- Mai ciò che il cliente ha già (e, con 1 contatto per azienda, le sue aziende).
       and not exists (select 1 from deliveries x where x.org_id = s.org_id and x.person_key = p.person_key)
       and (s.contacts_per_company > 1
            or not exists (select 1 from deliveries x where x.org_id = s.org_id and x.company_domain = c.domain))
       -- Dati recenti e affidabili.
       and p.last_verified_at > now() - make_interval(days => p_max_age_days)
       and e.verified_at > now() - make_interval(days => p_max_age_days)
       and e.bounce_reports = 0
       and e.status in ('found_public', 'validated')
       and (s.email_mode <> 'personal_only' or e.type = 'personal')
       -- Solo azienda: solo la casella generica del dominio aziendale.
       and (s.email_mode <> 'company_only' or (e.type = 'generic' and email_on_domain(e.address, c.domain)))
       and not exists (
         select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
          where r.status = 'refunded'
            and (x.person_key = p.person_key or (r.reason = 'company_closed' and x.company_domain = c.domain)))
       and not exists (
         select 1 from suppression_list sl
          where sl.email_hash = sha256_hex(e.address)
             or sl.domain_hash = sha256_hex(c.domain)
             or sl.domain_hash = sha256_hex(split_part(e.address, '@', 2)))
       -- Target: paese, settore (o una parola chiave del settore), zona, esclusioni.
       and c.country_code = any (s.countries)
       -- Ricerca opportunità «tutti i settori»: nessun filtro di settore.
       and sector_matches(s.target, s.industry, c.tags, c.name, c.industry)
       and (jsonb_array_length(coalesce(s.target -> 'regions', '[]')) = 0
            or exists (select 1 from jsonb_array_elements_text(s.target -> 'regions') g
                        where cardinality(term_stems(g)) > 0 and c.places @> term_stems(g)))
       and not exists (select 1 from jsonb_array_elements_text(coalesce(s.target -> 'exclude_keywords', '[]')) k
                        where cardinality(term_stems(k)) > 0
                          and (c.tags || term_stems(c.name) || term_stems(c.industry)) @> term_stems(k))
  )
  select pool.person_id, pool.job_title,
         jsonb_build_object(
           'company', pool.data -> 'company',
           'person', pool.data -> 'person',
           'email', coalesce(pool.data -> 'email', '{}'::jsonb)
                    || jsonb_build_object('address', pool.address, 'type', pool.type, 'status', pool.status),
           'email_patterns', coalesce(pool.data -> 'email_patterns', '[]'::jsonb),
           'sources', pool.data -> 'sources',
           'quality', pool.data -> 'quality',
           'signals', pool.signals,
           'keys', jsonb_build_object('person_key', pool.person_key),
           'origin', jsonb_build_object('source', 'warehouse', 'verified_at', pool.verified_at),
           '_person_id', pool.person_id,
           '_email_id', pool.email_id)
    from pool
   order by coalesce((pool.data #>> '{quality,score}')::integer, 0) desc, pool.verified_at desc
   limit p_limit
$$;


-- opportunity_pool: definizione della migrazione 038, cambia solo il controllo del settore.
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
     -- Grandi aziende fuori dalle ricerche con opportunità (migrazione 038).
     and not is_large_company(c.id, c.domain, c.size_hint, c.name)
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
     -- Paese: le aziende degli annunci hanno il nome del paese, non il codice.
     and (c.country_code = any (s.countries)
          or (c.country_code is null and 'IT' = any (s.countries) and lower(c.country) in ('italia', 'italy', 'it')))
     -- Settore: come il magazzino. Senza settore («tutti i settori») nessun filtro.
     and sector_matches(s.target, s.industry, c.tags, c.name, c.industry)
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

