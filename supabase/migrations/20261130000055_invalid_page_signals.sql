-- Prove false dalle pagine che non sono il sito (punto 2 del 21/10). Il controllo siti ora riconosce le
-- pagine anti-bot o d'errore, i traslochi verso un altro dominio e le pagine provvisorie e su queste dà
-- «non determinabile», con evidence.invalid_page = true. Finora «non determinabile» lasciava la vecchia
-- prova in company_signals (macron.com, palmabit.com, radiciviaggi.it): ora la toglie, come «fail».
-- Unica differenza dalla 050: la condizione del delete. Per tornare indietro: rieseguire la funzione della 050.
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
      elsif v_status = 'fail' or (v_check #>> '{evidence,invalid_page}') = 'true' then
        -- Il problema non c'è più, oppure la pagina scaricata non è il sito (blocco, trasloco, pagina
        -- provvisoria: migrazione 055): la vecchia prova non vale.
        delete from company_signals cs where cs.company_id = v_company and cs.code = v_check ->> 'code';
      end if;
    end loop;
    v_saved := v_saved + 1;
  end loop;
  return v_saved;
end;
$$;
revoke all on function public.store_company_checks(jsonb, jsonb, text) from public, anon, authenticated;
