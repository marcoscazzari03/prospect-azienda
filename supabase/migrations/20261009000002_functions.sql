-- Funzioni transazionali. Tutte SECURITY DEFINER ed eseguibili SOLO dal
-- service role (le API del server): il browser non può chiamarle.

create or replace function public.sha256_hex(p text)
returns text language sql immutable as $$
  select encode(sha256(convert_to(lower(trim(p)), 'UTF8')), 'hex')
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where org_id = p_org and user_id = auth.uid())
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where user_id = auth.uid()), false)
$$;

create or replace function public.org_available_credits(p_org uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::integer from credit_ledger where org_id = p_org
$$;

-- Crediti per un lead consegnato, limitati dal massimo della modalità scelta.
create or replace function public.lead_credits(p_mode text, p_type text, p_status text)
returns integer language sql stable set search_path = public as $$
  select least(
    coalesce((select credits from credit_prices where email_type = p_type and email_status = p_status), 1),
    (select max_credits from email_modes where mode = p_mode)
  )
$$;

-- ---------------------------------------------------------------------------
-- Registrazione: profilo + organizzazione + crediti di benvenuto
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_name text;
  v_free plans%rowtype;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company'), ''), split_part(new.email, '@', 2), 'La mia azienda');

  insert into profiles (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into organizations (name) values (v_name) returning id into v_org;
  insert into memberships (org_id, user_id, role) values (v_org, new.id, 'owner');

  select * into v_free from plans where id = 'free';
  if found and v_free.credits > 0 then
    insert into credit_ledger (org_id, delta, kind, description, external_ref, expires_at)
    values (v_org, v_free.credits, 'grant', 'Crediti di benvenuto', 'welcome:' || v_org,
            now() + make_interval(months => v_free.credits_valid_months));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Accrediti (acquisti, abbonamenti, regali, rettifiche) idempotenti
-- ---------------------------------------------------------------------------

create or replace function public.grant_credits(
  p_org uuid, p_delta integer, p_kind text, p_description text,
  p_external_ref text default null, p_expires_at timestamptz default null, p_actor uuid default null
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('grant', 'purchase', 'subscription', 'refund', 'adjust', 'expire') then
    raise exception 'kind non ammesso: %', p_kind;
  end if;
  perform pg_advisory_xact_lock(hashtext(p_org::text));
  if p_delta < 0 and org_available_credits(p_org) + p_delta < 0 then
    raise exception 'saldo insufficiente per la rettifica';
  end if;
  insert into credit_ledger (org_id, delta, kind, description, external_ref, expires_at, created_by)
  values (p_org, p_delta, p_kind, p_description, p_external_ref, p_expires_at, p_actor)
  on conflict (external_ref) where external_ref is not null do nothing;
  if found and p_actor is not null then
    insert into audit_log (actor_id, action, target, metadata)
    values (p_actor, 'credits.' || p_kind, p_org::text, jsonb_build_object('delta', p_delta, 'description', p_description));
  end if;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Creazione ricerca: verifica limiti e RISERVA i crediti massimi
-- ---------------------------------------------------------------------------

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

  v_reserve := p_quantity * (select max_credits from email_modes where mode = p_mode);
  if v_reserve is null then raise exception 'INVALID_MODE'; end if;
  if org_available_credits(p_org) < v_reserve then
    raise exception 'INSUFFICIENT_CREDITS:%', v_reserve;
  end if;

  insert into searches (org_id, created_by, name, target, email_mode, quantity, contacts_per_company, credits_reserved)
  values (p_org, p_user, left(p_name, 120), p_target, p_mode, p_quantity, p_contacts_per_company, v_reserve)
  returning * into v_search;

  insert into credit_ledger (org_id, delta, kind, description, search_id, created_by)
  values (p_org, -v_reserve, 'reserve', 'Riserva per la ricerca "' || v_search.name || '"', v_search.id, p_user);

  insert into search_events (search_id, stage, message, counters)
  values (v_search.id, 'queued', 'Ricerca in coda', jsonb_build_object('credits_reserved', v_reserve));

  return v_search;
end;
$$;

-- Nuovo giro del motore (il primo o un top-up).
create or replace function public.start_run(p_search uuid, p_token_hash text, p_requested integer)
returns public.search_runs language plpgsql security definer set search_path = public as $$
declare
  v_search searches%rowtype;
  v_run search_runs%rowtype;
begin
  select * into v_search from searches where id = p_search for update;
  if v_search.status not in ('queued', 'running') then raise exception 'SEARCH_CLOSED'; end if;

  insert into search_runs (search_id, attempt, run_token_hash, requested)
  values (p_search, v_search.attempts + 1, p_token_hash, p_requested)
  returning * into v_run;

  update searches
     set attempts = attempts + 1, status = 'running', started_at = coalesce(started_at, now())
   where id = p_search;
  return v_run;
end;
$$;

-- Verifica del token di un giro (confronto sugli hash, in SQL).
create or replace function public.check_run(p_run uuid, p_token_hash text)
returns public.search_runs language sql stable security definer set search_path = public as $$
  select * from search_runs where id = p_run and run_token_hash = p_token_hash
$$;

create or replace function public.record_engine_progress(
  p_run uuid, p_token_hash text, p_stage text, p_message text, p_counters jsonb
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_run search_runs%rowtype;
begin
  select * into v_run from check_run(p_run, p_token_hash);
  if v_run.id is null or v_run.status not in ('dispatched', 'running') then return false; end if;
  update search_runs set status = 'running', last_event_at = now() where id = p_run;
  insert into search_events (search_id, run_id, stage, message, counters)
  values (v_run.search_id, p_run, left(p_stage, 40), left(coalesce(p_message, ''), 300), coalesce(p_counters, '{}'::jsonb));
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Risultati del motore: deduplica per cliente, opposizioni, magazzino,
-- consegne e addebito per lead. Idempotente (un solo "results" per giro).
-- ---------------------------------------------------------------------------

create or replace function public.apply_engine_results(p_run uuid, p_token_hash text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_run search_runs%rowtype;
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

  for v_lead in select value from jsonb_array_elements(coalesce(p_payload -> 'leads', '[]'::jsonb)) loop
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

    -- Magazzino
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

    insert into deliveries (org_id, search_id, run_id, person_id, email_id, person_key, company_domain, data,
                            email_address, email_type, email_status, credits, quality_score)
    values (v_search.org_id, v_search.id, p_run, v_person_id, v_email_id, v_person_key, v_domain,
            jsonb_build_object(
              'company', v_lead -> 'company', 'person', v_lead -> 'person', 'email', v_lead -> 'email',
              'email_patterns', coalesce(v_lead -> 'email_patterns', '[]'::jsonb),
              'sources', v_lead -> 'sources', 'quality', v_lead -> 'quality'),
            v_email_addr, v_type, v_status, v_credits,
            coalesce((v_lead #>> '{quality,score}')::integer, 0))
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
          v_new || ' nuovi lead consegnati',
          jsonb_build_object('new', v_new, 'delivered', v_search.delivered, 'quantity', v_search.quantity,
                             'duplicates', v_dup, 'suppressed', v_suppressed));

  return jsonb_build_object(
    'ok', true, 'search_id', v_search.id, 'org_id', v_search.org_id,
    'new', v_new, 'delivered', v_search.delivered, 'quantity', v_search.quantity,
    'remaining', v_search.quantity - v_search.delivered, 'attempts', v_search.attempts,
    'credits_charged', v_search.credits_charged, 'credits_reserved', v_search.credits_reserved,
    'skipped', jsonb_build_object('duplicates', v_dup, 'suppressed', v_suppressed, 'invalid', v_invalid,
                                  'company_full', v_company_full, 'over_budget', v_over));
end;
$$;

-- Chiusura: stato finale e restituzione dei crediti riservati non usati.
create or replace function public.finalize_search(p_search uuid, p_error text default null)
returns public.searches language plpgsql security definer set search_path = public as $$
declare
  v_search searches%rowtype;
  v_release integer;
  v_status text;
begin
  select * into v_search from searches where id = p_search for update;
  if v_search.status not in ('queued', 'running') then return v_search; end if;

  v_status := case
    when v_search.delivered >= v_search.quantity then 'completed'
    when v_search.delivered > 0 then 'partial'
    when p_error is not null then 'failed'
    else 'partial'
  end;

  v_release := v_search.credits_reserved - v_search.credits_charged;
  if v_release > 0 then
    insert into credit_ledger (org_id, delta, kind, description, search_id)
    values (v_search.org_id, v_release, 'release',
            'Crediti non usati restituiti ("' || v_search.name || '")', v_search.id);
  end if;

  update search_runs set status = 'failed', error = coalesce(p_error, 'chiusa'), finished_at = now()
   where search_id = p_search and status in ('dispatched', 'running');

  update searches set status = v_status, error = p_error, finished_at = now()
   where id = p_search
   returning * into v_search;

  insert into search_events (search_id, stage, message, counters)
  values (p_search, v_status,
          case v_status
            when 'completed' then 'Ricerca completata'
            when 'failed' then 'Ricerca non riuscita: crediti restituiti'
            else 'Ricerca conclusa con ' || v_search.delivered || ' lead su ' || v_search.quantity || ': crediti non usati restituiti'
          end,
          jsonb_build_object('delivered', v_search.delivered, 'credits_charged', v_search.credits_charged,
                             'credits_released', greatest(v_release, 0)));
  return v_search;
end;
$$;

-- Rimborso di un lead segnalato (automatico entro soglia o deciso dall'admin).
create or replace function public.refund_report(p_report uuid, p_actor uuid, p_approve boolean)
returns public.lead_reports language plpgsql security definer set search_path = public as $$
declare
  v_report lead_reports%rowtype;
  v_delivery deliveries%rowtype;
begin
  select * into v_report from lead_reports where id = p_report for update;
  if v_report.status <> 'open' then return v_report; end if;
  select * into v_delivery from deliveries where id = v_report.delivery_id;

  if p_approve then
    insert into credit_ledger (org_id, delta, kind, description, search_id, external_ref, created_by)
    values (v_report.org_id, v_delivery.credits, 'refund',
            'Rimborso lead segnalato (' || v_report.reason || ')', v_delivery.search_id,
            'report:' || v_report.id, p_actor)
    on conflict (external_ref) where external_ref is not null do nothing;
    if v_report.reason = 'bounce' and v_delivery.email_id is not null then
      update emails set bounce_reports = bounce_reports + 1 where id = v_delivery.email_id;
    end if;
  end if;

  update lead_reports
     set status = case when p_approve then 'refunded' else 'rejected' end,
         refund_credits = case when p_approve then v_delivery.credits else 0 end,
         resolved_at = now(), resolved_by = p_actor
   where id = p_report
   returning * into v_report;
  return v_report;
end;
$$;

-- Le funzioni che toccano crediti e consegne sono riservate al server.
revoke execute on function
  public.grant_credits(uuid, integer, text, text, text, timestamptz, uuid),
  public.create_search(uuid, uuid, text, jsonb, text, integer, integer),
  public.start_run(uuid, text, integer),
  public.check_run(uuid, text),
  public.record_engine_progress(uuid, text, text, text, jsonb),
  public.apply_engine_results(uuid, text, jsonb),
  public.finalize_search(uuid, text),
  public.refund_report(uuid, uuid, boolean),
  public.org_available_credits(uuid)
from public, anon, authenticated;

grant execute on function
  public.grant_credits(uuid, integer, text, text, text, timestamptz, uuid),
  public.create_search(uuid, uuid, text, jsonb, text, integer, integer),
  public.start_run(uuid, text, integer),
  public.check_run(uuid, text),
  public.record_engine_progress(uuid, text, text, text, jsonb),
  public.apply_engine_results(uuid, text, jsonb),
  public.finalize_search(uuid, text),
  public.refund_report(uuid, uuid, boolean),
  public.org_available_credits(uuid)
to service_role;
