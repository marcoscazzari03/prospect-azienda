-- Contatore dell'import (punto 39b): «nuove» contava come aggiornate le aziende salvate da un
-- tentativo precedente della stessa chiamata. Solo il conteggio cambia, non i dati salvati.
create or replace function public.store_imported_companies(p_source text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_domain text;
  v_industry text;
  v_city text;
  v_places text[];
  v_tags text[];
  v_new boolean;
  v_first timestamptz;
  v_origin text;
  v_name_industry text;
  v_name_keywords text[];
  v_received integer := 0;
  v_new_count integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or coalesce(p_source, '') !~ '^[a-z_]{2,20}$' then
    return jsonb_build_object('received', 0, 'new', 0, 'updated', 0, 'skipped', 0);
  end if;

  for v_item in select x from jsonb_array_elements(p_items) x limit 5000 loop
    v_received := v_received + 1;
    v_domain := lower(trim(coalesce(v_item ->> 'domain', '')));
    if v_domain !~ '^[a-z0-9.-]+\.[a-z]{2,24}$' or length(v_domain) > 200
       or exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(v_domain))
       -- Non clienti (enti, associazioni sportive, centri commerciali, sedi di grandi gruppi),
       -- piattaforme e pagine ospitate su siti altrui.
       or is_non_target_company(v_item ->> 'name')
       or is_platform_domain(v_domain)
       or is_hosted_page(v_item ->> 'website', v_item ->> 'name') then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_industry := left(btrim(coalesce(v_item ->> 'industry', '')), 120);
    v_city := left(btrim(coalesce(v_item ->> 'city', '')), 80);
    v_places := term_stems(v_city) || term_stems(v_item ->> 'province') || term_stems(v_item ->> 'region');
    -- Senza categoria riconosciuta: settore dal nome quando è evidente («Estetica…», «…Montaggi»).
    if v_industry = '' then
      select n.industry, n.keywords into v_name_industry, v_name_keywords from industry_from_name(v_item ->> 'name') n;
      v_industry := coalesce(v_name_industry, '');
    end if;
    v_tags := term_stems(v_industry) || coalesce(array(select distinct unnest(term_stems(k)) from unnest(v_name_keywords) k), '{}');
    v_name_keywords := null;
    if jsonb_typeof(v_item -> 'keywords') = 'array' then
      v_tags := v_tags || array(select distinct unnest(term_stems(left(k, 60)))
                                  from (select k from jsonb_array_elements_text(v_item -> 'keywords') k limit 10) x);
    end if;

    insert into companies as c (domain, name, website, country, country_code, city, industry, origin, tags, places)
    values (v_domain, left(coalesce(nullif(btrim(v_item ->> 'name'), ''), v_domain), 200),
            left(coalesce(nullif(v_item ->> 'website', ''), 'https://' || v_domain), 300),
            'Italia', 'IT', v_city, v_industry, left(p_source, 20),
            array(select distinct unnest(v_tags)), array(select distinct unnest(v_places)))
    on conflict (domain) do update
      set city = coalesce(nullif(c.city, ''), excluded.city),
          industry = coalesce(nullif(c.industry, ''), excluded.industry),
          country_code = coalesce(c.country_code, excluded.country_code),
          tags = array(select distinct unnest(c.tags || excluded.tags)),
          places = array(select distinct unnest(c.places || excluded.places))
    returning (xmax = 0), c.first_seen_at, c.origin into v_new, v_first, v_origin;
    -- Nuova anche se salvata pochi minuti fa dalla stessa fonte: n8n ripete la chiamata dopo un
    -- errore di rete anche quando il primo tentativo è andato a buon fine (import del 20/10:
    -- 1.038 aziende nuove contate come aggiornate).
    if v_new or (v_origin = left(p_source, 20) and v_first > now() - interval '30 minutes') then
      v_new_count := v_new_count + 1;
    else
      v_updated := v_updated + 1;
    end if;
  end loop;

  return jsonb_build_object('received', v_received, 'new', v_new_count, 'updated', v_updated, 'skipped', v_skipped);
end;
$$;
revoke all on function public.store_imported_companies(text, jsonb) from public, anon, authenticated;
