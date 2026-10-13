-- Test dei segnali (fase 3): +1 credito, segnale obbligatorio, prove per azienda,
-- magazzino con prove fresche, rimborso "segnale non corretto".
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(search_required_signals('{"signals":{"codes":["stale_copyright","no_mobile","job_ad"]}}') = '{job_ad,no_mobile}'
                     and search_required_signals('{"signals":{"codes":"x"}}') = '{}' and search_required_signals('{}') = '{}',
                     'segnali che decidono: solo i verificati');
select pg_temp.check(signals_satisfy('{"signals":{"codes":["no_mobile","no_https"]}}', '{no_https}')
                     and not signals_satisfy('{"signals":{"codes":["no_mobile","no_https"],"match":"all"}}', '{no_https}')
                     and not signals_satisfy('{"signals":{"codes":["no_mobile"]}}', '{stale_copyright}')
                     and signals_satisfy('{"signals":{"codes":["stale_copyright"]}}', '{}'),
                     '"basta uno", "servono tutti", indicativi che non decidono');
select pg_temp.check(signal_is_fresh('job_ad', jsonb_build_object('date', (current_date - 10)::text), now())
                     and not signal_is_fresh('job_ad', jsonb_build_object('date', (current_date - 70)::text), now())
                     and not signal_is_fresh('job_ad', '{}', now())
                     and signal_is_fresh('no_mobile', '{}', now() - interval '29 days')
                     and not signal_is_fresh('no_mobile', '{}', now() - interval '31 days'),
                     'freschezza: annunci 60 giorni, sito 30 giorni');

insert into auth.users (id, email, raw_user_meta_data) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'ivo@iota.it', '{}'),
  ('c1c1c1c1-0000-4000-8000-000000000002', 'lia@kappa.it', '{}');
create temp table o as
  select (select org_id from memberships where user_id = 'c1c1c1c1-0000-4000-8000-000000000001') as org_i,
         (select org_id from memberships where user_id = 'c1c1c1c1-0000-4000-8000-000000000002') as org_l;
select grant_credits((select org_i from o), 100, 'grant', 'test');
select grant_credits((select org_l from o), 100, 'grant', 'test');
update plans set max_active_searches = 5 where id = (select plan_id from organizations where id = (select org_l from o));

-- Ivo cerca dentisti con sito non adatto ai cellulari: riserva 3+1 per lead.
create temp table si as
  select * from create_search('c1c1c1c1-0000-4000-8000-000000000001', (select org_i from o), 'Dentisti cellulari',
    '{"industry":"Studi dentistici","countries":["IT"],"regions":["Lombardia"],"roles":["Titolare"],
      "signals":{"codes":["no_mobile","stale_copyright"],"match":"any"}}', 'mixed', 3, 1);
select pg_temp.check((select credits_reserved = 12 from si), 'riserva con segnale: (3 + 1) x 3 lead');

create temp table ri as select * from start_run((select id from si), sha256_hex('tok-i'), 3);
select apply_engine_results((select id from ri), sha256_hex('tok-i'), $json$
{"leads": [
  {"company":{"name":"Studio Alfa","domain":"alfa.it","website":"https://alfa.it","country":"Italia","city":"Milano","technologies":["wordpress"]},
   "person":{"full_name":"Anna Alfa","job_title":"Titolare","role_match":"exact"},
   "email":{"address":"anna@alfa.it","type":"personal","status":"found_public","source":"website"},
   "keys":{"person_key":"anna alfa|alfa.it"}, "quality":{"score":90},
   "signals":[{"code":"no_mobile","evidence":{"detail":"Homepage senza impostazione per dispositivi mobili","checked_at":"2026-10-13"}},
              {"code":"stale_copyright","evidence":{"detail":"Copyright fermo al 2019"}},
              {"code":"outdated_cms","evidence":{"detail":"non richiesto"}}]},
  {"company":{"name":"Studio Beta","domain":"beta.it","website":"https://beta.it","country":"Italia","city":"Bergamo"},
   "person":{"full_name":"Bruno Beta","job_title":"Titolare"},
   "email":{"address":"info@beta.it","type":"generic","status":"found_public","source":"website"},
   "keys":{"person_key":"bruno beta|beta.it"}, "quality":{"score":70},
   "signals":[{"code":"stale_copyright","evidence":{"detail":"Copyright fermo al 2018"}}]},
  {"company":{"name":"Studio Gamma","domain":"gamma.it","website":"https://gamma.it","country":"Italia","city":"Milano"},
   "person":{"full_name":"Gino Gamma","job_title":"Titolare"},
   "email":{"address":"info@gamma.it","type":"generic","status":"found_public","source":"website"},
   "keys":{"person_key":"gino gamma|gamma.it"}, "quality":{"score":60},
   "signals":[{"code":"no_mobile","evidence":{"detail":"Homepage senza impostazione per dispositivi mobili"}}]}
], "usage":{"ai_search_calls":1}}
$json$::jsonb);

