-- Pagine ospitate su siti di altri (collaudo del 17/10): il ristorante «La Chicca» aveva come
-- sito il suo menù digitale su creoadv.com, una web agency. Dominio, controlli del sito e
-- segnale «sito datato» erano quelli dell'agenzia, non del ristorante. Un «sito» con un
-- percorso oltre la radice (lingua esclusa) su un dominio che non contiene nessuna parola del
-- nome dell'azienda non è il sito ufficiale: fuori dalla riserva. Anche le piattaforme di
-- ordinazione con un sottodominio per locale (vorreiordinare.it).

create or replace function public.is_hosted_page(p_website text, p_name text)
returns boolean language sql immutable set search_path = public as $$
  with u as (
    select lower(coalesce(substring(p_website from '^https?://([^/?#:]+)'), '')) as host,
           regexp_replace(lower(coalesce(substring(p_website from '^https?://[^/?#]+(/[^?#]*)'), '')),
                          '^/((it|en|de|fr|es)(-[a-z]{2})?(/|$))?|/+$', '', 'g') as path
  )
  select u.path <> '' and not exists (
    select 1 from regexp_split_to_table(lower(translate(coalesce(p_name, ''), 'àáèéìíòóùúÀÈÉÌÒÙ', 'aaeeiioouuaeeiou')), '[^a-z0-9]+') w
     where length(w) >= 4 and replace(u.host, '-', '') like '%' || w || '%')
    from u
$$;

create or replace function public.is_platform_domain(p_domain text)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(p_domain, '') ~* '(^|\.)(thefork|booking|accor|airbnb|expedia|hotels|trivago|agoda|tripadvisor|justeat|deliveroo|glovoapp|ubereats|facebook|instagram|google|wixsite|business\.site|vorreiordinare)\.[a-z.]+$'
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
           order by coalesce(c.referente_missed_at > now() - interval '90 days', false), pool.latest desc nulls last
           limit least(greatest(coalesce(p_limit, 40), 0), 40)) p
$$;
revoke all on function public.opportunity_reserve(uuid, text[], integer) from public, anon, authenticated;
