-- Magazzino completo: si salva ogni lead valido trovato dal motore, anche se non
-- viene consegnato, e un altro cliente lo riceve dal magazzino.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('d1d1d1d1-0000-4000-8000-000000000001', 'olga@omega.it', '{}'),
  ('d1d1d1d1-0000-4000-8000-000000000002', 'piero@psi.it', '{}');
create temp table o5 as
  select (select org_id from memberships where user_id = 'd1d1d1d1-0000-4000-8000-000000000001') as org_o,
         (select org_id from memberships where user_id = 'd1d1d1d1-0000-4000-8000-000000000002') as org_p;
select grant_credits((select org_o from o5), 100, 'grant', 'test');
select grant_credits((select org_p from o5), 100, 'grant', 'test');
update plans set max_active_searches = 5 where id = (select plan_id from organizations where id = (select org_p from o5));

-- Olga chiede 1 solo lead nominativo: il motore ne trova 4 validi + 1 in opposizione.
create temp table so as
  select * from create_search('d1d1d1d1-0000-4000-8000-000000000001', (select org_o from o5), 'Architetti',
    '{"industry":"Studi di architettura","countries":["IT"],"regions":["Piemonte"],"roles":["Titolare"]}', 'personal_only', 1, 1);
insert into suppression_list (email_hash) values (sha256_hex('vietato@quinto.it'));
create temp table ro as select * from start_run((select id from so), sha256_hex('tok-o'), 1);
create temp table res as select apply_engine_results((select id from ro), sha256_hex('tok-o'), $json$
{"leads": [
  {"company":{"name":"Studio Primo","domain":"primo.it","website":"https://primo.it","country":"Italia","city":"Torino"},
   "person":{"full_name":"Paolo Primo","job_title":"Architetto titolare"},
   "email":{"address":"paolo@primo.it","type":"personal","status":"found_public","source":"website","alternatives":[{"address":"info@primo.it"}]},
   "keys":{"person_key":"paolo primo|primo.it"}, "quality":{"score":90}},
  {"company":{"name":"Studio Secondo","domain":"secondo.it","website":"https://secondo.it","country":"Italia","city":"Torino"},
   "person":{"full_name":"Sara Secondo","job_title":"Titolare"},
   "email":{"address":"sara@secondo.it","type":"personal","status":"validated","source":"enrichment"},
   "keys":{"person_key":"sara secondo|secondo.it"}, "quality":{"score":85}},
  {"company":{"name":"Studio Primo","domain":"primo.it","website":"https://primo.it","country":"Italia","city":"Torino"},
   "person":{"full_name":"Pia Primo","job_title":"Socia"},
   "email":{"address":"pia@primo.it","type":"personal","status":"found_public","source":"website"},
   "keys":{"person_key":"pia primo|primo.it"}, "quality":{"score":80}},
  {"company":{"name":"Studio Terzo","domain":"terzo.it","website":"https://terzo.it","country":"Italia","city":"Novara"},
   "person":{"full_name":"Tino Terzo","job_title":"Titolare"},
   "email":{"address":"info@terzo.it","type":"generic","status":"found_public","source":"website"},
   "keys":{"person_key":"tino terzo|terzo.it"}, "quality":{"score":60}, "_stock_only": true},
  {"company":{"name":"Studio Quinto","domain":"quinto.it","website":"https://quinto.it","country":"Italia"},
   "person":{"full_name":"Quinto Q","job_title":"Titolare"},
   "email":{"address":"vietato@quinto.it","type":"personal","status":"found_public","source":"website"},
   "keys":{"person_key":"quinto q|quinto.it"}},
  {"company":{"name":"Studio Sesto","domain":"sesto.it","country":"Italia"},
   "person":{"full_name":"Sesto S","job_title":"Titolare"},
   "email":{"address":"sesto@sesto.it","type":"personal","status":"guessed"},
   "keys":{"person_key":"sesto s|sesto.it"}}
]}
$json$::jsonb) as v;

