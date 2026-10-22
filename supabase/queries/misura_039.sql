-- Punto 39 (22/10): numeri della coda del controllo siti in produzione, prima di riproporre la priorità.
-- Sola lettura. La 060 era veloce sul banco di prova (una sola ricerca) e lenta qui: servono le dimensioni vere.
-- Il risultato è una riga sola in JSON; il tempo di pending_site_checks(150) è misurato con clock_timestamp().

with t0 as (select clock_timestamp() as t),
coda as (select count(*) as n from pending_site_checks(150)),
t1 as (select clock_timestamp() as t from coda)
select jsonb_build_object(
  'aziende', (select count(*) from companies),
  'da_controllare_25g', (select count(*) from companies where site_checked_at is null or site_checked_at < now() - interval '25 days'),
  'mai_controllate', (select count(*) from companies where site_checked_at is null),
  'ricerche_30g', (select count(*) from searches where deleted_at is null and created_at > now() - interval '30 days'),
  'zone_settori_diversi_30g', (select count(distinct (coalesce(target -> 'regions', '[]'), coalesce(target ->> 'industry', ''),
                                                      coalesce(target -> 'industry_keywords', '[]')))
                                 from searches where deleted_at is null and created_at > now() - interval '30 days'),
  'avvisi_attivi', (select count(*) from search_alerts),
  'coda_ms', (select round(extract(epoch from (t1.t - t0.t)) * 1000) from t0, t1),
  'zone_piu_cercate', (select coalesce(jsonb_agg(x order by x.ricerche desc), '[]') from (
      select r as zona, count(*) as ricerche
        from searches s, jsonb_array_elements_text(coalesce(s.target -> 'regions', '[]')) r
       where s.deleted_at is null and s.created_at > now() - interval '30 days'
       group by r order by count(*) desc limit 10) x)
) as misura;
