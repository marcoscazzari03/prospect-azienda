-- Segnale indicativo «Sito senza informativa privacy o cookie» (no_privacy, punto 48 del 20/10).
-- Il controllo è nei workflow (lib-controlli-sito.js); qui il codice entra tra i controlli salvati
-- (store_company_checks) e tra i segnali che il magazzino conserva con il lead (stock_lead).
create or replace function public.site_check_codes() returns text[] language sql immutable as $$
  select array['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright', 'under_construction', 'no_booking_engine', 'no_privacy']
$$;

create or replace function public.stock_lead(p_lead jsonb, p_target jsonb)
returns table (company_id uuid, person_id uuid, email_id uuid)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_email_addr text := lower(trim(p_lead #>> '{email,address}'));
  v_domain text := lower(trim(p_lead #>> '{company,domain}'));
  v_person_key text := lower(trim(p_lead #>> '{keys,person_key}'));
  v_type text := p_lead #>> '{email,type}';
  v_status text := p_lead #>> '{email,status}';
  v_tech text[];
  v_company uuid;
  v_person uuid;
  v_email uuid;
begin
  v_tech := case when jsonb_typeof(p_lead #> '{company,technologies}') = 'array'
                 then array(select t from jsonb_array_elements_text(p_lead #> '{company,technologies}') t limit 10)
                 else '{}'::text[] end;
  insert into companies as c (domain, name, website, country, city, industry, size_hint, technologies)
  values (v_domain,
          coalesce(nullif(p_lead #>> '{company,name}', ''), v_domain),
          coalesce(nullif(p_lead #>> '{company,website}', ''), 'https://' || v_domain),
          coalesce(p_lead #>> '{company,country}', ''), coalesce(p_lead #>> '{company,city}', ''),
          coalesce(p_lead #>> '{company,industry}', ''), coalesce(p_lead #>> '{company,size_hint}', ''),
          v_tech)
  on conflict (domain) do update
    set name = excluded.name, website = excluded.website,
        country = coalesce(nullif(excluded.country, ''), c.country),
        city = coalesce(nullif(excluded.city, ''), c.city),
        industry = coalesce(nullif(excluded.industry, ''), c.industry),
        size_hint = coalesce(nullif(excluded.size_hint, ''), c.size_hint),
        technologies = case when cardinality(excluded.technologies) > 0 then excluded.technologies else c.technologies end,
        last_verified_at = now()
  returning c.id into v_company;
  perform tag_company(v_company, p_target);

  -- Prove dei segnali (tutti quelli superati), riusabili finché fresche.
  insert into company_signals as cs (company_id, code, evidence, checked_at)
  select v_company, x ->> 'code', coalesce(x -> 'evidence', '{}'::jsonb), now()
    from jsonb_array_elements(case when jsonb_typeof(p_lead -> 'signals') = 'array' then p_lead -> 'signals' else '[]'::jsonb end) x
   where x ->> 'code' = any (verified_signal_codes() || array['stale_copyright', 'under_construction', 'no_booking_engine', 'no_privacy'])
  on conflict (company_id, code) do update set evidence = excluded.evidence, checked_at = excluded.checked_at;

  insert into people as p (company_id, person_key, full_name, first_name, last_name, job_title, linkedin_url, discovery_url)
  values (v_company, v_person_key,
          coalesce(p_lead #>> '{person,full_name}', ''), coalesce(p_lead #>> '{person,first_name}', ''),
          coalesce(p_lead #>> '{person,last_name}', ''), coalesce(p_lead #>> '{person,job_title}', ''),
          coalesce(p_lead #>> '{person,linkedin_url}', ''), coalesce(p_lead #>> '{sources,discovery_url}', ''))
  on conflict (person_key) do update
    set company_id = excluded.company_id, full_name = excluded.full_name,
        job_title = coalesce(nullif(excluded.job_title, ''), p.job_title),
        linkedin_url = coalesce(nullif(excluded.linkedin_url, ''), p.linkedin_url),
        discovery_url = coalesce(nullif(excluded.discovery_url, ''), p.discovery_url),
        last_verified_at = now()
  returning p.id into v_person;

  insert into emails as e (company_id, person_id, address, type, status, source, source_url)
  values (v_company, case when v_type = 'personal' then v_person end, v_email_addr, v_type, v_status,
          case when (p_lead #>> '{email,source}') = 'enrichment' then 'enrichment' else 'website' end,
          coalesce(p_lead #>> '{email,source_url}', ''))
  on conflict (address) do update
    set status = case when e.status = 'validated' then e.status else excluded.status end,
        source_url = coalesce(nullif(excluded.source_url, ''), e.source_url),
        verified_at = now()
  returning e.id into v_email;

  -- Scheda del lead per il magazzino: si aggiorna se l'email è nuova o migliore
  -- (una nominativa vince su una generica).
  update people pp
     set lead = jsonb_strip_nulls(jsonb_build_object(
                  'company', p_lead -> 'company', 'person', p_lead -> 'person',
                  'email', (p_lead -> 'email') - 'alternatives',
                  'email_patterns', coalesce(p_lead -> 'email_patterns', '[]'::jsonb),
                  'sources', p_lead -> 'sources', 'quality', p_lead -> 'quality')),
         email_id = v_email
   where pp.id = v_person
     and (pp.email_id is null or pp.email_id = v_email or v_type = 'personal'
          or not exists (select 1 from emails x where x.id = pp.email_id and x.type = 'personal'));

  return query select v_company, v_person, v_email;
end;
$$;
revoke execute on function public.stock_lead(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.stock_lead(jsonb, jsonb) to service_role;