select pg_temp.check((select delivered = 1 from searches where id = (select id from so)), 'consegnato solo il lead richiesto');
select pg_temp.check((select (v ->> 'stocked')::int = 4 and (v #>> '{skipped,beyond_quantity}')::int = 2 from res),
                     '4 lead salvati in magazzino, 2 oltre la quantità');
select pg_temp.check((select count(*) = 4 from people where lead is not null and person_key in
                       ('paolo primo|primo.it', 'sara secondo|secondo.it', 'pia primo|primo.it', 'tino terzo|terzo.it')),
                     'schede salvate anche per i lead non consegnati e per la generica di «solo nominative»');
select pg_temp.check(not exists (select 1 from people where person_key in ('quinto q|quinto.it', 'sesto s|sesto.it')),
                     'mai salvati: contatti in opposizione ed email ipotizzate');
select pg_temp.check((select lead -> 'email' ? 'alternatives' from people where person_key = 'paolo primo|primo.it') = false
                     and (select e.address = 'paolo@primo.it' from people p join emails e on e.id = p.email_id where p.person_key = 'paolo primo|primo.it'),
                     'scheda con l''email da vendere, senza le alternative');

-- Piero cerca lo stesso target: riceve dal magazzino i lead che Olga non ha avuto.
create temp table sp5 as
  select * from create_search('d1d1d1d1-0000-4000-8000-000000000002', (select org_p from o5), 'Architetti Piemonte',
    '{"industry":"Studi di architettura","countries":["IT"],"regions":["Piemonte"],"roles":["Titolare"]}', 'mixed', 10, 2);
select pg_temp.check((select count(*) = 4 from warehouse_candidates((select id from sp5))),
                     'magazzino: 4 candidati, anche quelli mai consegnati');
create temp table rp5 as select deliver_from_warehouse((select id from sp5),
  (select jsonb_agg(jsonb_build_object('person_id', person_id, 'role_match', 'exact')) from warehouse_candidates((select id from sp5)))) as v;
select pg_temp.check((select (v ->> 'new')::int = 4 from rp5), 'consegnati dal magazzino');
select pg_temp.check((select count(*) = 0 from warehouse_candidates((select id from sp5))), 'mai due volte allo stesso cliente');

-- Olga non riceve dal magazzino il contatto che ha già avuto.
create temp table so2 as
  select * from create_search('d1d1d1d1-0000-4000-8000-000000000001', (select org_o from o5), 'Architetti 2',
    '{"industry":"Studi di architettura","countries":["IT"],"regions":["Piemonte"],"roles":["Titolare"]}', 'mixed', 10, 2);
select pg_temp.check((select count(*) = 3 and bool_and(lead #>> '{keys,person_key}' <> (select person_key from deliveries where org_id = (select org_o from o5) limit 1))
                        from warehouse_candidates((select id from so2))),
                     'il cliente non riceve ciò che ha già');

-- Un'email nominativa vince sulla generica nella scheda.
select stock_lead('{"company":{"name":"Studio Terzo","domain":"terzo.it"},"person":{"full_name":"Tino Terzo"},
  "email":{"address":"tino@terzo.it","type":"personal","status":"found_public","source":"website"},
  "keys":{"person_key":"tino terzo|terzo.it"}}', '{}');
select stock_lead('{"company":{"name":"Studio Terzo","domain":"terzo.it"},"person":{"full_name":"Tino Terzo"},
  "email":{"address":"segreteria@terzo.it","type":"generic","status":"found_public","source":"website"},
  "keys":{"person_key":"tino terzo|terzo.it"}}', '{}');
select pg_temp.check((select e.address = 'tino@terzo.it' from people p join emails e on e.id = p.email_id where p.person_key = 'tino terzo|terzo.it'),
                     'la nominativa resta nella scheda anche se poi arriva una generica');

\echo 'Test magazzino completo superati.'

-- Ricerca opportunità «tutti i settori»: il magazzino non filtra per settore.
create temp table sa as
  select * from create_search('d1d1d1d1-0000-4000-8000-000000000002', (select org_p from o5), 'Tutti i settori',
    '{"industry":"","countries":["IT"],"regions":["Piemonte"],"roles":["Titolare"]}', 'mixed', 5, 2);
select pg_temp.check((select count(*) = 0 from warehouse_candidates((select id from sa))),
                     'tutti i settori: nessun candidato che il cliente ha già');
create temp table sa2 as
  select * from create_search('d1d1d1d1-0000-4000-8000-000000000001', (select org_o from o5), 'Tutti i settori 2',
    '{"industry":"","countries":["IT"],"regions":["Piemonte"],"roles":["Titolare"]}', 'mixed', 5, 2);
select pg_temp.check((select count(*) >= 1 from warehouse_candidates((select id from sa2))),
                     'tutti i settori: candidati di qualsiasi settore');
\echo 'Test tutti i settori superati.'
