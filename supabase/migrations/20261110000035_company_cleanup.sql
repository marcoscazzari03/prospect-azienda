-- Database delle aziende più pulito (deciso il 18/10, analisi giornaliera):
-- 1. niente aziende che non sono clienti: associazioni sportive (A.S.D./S.S.D.), enti e servizi
--    pubblici (acquedotti, ATO, consorzi), centri e parchi commerciali, porti turistici, sedi e
--    filiali di grandi gruppi. Esclusi all'importazione (anche per le aziende trovate dall'AI),
--    dal controllo siti, dal settore con Haiku e dalla riserva delle ricerche;
-- 2. settore dal nome quando è evidente («Estetica Dimensione Donna» -> Centro estetico),
--    all'importazione e quando Haiku non riesce a classificare dalla homepage.

create or replace function public.is_non_target_company(p_name text)
returns boolean language sql immutable set search_path = public as $$
  select translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu') ~
    ('(^|[^a-z])(a\.? ?s\.? ?d|s\.? ?s\.? ?d)\.?([^a-z]|$)'
     || '|\m(polisportiva|associazione sportiva|pro loco|parrocchia|comune di|consorzio di bonifica|servizio idrico|acquedotto)\M'
     || '|\m(parco commerciale|centro commerciale|outlet village|porto turistico)\M'
     || '|^ato\M|\macque s\.?p\.?a'
     || '|\m(sede di|filiale di|headquarters?)\M')
$$;

