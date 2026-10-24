-- Controllo siti, aziende salvate ora per ora nelle ultime 24 ore e arretrato (24/10). Solo lettura.
-- Il worker del VPS gira alle :05 e alle :35 (fino a 300 aziende a giro), n8n alle :25 (150): se il worker è regolare si
-- vedono circa 600-750 aziende l'ora, e n8n «Aziende | Controllo siti» si può spegnere (checklist 95).
select to_char(date_trunc('hour', site_checked_at) at time zone 'Europe/Rome', 'DD/MM HH24":00"') as ora,
       count(*) as aziende_controllate
  from companies
 where site_checked_at > now() - interval '24 hours'
 group by date_trunc('hour', site_checked_at)
 order by date_trunc('hour', site_checked_at) desc;

-- Arretrato: aziende mai controllate o da più di 25 giorni (escluse quelle non in target).
select count(*) filter (where site_checked_at is null) as mai_controllate,
       count(*) filter (where site_checked_at < now() - interval '25 days') as scadute
  from companies
 where (site_checked_at is null or site_checked_at < now() - interval '25 days')
   and not is_non_target_company(name);
