-- Email aziendali dal controllo siti (punto 3 del 20/10). Il workflow «Aziende | Controllo siti» scarica
-- già la homepage di 150 aziende l'ora: ora ne estrae anche l'email aziendale (stesse regole del motore)
-- e la salva qui. Le riserve del motore partono dalle aziende con l'email già nota: meno scarti
-- «nessuna_email» (40-57% nelle ricerche del 18-19/10) e meno pagine scaricate.
alter table public.companies add column if not exists site_email text not null default '';
alter table public.companies add column if not exists site_email_at timestamptz;

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
  v_email text;
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

    -- Email aziendale trovata nella homepage dal controllo siti (migrazione 050): solo del dominio
    -- dell'azienda o di un suo dominio fratello. Toglie anche la memoria «email non trovata».
    v_email := lower(trim(coalesce(v_item #>> '{company,email}', '')));
    if v_email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$' and length(v_email) <= 200 and email_on_domain(v_email, v_domain) then
      update companies set site_email = v_email, site_email_at = now(), email_missed_at = null where id = v_company;
    end if;

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

create or replace function public.target_reserve(p_search uuid, p_exclude text[], p_limit integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'company_name', p.name, 'website', p.website, 'country', p.country, 'city', p.city,
           'industry', p.industry, 'size_hint', p.size_hint, 'technologies', to_jsonb(p.technologies),
           'source_url', p.website, 'contact_page', '', 'signals', '[]'::jsonb, 'origin', 'database')), '[]'::jsonb)
    from (select pool.* from searches se,
                 target_pool(se.org_id, se.target, se.contacts_per_company, p_exclude) pool
                 left join companies c on c.id = pool.id
           where se.id = p_search and not is_platform_domain(pool.domain) and not is_hosted_page(pool.website, pool.name)
             and not is_non_target_company(pool.name)
           order by coalesce(c.email_missed_at > now() - interval '90 days', false),
                    coalesce(c.site_email, '') = '',
                    coalesce(c.referente_missed_at > now() - interval '90 days', false), pool.checked_at desc nulls last
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
           where se.id = p_search and not is_platform_domain(pool.domain) and not is_hosted_page(pool.website, pool.name)
             and not is_non_target_company(pool.name)
           order by coalesce(c.email_missed_at > now() - interval '90 days', false),
                    coalesce(c.site_email, '') = '',
                    coalesce(c.referente_missed_at > now() - interval '90 days', false), is_busy_hirer(pool.id), pool.latest desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;
revoke all on function public.opportunity_reserve(uuid, text[], integer) from public, anon, authenticated;
