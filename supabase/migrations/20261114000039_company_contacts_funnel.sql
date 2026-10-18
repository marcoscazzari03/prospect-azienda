-- Grandi aziende, moduli di contatto e qualità del database (18/10, dopo la seconda valutazione).
--
-- 1) La regola «6+ annunci o annunci in 3+ regioni» non esclude più: può essere una PMI che
--    cresce. Diventa una priorità più bassa nella riserva (is_busy_hirer). Esclusione
--    automatica solo per l'elenco large_companies, 201+ dipendenti, banche e assicurazioni.
-- 2) Modulo di contatto: il motore lo rileva sulle pagine del sito e lo salva in
--    companies.contact_form_url. Per ora non cambia la consegna: serve a valutare se
--    consegnare anche le aziende senza email ma con il modulo.
-- 3) database_funnel(): aziende raccolte, con sito e settore, con un contatto aziendale,
--    con opportunità recenti (riquadro nella pagina admin).

alter table public.companies add column if not exists contact_form_url text not null default '';

create or replace function public.is_busy_hirer(p_company uuid)
returns boolean language sql stable set search_path = public as $$
  select coalesce((select count(*) >= 6 or count(distinct nullif(lower(j.region), '')) >= 3
                     from job_ads j
                    where j.company_id = p_company and j.posted_at >= now() - interval '120 days'), false)
$$;
revoke execute on function public.is_busy_hirer(uuid) from public, anon, authenticated;
grant execute on function public.is_busy_hirer(uuid) to service_role;

create or replace function public.is_large_company(p_company uuid, p_domain text, p_size text, p_name text)
returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from large_companies l
                  where l.domain = lower(p_domain) or lower(p_domain) like '%.' || l.domain)
      or coalesce((regexp_match(coalesce(p_size, ''), '(\d+)'))[1]::integer >= 201, false)
      or coalesce(lower(p_name) ~ '\m(banca|bank|assicurazioni|insurance)\M', false)
$$;

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
           where se.id = p_search and not is_platform_domain(pool.domain) and not is_hosted_page(pool.website, pool.name)
             and not is_non_target_company(pool.name)
           order by coalesce(c.referente_missed_at > now() - interval '90 days', false), is_busy_hirer(pool.id), pool.latest desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;

