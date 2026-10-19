-- Moduli di contatto nella consegna (19/10) e ricostruzione del magazzino.
--
-- 1) Magazzino: la pulizia dei nomi del 18/10 ha cancellato tutta la tabella people, comprese
--    le schede «Solo azienda» senza nome (chiave «|dominio») che il magazzino usa per consegnare
--    subito le aziende già verificate. Le schede si ricostruiscono dalle email generiche del
--    dominio aziendale rimaste nel database: nessun dato di persone.
-- 2) deliver_leads: con l'opzione «Email aziendale o modulo di contatto» (target.contact =
--    'email_or_form', solo in «Solo azienda») si consegnano anche le aziende senza email ma con
--    il modulo di contatto sul loro sito (email_type 'form', nessuna email). Stesso prezzo.

create or replace function public.rebuild_company_stock()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_rows integer;
begin
  insert into public.people (company_id, person_key, full_name, discovery_url, first_seen_at, last_verified_at, lead, email_id)
  select distinct on (c.id)
         c.id, '|' || c.domain, '', c.website, e.first_seen_at, e.verified_at,
         jsonb_build_object(
           'company', jsonb_strip_nulls(jsonb_build_object(
             'name', c.name, 'domain', c.domain, 'website', c.website, 'country', c.country, 'city', c.city,
             'industry', c.industry, 'size_hint', c.size_hint, 'technologies', to_jsonb(coalesce(c.technologies, '{}')),
             'contact_form', nullif(c.contact_form_url, ''))),
           'person', jsonb_build_object('full_name', '', 'first_name', '', 'last_name', '', 'job_title', '', 'role_match', 'unknown', 'linkedin_url', ''),
           'email', jsonb_build_object('address', e.address, 'type', 'generic', 'status', e.status, 'source', e.source,
                                       'source_url', e.source_url, 'free_provider', false),
           'email_patterns', '[]'::jsonb,
           'sources', jsonb_build_object('discovery_url', c.website, 'contact_page', ''),
           'quality', jsonb_build_object('score', 63, 'checks', jsonb_build_object(
             'official_site', true, 'discovery_source', true, 'role_match', 'unknown', 'email_on_company_domain', true,
             'email_personal', false, 'email_verified', true))),
         e.id
    from public.emails e
    join public.companies c on c.id = e.company_id
   where e.type = 'generic'
     and e.status in ('found_public', 'validated')
     and e.bounce_reports = 0
     and public.email_on_domain(e.address, c.domain)
     and not exists (select 1 from public.people p where p.company_id = c.id)
   order by c.id,
            (split_part(e.address, '@', 1) in ('info', 'commerciale', 'sales', 'contatti', 'office')) desc,
            e.verified_at desc
  on conflict (person_key) do nothing;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
revoke all on function public.rebuild_company_stock() from public, anon, authenticated;
select public.rebuild_company_stock();

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
  v_solo_azienda boolean;
  v_moduli boolean;
  v_form_only boolean;
  v_form text;
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
  v_solo_azienda := v_search.email_mode = 'company_only';
  -- «Email aziendale o modulo di contatto» (solo in «Solo azienda»): si consegnano anche le
  -- aziende senza email ma con il modulo di contatto sul loro sito.
  v_moduli := v_solo_azienda and coalesce(v_search.target ->> 'contact', '') = 'email_or_form';

  for v_lead in select value from jsonb_array_elements(coalesce(p_leads, '[]'::jsonb)) loop
    v_email_addr := lower(trim(v_lead #>> '{email,address}'));
    v_domain := lower(trim(v_lead #>> '{company,domain}'));
    v_person_key := lower(trim(v_lead #>> '{keys,person_key}'));
    v_type := v_lead #>> '{email,type}';
    v_status := v_lead #>> '{email,status}';
    v_form_only := coalesce((v_lead ->> '_form_only')::boolean, false);

    if v_form_only then
      -- Lead con il solo modulo: ammesso solo se la ricerca lo chiede e se la pagina del
      -- modulo è sul sito dell'azienda. Nessuna email, nessuna persona, chiave dell'azienda.
      -- (Il callback li manda per ogni ricerca «Solo azienda»: senza l'opzione si ignorano.)
      if not v_moduli then continue; end if;
      v_form := lower(trim(coalesce(v_lead #>> '{company,contact_form}', '')));
      if v_domain is null or v_domain = ''
         or v_form !~ ('^https?://([a-z0-9-]+\.)*' || replace(v_domain, '.', '\.') || '(/|$)') then
        v_invalid := v_invalid + 1;
        continue;
      end if;
      v_email_addr := '';
      v_type := 'form';
      v_status := 'found_public';
      v_person_key := '|' || v_domain;
      v_company_id := null; v_person_id := null; v_email_id := null;
      v_lead := (v_lead - 'person' - 'email_patterns' - 'email' - '_form_only')
                || jsonb_build_object('person', jsonb_build_object('full_name', '', 'first_name', '', 'last_name', '', 'job_title', '', 'linkedin_url', ''),
                                      'email_patterns', '[]'::jsonb,
                                      'keys', jsonb_build_object('person_key', v_person_key));
    -- Difesa in profondità: mai email ipotizzate o tipi non vendibili.
    elsif v_email_addr is null or v_email_addr !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
       or v_domain is null or v_domain = '' or v_person_key is null or v_person_key = ''
       or v_type not in ('generic', 'personal') or v_status not in ('found_public', 'validated') then
      v_invalid := v_invalid + 1;
      continue;
    end if;

    -- Solo azienda: solo la casella generica del dominio aziendale, mai dati di persone
    -- (né nella consegna né nel magazzino). La chiave del lead è quella dell'azienda.
    if v_solo_azienda and not v_form_only then
      if v_type <> 'generic' or not email_on_domain(v_email_addr, v_domain) then
        v_invalid := v_invalid + 1;
        continue;
      end if;
      v_lead := (v_lead - 'person' - 'email_patterns')
                || jsonb_build_object('person', jsonb_build_object('full_name', '', 'first_name', '', 'last_name', '', 'job_title', '', 'linkedin_url', ''),
                                      'email_patterns', '[]'::jsonb,
                                      'email', (v_lead -> 'email') - 'alternatives');
      if left(v_person_key, 1) <> '|' then
        v_person_key := '|' || v_domain;
        v_lead := jsonb_set(v_lead, '{keys,person_key}', to_jsonb(v_person_key));
      end if;
    end if;

    if exists (select 1 from suppression_list
               where (v_email_addr <> '' and email_hash = sha256_hex(v_email_addr))
                  or domain_hash = sha256_hex(v_domain)
                  or (v_email_addr <> '' and domain_hash = sha256_hex(split_part(v_email_addr, '@', 2)))) then
      v_suppressed := v_suppressed + 1;
      continue;
    end if;

    -- Magazzino: ogni lead valido trovato dal motore si salva, anche se non viene
    -- consegnato (oltre la quantità, già avuto da questo cliente, senza il segnale,
    -- generica in una ricerca «solo nominative»...): altri clienti potranno riceverlo.
    -- (Il lead con il solo modulo non va nel magazzino: l'azienda e il modulo sono già nel
    -- database delle aziende e tornano dalla riserva.)
    if p_source <> 'warehouse' and not v_form_only then
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
      -- Solo azienda da una scheda con il referente: la consegna si lega alla scheda
      -- dell'azienda, se c'è, e mai alla persona.
      if v_solo_azienda then
        select p.id into v_person_id from people p where p.person_key = v_person_key;
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
