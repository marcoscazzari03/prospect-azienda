-- Fase 2: costi reali di Claude per giro, giro interrotto chiuso dal workflow di errore.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('e1e1e1e1-0000-4000-8000-000000000001', 'rita@rho.it', '{}');
create temp table o6 as select (select org_id from memberships where user_id = 'e1e1e1e1-0000-4000-8000-000000000001') as org_r;
select grant_credits((select org_r from o6), 100, 'grant', 'test');
create temp table s6 as
  select * from create_search('e1e1e1e1-0000-4000-8000-000000000001', (select org_r from o6), 'Costi',
    '{"industry":"Studi legali","countries":["IT"],"roles":["Titolare"]}', 'mixed', 3, 1);
create temp table r6 as select * from start_run((select id from s6), sha256_hex('tok-6'), 3);

select record_engine_progress((select id from r6), sha256_hex('tok-6'), 'planning', 'Pianificazione', '{"lots_planned":1,"n8n_execution_id":"9001"}');
select pg_temp.check((select n8n_execution_id = '9001' and status = 'running' from search_runs where id = (select id from r6)),
                     'ID dell''esecuzione salvato con il primo avanzamento');
select pg_temp.check(not exists (select 1 from search_events where run_id = (select id from r6) and counters ? 'n8n_execution_id'),
                     'ID non mostrato negli eventi del cliente');

select apply_engine_results((select id from r6), sha256_hex('tok-6'),
  '{"leads":[],"usage":{"ai_search_calls":1,"ai_planner_calls":1,"claude_input_tokens":34000,"claude_output_tokens":3000,"claude_web_searches":3,"pages_fetched":20}}');
select pg_temp.check((select round(sum(total_eur), 3) = 0.118 from run_costs where run_id = (select id from r6) and provider like 'claude_%'),
                     'costo Claude reale: 34k token in + 3k out + 3 ricerche = circa 0,118 €');
select pg_temp.check(not exists (select 1 from run_costs where run_id = (select id from r6) and provider = 'openai_search_lot'),
                     'niente stima a lotto quando ci sono i token');

-- Esecuzione interrotta.
create temp table r7 as select * from start_run((select id from s6), sha256_hex('tok-7'), 3);
select record_engine_progress((select id from r7), sha256_hex('tok-7'), 'planning', 'x', '{"n8n_execution_id":"9002"}');
select pg_temp.check((select fail_engine_run('9002', 'Errore nel nodo X') = (select id from s6)), 'giro interrotto: restituisce la ricerca da chiudere');
select pg_temp.check((select status = 'failed' from search_runs where id = (select id from r7)), 'giro segnato come fallito');
select pg_temp.check(fail_engine_run('9002', 'di nuovo') is null and fail_engine_run('inesistente', 'x') is null,
                     'idempotente e sicuro con ID sconosciuti');
\echo 'Test costi ed errori superati.'
