-- Magazzino dei lead: i contatti già trovati per un cliente possono essere
-- consegnati subito ad altri clienti con lo stesso target, senza costi del
-- motore. Regole: dati recenti (riverificati entro N giorni), nessun bounce,
-- nessun rimborso per ruolo/azienda/target sbagliato, opposizioni rispettate,
-- mai due volte lo stesso contatto allo stesso cliente.

-- ---------------------------------------------------------------------------
-- Termini normalizzati per confrontare settori e zone scritti a mano.
-- "Studi legali" -> {legal}; "Software house" -> {softwar, hous}.
-- ---------------------------------------------------------------------------

create or replace function public.term_stems(p text)
returns text[] language sql immutable set search_path = public as $$
  select coalesce(array_agg(distinct case when length(w) >= 5 then regexp_replace(w, '[aeio]$', '') else w end), '{}')
    from regexp_split_to_table(
           regexp_replace(
             lower(translate(coalesce(p, ''), 'àáâäèéêëìíîïòóôöùúûüçñÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜÇÑ',
                                              'aaaaeeeeiiiioooouuuucnaaaaeeeeiiiioooouuuucn')),
             '[^a-z0-9]+', ' ', 'g'),
           ' ') as w
   where length(w) >= 3
     and w not in ('del', 'dei', 'della', 'delle', 'degli', 'dell', 'nel', 'nella', 'nelle', 'per', 'con', 'tra', 'fra',
                   'and', 'the', 'for', 'with', 'azienda', 'aziende', 'societa', 'impresa', 'imprese', 'settore',
                   'studio', 'studi', 'srl', 'spa', 'snc', 'sas', 'ltd', 'gmbh', 'company', 'companies',
                   'piccole', 'medie', 'grandi', 'pmi', 'italia', 'italiane', 'italiani', 'italiana', 'italiano')
$$;

alter table public.companies
  add column if not exists country_code text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists places text[] not null default '{}';
create index if not exists companies_tags_idx on public.companies using gin (tags);

alter table public.deliveries
  add column if not exists source text not null default 'engine' check (source in ('engine', 'warehouse'));
create index if not exists deliveries_person_key_idx on public.deliveries (person_key);

-- Etichette di un'azienda in base alla ricerca che l'ha trovata. Paese e zona
-- solo se la ricerca ne indicava uno solo (altrimenti non sappiamo quale).
create or replace function public.tag_company(p_company uuid, p_target jsonb)
returns void language sql security definer set search_path = public as $$
  update companies c
     set tags = array(select distinct unnest(c.tags || term_stems(p_target ->> 'industry') || term_stems(c.industry))),
         places = array(select distinct unnest(
                    c.places || term_stems(c.city)
                    || case when jsonb_array_length(coalesce(p_target -> 'regions', '[]')) = 1
                            then term_stems(p_target -> 'regions' ->> 0) else '{}'::text[] end)),
         country_code = case when jsonb_array_length(coalesce(p_target -> 'countries', '[]')) = 1
                             then upper(p_target -> 'countries' ->> 0) else c.country_code end
   where c.id = p_company
$$;

-- ---------------------------------------------------------------------------
-- Consegna di un lotto di lead a una ricerca (dal motore o dal magazzino):
-- deduplica per cliente, opposizioni, limite per azienda, budget, addebito.
-- ---------------------------------------------------------------------------

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
  v_new integer := 0;
  v_dup integer := 0;
  v_suppressed integer := 0;
  v_invalid integer := 0;
  v_company_full integer := 0;
  v_over integer := 0;
  v_rows integer;
