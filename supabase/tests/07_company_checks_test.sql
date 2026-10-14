-- Database delle aziende: ogni azienda controllata salvata con l'esito dei controlli.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('f1f1f1f1-0000-4000-8000-000000000001', 'gino@gamma.it', '{}');
create temp table o7 as select (select org_id from memberships where user_id = 'f1f1f1f1-0000-4000-8000-000000000001') as org_g;
select grant_credits((select org_g from o7), 100, 'grant', 'test');
create temp table s7 as
  select * from create_search('f1f1f1f1-0000-4000-8000-000000000001', (select org_g from o7), 'Target',
    '{"industry":"Falegnamerie","countries":["IT"],"regions":["Emilia-Romagna"],"roles":["Titolare"]}', 'mixed', 3, 1);
create temp table r7c as select * from start_run((select id from s7), sha256_hex('tok-c7'), 3);

select pg_temp.check(record_company_checks((select id from r7c), sha256_hex('sbagliato'), '[{"company":{"domain":"x.it"}}]') = 0,
                     'token sbagliato: nulla salvato');

select pg_temp.check(record_company_checks((select id from r7c), sha256_hex('tok-c7'), '[
  {"company":{"domain":"legnobello.it","name":"Legno Bello","website":"https://legnobello.it","city":"Modena","industry":"Falegnameria","technologies":["wordpress"]},
   "checks":[{"code":"outdated_cms","status":"pass","evidence":{"detail":"WordPress 5.2"}},
             {"code":"single_language","status":"fail","evidence":{}},
             {"code":"no_mobile","status":"undetermined","evidence":{}},
             {"code":"job_ad","status":"pass","evidence":{}},
             {"code":"no_https","status":"strano","evidence":{}}]},
  {"company":{"domain":"non valido"}, "checks":[]}
]') = 1, 'salvata solo l''azienda valida');

select pg_temp.check((select origin = 'target' and site_checked_at is not null and 'wordpress' = any (technologies) and country_code = 'IT'
                        from companies where domain = 'legnobello.it'), 'azienda salvata con origine, data del controllo, tecnologie e paese');
select pg_temp.check((select count(*) = 3 from company_checks cc join companies c on c.id = cc.company_id where c.domain = 'legnobello.it'),
                     'tre controlli salvati (esclusi annuncio e stato non valido)');
select pg_temp.check((select array_agg(code) = array['outdated_cms'] from company_signals cs join companies c on c.id = cs.company_id where c.domain = 'legnobello.it'),
                     'solo il controllo positivo diventa una prova');

-- Un controllo successivo negativo cancella la prova.
select store_company_checks('[{"company":{"domain":"legnobello.it","name":"Altro nome"},"checks":[{"code":"outdated_cms","status":"fail","evidence":{"detail":"WordPress 6.8"}}]}]',
                            '{}', 'seed');
select pg_temp.check(not exists (select 1 from company_signals cs join companies c on c.id = cs.company_id where c.domain = 'legnobello.it'),
                     'controllo negativo più recente: la vecchia prova non vale più');
select pg_temp.check((select status = 'fail' and detail = 'WordPress 6.8' from company_checks cc join companies c on c.id = cc.company_id
                       where c.domain = 'legnobello.it' and cc.code = 'outdated_cms'), 'storico aggiornato con l''ultimo esito');
select pg_temp.check((select name = 'Legno Bello' and origin = 'target' from companies where domain = 'legnobello.it'),
                     'nome e origine della prima volta non sovrascritti');

-- Opposizione: l'azienda non viene salvata.
insert into suppression_list (domain_hash, reason) values (sha256_hex('nonvoglio.it'), 'opt_out');
select pg_temp.check(store_company_checks('[{"company":{"domain":"nonvoglio.it"},"checks":[]}]', '{}', 'seed') = 0
                     and not exists (select 1 from companies where domain = 'nonvoglio.it'), 'aziende in opposizione mai salvate');
\echo 'Test database aziende superati.'
