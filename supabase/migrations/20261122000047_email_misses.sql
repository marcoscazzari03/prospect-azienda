-- Memoria delle aziende senza email (analisi del motore del 20/10). Le ricerche dalla riserva
-- riprovavano per prime le stesse aziende senza email sul sito: nella ricerca opportunità del
-- 18/10, 23 aziende su 40 senza email, 115 pagine scaricate per 17 lead. Come per i referenti
-- (migrazione 031): l'azienda senza email né modulo di contatto passa in fondo alla riserva per
-- 90 giorni, poi torna come le altre (il sito può cambiare).
alter table public.companies add column if not exists email_missed_at timestamptz;

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
                    coalesce(c.referente_missed_at > now() - interval '90 days', false), is_busy_hirer(pool.id), pool.latest desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;
revoke all on function public.opportunity_reserve(uuid, text[], integer) from public, anon, authenticated;
