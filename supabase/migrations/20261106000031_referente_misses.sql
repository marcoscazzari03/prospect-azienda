-- Memoria dei referenti non trovati, tra ricerche diverse. Collaudo del 17/10 (hotel in
-- Puglia): la seconda ricerca ha riprovato per primi 14 dei 15 hotel in cui la prima non
-- aveva trovato il titolare, pagando di nuovo le stesse ricerche web senza risultato.
-- Le aziende con un referente non trovato di recente passano in fondo alla riserva: si
-- riprovano solo quando non c'è altro (o con un ruolo diverso che le fa tornare utili).
alter table public.companies add column if not exists referente_missed_at timestamptz;

create or replace function public.target_reserve(p_search uuid, p_exclude text[], p_limit integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'company_name', p.name, 'website', p.website, 'country', p.country, 'city', p.city,
           'industry', p.industry, 'size_hint', p.size_hint, 'technologies', to_jsonb(p.technologies),
           'source_url', p.website, 'contact_page', '', 'signals', '[]'::jsonb, 'origin', 'database')), '[]'::jsonb)
    from (select pool.* from searches se,
                 target_pool(se.org_id, se.target, se.contacts_per_company, p_exclude) pool
                 left join companies c on c.id = pool.id
           where se.id = p_search
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
           where se.id = p_search
           order by coalesce(c.referente_missed_at > now() - interval '90 days', false), pool.latest desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;
revoke all on function public.opportunity_reserve(uuid, text[], integer) from public, anon, authenticated;

-- Hotel già provati senza referente nei collaudi del 17/10.
update public.companies set referente_missed_at = now()
 where domain in ('torrecintola.it', 'abatemasseria.it', 'brahotel.com', 'lecarasse.it', 'hotelpalumbobari.it',
                  'melograno.com', 'bbmaxxi.it', 'arasolishotel.com', 'leonbari.it', 'santantonioalbergo.com',
                  'masseriaserritella.it', 'masseriaiazzoscagno.it', 'villasanarica.it', 'villamariacrispiano.it',
                  'hotelsvevo.it', 'masseriatorrepietra.it', 'materiis.com', 'imagoplus.net', 'residencemoderno.com',
                  'terranobile.it', 'matarrese1950.it', 'salinahotel.it', 'altapuglia.it', 'hotellabaiabari.it',
                  'hotelauditorium.it');
