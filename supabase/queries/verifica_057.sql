-- Verifica della migrazione 057 sui dati veri, PRIMA di eseguirla: crea una copia temporanea della funzione nuova,
-- confronta i risultati con quella attuale sulle ultime 4 ricerche opportunità e annulla tutto (rollback).
-- Da eseguire nell'editor SQL di Supabase così com'è (circa 30–60 secondi). Se va oltre il tempo dell'editor non resta
-- nulla: basta ridurre «limit 4».
begin;
create or replace function public.opportunity_pool_057(p_org uuid, p_target jsonb, p_contacts integer, p_exclude text[])
returns table (id uuid, domain text, name text, website text, country text, city text, industry text, size_hint text,
               technologies text[], signals jsonb, latest timestamptz, ad_url text)
language plpgsql stable security definer set search_path = public as $f$
begin
  -- Query dinamica: pianificata a ogni chiamata con i valori veri della ricerca (in una funzione SQL il piano
  -- generico era 3 volte più lento: 3,1 s contro 0,9 s su 12.000 aziende di prova).
  return query execute $q$
  with s as (
    select $2 as target,
           term_stems($2 ->> 'industry') as industry,
           coalesce(btrim($2 ->> 'industry'), '') as industry_text,
           jsonb_array_length(coalesce($2 -> 'industry_keywords', '[]')) as kw_count,
           array(select upper(x) from jsonb_array_elements_text(coalesce($2 -> 'countries', '[]')) x) as countries,
           search_signal_codes($2) as codes,
           -- Per signals_satisfy, calcolati una volta sola (prima: una chiamata per azienda, 1,6 s su 8.000 aziende).
           search_required_signals($2) as required,
           coalesce($2 #>> '{signals,match}', 'any') = 'all' as match_all,
           array(select f ->> 'code' from jsonb_array_elements(
                   case when jsonb_typeof($2 #> '{signals,job_families}') = 'array'
                        then $2 #> '{signals,job_families}' else '[]'::jsonb end) f) as families
  ),
  -- Radici delle parole chiave e delle zone calcolate una volta sola (prima: per ogni azienda, 3–9 s).
  kw as (
    select term_stems(k) as stems from jsonb_array_elements_text(coalesce($2 -> 'industry_keywords', '[]')) k
     where cardinality(term_stems(k)) > 0
  ),
  rg as (
    select term_stems(g) as stems from jsonb_array_elements_text(coalesce($2 -> 'regions', '[]')) g
     where cardinality(term_stems(g)) > 0
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
     -- Come signals_satisfy (migrazione 016).
     and case when cardinality(s.required) = 0 then true
              when s.match_all then s.required <@ coalesce(sig.codes, '{}')
              else s.required && coalesce(sig.codes, '{}') end
     and not (c.domain = any (coalesce($4, '{}')))
     and (coalesce($3, 1) > 1
          or not exists (select 1 from deliveries x where x.org_id = $1 and x.company_domain = c.domain))
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     -- Grandi aziende fuori dalle ricerche con opportunità (migrazione 038).
     and not is_large_company(c.id, c.domain, c.size_hint, c.name)
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
     -- Paese: le aziende degli annunci hanno il nome del paese, non il codice.
     and (c.country_code = any (s.countries)
          or (c.country_code is null and 'IT' = any (s.countries) and lower(c.country) in ('italia', 'italy', 'it')))
     -- Settore: come il magazzino (sector_matches, migrazione 053), con le radici già calcolate.
     and case
           when cardinality(s.industry) = 0 and s.industry_text <> '' then false
           when cardinality(s.industry) = 0 then s.kw_count = 0 or exists (select 1 from kw where coalesce(c.tags, '{}') @> kw.stems)
           else coalesce(c.tags, '{}') @> s.industry
                and (not exists (select 1 from kw)
                     or exists (select 1 from kw where (coalesce(c.tags, '{}') || term_stems(c.name) || term_stems(c.industry)) @> kw.stems))
         end
     -- Zona: luoghi dell'azienda, città o regione dei suoi annunci.
     and (jsonb_array_length(coalesce(s.target -> 'regions', '[]')) = 0
          or exists (select 1 from rg where (c.places || term_stems(c.city)) @> rg.stems)
          or exists (
            select 1 from rg
             where (c.places || term_stems(c.city)
                    || coalesce((select array_agg(distinct w) from job_ads j2, unnest(term_stems(j2.region) || term_stems(j2.city)) w
                                  where j2.company_id = c.id), '{}')) @> rg.stems))
     and not exists (select 1 from jsonb_array_elements_text(coalesce(s.target -> 'exclude_keywords', '[]')) k
                      where cardinality(term_stems(k)) > 0
                        and (c.tags || term_stems(c.name) || term_stems(c.industry)) @> term_stems(k))
$q$ using p_org, p_target, p_contacts, p_exclude;
end;
$f$;

-- Risultati delle due versioni salvati una volta sola (due calcoli per ricerca), poi confronto delle righe intere.
create temp table v_ricerche on commit drop as
  select s.id, s.name, s.org_id, s.target, s.contacts_per_company from searches s
   where s.deleted_at is null and cardinality(search_signal_codes(s.target)) > 0
   order by s.created_at desc limit 4;
create temp table v_attuale on commit drop as
  select r.id, p::text as riga from v_ricerche r, lateral opportunity_pool(r.org_id, r.target, r.contacts_per_company, '{}') p;
create temp table v_nuova on commit drop as
  select r.id, p::text as riga from v_ricerche r, lateral opportunity_pool_057(r.org_id, r.target, r.contacts_per_company, '{}') p;

select r.name,
       (select count(*) from v_attuale a where a.id = r.id) as attuale,
       (select count(*) from v_nuova n where n.id = r.id) as nuova,
       (select count(*) from ((select riga from v_attuale where id = r.id except all select riga from v_nuova where id = r.id)
                              union all
                              (select riga from v_nuova where id = r.id except all select riga from v_attuale where id = r.id)) d) as differenze
  from v_ricerche r;

rollback;
