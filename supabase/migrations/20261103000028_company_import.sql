-- Popolamento del database aziende da fonti aperte (OpenStreetMap).
--
-- Il workflow n8n «Aziende | Popolamento OSM» scarica una regione al giorno le attività
-- con sito web e le salva qui. Si salvano solo aziende (dominio, nome, sito, città,
-- settore): nessun dato personale. Poi «Aziende | Controllo siti» controlla i siti
-- (segnali per le ricerche opportunità) e le ricerche in target le trovano per settore e zona.
-- Le aziende già presenti non vengono sovrascritte: si aggiungono solo luoghi ed etichette.

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
       or exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(v_domain)) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_industry := left(btrim(coalesce(v_item ->> 'industry', '')), 120);
    v_city := left(btrim(coalesce(v_item ->> 'city', '')), 80);
    v_places := term_stems(v_city) || term_stems(v_item ->> 'province') || term_stems(v_item ->> 'region');
    v_tags := term_stems(v_industry);
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
    returning (xmax = 0) into v_new;
    if v_new then v_new_count := v_new_count + 1; else v_updated := v_updated + 1; end if;
  end loop;

  return jsonb_build_object('received', v_received, 'new', v_new_count, 'updated', v_updated, 'skipped', v_skipped);
end;
$$;
revoke all on function public.store_imported_companies(text, jsonb) from public, anon, authenticated;

-- Il settore con Claude Haiku anche per le aziende importate senza categoria riconosciuta.
create or replace function public.pending_industry_companies(p_limit integer)
returns table (company_id uuid, company_name text, website text, city text, ads integer)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.website, c.city, count(j.id)::integer
    from companies c
    left join job_ads j on j.company_id = c.id
   where c.industry = ''
     and (c.industry_checked_at is null or c.industry_checked_at < now() - interval '60 days')
     and (j.id is not null or c.origin = 'osm')
   group by c.id
   order by count(j.id) desc, max(j.posted_at) desc nulls last
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
$$;
revoke all on function public.pending_industry_companies(integer) from public, anon, authenticated;
