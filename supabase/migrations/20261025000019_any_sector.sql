-- Ricerca opportunità senza settore («tutti i settori»): il magazzino consegna
-- aziende di qualsiasi settore che rispettano gli altri filtri (paese, zona,
-- esclusioni, segnali). Le aziende restano etichettate con il loro settore reale.

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
       and ((cardinality(s.industry) = 0
             and jsonb_array_length(coalesce(s.target -> 'industry_keywords', '[]')) = 0)
            or (cardinality(s.industry) > 0 and c.tags @> s.industry)
            or exists (select 1 from jsonb_array_elements_text(coalesce(s.target -> 'industry_keywords', '[]')) k
                        where cardinality(term_stems(k)) > 0 and c.tags @> term_stems(k)))
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
