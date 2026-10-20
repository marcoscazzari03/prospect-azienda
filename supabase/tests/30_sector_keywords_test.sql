-- Parole chiave del settore che restringono (migrazione 052, punto 52).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000030', 'sk@tau.it', '{}');
create temp table o30 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000030') as org;

select store_imported_companies('osm', '[
  {"domain":"palcomweb30.it","name":"Palcom Web Agency","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Informatica","keywords":["informatica"]},
  {"domain":"negoziopc30.it","name":"Negozio Computer Lecce","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Informatica","keywords":["informatica"]},
  {"domain":"albergo30.it","name":"Albergo Web Lecce","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Albergo","keywords":["albergo"]}
]');
select store_company_checks('[
  {"company":{"domain":"palcomweb30.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"negoziopc30.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"albergo30.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]}
]', '{}', 'seed');

select pg_temp.check(target_availability((select org from o30),
  '{"industry":"Informatica","countries":["IT"],"regions":["Puglia"]}', 1) = 2, 'solo settore: entrambe le aziende di informatica');
select pg_temp.check(target_availability((select org from o30),
  '{"industry":"Informatica","industry_keywords":["web agency"],"countries":["IT"],"regions":["Puglia"]}', 1) = 1,
  'settore + «web agency»: solo la web agency, non il negozio di computer né l''albergo');
select pg_temp.check(target_availability((select org from o30),
  '{"industry":"Informatica","industry_keywords":["web agency","sviluppo siti"],"countries":["IT"],"regions":["Puglia"]}', 1) = 1,
  'più parole chiave: basta una');
select pg_temp.check(target_availability((select org from o30),
  '{"industry":"","industry_keywords":["informatica"],"countries":["IT"],"regions":["Puglia"]}', 1) = 2
  and target_availability((select org from o30),
  '{"industry":"","industry_keywords":["albergo","informatica"],"countries":["IT"],"regions":["Puglia"]}', 1) > 2,
  'senza settore le parole chiave restano alternative');
select pg_temp.check(sector_matches('{"industry_keywords":["di"]}', array['informat'], array['informat'], 'X', ''),
  'parola chiave senza termini utili: ignorata');
select pg_temp.check(sector_matches('{}', '{}', '{}', 'X', ''), 'nessun settore né parola chiave: nessun filtro');
