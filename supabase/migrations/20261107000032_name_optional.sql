-- Il nome del referente diventa un valore aggiunto (deciso il 17/10 dopo i collaudi:
-- nelle micro-imprese il titolare è pubblicato in ~1 sito su 8). «Email generiche incluse»
-- e «Mista» consegnano anche l'azienda senza nome con la sua email generica; una generica
-- con il nome costa 1 credito in più.

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

update public.email_modes set description =
  'Email aziendali verificate come info@ o sales@. Il nome del referente quando è sul sito (+1 credito).'
 where mode = 'generic_ok';
update public.email_modes set description =
  'Cerchiamo il referente sul sito e nei registri delle imprese; se non c''è, l''azienda con la sua email generica.'
 where mode = 'mixed';

-- Spesa del motore per una ricerca (AI, arricchimento, verifiche): il backend smette di
-- lanciare giri quando supera il budget della ricerca.
create or replace function public.search_cost_eur(p_search uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(rc.total_eur), 0) from run_costs rc join search_runs sr on sr.id = rc.run_id where sr.search_id = p_search
$$;
revoke all on function public.search_cost_eur(uuid) from public, anon, authenticated;

-- Piattaforme (prenotazioni, recensioni, delivery) registrate come «sito» dell'azienda: non
-- sono il sito ufficiale e non portano a referente o email dell'azienda.
create or replace function public.is_platform_domain(p_domain text)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(p_domain, '') ~* '(^|\.)(thefork|booking|accor|airbnb|expedia|hotels|trivago|agoda|tripadvisor|justeat|deliveroo|glovoapp|ubereats|facebook|instagram|google|wixsite|business\.site)\.[a-z.]+$'
$$;

create or replace function public.target_reserve(p_search uuid, p_exclude text[], p_limit integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'company_name', p.name, 'website', p.website, 'country', p.country, 'city', p.city,
           'industry', p.industry, 'size_hint', p.size_hint, 'technologies', to_jsonb(p.technologies),
           'source_url', p.website, 'contact_page', '', 'signals', '[]'::jsonb, 'origin', 'database')), '[]'::jsonb)
    from (select pool.* from searches se,
                 target_pool(se.org_id, se.target, se.contacts_per_company, p_exclude) pool
                 left join companies c on c.id = pool.id
           where se.id = p_search and not is_platform_domain(pool.domain)
           order by coalesce(c.referente_missed_at > now() - interval '90 days', false), pool.checked_at desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;
revoke all on function public.target_reserve(uuid, text[], integer) from public, anon, authenticated;

create or replace function public.opportunity_reserve(p_search uuid, p_exclude text[], p_limit integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'company_name', p.name, 'website', p.website, 'country', p.country, 'city', p.city,
           'industry', p.industry, 'size_hint', p.size_hint, 'technologies', to_jsonb(p.technologies),
           'source_url', coalesce(p.ad_url, p.website), 'contact_page', '',
           'signals', p.signals, 'origin', 'database')), '[]'::jsonb)
    from (select pool.* from searches se,
                 opportunity_pool(se.org_id, se.target, se.contacts_per_company, p_exclude) pool
                 left join companies c on c.id = pool.id
           where se.id = p_search and not is_platform_domain(pool.domain)
           order by coalesce(c.referente_missed_at > now() - interval '90 days', false), pool.latest desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;
revoke all on function public.opportunity_reserve(uuid, text[], integer) from public, anon, authenticated;
