-- Verifica della migrazione 059 sui dati veri, PRIMA di eseguirla: crea una copia temporanea della funzione nuova,
-- confronta i risultati con quella attuale sulle ultime 4 ricerche in target e annulla tutto (rollback).
-- Da eseguire nell'editor SQL di Supabase così com'è. Risultato atteso: «differenze» = 0 su ogni riga.
-- Se va oltre il tempo dell'editor non resta nulla: basta ridurre «limit 4».
begin;
create or replace function public.target_pool_059(p_org uuid, p_target jsonb, p_contacts integer, p_exclude text[])
returns table (id uuid, domain text, name text, website text, country text, city text, industry text, size_hint text,
               technologies text[], checked_at timestamptz)
language plpgsql stable security definer set search_path = public as $f$
begin
  -- Ricerca non «semplice» (segnali, dimensione, fatturato, note…): nessuna azienda, come prima.
  if not target_is_simple(p_target) then
    return;
  end if;
  return query execute $q$
  with s as (
    select $2 as target,
           term_stems($2 ->> 'industry') as industry,
           coalesce(btrim($2 ->> 'industry'), '') as industry_text,
           jsonb_array_length(coalesce($2 -> 'industry_keywords', '[]')) as kw_count,
           array(select upper(x) from jsonb_array_elements_text(coalesce($2 -> 'countries', '[]')) x) as countries
  ),
  -- Radici di parole chiave, zone ed esclusioni calcolate una volta sola (prima: per ogni azienda).
  kw as (
    select term_stems(k) as stems from jsonb_array_elements_text(coalesce($2 -> 'industry_keywords', '[]')) k
     where cardinality(term_stems(k)) > 0
  ),
  rg as (
    select term_stems(g) as stems from jsonb_array_elements_text(coalesce($2 -> 'regions', '[]')) g
     where cardinality(term_stems(g)) > 0
  ),
  ex as (
    select term_stems(k) as stems from jsonb_array_elements_text(coalesce($2 -> 'exclude_keywords', '[]')) k
     where cardinality(term_stems(k)) > 0
  )
  select c.id, c.domain, c.name, c.website, c.country, c.city, c.industry, c.size_hint, c.technologies, c.site_checked_at
    from s
    join companies c on true
   where not (c.domain = any (coalesce($4, '{}')))
     and (coalesce($3, 1) > 1
          or not exists (select 1 from deliveries x where x.org_id = $1 and x.company_domain = c.domain))
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
     -- Sito vivo: controllato di recente con almeno un esito leggibile.
     and exists (select 1 from company_checks cc
                  where cc.company_id = c.id and cc.status in ('pass', 'fail')
                    and cc.checked_at > now() - interval '60 days')
     and (c.country_code = any (s.countries)
          or (c.country_code is null and 'IT' = any (s.countries) and lower(c.country) in ('italia', 'italy', 'it')))
     -- Settore: come sector_matches (053), con le radici già calcolate.
     and case
           when cardinality(s.industry) = 0 and s.industry_text <> '' then false
           when cardinality(s.industry) = 0 then s.kw_count = 0 or exists (select 1 from kw where coalesce(c.tags, '{}') @> kw.stems)
           else coalesce(c.tags, '{}') @> s.industry
                and (not exists (select 1 from kw)
                     or exists (select 1 from kw where (coalesce(c.tags, '{}') || term_stems(c.name) || term_stems(c.industry)) @> kw.stems))
         end
     -- Zona: luoghi dell'azienda, città o regione dei suoi annunci (gli annunci si leggono solo se servono).
     and (jsonb_array_length(coalesce(s.target -> 'regions', '[]')) = 0
          or exists (select 1 from rg where (c.places || term_stems(c.city)) @> rg.stems)
          or exists (
            select 1 from rg
             where (c.places || term_stems(c.city)
                    || coalesce((select array_agg(distinct w) from job_ads j2, unnest(term_stems(j2.region) || term_stems(j2.city)) w
                                  where j2.company_id = c.id), '{}')) @> rg.stems))
     and not exists (select 1 from ex where (c.tags || term_stems(c.name) || term_stems(c.industry)) @> ex.stems)
$q$ using p_org, p_target, p_contacts, p_exclude;
end;
$f$;

create temp table v_ricerche on commit drop as
  select s.id, s.name, s.org_id, s.target, s.contacts_per_company from searches s
   where s.deleted_at is null and target_is_simple(s.target)
   order by s.created_at desc limit 4;
create temp table v_attuale on commit drop as
  select r.id, p::text as riga from v_ricerche r, lateral target_pool(r.org_id, r.target, r.contacts_per_company, '{}') p;
create temp table v_nuova on commit drop as
  select r.id, p::text as riga from v_ricerche r, lateral target_pool_059(r.org_id, r.target, r.contacts_per_company, '{}') p;

select r.name,
       (select count(*) from v_attuale a where a.id = r.id) as attuale,
       (select count(*) from v_nuova n where n.id = r.id) as nuova,
       (select count(*) from ((select riga from v_attuale where id = r.id except all select riga from v_nuova where id = r.id)
                              union all
                              (select riga from v_nuova where id = r.id except all select riga from v_attuale where id = r.id)) d) as differenze
  from v_ricerche r;

rollback;
