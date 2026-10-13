-- Magazzino completo: ogni lead valido trovato dal motore viene salvato, anche
-- se non viene consegnato (oltre la quantità, già avuto da quel cliente, oltre il
-- limite per azienda, senza il segnale richiesto, generica in «solo nominative»).
-- Il magazzino pesca da tutte le schede salvate (people.lead), non più solo dalle
-- consegne. Mai salvati: email ipotizzate o non valide, contatti in opposizione.

alter table public.people
  add column if not exists lead jsonb,
  add column if not exists email_id uuid references public.emails (id) on delete set null;
create index if not exists people_email_idx on public.people (email_id);
create index if not exists people_stock_idx on public.people (company_id) where lead is not null;

-- Salva (o aggiorna) un lead trovato dal motore nel magazzino, con la sua scheda.
-- Restituisce azienda, persona ed email. Non consegna nulla e non addebita nulla.
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
   where x ->> 'code' = any (verified_signal_codes() || array['stale_copyright', 'under_construction', 'no_booking_engine'])
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

create or replace function public.deliver_leads(p_search uuid, p_run uuid, p_leads jsonb, p_source text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_search searches%rowtype;
  v_lead jsonb;
  v_email_addr text;
  v_domain text;
  v_person_key text;
  v_type text;
  v_status text;
  v_credits integer;
  v_company_id uuid;
  v_person_id uuid;
  v_email_id uuid;
  v_codes text[];
  v_required text[];
  v_signals jsonb;
  v_passed text[];
  v_new integer := 0;
  v_dup integer := 0;
  v_suppressed integer := 0;
  v_invalid integer := 0;
  v_company_full integer := 0;
  v_over integer := 0;
  v_no_signal integer := 0;
  v_stocked integer := 0;
  v_beyond integer := 0;
  v_rows integer;
begin
  select * into v_search from searches where id = p_search for update;
  v_codes := search_signal_codes(v_search.target);
  v_required := search_required_signals(v_search.target);

  for v_lead in select value from jsonb_array_elements(coalesce(p_leads, '[]'::jsonb)) loop
    v_email_addr := lower(trim(v_lead #>> '{email,address}'));
    v_domain := lower(trim(v_lead #>> '{company,domain}'));
    v_person_key := lower(trim(v_lead #>> '{keys,person_key}'));
    v_type := v_lead #>> '{email,type}';
    v_status := v_lead #>> '{email,status}';

    -- Difesa in profondità: mai email ipotizzate o tipi non vendibili.
    if v_email_addr is null or v_email_addr !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
       or v_domain is null or v_domain = '' or v_person_key is null or v_person_key = ''
       or v_type not in ('generic', 'personal') or v_status not in ('found_public', 'validated') then
      v_invalid := v_invalid + 1;
      continue;
    end if;

    if exists (select 1 from suppression_list
               where email_hash = sha256_hex(v_email_addr)
                  or domain_hash = sha256_hex(v_domain)
                  or domain_hash = sha256_hex(split_part(v_email_addr, '@', 2))) then
      v_suppressed := v_suppressed + 1;
      continue;
    end if;

    -- Magazzino: ogni lead valido trovato dal motore si salva, anche se non viene
    -- consegnato (oltre la quantità, già avuto da questo cliente, senza il segnale,
    -- generica in una ricerca «solo nominative»...): altri clienti potranno riceverlo.
    if p_source <> 'warehouse' then
      select s.company_id, s.person_id, s.email_id into v_company_id, v_person_id, v_email_id
        from stock_lead(v_lead, v_search.target) s;
      v_stocked := v_stocked + 1;
    end if;
    if coalesce((v_lead ->> '_stock_only')::boolean, false) then continue; end if;
    if v_search.delivered >= v_search.quantity then
      v_beyond := v_beyond + 1;
      continue;
    end if;
    if v_search.email_mode = 'personal_only' and v_type <> 'personal' then
      v_invalid := v_invalid + 1;
      continue;
    end if;

    -- Segnali: si tengono solo quelli richiesti dalla ricerca, con la loro prova.
    select coalesce(jsonb_agg(jsonb_build_object('code', s ->> 'code', 'evidence', coalesce(s -> 'evidence', '{}'::jsonb))
                              order by s ->> 'code'), '[]'::jsonb),
           coalesce(array_agg(s ->> 'code'), '{}')
      into v_signals, v_passed
      from jsonb_array_elements(case when jsonb_typeof(v_lead -> 'signals') = 'array' then v_lead -> 'signals' else '[]'::jsonb end) s
     where s ->> 'code' = any (v_codes);
    if not signals_satisfy(v_search.target, v_passed) then
      v_no_signal := v_no_signal + 1;
      continue;
    end if;


    if exists (select 1 from deliveries where org_id = v_search.org_id and person_key = v_person_key) then
      v_dup := v_dup + 1;
      continue;
    end if;

    if (select count(*) from deliveries where search_id = v_search.id and company_domain = v_domain)
       >= v_search.contacts_per_company then
      v_company_full := v_company_full + 1;
      continue;
    end if;

    -- Crediti in più: il prezzo più alto tra i segnali verificati che il lead ha davvero.
    v_credits := lead_credits(v_search.email_mode, v_type, v_status)
                 + signal_extra(coalesce(v_search.signal_prices, signal_prices()),
                                array(select c from unnest(v_passed) c where c = any (v_required)));
    if v_search.credits_charged + v_credits > v_search.credits_reserved then
      v_over := v_over + 1;
      continue;
    end if;

    if p_source = 'warehouse' then
      -- Già in magazzino: nessun aggiornamento (i dati non sono stati riverificati).
      select p.id, p.company_id into v_person_id, v_company_id from people p where p.id = (v_lead ->> '_person_id')::uuid;
      select e.id into v_email_id from emails e where e.id = (v_lead ->> '_email_id')::uuid and e.address = v_email_addr;
      if v_person_id is null or v_email_id is null then
        v_invalid := v_invalid + 1;
        continue;
      end if;
    end if;

    insert into deliveries (org_id, search_id, run_id, person_id, email_id, person_key, company_domain, data,
                            email_address, email_type, email_status, credits, quality_score, source)
    values (v_search.org_id, v_search.id, p_run, v_person_id, v_email_id, v_person_key, v_domain,
            jsonb_strip_nulls(jsonb_build_object(
              'company', v_lead -> 'company', 'person', v_lead -> 'person', 'email', v_lead -> 'email',
              'email_patterns', coalesce(v_lead -> 'email_patterns', '[]'::jsonb),
              'sources', v_lead -> 'sources', 'quality', v_lead -> 'quality', 'origin', v_lead -> 'origin',
              'signals', case when jsonb_array_length(v_signals) > 0 then v_signals end)),
            v_email_addr, v_type, v_status, v_credits,
            coalesce((v_lead #>> '{quality,score}')::integer, 0),
            case when p_source = 'warehouse' then 'warehouse' else 'engine' end)
    on conflict (org_id, person_key) do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      v_dup := v_dup + 1;
      continue;
    end if;

    v_new := v_new + 1;
    v_search.delivered := v_search.delivered + 1;
    v_search.credits_charged := v_search.credits_charged + v_credits;
  end loop;

  update searches set delivered = v_search.delivered, credits_charged = v_search.credits_charged
   where id = v_search.id;

  return jsonb_build_object(
    'new', v_new, 'delivered', v_search.delivered, 'quantity', v_search.quantity,
    'credits_charged', v_search.credits_charged,
    'skipped', jsonb_build_object('duplicates', v_dup, 'suppressed', v_suppressed, 'invalid', v_invalid,
                                  'company_full', v_company_full, 'over_budget', v_over, 'no_signal', v_no_signal,
                                  'beyond_quantity', v_beyond),
    'stocked', v_stocked);
end;
$$;

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
       and ((cardinality(s.industry) > 0 and c.tags @> s.industry)
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

-- Recupero una tantum: le schede dei lead già consegnati (la migliore per persona).
update public.people p
   set lead = x.data, email_id = x.email_id
  from (
    select distinct on (d.person_id) d.person_id, d.email_id,
           jsonb_strip_nulls((d.data - 'signals' - 'origin') || jsonb_build_object('email', (d.data -> 'email') - 'alternatives')) as data
      from public.deliveries d
      join public.emails e on e.id = d.email_id
     where d.person_id is not null
     order by d.person_id, (d.email_type = 'personal') desc, d.delivered_at desc
  ) x
 where p.id = x.person_id and p.lead is null;

revoke execute on function public.stock_lead(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.stock_lead(jsonb, jsonb) to service_role;