begin
  select * into v_search from searches where id = p_search for update;

  for v_lead in select value from jsonb_array_elements(coalesce(p_leads, '[]'::jsonb)) loop
    exit when v_search.delivered >= v_search.quantity;

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

    if v_search.email_mode = 'personal_only' and v_type <> 'personal' then
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

    if exists (select 1 from deliveries where org_id = v_search.org_id and person_key = v_person_key) then
      v_dup := v_dup + 1;
      continue;
    end if;

    if (select count(*) from deliveries where search_id = v_search.id and company_domain = v_domain)
       >= v_search.contacts_per_company then
      v_company_full := v_company_full + 1;
      continue;
    end if;

    v_credits := lead_credits(v_search.email_mode, v_type, v_status);
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
    else
      insert into companies as c (domain, name, website, country, city, industry, size_hint)
      values (v_domain,
              coalesce(nullif(v_lead #>> '{company,name}', ''), v_domain),
              coalesce(nullif(v_lead #>> '{company,website}', ''), 'https://' || v_domain),
              coalesce(v_lead #>> '{company,country}', ''), coalesce(v_lead #>> '{company,city}', ''),
              coalesce(v_lead #>> '{company,industry}', ''), coalesce(v_lead #>> '{company,size_hint}', ''))
      on conflict (domain) do update
        set name = excluded.name, website = excluded.website,
            country = coalesce(nullif(excluded.country, ''), c.country),
            city = coalesce(nullif(excluded.city, ''), c.city),
            industry = coalesce(nullif(excluded.industry, ''), c.industry),
            size_hint = coalesce(nullif(excluded.size_hint, ''), c.size_hint),
            last_verified_at = now()
      returning id into v_company_id;
      perform tag_company(v_company_id, v_search.target);

      insert into people as p (company_id, person_key, full_name, first_name, last_name, job_title, linkedin_url, discovery_url)
      values (v_company_id, v_person_key,
              coalesce(v_lead #>> '{person,full_name}', ''), coalesce(v_lead #>> '{person,first_name}', ''),
              coalesce(v_lead #>> '{person,last_name}', ''), coalesce(v_lead #>> '{person,job_title}', ''),
              coalesce(v_lead #>> '{person,linkedin_url}', ''), coalesce(v_lead #>> '{sources,discovery_url}', ''))
      on conflict (person_key) do update
        set company_id = excluded.company_id, full_name = excluded.full_name,
            job_title = coalesce(nullif(excluded.job_title, ''), p.job_title),
            linkedin_url = coalesce(nullif(excluded.linkedin_url, ''), p.linkedin_url),
            discovery_url = coalesce(nullif(excluded.discovery_url, ''), p.discovery_url),
            last_verified_at = now()
      returning id into v_person_id;

      insert into emails as e (company_id, person_id, address, type, status, source, source_url)
      values (v_company_id, case when v_type = 'personal' then v_person_id end, v_email_addr, v_type, v_status,
              case when (v_lead #>> '{email,source}') = 'enrichment' then 'enrichment' else 'website' end,
              coalesce(v_lead #>> '{email,source_url}', ''))
      on conflict (address) do update
        set status = case when e.status = 'validated' then e.status else excluded.status end,
            source_url = coalesce(nullif(excluded.source_url, ''), e.source_url),
            verified_at = now()
      returning id into v_email_id;
    end if;

    insert into deliveries (org_id, search_id, run_id, person_id, email_id, person_key, company_domain, data,
                            email_address, email_type, email_status, credits, quality_score, source)
    values (v_search.org_id, v_search.id, p_run, v_person_id, v_email_id, v_person_key, v_domain,
            jsonb_strip_nulls(jsonb_build_object(
              'company', v_lead -> 'company', 'person', v_lead -> 'person', 'email', v_lead -> 'email',
              'email_patterns', coalesce(v_lead -> 'email_patterns', '[]'::jsonb),
              'sources', v_lead -> 'sources', 'quality', v_lead -> 'quality', 'origin', v_lead -> 'origin')),
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
                                  'company_full', v_company_full, 'over_budget', v_over));
end;
$$;

-- Risultati del motore: stessa logica di prima, consegna tramite deliver_leads.
create or replace function public.apply_engine_results(p_run uuid, p_token_hash text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_run search_runs%rowtype;
  v_search searches%rowtype;
  v_res jsonb;
begin
  select * into v_run from check_run(p_run, p_token_hash);
  if v_run.id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_token');
  end if;
  if v_run.status not in ('dispatched', 'running') then
    return jsonb_build_object('ok', false, 'reason', 'already_processed', 'search_id', v_run.search_id);
  end if;

  select * into v_search from searches where id = v_run.search_id for update;
  if v_search.status not in ('queued', 'running') then
    update search_runs set status = 'completed', finished_at = now(), stats = p_payload -> 'stats', usage = p_payload -> 'usage'
     where id = p_run;
    return jsonb_build_object('ok', false, 'reason', 'search_closed', 'search_id', v_search.id);
  end if;

  v_res := deliver_leads(v_search.id, p_run, p_payload -> 'leads', 'engine');

  update search_runs
     set status = 'completed', finished_at = now(), last_event_at = now(),
         stats = p_payload -> 'stats', usage = p_payload -> 'usage',
         n8n_execution_id = p_payload ->> 'n8n_execution_id'
   where id = p_run;

  -- Costi del giro (unità riportate dal motore x costi unitari correnti).
  insert into run_costs (run_id, provider, units, unit_cost_eur, total_eur)
  select p_run, r.provider, u.units, r.unit_cost_eur, round(u.units * r.unit_cost_eur, 4)
    from (values
      ('openai_search_lot', coalesce((p_payload #>> '{usage,ai_search_calls}')::numeric, 0)),
      ('openai_planner', coalesce((p_payload #>> '{usage,ai_planner_calls}')::numeric, 0)),
      ('rocketreach_lookup', coalesce((p_payload #>> '{usage,enrichment_lookups}')::numeric, 0)),
      ('page_fetch', coalesce((p_payload #>> '{usage,pages_fetched}')::numeric, 0))
    ) as u (provider, units)
    join cost_rates r on r.provider = u.provider
   where u.units > 0;

  insert into search_events (search_id, run_id, stage, message, counters)
  values (v_search.id, p_run, 'delivered',
          (v_res ->> 'new') || ' nuovi lead consegnati',
          jsonb_build_object('new', (v_res ->> 'new')::int, 'delivered', (v_res ->> 'delivered')::int,
                             'quantity', v_search.quantity,
                             'duplicates', (v_res #>> '{skipped,duplicates}')::int,
                             'suppressed', (v_res #>> '{skipped,suppressed}')::int));

  return v_res || jsonb_build_object(
    'ok', true, 'search_id', v_search.id, 'org_id', v_search.org_id,
    'remaining', v_search.quantity - (v_res ->> 'delivered')::int, 'attempts', v_search.attempts,
    'credits_reserved', v_search.credits_reserved);
end;
$$;

-- ---------------------------------------------------------------------------
-- Ricerca nel magazzino per una ricerca. Il ruolo viene filtrato dal server
-- (stesse regole del motore); qui tutto il resto.
-- ---------------------------------------------------------------------------

create or replace function public.warehouse_candidates(
  p_search uuid, p_max_age_days integer default 180, p_limit integer default 500, p_only uuid[] default null
) returns table (person_id uuid, job_title text, lead jsonb)
language sql stable security definer set search_path = public as $$
  with s as (
    select se.org_id, se.email_mode, se.contacts_per_company, se.target,
           term_stems(se.target ->> 'industry') as industry,
           array(select upper(x) from jsonb_array_elements_text(coalesce(se.target -> 'countries', '[]')) x) as countries
      from searches se where se.id = p_search
  ),
  pool as (
    select distinct on (d.person_key)
           p.id as person_id, p.job_title, d.person_key, d.data, d.delivered_at,
           e.id as email_id, e.address, e.type, e.status,
           least(p.last_verified_at, e.verified_at) as verified_at
      from s
      join deliveries d on true
      join people p on p.id = d.person_id
      join companies c on c.id = p.company_id
      join emails e on e.id = d.email_id
     where (p_only is null or p.id = any (p_only))
       -- Mai ciò che il cliente ha già (e, con 1 contatto per azienda, le sue aziende).
       and not exists (select 1 from deliveries x where x.org_id = s.org_id and x.person_key = d.person_key)
       and (s.contacts_per_company > 1
            or not exists (select 1 from deliveries x where x.org_id = s.org_id and x.company_domain = d.company_domain))
       -- Dati recenti e affidabili.
       and p.last_verified_at > now() - make_interval(days => p_max_age_days)
       and e.verified_at > now() - make_interval(days => p_max_age_days)
       and e.bounce_reports = 0
       and e.status in ('found_public', 'validated')
       and (s.email_mode <> 'personal_only' or e.type = 'personal')
       and not exists (
         select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
          where r.status = 'refunded'
            and (x.person_key = d.person_key or (r.reason = 'company_closed' and x.company_domain = d.company_domain)))
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
     order by d.person_key, (e.type = 'personal') desc, d.delivered_at desc
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
           'keys', jsonb_build_object('person_key', pool.person_key),
           'origin', jsonb_build_object('source', 'warehouse', 'verified_at', pool.verified_at),
           '_person_id', pool.person_id,
           '_email_id', pool.email_id)
    from pool
   order by coalesce((pool.data #>> '{quality,score}')::integer, 0) desc, pool.verified_at desc
   limit p_limit
$$;

-- Consegna dal magazzino dei contatti scelti dal server (nell'ordine dato),
-- con il ruolo ricalcolato sul target della nuova ricerca.
create or replace function public.deliver_from_warehouse(p_search uuid, p_picks jsonb, p_max_age_days integer default 180)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_search searches%rowtype;
  v_leads jsonb;
  v_res jsonb;
begin
  select * into v_search from searches where id = p_search for update;
  if v_search.status not in ('queued', 'running') then
    return jsonb_build_object('ok', false, 'reason', 'search_closed', 'new', 0);
  end if;

  select coalesce(jsonb_agg(
           jsonb_set(w.lead, '{person,role_match}', to_jsonb(coalesce(pk.value ->> 'role_match', 'exact')))
           order by pk.ord), '[]'::jsonb)
    into v_leads
    from jsonb_array_elements(coalesce(p_picks, '[]'::jsonb)) with ordinality as pk (value, ord)
    join warehouse_candidates(
           p_search, p_max_age_days, 1000,
           array(select (x ->> 'person_id')::uuid from jsonb_array_elements(coalesce(p_picks, '[]'::jsonb)) x)) w
      on w.person_id = (pk.value ->> 'person_id')::uuid;

  v_res := deliver_leads(p_search, null, v_leads, 'warehouse');

  if (v_res ->> 'new')::int > 0 then
    insert into search_events (search_id, stage, message, counters)
    values (p_search, 'warehouse',
            (v_res ->> 'new') || ' lead consegnati subito dal nostro archivio',
            jsonb_build_object('new', (v_res ->> 'new')::int, 'delivered', (v_res ->> 'delivered')::int,
                               'quantity', v_search.quantity));
  end if;
  return v_res || jsonb_build_object('ok', true);
end;
$$;

-- Etichette per le aziende già in magazzino, dalle ricerche che le hanno trovate.
do $$
declare r record;
begin
  for r in
    select distinct p.company_id, s.target
      from deliveries d join people p on p.id = d.person_id join searches s on s.id = d.search_id
  loop
    perform tag_company(r.company_id, r.target);
  end loop;
end $$;

revoke execute on function
  public.tag_company(uuid, jsonb),
  public.deliver_leads(uuid, uuid, jsonb, text),
  public.warehouse_candidates(uuid, integer, integer, uuid[]),
  public.deliver_from_warehouse(uuid, jsonb, integer)
from public, anon, authenticated;

grant execute on function
  public.tag_company(uuid, jsonb),
  public.deliver_leads(uuid, uuid, jsonb, text),
  public.warehouse_candidates(uuid, integer, integer, uuid[]),
  public.deliver_from_warehouse(uuid, jsonb, integer)
to service_role;
