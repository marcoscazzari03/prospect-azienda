-- Verifica della migrazione 062 sui dati veri, PRIMA di eseguirla: quante aziende del database diventano «portale o
-- piattaforma» con la regola nuova, raggruppate per dominio del portale (nessun nome di azienda). Annulla tutto (rollback).
begin;
create or replace function pg_temp.nuova(p_domain text) returns boolean language sql immutable as $$
  select coalesce(p_domain, '') ~* '(^|\.)(thefork|booking|accor|airbnb|expedia|hotels|trivago|agoda|tripadvisor|justeat|deliveroo|glovoapp|ubereats|facebook|instagram|google|wixsite|vorreiordinare|treatwell|bookizon|comingsoon|flowcode|menudigitale|spiiky|autoscout24|oraridiapertura24|trovavetrine|datadeo|campagnamica|linktr)\.[a-z.]+$'
      or coalesce(p_domain, '') ~* '(^|\.)(business\.site|bento\.me|lnk\.bio|camping\.it)$'
$$;
select regexp_replace(c.domain, '^.*?([a-z0-9-]+\.[a-z]+)$', '\1') as portale, count(*) as aziende
  from companies c
 where pg_temp.nuova(c.domain) and not is_platform_domain(c.domain)
 group by 1 order by 2 desc;
rollback;
