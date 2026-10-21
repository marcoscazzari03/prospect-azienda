-- Pagine che non sono il sito: la vecchia prova si toglie (migrazione 055, punto 2 del 21/10).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select store_company_checks(jsonb_build_array(
  jsonb_build_object('company', jsonb_build_object('domain', 'bloccata32.it', 'name', 'Bloccata'),
    'checks', '[{"code":"no_mobile","status":"pass","evidence":{}},{"code":"no_privacy","status":"pass","evidence":{}}]'::jsonb),
  jsonb_build_object('company', jsonb_build_object('domain', 'spenta32.it', 'name', 'Spenta'),
    'checks', '[{"code":"no_mobile","status":"pass","evidence":{}}]'::jsonb)), '{}', 'seed');
select pg_temp.check((select count(*) = 3 from company_signals s join companies c on c.id = s.company_id where c.domain like '%32.it'),
  'prove salvate al primo controllo');

select store_company_checks(jsonb_build_array(
  jsonb_build_object('company', jsonb_build_object('domain', 'bloccata32.it', 'name', 'Bloccata'),
    'checks', '[{"code":"no_mobile","status":"undetermined","evidence":{"detail":"Pagina di blocco o di errore, non il sito","invalid_page":true}},{"code":"no_privacy","status":"undetermined","evidence":{"detail":"Pagina di blocco o di errore, non il sito","invalid_page":true}}]'::jsonb),
  jsonb_build_object('company', jsonb_build_object('domain', 'spenta32.it', 'name', 'Spenta'),
    'checks', '[{"code":"no_mobile","status":"undetermined","evidence":{"detail":"Sito non raggiungibile"}}]'::jsonb)), '{}', 'seed');
select pg_temp.check((select count(*) = 0 from company_signals s join companies c on c.id = s.company_id where c.domain = 'bloccata32.it'),
  'pagina che non è il sito: vecchie prove tolte');
select pg_temp.check((select count(*) = 1 from company_signals s join companies c on c.id = s.company_id where c.domain = 'spenta32.it'),
  'non determinabile per altri motivi (sito spento): la prova resta');
select pg_temp.check((select status = 'undetermined' from company_checks k join companies c on c.id = k.company_id where c.domain = 'bloccata32.it' and k.code = 'no_mobile'),
  'il controllo resta registrato come non determinabile');