select pg_temp.check((select delivered = 2 and credits_charged = 5 from searches where id = (select id from si)),
                     'consegnati solo i lead con il segnale: (2 + 1) + (1 + 1) crediti');
select pg_temp.check(not exists (select 1 from deliveries where person_key = 'bruno beta|beta.it'),
                     'segnale indicativo da solo: lead non consegnato');
select pg_temp.check((select credits = 3 and jsonb_array_length(data -> 'signals') = 2
                        and not (data -> 'signals') @> '[{"code":"outdated_cms"}]'
                        from deliveries where person_key = 'anna alfa|alfa.it'),
                     'prova salvata sul lead, solo per i segnali richiesti');
select pg_temp.check((select count(*) = 3 from company_signals cs join companies c on c.id = cs.company_id where c.domain = 'alfa.it'),
                     'prove salvate per azienda (tutte quelle superate, anche se non richieste)');
select pg_temp.check((select technologies = '{wordpress}' from companies where domain = 'alfa.it'), 'tecnologie salvate');

-- Ricerca senza segnali: prezzo invariato e nessun filtro.
create temp table sn as
  select * from create_search('c1c1c1c1-0000-4000-8000-000000000002', (select org_l from o), 'Dentisti',
    '{"industry":"Studi dentistici","countries":["IT"],"roles":["Titolare"],"signals":{"codes":["stale_copyright"]}}', 'mixed', 2, 1);
select pg_temp.check((select credits_reserved = 6 from sn), 'solo segnali indicativi: nessun credito in più');
select finalize_search((select id from sn));

-- Lia cerca lo stesso segnale: il magazzino consegna solo aziende con la prova fresca.
create temp table sl as
  select * from create_search('c1c1c1c1-0000-4000-8000-000000000002', (select org_l from o), 'Dentisti cellulari',
    '{"industry":"Studi dentistici","countries":["IT"],"regions":["Lombardia"],"roles":["Titolare"],
      "signals":{"codes":["no_mobile"],"match":"any"}}', 'mixed', 5, 1);
select pg_temp.check((select count(*) = 2 from warehouse_candidates((select id from sl))), 'magazzino: 2 aziende con la prova');
update company_signals set checked_at = now() - interval '40 days'
 where company_id = (select id from companies where domain = 'gamma.it');
