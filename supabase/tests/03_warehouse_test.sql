-- Test del magazzino dei lead: un cliente trova dei contatti col motore,
-- un altro cliente con lo stesso target li riceve subito dal magazzino.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(term_stems('Studi legali') = '{legal}' and term_stems('Studio Legale Associato') @> '{legal}',
                     'termini normalizzati: studi legali = studio legale');

insert into auth.users (id, email, raw_user_meta_data) values
  ('55555555-5555-5555-5555-555555555555', 'elena@eps.it', '{}'),
  ('66666666-6666-6666-6666-666666666666', 'fabio@zeta.it', '{}');
create temp table w as
  select (select org_id from memberships where user_id = '55555555-5555-5555-5555-555555555555') as org_e,
         (select org_id from memberships where user_id = '66666666-6666-6666-6666-666666666666') as org_f;
select grant_credits((select org_e from w), 100, 'grant', 'test');
select grant_credits((select org_f from w), 100, 'grant', 'test');

-- Elena trova 3 studi legali a Milano con il motore.
create temp table se as
  select * from create_search('55555555-5555-5555-5555-555555555555', (select org_e from w), 'Avvocati Lombardia',
    '{"industry":"Studi legali","countries":["IT"],"regions":["Lombardia"],"roles":["Titolare"]}', 'mixed', 5, 1);
create temp table re as select * from start_run((select id from se), sha256_hex('tok-e'), 5);
select apply_engine_results((select id from re), sha256_hex('tok-e'), $json$
{"leads": [
  {"company":{"name":"Studio Uno","domain":"uno.it","website":"https://uno.it","country":"Italia","city":"Milano","industry":"Studio legale"},
   "person":{"full_name":"Aldo Uno","job_title":"Avvocato titolare","role_match":"exact"},
   "email":{"address":"aldo@uno.it","type":"personal","status":"found_public","source":"website","source_url":"https://uno.it/team"},
   "keys":{"person_key":"aldo uno|uno.it"}, "quality":{"score":90}},
  {"company":{"name":"Studio Due","domain":"due.it","website":"https://due.it","country":"Italia","city":"Bergamo"},
   "person":{"full_name":"Bice Due","job_title":"Socio fondatore"},
   "email":{"address":"info@due.it","type":"generic","status":"found_public","source":"website"},
   "keys":{"person_key":"bice due|due.it"}, "quality":{"score":70}},
  {"company":{"name":"Studio Tre","domain":"tre.it","website":"https://tre.it","country":"Italia","city":"Milano"},
   "person":{"full_name":"Carlo Tre","job_title":"Titolare"},
   "email":{"address":"carlo@tre.it","type":"personal","status":"validated","source":"enrichment"},
   "keys":{"person_key":"carlo tre|tre.it"}, "quality":{"score":80}}
], "usage":{"ai_search_calls":1}}
$json$::jsonb);
select pg_temp.check((select tags @> '{legal}' and country_code = 'IT' and places @> '{lombardi,milan}' from companies where domain = 'uno.it'),
                     'azienda etichettata con settore, paese e zona della ricerca');

-- Fabio cerca "studio legale" in Lombardia: 3 candidati dal magazzino.
create temp table sf as
  select * from create_search('66666666-6666-6666-6666-666666666666', (select org_f from w), 'Legali',
    '{"industry":"studio legale","countries":["IT"],"regions":["Lombardia"],"roles":["Titolare"]}', 'mixed', 2, 1);
select pg_temp.check((select count(*) = 3 from warehouse_candidates((select id from sf))), 'stesso target: 3 candidati');
select pg_temp.check((select person_id is not null and lead #>> '{keys,person_key}' = 'aldo uno|uno.it'
                        from warehouse_candidates((select id from sf)) limit 1), 'ordinati per qualità');

create temp table rf as select deliver_from_warehouse((select id from sf),
  (select jsonb_agg(jsonb_build_object('person_id', person_id, 'role_match', 'exact')) from warehouse_candidates((select id from sf)))) as v;
select pg_temp.check((select (v ->> 'new')::int = 2 from rf), 'consegnati 2 lead, quanti richiesti');
select pg_temp.check((select delivered = 2 and credits_charged = 5 from searches where id = (select id from sf)),
                     'addebito come per il motore (2 nominativa sul sito + 3 validata)');
