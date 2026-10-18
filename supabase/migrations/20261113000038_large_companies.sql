-- Ricerche con opportunità solo su piccole e medie imprese (deciso il 18/10). Collaudo del
-- 18/10 («Rifacimento del sito», Lombardia): tra le 23 aziende scartate senza email c'erano
-- Leroy Merlin, Maisons du Monde, Capgemini, Stora Enso, una banca: hanno solo moduli di
-- contatto e non sono clienti di un'agenzia web, di un MSP o di un consulente.
--
-- Grande azienda se: è nell'elenco large_companies (curato a mano), oppure la dimensione
-- nota parte da 201 dipendenti, oppure negli ultimi 120 giorni ha pubblicato almeno 6
-- annunci o annunci in almeno 3 regioni, oppure è una banca o un'assicurazione.
-- Vale solo per le ricerche con opportunità: quelle in target hanno il filtro di dimensione.

create table if not exists public.large_companies (
  domain text primary key,
  note text not null default '',
  added_at timestamptz not null default now()
);
alter table public.large_companies enable row level security; -- nessuna policy: solo il server

insert into public.large_companies (domain, note) values
  ('leroymerlin.it', 'catena'), ('maisonsdumonde.com', 'catena'), ('capgemini-engineering.com', 'multinazionale'),
  ('storaenso.it', 'multinazionale'), ('fmlogistic.it', 'multinazionale'), ('exprivia.it', 'quotata'),
  ('wyser.it', 'gruppo Gi Group'), ('bancaprivataleasing.it', 'banca'), ('risoscotti.com', 'grande azienda')
on conflict (domain) do nothing;

create or replace function public.is_large_company(p_company uuid, p_domain text, p_size text, p_name text)
returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from large_companies l
                  where l.domain = lower(p_domain) or lower(p_domain) like '%.' || l.domain)
      or coalesce((regexp_match(coalesce(p_size, ''), '(\d+)'))[1]::integer >= 201, false)
      or coalesce(lower(p_name) ~ '\m(banca|bank|assicurazioni|insurance)\M', false)
      or coalesce((select count(*) >= 6 or count(distinct nullif(lower(j.region), '')) >= 3
                     from job_ads j
                    where j.company_id = p_company and j.posted_at >= now() - interval '120 days'), false)
$$;
revoke execute on function public.is_large_company(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.is_large_company(uuid, text, text, text) to service_role;

create or replace function public.opportunity_pool(p_org uuid, p_target jsonb, p_contacts integer, p_exclude text[])
returns table (id uuid, domain text, name text, website text, country text, city text, industry text, size_hint text,
               technologies text[], signals jsonb, latest timestamptz, ad_url text)
language sql stable security definer set search_path = public as $$
  with s as (
    select p_target as target,
           term_stems(p_target ->> 'industry') as industry,
           array(select upper(x) from jsonb_array_elements_text(coalesce(p_target -> 'countries', '[]')) x) as countries,
           search_signal_codes(p_target) as codes,
           array(select f ->> 'code' from jsonb_array_elements(
                   case when jsonb_typeof(p_target #> '{signals,job_families}') = 'array'
                        then p_target #> '{signals,job_families}' else '[]'::jsonb end) f) as families
  )
  select c.id, c.domain, c.name, c.website, c.country, c.city, c.industry, c.size_hint, c.technologies,
         sig.signals, sig.latest, ad.url
    from s
    join companies c on true
    -- Ultimo annuncio recente di una famiglia richiesta.
    left join lateral (
      select j.url, j.title, j.posted_at, j.family, j.region, j.city
        from job_ads j
       where 'job_ad' = any (s.codes)
         and j.company_id = c.id
         and j.posted_at >= current_date - 60
         and (cardinality(s.families) = 0 or j.family = any (s.families))
       order by j.posted_at desc
       limit 1
    ) ad on true
    cross join lateral (
      select coalesce(jsonb_agg(x.sig order by x.code), '[]'::jsonb) as signals,
             coalesce(array_agg(x.code), '{}') as codes,
             max(x.at) as latest
        from (
          select cs.code, cs.checked_at as at, jsonb_build_object('code', cs.code, 'evidence', cs.evidence) as sig
            from company_signals cs
           where cs.company_id = c.id
             and cs.code = any (s.codes)
             and cs.code <> 'job_ad'
             and signal_is_fresh(cs.code, cs.evidence, cs.checked_at)
          union all
          select 'job_ad', ad.posted_at,
                 jsonb_build_object('code', 'job_ad', 'evidence', jsonb_build_object(
                   'url', ad.url, 'title', ad.title, 'date', to_char(ad.posted_at, 'YYYY-MM-DD'),
                   'family', ad.family, 'source', 'job_board', 'checked_at', to_char(now(), 'YYYY-MM-DD')))
           where ad.url is not null
        ) x
    ) sig
   where cardinality(s.codes) > 0
     and signals_satisfy(s.target, sig.codes)
     and not (c.domain = any (coalesce(p_exclude, '{}')))
     and (coalesce(p_contacts, 1) > 1
          or not exists (select 1 from deliveries x where x.org_id = p_org and x.company_domain = c.domain))
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     -- Grandi aziende fuori dalle ricerche con opportunità (migrazione 038).
     and not is_large_company(c.id, c.domain, c.size_hint, c.name)
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
     -- Paese: le aziende degli annunci hanno il nome del paese, non il codice.
     and (c.country_code = any (s.countries)
          or (c.country_code is null and 'IT' = any (s.countries) and lower(c.country) in ('italia', 'italy', 'it')))
     -- Settore: come il magazzino. Senza settore («tutti i settori») nessun filtro.
     and ((cardinality(s.industry) = 0
           and jsonb_array_length(coalesce(s.target -> 'industry_keywords', '[]')) = 0)
          or (cardinality(s.industry) > 0 and c.tags @> s.industry)
          or exists (select 1 from jsonb_array_elements_text(coalesce(s.target -> 'industry_keywords', '[]')) k
                      where cardinality(term_stems(k)) > 0 and c.tags @> term_stems(k)))
     -- Zona: luoghi dell'azienda, città o regione dei suoi annunci.
     and (jsonb_array_length(coalesce(s.target -> 'regions', '[]')) = 0
          or exists (
            select 1 from jsonb_array_elements_text(s.target -> 'regions') g
             where cardinality(term_stems(g)) > 0
               and (c.places || term_stems(c.city)
                    || coalesce((select array_agg(distinct w) from job_ads j2, unnest(term_stems(j2.region) || term_stems(j2.city)) w
                                  where j2.company_id = c.id), '{}')) @> term_stems(g)))
     and not exists (select 1 from jsonb_array_elements_text(coalesce(s.target -> 'exclude_keywords', '[]')) k
                      where cardinality(term_stems(k)) > 0
                        and (c.tags || term_stems(c.name) || term_stems(c.industry)) @> term_stems(k))
$$;
