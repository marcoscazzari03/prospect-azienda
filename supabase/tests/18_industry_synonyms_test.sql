-- Sinonimi dei settori: chi cerca «albergo» trova gli hotel, senza allargare troppo.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000018', 'sara@sigma.it', '{}');
create temp table o18 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000018') as org;

select store_imported_companies('osm', '[
  {"domain":"hotelsole18.it","name":"Hotel Sole","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Hotel","keywords":["hotel","turismo"]},
  {"domain":"dentista18.it","name":"Studio Rossi","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Studio dentistico","keywords":["dentista"]},
  {"domain":"meccanica18.it","name":"Meccanica Bianchi","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Meccanica","keywords":["meccanica","metalmeccanica"]}
]');
select store_company_checks('[
  {"company":{"domain":"hotelsole18.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"dentista18.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"meccanica18.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]}
]', '{}', 'seed');

select pg_temp.check((select tags @> array['alberg', 'albergh'] from companies where domain = 'hotelsole18.it'), 'hotel: etichette allargate ad albergo');
select pg_temp.check(target_availability((select org from o18), '{"industry":"Albergo","countries":["IT"],"regions":["Puglia"]}', 1) = 1, 'cerca «albergo», trova l''hotel');
select pg_temp.check(target_availability((select org from o18), '{"industry":"Odontoiatra","countries":["IT"],"regions":["Puglia"]}', 1) = 1, 'cerca «odontoiatra», trova il dentista');
select pg_temp.check(target_availability((select org from o18), '{"industry":"Autofficina","countries":["IT"],"regions":["Puglia"]}', 1) = 0, 'la meccanica industriale non diventa un''autofficina');
select pg_temp.check(target_availability((select org from o18), '{"industry":"Hotel","countries":["IT"],"regions":["Puglia"]}', 1) = 1, 'la ricerca «hotel» resta uguale');
select pg_temp.check((select not (tags @> array['alberg']) from companies where domain = 'dentista18.it'), 'nessun sinonimo dove non serve');

-- Aggiornamenti successivi delle etichette (settore da Haiku): il gruppo si aggiunge anche lì.
update companies set tags = array['ristorant'] where domain = 'meccanica18.it';
select pg_temp.check((select tags @> array['trattori', 'osteri'] from companies where domain = 'meccanica18.it'), 'etichette aggiornate: sinonimi aggiunti');

select 'superati tutti i test sinonimi';
