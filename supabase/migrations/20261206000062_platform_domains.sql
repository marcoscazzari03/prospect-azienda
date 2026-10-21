-- Portali e piattaforme non sono il sito dell'azienda (punto 54e, Data Quality 21/10). Su 234 aziende OSM con nome e dominio
-- molto diversi, 28 avevano come sito la pagina di un portale (TheFork, Trivago, Treatwell, AutoScout24, lnk.bio, menù
-- digitali, elenchi locali): il controllo ne leggeva la homepage e salvava email e segnali del portale. Le pagine interne
-- erano già escluse dalle ricerche (is_hosted_page, 033); restavano i portali indicati con la sola homepage e i siti
-- business.site di Google (servizio chiuso: 59 aziende), che la vecchia espressione non riconosceva nei sottodomini.
-- Effetto: queste aziende escono dalle riserve, dagli avvisi e dai prossimi import (store_imported_companies, 048).
-- Indietro: rieseguire is_platform_domain dalla 033.

create or replace function public.is_platform_domain(p_domain text)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(p_domain, '') ~* '(^|\.)(thefork|booking|accor|airbnb|expedia|hotels|trivago|agoda|tripadvisor|justeat|deliveroo|glovoapp|ubereats|facebook|instagram|google|wixsite|vorreiordinare|treatwell|bookizon|comingsoon|flowcode|menudigitale|spiiky|autoscout24|oraridiapertura24|trovavetrine|datadeo|campagnamica|linktr)\.[a-z.]+$'
      or coalesce(p_domain, '') ~* '(^|\.)(business\.site|bento\.me|lnk\.bio|camping\.it)$'
$$;
