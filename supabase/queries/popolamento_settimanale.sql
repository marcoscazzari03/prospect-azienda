-- Controllo settimanale del popolamento (21/10, preparate dal Business Analyst e provate su un Postgres locale con tutte le migrazioni).
-- Sola lettura: eseguire una query alla volta nel SQL Editor di Supabase.

-- Q1 Aziende per origine: settore, controlli, email, nuove della settimana
select coalesce(x.o, 'TOTALE') as origine,
       count(*) as aziende,
       count(*) filter (where c.first_seen_at >= now() - interval '7 days') as nuove_7gg,
       count(*) filter (where c.industry <> '') as con_settore,
       count(*) filter (where c.industry = '' and c.industry_checked_at is null) as senza_settore_mai_provato,
       count(*) filter (where c.industry = '' and c.industry_checked_at is not null) as senza_settore_dopo_claude,
       count(*) filter (where c.site_checked_at is not null) as controllate,
       count(*) filter (where c.site_checked_at >= now() - interval '7 days') as controllate_7gg,
       count(*) filter (where c.site_checked_at is null) as mai_controllate,
       count(*) filter (where c.site_checked_at is not null and not exists (
         select 1 from company_checks k where k.company_id = c.id and k.status in ('pass', 'fail'))) as irraggiungibili,
       count(*) filter (where c.site_email <> '') as con_email_sito
  from companies c
 cross join lateral (select coalesce(nullif(c.origin, ''), '(vuota)') as o) x
 group by rollup (x.o)
 order by aziende desc;

-- Q2 Coda del controllo siti (stesse condizioni di pending_site_checks) e scadenze dei prossimi 10 giorni
select 'in coda adesso' as quando, count(*) as aziende
  from companies c
 where (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
   and not is_non_target_company(c.name)
union all
select 'tornano in coda il ' || to_char(date_trunc('day', c.site_checked_at + interval '25 days'), 'DD/MM'), count(*)
  from companies c
 where c.site_checked_at >= now() - interval '25 days'
   and c.site_checked_at + interval '25 days' < now() + interval '10 days'
 group by date_trunc('day', c.site_checked_at + interval '25 days')
 order by 1;

-- Q3 Prove per segnale: fresche (30 giorni, annunci 60), nuove della settimana, in scadenza entro 5 giorni
select cs.code as segnale,
       count(*) filter (where signal_is_fresh(cs.code, cs.evidence, cs.checked_at)) as fresche,
       count(*) as totali,
       count(*) filter (where cs.checked_at >= now() - interval '7 days') as nuove_7gg,
       count(*) filter (where cs.code <> 'job_ad' and cs.checked_at between now() - interval '30 days' and now() - interval '25 days') as scadono_entro_5gg
  from company_signals cs
 group by cs.code
 order by fresche desc;

-- Q3b Annunci: la fonte vera è job_ads, non company_signals (21/10, Data Quality). In company_signals job_ad c'è solo
-- per i lead consegnati con l'annuncio; le ricerche opportunità leggono job_ads (opportunity_pool).
select coalesce(j.family, 'TOTALE') as famiglia, count(distinct j.company_id) as aziende_con_annuncio_60gg
  from job_ads j
 where j.company_id is not null and j.posted_at >= now() - interval '60 days'
 group by rollup (j.family) order by 2 desc;

-- Q4 Aziende e prove fresche per regione (la colonna con_annuncio conta solo i lead consegnati con l'annuncio: vedi Q3b) (zona dai luoghi dell'azienda, come le ricerche; senza filtro di settore)
with reg as (select distinct regione, term_stems(regione) as st from it_provinces),
     f as (select cs.company_id, cs.code from company_signals cs where signal_is_fresh(cs.code, cs.evidence, cs.checked_at))
select reg.regione,
       count(distinct c.id) as aziende,
       count(distinct c.id) filter (where c.site_checked_at >= now() - interval '30 days') as controllate_30gg,
       count(distinct f.company_id) filter (where f.code in ('outdated_cms', 'no_mobile', 'stale_copyright')) as rifacimento_sito,
       count(distinct f.company_id) filter (where f.code = 'outdated_cms') as manutenzione_wp,
       count(distinct f.company_id) filter (where f.code in ('no_https', 'outdated_cms')) as sicurezza_sito,
       count(distinct f.company_id) filter (where f.code = 'single_language') as una_lingua,
       count(distinct f.company_id) filter (where f.code = 'no_privacy') as senza_privacy,
       count(distinct f.company_id) filter (where f.code = 'job_ad') as con_annuncio
  from reg
  join companies c on c.places @> reg.st
  left join f on f.company_id = c.id
 group by reg.regione
 order by aziende desc;

-- Q5 Annunci degli ultimi 60 giorni con azienda collegata, per famiglia
select coalesce(j.family, 'TOTALE') as famiglia,
       count(*) as annunci,
       count(*) filter (where j.company_id is not null) as collegati,
       count(distinct j.company_id) as aziende_collegate,
       count(*) filter (where j.first_seen_at >= now() - interval '7 days') as nuovi_7gg
  from job_ads j
 where j.posted_at >= now() - interval '60 days'
 group by rollup (j.family)
 order by annunci desc;

-- Q6 Ricerche della settimana: clienti e admin, tipo, esito
with s as (
  select se.*,
         exists (select 1 from memberships m join profiles p on p.user_id = m.user_id
                  where m.org_id = se.org_id and p.is_admin) as admin,
         case when cardinality(search_signal_codes(se.target)) > 0 then 'opportunita' else 'target' end as tipo
    from searches se
   where se.created_at >= now() - interval '7 days')
select case when admin then 'admin' else 'clienti' end as chi, tipo, status,
       count(*) as ricerche, count(distinct org_id) as organizzazioni,
       sum(quantity) as richiesti, sum(delivered) as consegnati, sum(credits_charged) as crediti
  from s
 group by 1, 2, 3
 order by 1, 2, 3;

-- Q7 Lead consegnati per giorno e provenienza (database o ricerca AI), solo clienti
select d.delivered_at::date as giorno, d.source as provenienza,
       count(*) as lead, count(distinct d.org_id) as clienti, sum(d.credits) as crediti
  from deliveries d
 where d.delivered_at >= now() - interval '7 days'
   and not exists (select 1 from memberships m join profiles p on p.user_id = m.user_id
                    where m.org_id = d.org_id and p.is_admin)
 group by 1, 2
 order by 1, 2;

-- Q8 Servizi, settori e regioni cercati nella settimana (clienti e admin separati)
select case when exists (select 1 from memberships m join profiles p on p.user_id = m.user_id
                          where m.org_id = se.org_id and p.is_admin) then 'admin' else 'clienti' end as chi,
       coalesce(se.target #>> '{signals,offer}', '(target)') as servizio,
       coalesce(nullif(se.target ->> 'industry', ''), '(tutti i settori)') as settore,
       coalesce(r.regione, '(tutta Italia)') as regione,
       count(*) as ricerche, sum(se.quantity) as richiesti, sum(se.delivered) as consegnati
  from searches se
  left join lateral jsonb_array_elements_text(coalesce(se.target -> 'regions', '[]')) r(regione) on true
 where se.created_at >= now() - interval '7 days'
 group by 1, 2, 3, 4
 order by ricerche desc
 limit 40;
