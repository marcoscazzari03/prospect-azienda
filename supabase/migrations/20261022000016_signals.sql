-- Segnali di bisogno, fase 3 (regole in docs/07-segnali.md):
--   * prove dei segnali per azienda (riusabili dal magazzino finché fresche);
--   * +1 credito per lead con segnale verificato, riservato alla creazione;
--   * consegna solo dei lead che hanno davvero il segnale richiesto;
--   * motivo di segnalazione "segnale non corretto" (wrong_signal).

-- Codici dei segnali verificati: devono coincidere con SIGNALS (level "verified")
-- in src/lib/domain/signals.ts (controllato da tests/signals-catalog.test.ts).
create or replace function public.verified_signal_codes()
returns text[] language sql immutable as $$
  select array['job_ad', 'no_https', 'no_mobile', 'outdated_cms', 'single_language']
$$;

-- Segnali richiesti da una ricerca (tutti, indicativi compresi) e quelli che decidono.
create or replace function public.search_signal_codes(p_target jsonb)
returns text[] language sql immutable set search_path = public as $$
  select case when jsonb_typeof(p_target #> '{signals,codes}') = 'array'
    then array(select distinct c from jsonb_array_elements_text(p_target #> '{signals,codes}') c order by c)
    else '{}'::text[] end
$$;

create or replace function public.search_required_signals(p_target jsonb)
returns text[] language sql immutable set search_path = public as $$
  select array(select c from unnest(search_signal_codes(p_target)) c where c = any (verified_signal_codes()) order by c)
$$;

-- I segnali passati di un lead soddisfano la ricerca? ("basta uno" o "servono tutti")
create or replace function public.signals_satisfy(p_target jsonb, p_passed text[])
returns boolean language sql immutable set search_path = public as $$
  select case
    when cardinality(search_required_signals(p_target)) = 0 then true
    when coalesce(p_target #>> '{signals,match}', 'any') = 'all' then search_required_signals(p_target) <@ coalesce(p_passed, '{}')
    else search_required_signals(p_target) && coalesce(p_passed, '{}')
  end
$$;

-- Freschezza di una prova: annunci pubblicati negli ultimi 60 giorni, segnali dal
-- sito controllati negli ultimi 30.
create or replace function public.signal_is_fresh(p_code text, p_evidence jsonb, p_checked_at timestamptz)
returns boolean language sql stable as $$
  select case
    when p_code = 'job_ad' then
      coalesce(p_evidence ->> 'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
      and (p_evidence ->> 'date')::date >= current_date - 60
      and p_checked_at > now() - interval '60 days'
    else p_checked_at > now() - interval '30 days'
  end
$$;

-- ---------------------------------------------------------------------------
-- Prove per azienda (mai leggibili dai clienti: le vedono solo nei lead consegnati)
-- ---------------------------------------------------------------------------

create table if not exists public.company_signals (
  company_id uuid not null references public.companies (id) on delete cascade,
  code text not null,
  evidence jsonb not null default '{}',
  checked_at timestamptz not null default now(),
  primary key (company_id, code)
);
create index if not exists company_signals_code_idx on public.company_signals (code, checked_at desc);
alter table public.company_signals enable row level security;
revoke all on public.company_signals from anon, authenticated;

-- Tecnologie del sito (filtro di segmentazione).
alter table public.companies add column if not exists technologies text[] not null default '{}';

-- Nuovo motivo di segnalazione.
alter table public.lead_reports drop constraint if exists lead_reports_reason_check;
alter table public.lead_reports add constraint lead_reports_reason_check
  check (reason in ('bounce', 'wrong_role', 'company_closed', 'out_of_target', 'duplicate', 'wrong_signal', 'other'));

-- ---------------------------------------------------------------------------
-- Creazione: con segnali verificati si riserva 1 credito in più per lead
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

  v_reserve := p_quantity * ((select max_credits from email_modes where mode = p_mode)
                             + case when cardinality(search_required_signals(p_target)) > 0 then 1 else 0 end);
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

-- ---------------------------------------------------------------------------
-- Consegna: segnale obbligatorio se richiesto, +1 credito, prove salvate
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

    v_credits := lead_credits(v_search.email_mode, v_type, v_status)
                 + case when cardinality(v_required) > 0 then 1 else 0 end;
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

-- ---------------------------------------------------------------------------
-- Magazzino: con segnali richiesti, solo aziende con prove fresche
-- ---------------------------------------------------------------------------

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
    select distinct on (d.person_key)
           p.id as person_id, p.job_title, d.person_key, d.data, d.delivered_at,
           e.id as email_id, e.address, e.type, e.status,
           least(p.last_verified_at, e.verified_at) as verified_at,
           sig.signals
      from s
      join deliveries d on true
      join people p on p.id = d.person_id
      join companies c on c.id = p.company_id
      join emails e on e.id = d.email_id
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
           'signals', pool.signals,
           'keys', jsonb_build_object('person_key', pool.person_key),
           'origin', jsonb_build_object('source', 'warehouse', 'verified_at', pool.verified_at),
           '_person_id', pool.person_id,
           '_email_id', pool.email_id)
    from pool
   order by coalesce((pool.data #>> '{quality,score}')::integer, 0) desc, pool.verified_at desc
   limit p_limit
$$;

-- ---------------------------------------------------------------------------
-- Rimborso "segnale non corretto": la prova non si rivende più
-- ---------------------------------------------------------------------------

create or replace function public.refund_report(p_report uuid, p_approve boolean, p_actor uuid default null)
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
    if v_report.reason = 'wrong_signal' then
      delete from company_signals cs
       using companies c
       where c.domain = v_delivery.company_domain and cs.company_id = c.id
         and cs.code in (select x ->> 'code' from jsonb_array_elements(coalesce(v_delivery.data -> 'signals', '[]'::jsonb)) x);
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

revoke execute on function
  public.verified_signal_codes(),
  public.search_signal_codes(jsonb),
  public.search_required_signals(jsonb),
  public.signals_satisfy(jsonb, text[]),
  public.signal_is_fresh(text, jsonb, timestamptz)
from public, anon, authenticated;

grant execute on function
  public.verified_signal_codes(),
  public.search_signal_codes(jsonb),
  public.search_required_signals(jsonb),
  public.signals_satisfy(jsonb, text[]),
  public.signal_is_fresh(text, jsonb, timestamptz)
to service_role;
