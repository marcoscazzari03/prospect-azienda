-- Ricerche con la ricerca AI sul web: 1 credito in più a lead (deciso il 17/10). Sono le
-- ricerche in target con filtri che il database non sa verificare (dimensione, fatturato,
-- parole chiave, note) o fuori dall'Italia: le aziende le trova l'AI sul web e costano ~10
-- volte quelle dal database (prove del 17/10: ~0,135 EUR a lead contro ~0,012). Le ricerche
-- opportunità hanno già il prezzo del segnale.

create or replace function public.search_ai_extra(p_target jsonb)
returns integer language sql stable set search_path = public as $$
  select case when cardinality(search_signal_codes(p_target)) = 0
               and (not target_is_simple(p_target)
                    or exists (select 1 from jsonb_array_elements_text(coalesce(p_target -> 'countries', '[]')) c
                                where upper(c) <> 'IT'))
              then 1 else 0 end
$$;
revoke execute on function public.search_ai_extra(jsonb) from public, anon, authenticated;
grant execute on function public.search_ai_extra(jsonb) to service_role;

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
                             + signal_extra(v_prices, search_required_signals(p_target))
                             + search_ai_extra(p_target));
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
    -- Il nome del referente è un valore aggiunto: +1 credito sulle generiche con il nome
    -- (le nominative lo hanno già nel prezzo), entro il massimo della modalità.
    v_credits := least(lead_credits(v_search.email_mode, v_type, v_status)
                         + case when v_type = 'generic' and coalesce(trim(v_lead #>> '{person,full_name}'), '') <> '' then 1 else 0 end,
                       (select max_credits from email_modes where mode = v_search.email_mode))
                 + signal_extra(coalesce(v_search.signal_prices, signal_prices()),
                                array(select c from unnest(v_passed) c where c = any (v_required)))
                 + search_ai_extra(v_search.target);
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
