-- Regione delle aziende dai loro dati, non dalla ricerca (migrazione 042).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check((select count(*) = 107 from it_provinces), '107 province');
select pg_temp.check(city_places('Padova') @> term_stems('Veneto'), 'capoluogo: regione dalla città');
select pg_temp.check(city_places('Forlì') @> term_stems('Emilia-Romagna') and city_places('Monza') @> term_stems('Lombardia'), 'parte del nome della provincia');
select pg_temp.check(not (city_places('Reggio') && term_stems('Calabria')) and not (city_places('Reggio') && term_stems('Emilia')), 'nome ambiguo: nessuna regione');
select pg_temp.check(not (city_places('Roma') && term_stems('Veneto')), 'Roma non è in Veneto');

insert into companies (domain, name, website, country, city, origin) values
  ('dinamica42.it', 'Dinamica', 'https://dinamica42.it', 'Italia', 'Roma', ''),
  ('piccolo42.it', 'Piccolo', 'https://piccolo42.it', 'Italia', 'Scorzè', '');
select tag_company(id, '{"industry":"Software","regions":["Veneto"],"countries":["IT"]}') from companies where domain in ('dinamica42.it', 'piccolo42.it');
select pg_temp.check((select not (places && term_stems('Veneto')) and places @> term_stems('Lazio') from companies where domain = 'dinamica42.it'),
                     'azienda di Roma trovata in una ricerca sul Veneto: resta nel Lazio');
select pg_temp.check((select not (places && term_stems('Veneto')) from companies where domain = 'piccolo42.it'),
                     'città non capoluogo: nessuna regione presa dalla ricerca');

select 'superati tutti i test luoghi delle aziende';