select pg_temp.check((select count(*) = 2 from deliveries where org_id = (select org_f from w) and source = 'warehouse' and run_id is null),
                     'consegne segnate come magazzino');
select pg_temp.check((select data #>> '{origin,source}' = 'warehouse' from deliveries where org_id = (select org_f from w) limit 1),
                     'origine visibile nel lead');
select pg_temp.check(exists (select 1 from search_events where search_id = (select id from sf) and stage = 'warehouse'),
                     'evento "consegnati dal nostro archivio"');
select pg_temp.check((select last_verified_at < now() from people where person_key = 'aldo uno|uno.it')
                     and (select count(*) = 3 from people where person_key like '%|uno.it' or person_key like '%|due.it' or person_key like '%|tre.it'), 'magazzino non toccato dalla riconsegna');
select finalize_search((select id from sf));
select pg_temp.check((select status = 'completed' from searches where id = (select id from sf)), 'ricerca completata senza motore');

-- Seconda ricerca di Fabio: già avuti 2 contatti, resta solo il terzo.
create temp table sf2 as
  select * from create_search('66666666-6666-6666-6666-666666666666', (select org_f from w), 'Legali 2',
    '{"industry":"Avvocati","industry_keywords":["studi legali"],"countries":["IT"],"regions":[],"roles":["Titolare"]}', 'mixed', 5, 1);
select pg_temp.check((select count(*) = 1 from warehouse_candidates((select id from sf2))),
                     'mai due volte lo stesso contatto; corrispondenza anche per parola chiave');
select finalize_search((select id from sf2));

-- Target diversi: nessun candidato.
create temp table targets (t jsonb, mode text, msg text);
insert into targets values
  ('{"industry":"Software house","countries":["IT"]}', 'mixed', 'altro settore'),
  ('{"industry":"Studi legali","countries":["DE"]}', 'mixed', 'altro paese'),
  ('{"industry":"Studi legali","countries":["IT"],"regions":["Lazio"]}', 'mixed', 'altra zona'),
  ('{"industry":"Studi legali","countries":["IT"],"exclude_keywords":["Studio Uno","Studio Tre","legali"]}', 'mixed', 'parole escluse');
insert into auth.users (id, email) values ('77777777-7777-7777-7777-777777777777', 'gino@eta.it');
create temp table g as select (select org_id from memberships where user_id = '77777777-7777-7777-7777-777777777777') as org_g;
select grant_credits((select org_g from g), 100, 'grant', 'test');
do $$
declare r record; v_id uuid; n int;
begin
  for r in select * from targets loop
    select id into v_id from create_search('77777777-7777-7777-7777-777777777777', (select org_g from g), 'x', r.t, r.mode, 1, 1);
    select count(*) into n from warehouse_candidates(v_id);
    if n <> 0 then raise exception 'TEST FALLITO: % (% candidati)', r.msg, n; end if;
    raise notice 'ok  nessun candidato: %', r.msg;
    perform finalize_search(v_id);
  end loop;
end $$;

create temp table sg as
  select * from create_search('77777777-7777-7777-7777-777777777777', (select org_g from g), 'x',
    '{"industry":"Studi legali","countries":["IT"]}', 'personal_only', 5, 1);
select pg_temp.check((select count(*) = 2 from warehouse_candidates((select id from sg))), 'solo nominative: la generica è esclusa');
update emails set bounce_reports = 1 where address = 'aldo@uno.it';
select pg_temp.check((select count(*) = 1 from warehouse_candidates((select id from sg))), 'email con bounce esclusa');
update people set last_verified_at = now() - interval '200 days' where person_key = 'carlo tre|tre.it';
select pg_temp.check((select count(*) = 0 from warehouse_candidates((select id from sg))), 'dati vecchi esclusi');
update emails set bounce_reports = 0 where address = 'aldo@uno.it';
insert into suppression_list (email_hash) values (sha256_hex('aldo@uno.it'));
select pg_temp.check((select count(*) = 0 from warehouse_candidates((select id from sg))), 'opposizione GDPR rispettata');

set role authenticated;
do $$ begin
  perform warehouse_candidates((select id from sg));
  raise exception 'doveva fallire';
exception when insufficient_privilege then null;
end $$;
reset role;
select pg_temp.check(true, 'magazzino non accessibile agli utenti');

\echo 'Test magazzino superati.'