select pg_temp.check((select count(*) = 1 and bool_and(lead #> '{signals,0}' ->> 'code' = 'no_mobile')
                        from warehouse_candidates((select id from sl))),
                     'prova scaduta (oltre 30 giorni): azienda esclusa; prova copiata nel lead');

create temp table sj as
  select * from create_search('c1c1c1c1-0000-4000-8000-000000000002', (select org_l from o), 'Dentisti annunci',
    '{"industry":"Studi dentistici","countries":["IT"],"roles":["Titolare"],
      "signals":{"codes":["job_ad"],"job_families":[{"code":"hr","label":"Risorse umane","titles":["recruiter"]}]}}', 'mixed', 5, 1);
insert into company_signals (company_id, code, evidence)
  select id, 'job_ad', jsonb_build_object('title', 'Sistemista', 'date', (current_date - 5)::text, 'family', 'it_systems')
    from companies where domain = 'alfa.it';
select pg_temp.check((select count(*) = 0 from warehouse_candidates((select id from sj))), 'annuncio di un''altra famiglia: escluso');
update company_signals set evidence = evidence || '{"family":"hr"}' where code = 'job_ad';
select pg_temp.check((select count(*) = 1 from warehouse_candidates((select id from sj))), 'annuncio della famiglia scelta: valido');
select finalize_search((select id from sj));

create temp table rl as select deliver_from_warehouse((select id from sl),
  (select jsonb_agg(jsonb_build_object('person_id', person_id, 'role_match', 'exact')) from warehouse_candidates((select id from sl)))) as v;
select pg_temp.check((select delivered = 1 and credits_charged = 3 from searches where id = (select id from sl)),
                     'dal magazzino con segnale: 2 + 1 crediti');
select pg_temp.check((select data #> '{signals,0}' ->> 'code' = 'no_mobile' from deliveries where org_id = (select org_l from o)),
                     'prova del magazzino sul lead consegnato');

-- Segnalazione "segnale non corretto": rimborso e prova non più rivendibile.
insert into lead_reports (delivery_id, org_id, reason)
  select id, org_id, 'wrong_signal' from deliveries where org_id = (select org_l from o);
select refund_report((select id from lead_reports where reason = 'wrong_signal'), true);
select pg_temp.check((select status = 'refunded' and refund_credits = 3 from lead_reports where reason = 'wrong_signal'),
                     'rimborso dei crediti del lead (segnale compreso)');
select pg_temp.check(not exists (select 1 from company_signals cs join companies c on c.id = cs.company_id
                                  where c.domain = 'alfa.it' and cs.code = 'no_mobile')
                     and exists (select 1 from company_signals cs join companies c on c.id = cs.company_id
                                  where c.domain = 'alfa.it' and cs.code = 'stale_copyright'),
                     'prova contestata cancellata, le altre restano');

set role authenticated;
do $$ begin
  perform 1 from company_signals;
  raise exception 'doveva fallire';
exception when insufficient_privilege then null;
end $$;
reset role;
select pg_temp.check(true, 'prove non accessibili agli utenti');

\echo 'Test segnali superati.'

-- Prezzo dei segnali modificabile dall'admin.
select pg_temp.check(signal_extra('{"website":1,"job_ad":3}', '{no_mobile,job_ad}') = 3
                     and signal_extra('{"website":1,"job_ad":3}', '{no_mobile,stale_copyright}') = 1
                     and signal_extra('{"website":1,"job_ad":3}', '{stale_copyright}') = 0
                     and signal_extra(null, '{job_ad}') = 0,
                     'crediti in più: il più alto tra i segnali verificati');
update app_settings set value = '{"website": 2, "job_ad": 4}' where key = 'signal_extra_credits';
create temp table sp as
  select * from create_search('c1c1c1c1-0000-4000-8000-000000000002', (select org_l from o), 'Prezzi',
    '{"industry":"Studi dentistici","countries":["IT"],"roles":["Titolare"],
      "signals":{"codes":["no_mobile","job_ad"],"job_families":[{"code":"hr","label":"HR","titles":["recruiter"]}]}}', 'generic_ok', 2, 1);
select pg_temp.check((select credits_reserved = 12 and signal_prices = '{"website": 2, "job_ad": 4}' from sp),
                     'riserva con il prezzo più alto (2 + 4) x 2 e prezzi salvati sulla ricerca');
update app_settings set value = '{"website": 9, "job_ad": 9}' where key = 'signal_extra_credits';
create temp table rp as select * from start_run((select id from sp), sha256_hex('tok-p'), 2);
select apply_engine_results((select id from rp), sha256_hex('tok-p'), $json$
{"leads": [
  {"company":{"name":"Zeta","domain":"zeta-p.it","website":"https://zeta-p.it","country":"Italia"},
   "person":{"full_name":"Zoe Zeta","job_title":"Titolare"},
   "email":{"address":"info@zeta-p.it","type":"generic","status":"found_public","source":"website"},
   "keys":{"person_key":"zoe zeta|zeta-p.it"}, "signals":[{"code":"no_mobile","evidence":{}}]},
  {"company":{"name":"Eta","domain":"eta-p.it","website":"https://eta-p.it","country":"Italia"},
   "person":{"full_name":"Ezio Eta","job_title":"Titolare"},
   "email":{"address":"info@eta-p.it","type":"generic","status":"found_public","source":"website"},
   "keys":{"person_key":"ezio eta|eta-p.it"}, "signals":[{"code":"job_ad","evidence":{"date":"2026-10-01"}}]}
]}
$json$::jsonb);
select pg_temp.check((select credits from deliveries where person_key = 'zoe zeta|zeta-p.it') = 3
                     and (select credits from deliveries where person_key = 'ezio eta|eta-p.it') = 5,
                     'addebito con i prezzi della ricerca (sito 1 + 2, annuncio 1 + 4), non quelli nuovi');
update app_settings set value = '{"website": 1, "job_ad": 1}' where key = 'signal_extra_credits';

\echo 'Test prezzi dei segnali superati.'
