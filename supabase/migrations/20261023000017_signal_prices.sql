-- Prezzo dei segnali modificabile dall'admin («Prezzi e costi»): crediti in più
-- per i lead con segnali dal sito e per quelli con annuncio di lavoro.
-- Ogni ricerca salva i prezzi validi alla creazione (searches.signal_prices).

insert into public.app_settings (key, value) values ('signal_extra_credits', '{"website": 1, "job_ad": 1}')
on conflict (key) do nothing;

alter table public.searches add column if not exists signal_prices jsonb;

-- Prezzi correnti (valori mancanti o non validi: 1 credito).
create or replace function public.signal_prices()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'website', greatest(0, least(10, coalesce((s.value ->> 'website')::int, 1))),
    'job_ad', greatest(0, least(10, coalesce((s.value ->> 'job_ad')::int, 1))))
    from (select (select value from app_settings where key = 'signal_extra_credits') as value) s
$$;

-- Crediti in più per un insieme di segnali: il più alto tra quelli verificati.
create or replace function public.signal_extra(p_prices jsonb, p_codes text[])
returns integer language sql immutable set search_path = public as $$
  select coalesce(max(case when c = 'job_ad' then (p_prices ->> 'job_ad')::int else (p_prices ->> 'website')::int end), 0)::integer
    from unnest(coalesce(p_codes, '{}')) c
   where p_prices is not null and c = any (verified_signal_codes())
$$;

create or replace function public.create_search(
  p_user uuid, p_org uuid, p_name text, p_target jsonb, p_mode text,
  p_quantity integer, p_contacts_per_company integer default 1
) returns public.searches language plpgsql security definer set search_path = public as $$
declare
  v_org organizations%rowtype;
  v_plan plans%rowtype;
  v_reserve integer;
  v_active integer;
  v_search searches%rowtype;
  v_prices jsonb;
begin
  if not exists (select 1 from memberships where org_id = p_org and user_id = p_user) then
    raise exception 'NOT_MEMBER';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_org::text));

  select * into v_org from organizations where id = p_org;
  if v_org.status <> 'active' then raise exception 'ORG_SUSPENDED'; end if;
  select * into v_plan from plans where id = v_org.plan_id;

  if p_quantity < 1 or p_quantity > v_plan.max_quantity_per_search then
    raise exception 'QUANTITY_LIMIT:%', v_plan.max_quantity_per_search;
  end if;

  select count(*) into v_active from searches where org_id = p_org and status in ('queued', 'running');
  if v_active >= v_plan.max_active_searches then
    raise exception 'ACTIVE_LIMIT:%', v_plan.max_active_searches;
  end if;

  -- Prezzi dei segnali fissati alla creazione: una modifica dell'admin non cambia le ricerche avviate.
  v_prices := case when cardinality(search_required_signals(p_target)) > 0 then signal_prices() end;
  v_reserve := p_quantity * ((select max_credits from email_modes where mode = p_mode)
                             + signal_extra(v_prices, search_required_signals(p_target)));
  if v_reserve is null then raise exception 'INVALID_MODE'; end if;
  if org_available_credits(p_org) < v_reserve then
    raise exception 'INSUFFICIENT_CREDITS:%', v_reserve;
  end if;

  insert into searches (org_id, created_by, name, target, email_mode, quantity, contacts_per_company, credits_reserved, signal_prices)
  values (p_org, p_user, left(p_name, 120), p_target, p_mode, p_quantity, p_contacts_per_company, v_reserve, v_prices)
  returning * into v_search;

  insert into credit_ledger (org_id, delta, kind, description, search_id, created_by)
  values (p_org, -v_reserve, 'reserve', 'Riserva per la ricerca "' || v_search.name || '"', v_search.id, p_user);

  insert into search_events (search_id, stage, message, counters)
  values (v_search.id, 'queued', 'Ricerca in coda', jsonb_build_object('credits_reserved', v_reserve));

  return v_search;
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
  v_tech text[];
  v_new integer := 0;
  v_dup integer := 0;
  v_suppressed integer := 0;
  v_invalid integer := 0;
  v_company_full integer := 0;
  v_over integer := 0;
  v_no_signal integer := 0;
  v_rows integer;
begin
  select * into v_search from searches where id = p_search for update;
  v_codes := search_signal_codes(v_search.target);
  v_required := search_required_signals(v_search.target);

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
    else
      v_tech := case when jsonb_typeof(v_lead #> '{company,technologies}') = 'array'
                     then array(select t from jsonb_array_elements_text(v_lead #> '{company,technologies}') t limit 10)
                     else '{}'::text[] end;
      insert into companies as c (domain, name, website, country, city, industry, size_hint, technologies)
      values (v_domain,
              coalesce(nullif(v_lead #>> '{company,name}', ''), v_domain),
              coalesce(nullif(v_lead #>> '{company,website}', ''), 'https://' || v_domain),
              coalesce(v_lead #>> '{company,country}', ''), coalesce(v_lead #>> '{company,city}', ''),
              coalesce(v_lead #>> '{company,industry}', ''), coalesce(v_lead #>> '{company,size_hint}', ''),
              v_tech)
      on conflict (domain) do update
        set name = excluded.name, website = excluded.website,
            country = coalesce(nullif(excluded.country, ''), c.country),
            city = coalesce(nullif(excluded.city, ''), c.city),
            industry = coalesce(nullif(excluded.industry, ''), c.industry),
            size_hint = coalesce(nullif(excluded.size_hint, ''), c.size_hint),
            technologies = case when cardinality(excluded.technologies) > 0 then excluded.technologies else c.technologies end,
            last_verified_at = now()
      returning id into v_company_id;
      perform tag_company(v_company_id, v_search.target);

      -- Prove nuove dal motore: riusabili dal magazzino finché fresche.
      insert into company_signals as cs (company_id, code, evidence, checked_at)
      select v_company_id, x ->> 'code', x -> 'evidence', now()
        from jsonb_array_elements(v_signals) x
      on conflict (company_id, code) do update set evidence = excluded.evidence, checked_at = excluded.checked_at;

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
                                  'company_full', v_company_full, 'over_budget', v_over, 'no_signal', v_no_signal));
end;
$$;

revoke execute on function public.signal_prices(), public.signal_extra(jsonb, text[]) from public, anon, authenticated;
grant execute on function public.signal_prices(), public.signal_extra(jsonb, text[]) to service_role;