create or replace function public.store_company_checks(p_items jsonb, p_target jsonb, p_origin text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_check jsonb;
  v_domain text;
  v_company uuid;
  v_tech text[];
  v_status text;
  v_saved integer := 0;
  v_form text;
begin
  if jsonb_typeof(p_items) <> 'array' then return 0; end if;

  for v_item in select x from jsonb_array_elements(p_items) x limit 500 loop
    v_domain := lower(trim(coalesce(v_item #>> '{company,domain}', '')));
    continue when v_domain !~ '^[a-z0-9.-]+\.[a-z]{2,24}$' or length(v_domain) > 200;
    continue when exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(v_domain));

    v_tech := case when jsonb_typeof(v_item #> '{company,technologies}') = 'array'
                   then array(select t from jsonb_array_elements_text(v_item #> '{company,technologies}') t limit 10)
                   else '{}'::text[] end;

    -- Modulo di contatto trovato sul sito (pagina del dominio dell'azienda).
    v_form := left(coalesce(v_item #>> '{company,contact_form}', ''), 300);
    if v_form !~* ('^https?://([a-z0-9-]+\.)*' || replace(v_domain, '.', '\.') || '(/|$)') then v_form := ''; end if;

    insert into companies as c (domain, name, website, country, city, industry, size_hint, technologies, origin, site_checked_at, contact_form_url)
    values (v_domain,
            left(coalesce(nullif(v_item #>> '{company,name}', ''), v_domain), 200),
            left(coalesce(nullif(v_item #>> '{company,website}', ''), 'https://' || v_domain), 300),
            left(coalesce(v_item #>> '{company,country}', ''), 80), left(coalesce(v_item #>> '{company,city}', ''), 80),
            left(coalesce(v_item #>> '{company,industry}', ''), 120), left(coalesce(v_item #>> '{company,size_hint}', ''), 60),
            v_tech, left(coalesce(p_origin, ''), 20), now(), v_form)
    on conflict (domain) do update
      set name = coalesce(nullif(c.name, ''), excluded.name),
          country = coalesce(nullif(excluded.country, ''), c.country),
          city = coalesce(nullif(excluded.city, ''), c.city),
          industry = coalesce(nullif(c.industry, ''), excluded.industry),
          size_hint = coalesce(nullif(excluded.size_hint, ''), c.size_hint),
          technologies = case when cardinality(excluded.technologies) > 0 then excluded.technologies else c.technologies end,
          site_checked_at = now(),
          contact_form_url = coalesce(nullif(excluded.contact_form_url, ''), c.contact_form_url),
          last_verified_at = now()
    returning c.id into v_company;
    perform tag_company(v_company, coalesce(p_target, '{}'::jsonb));

    for v_check in select x from jsonb_array_elements(
        case when jsonb_typeof(v_item -> 'checks') = 'array' then v_item -> 'checks' else '[]'::jsonb end) x loop
      v_status := v_check ->> 'status';
      continue when not (v_check ->> 'code' = any (site_check_codes()))
                 or v_status is null or v_status not in ('pass', 'fail', 'undetermined');

      insert into company_checks as cc (company_id, code, status, detail, evidence, source, checked_at)
      values (v_company, v_check ->> 'code', v_status, left(coalesce(v_check #>> '{evidence,detail}', ''), 300),
              coalesce(v_check -> 'evidence', '{}'::jsonb), 'website', now())
      on conflict (company_id, code) do update
        set status = excluded.status, detail = excluded.detail, evidence = excluded.evidence,
            source = excluded.source, checked_at = excluded.checked_at;

      if v_status = 'pass' then
        insert into company_signals as cs (company_id, code, evidence, checked_at)
        values (v_company, v_check ->> 'code', coalesce(v_check -> 'evidence', '{}'::jsonb), now())
        on conflict (company_id, code) do update set evidence = excluded.evidence, checked_at = excluded.checked_at;
      elsif v_status = 'fail' then
        -- Il problema non c'è più: la vecchia prova non vale.
        delete from company_signals cs where cs.company_id = v_company and cs.code = v_check ->> 'code';
      end if;
    end loop;
    v_saved := v_saved + 1;
  end loop;
  return v_saved;
end;
$$;
revoke all on function public.store_company_checks(jsonb, jsonb, text) from public, anon, authenticated;

-- Qualità del database (Italia): quante aziende sono davvero consegnabili.
create or replace function public.database_funnel()
returns jsonb language sql stable security definer set search_path = public as $$
  with c as (
    select co.id, co.domain, co.industry, co.website, co.contact_form_url, co.site_checked_at,
           exists (select 1 from emails e where e.company_id = co.id and e.type = 'generic'
                     and e.status in ('found_public', 'validated') and email_on_domain(e.address, co.domain)) as has_email,
           exists (select 1 from company_signals cs where cs.company_id = co.id
                     and cs.code = any (verified_signal_codes()) and cs.code <> 'job_ad'
                     and signal_is_fresh(cs.code, cs.evidence, cs.checked_at))
             or exists (select 1 from job_ads j where j.company_id = co.id and j.posted_at >= now() - interval '60 days') as has_signal
      from companies co
     where (co.country_code = 'IT' or (co.country_code is null and lower(co.country) in ('italia', 'italy', 'it')))
       and not is_non_target_company(co.name)
  )
  select jsonb_build_object(
    'raccolte', count(*),
    'con_sito_settore', count(*) filter (where website <> '' and industry <> ''),
    'sito_controllato_90gg', count(*) filter (where site_checked_at > now() - interval '90 days'),
    'con_email', count(*) filter (where has_email),
    'con_modulo', count(*) filter (where contact_form_url <> ''),
    'con_contatto', count(*) filter (where has_email or contact_form_url <> ''),
    'con_opportunita', count(*) filter (where has_signal),
    'opportunita_con_contatto', count(*) filter (where has_signal and (has_email or contact_form_url <> '')),
    'solo_modulo_con_opportunita', count(*) filter (where has_signal and not has_email and contact_form_url <> ''))
  from c
$$;
revoke execute on function public.database_funnel() from public, anon, authenticated;
grant execute on function public.database_funnel() to service_role;
