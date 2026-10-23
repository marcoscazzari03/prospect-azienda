-- Segnali misurati dal VPS (migrazione 068, punto 91): salvati come gli altri controlli del sito.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select store_imported_companies('osm', '[{"domain":"lento39.it","name":"Officina Lenta","city":"Lecco","province":"Lecco","region":"Lombardia","industry":"Officina","keywords":["officina"]}]');
select store_company_checks('[{"company":{"domain":"lento39.it"},"checks":[
  {"code":"cert_expiring","status":"pass","evidence":{"detail":"Il certificato HTTPS scade il 30/10/2026 (fra 7 giorni)","days_left":7}},
  {"code":"slow_site","status":"pass","evidence":{"detail":"La homepage ha risposto in 5,2 secondi","seconds":5.2}},
  {"code":"inventato","status":"pass","evidence":{}}
]}]', '{}', 'seed');
select pg_temp.check((select count(*) = 2 from company_signals s join companies c on c.id = s.company_id
                       where c.domain = 'lento39.it' and s.code in ('cert_expiring', 'slow_site')), 'i due segnali del VPS salvati come prove');
select pg_temp.check(not exists (select 1 from company_checks k join companies c on c.id = k.company_id where c.domain = 'lento39.it' and k.code = 'inventato'),
  'un codice sconosciuto resta fuori');

select store_company_checks('[{"company":{"domain":"lento39.it"},"checks":[{"code":"slow_site","status":"fail","evidence":{"seconds":0.8}}]}]', '{}', 'seed');
select pg_temp.check(not exists (select 1 from company_signals s join companies c on c.id = s.company_id where c.domain = 'lento39.it' and s.code = 'slow_site'),
  'sito tornato veloce: la vecchia prova si toglie');