-- Settore dal nome: la prima regola che corrisponde (l'ordine conta: «Boutique Hotel» è un hotel).
create or replace function public.industry_from_name(p_name text)
returns table (industry text, keywords text[]) language sql immutable set search_path = public as $$
  select r.industry, r.keywords
    from (values
    (1, '\m(hotel|albergo|alberghi|resort)\M', 'Hotel', array['hotel','albergo','alberghi']),
    (2, '\m(b ?& ?b|bed and breakfast)', 'Bed and breakfast', array['bed and breakfast','b&b','affittacamere']),
    (3, '\magriturismo', 'Agriturismo', array['agriturismo','turismo rurale']),
    (4, '\m(camping|campeggio)', 'Campeggio', array['campeggio','camping']),
    (5, '\m(ristorante|trattoria|osteria|pizzeria)', 'Ristorante', array['ristorante','ristorazione','pizzeria']),
    (6, '\m(centro estetico|estetica|estetista|beauty)', 'Centro estetico', array['estetica','estetista','centro estetico','bellezza']),
    (7, '\m(parrucchier|acconciatur|barbiere|barber)', 'Parrucchiere', array['parrucchiere','acconciature','barbiere']),
    (8, '\m(dentist|odontoiatr)', 'Studio dentistico', array['dentista','dentisti','odontoiatria']),
    (9, '\mfarmaci[ae]', 'Farmacia', array['farmacia']),
    (10, '\mveterinari', 'Clinica veterinaria', array['veterinario','veterinaria']),
    (11, '\m(avvocat|studio legale)', 'Studio legale', array['avvocato','avvocati','legale']),
    (12, '\mcommercialist', 'Studio commercialista', array['commercialista','commercialisti','contabilità','fiscale']),
    (13, '\marchitett', 'Studio di architettura', array['architetto','architettura']),
    (14, '\mgeometr', 'Studio tecnico', array['geometra','studio tecnico']),
    (15, '\mingegner', 'Studio di ingegneria', array['ingegneria','ingegnere']),
    (16, '\mimmobiliar', 'Agenzia immobiliare', array['immobiliare','agenzia immobiliare']),
    (17, '\massicuraz', 'Assicurazioni', array['assicurazioni','assicurazione']),
    (18, '\mautoscuol', 'Autoscuola', array['autoscuola','patente']),
    (19, '\m(agenzia viaggi|viaggi)\M', 'Agenzia di viaggi', array['agenzia viaggi','viaggi','turismo']),
    (20, '\m(autofficina|officina meccanica|carrozzeria|gommist)', 'Autofficina', array['autofficina','officina','carrozzeria','auto']),
    (21, '\mmontagg', 'Montaggi e installazioni', array['montaggi','installazioni','installatore']),
    (22, '\mmanutenzion', 'Manutenzioni', array['manutenzione','manutenzioni']),
    (23, '\m(impianti elettrici|elettricist|elettric|elettro)', 'Impianti e materiale elettrico', array['elettricista','impianti elettrici','materiale elettrico']),
    (24, '\m(idraulic|termoidraulic)', 'Idraulica e termoidraulica', array['idraulico','idraulica','termoidraulica']),
    (25, '\m(edil|costruzioni)', 'Edilizia', array['edilizia','costruzioni','impresa edile']),
    (26, '\m(serrament|infissi)', 'Serramenti e infissi', array['serramenti','infissi','finestre']),
    (27, '\m(arredament|mobilific|mobili)\M', 'Arredamento', array['arredamento','mobili']),
    (28, '\mfalegnam', 'Falegnameria', array['falegnameria','falegname','legno']),
    (29, '\mottic', 'Ottica', array['ottica','ottico','occhiali']),
    (30, '\mfotograf', 'Fotografia', array['fotografo','fotografia']),
    (31, '\m(tipografi|arti grafiche)', 'Tipografia', array['tipografia','stampa']),
    (32, '\m(palestra|fitness|gym)\M', 'Palestra e fitness', array['palestra','fitness']),
    (33, '\mcaseifici', 'Caseificio', array['caseificio','formaggi','latticini']),
    (34, '\m(cantina|cantine|vinicol|enoteca)', 'Vini e cantine', array['vino','cantina','enoteca']),
    (35, '\m(panifici|panetteri)', 'Panificio', array['panificio','pane','forno']),
    (36, '\mpasticceri', 'Pasticceria', array['pasticceria','dolci']),
    (37, '\mgelateri', 'Gelateria', array['gelateria','gelato']),
    (38, '\m(bar|caffe|caffetteria)\M', 'Bar e caffetteria', array['bar','caffetteria']),
    (39, '\mmacelleri', 'Macelleria', array['macelleria','carne']),
    (40, '\m(fiorai|fioreri)', 'Fioraio', array['fioraio','fiori']),
    (41, '\m(abbigliamento|boutique)\M', 'Abbigliamento', array['abbigliamento','moda']),
    (42, '\mcalzatur', 'Calzature', array['calzature','scarpe']),
    (43, '\m(gioielleri|oreficeri)', 'Gioielleria', array['gioielleria','gioielli']),
    (44, '\mferrament', 'Ferramenta', array['ferramenta']),
    (45, '\m(lavanderi|tintori)', 'Lavanderia', array['lavanderia','tintoria']),
    (46, '\m(trasporti|logistic|spedizion)', 'Trasporti e logistica', array['trasporti','logistica','spedizioni']),
    (47, '\m(pulizie|pulizia)\M', 'Imprese di pulizia', array['pulizie','impresa di pulizie']),
    (48, '\m(giardin|vivai)', 'Giardinaggio e vivai', array['giardinaggio','vivaio','piante']),
    (49, '\m(informatic|software|web agency)', 'Informatica e software', array['informatica','software','it'])
    ) r(n, pattern, industry, keywords)
   where translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu') ~ r.pattern
   order by r.n
   limit 1
$$;

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
    returning (xmax = 0) into v_new;
    if v_new then v_new_count := v_new_count + 1; else v_updated := v_updated + 1; end if;
  end loop;

  return jsonb_build_object('received', v_received, 'new', v_new_count, 'updated', v_updated, 'skipped', v_skipped);
end;
$$;

create or replace function public.store_company_industries(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_industry text;
  v_words text[];
  v_classified integer := 0;
  v_unknown integer := 0;
  v_n integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('classified', 0, 'unknown', 0);
  end if;

  for v_item in select x from jsonb_array_elements(p_items) x limit 200 loop
    continue when coalesce(v_item ->> 'company_id', '') !~ '^[0-9a-f-]{36}$';
    v_industry := left(btrim(regexp_replace(coalesce(v_item ->> 'industry', ''), '\s+', ' ', 'g')), 120);
    v_words := case when v_industry = '' then '{}'::text[] else term_stems(v_industry) end;
    -- Homepage illeggibile o senza indizi: settore dal nome quando è evidente.
    if v_industry = '' then
      select n.industry, coalesce(array(select distinct unnest(term_stems(k)) from unnest(n.keywords) k), '{}')
        into v_industry, v_words
        from companies c, industry_from_name(c.name) n
       where c.id = (v_item ->> 'company_id')::uuid;
      v_industry := coalesce(v_industry, '');
      v_words := coalesce(v_words, '{}') || case when v_industry = '' then '{}'::text[] else term_stems(v_industry) end;
    end if;
    if v_industry <> '' and jsonb_typeof(v_item -> 'keywords') = 'array' then
      v_words := v_words || array(select distinct unnest(term_stems(left(k, 60)))
                                    from (select k from jsonb_array_elements_text(v_item -> 'keywords') k limit 20) x);
    end if;

    update companies c
       set industry = case when c.industry = '' then v_industry else c.industry end,
           tags = array(select distinct unnest(c.tags || v_words)),
           industry_checked_at = now()
     where c.id = (v_item ->> 'company_id')::uuid;
    get diagnostics v_n = row_count;
    continue when v_n = 0;
    if v_industry = '' then v_unknown := v_unknown + 1; else v_classified := v_classified + 1; end if;
  end loop;

  return jsonb_build_object('classified', v_classified, 'unknown', v_unknown);
end;
$$;

create or replace function public.pending_industry_companies(p_limit integer)
returns table (company_id uuid, company_name text, website text, city text, ads integer)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.website, c.city, count(j.id)::integer
    from companies c
    left join job_ads j on j.company_id = c.id
   where c.industry = ''
     and not is_non_target_company(c.name)
     and (c.industry_checked_at is null or c.industry_checked_at < now() - interval '60 days')
     and (j.id is not null or c.origin = 'osm')
   group by c.id
   order by count(j.id) desc, max(j.posted_at) desc nulls last
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
$$;

create or replace function public.pending_site_checks(p_limit integer)
returns table (company_id uuid, domain text, name text, website text)
language sql stable security definer set search_path = public as $$
  select c.id, c.domain, c.name, c.website
    from companies c
   where (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
     and not is_non_target_company(c.name)
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
   order by c.site_checked_at nulls first, c.first_seen_at
   limit least(greatest(coalesce(p_limit, 80), 1), 300)
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
           where se.id = p_search and not is_platform_domain(pool.domain) and not is_hosted_page(pool.website, pool.name)
             and not is_non_target_company(pool.name)
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
           where se.id = p_search and not is_platform_domain(pool.domain) and not is_hosted_page(pool.website, pool.name)
             and not is_non_target_company(pool.name)
           order by coalesce(c.referente_missed_at > now() - interval '90 days', false), pool.latest desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;
revoke all on function public.opportunity_reserve(uuid, text[], integer) from public, anon, authenticated;

-- Aziende già nel database senza settore: settore dal nome dove è evidente.
update public.companies c
   set industry = n.industry,
       tags = array(select distinct unnest(c.tags || term_stems(n.industry)
                    || coalesce(array(select unnest(term_stems(k)) from unnest(n.keywords) k), '{}')))
  from (select c2.id, f.industry, f.keywords
          from public.companies c2
          cross join lateral public.industry_from_name(c2.name) f
         where c2.industry = '' and not public.is_non_target_company(c2.name)) n
 where c.id = n.id;
