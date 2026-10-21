-- Ripasso di sicurezza del 22/10 (migrazione 058).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(rate_hit('k34', 'prova34', interval '15 minutes', 2), 'rate_hit: primo tentativo ammesso');
select pg_temp.check(rate_hit('k34', 'prova34', interval '15 minutes', 2), 'rate_hit: secondo tentativo ammesso');
select pg_temp.check(not rate_hit('k34', 'prova34', interval '15 minutes', 2), 'rate_hit: terzo tentativo bloccato');
select pg_temp.check(not has_table_privilege('anon', 'public.search_alert_domains', 'select')
  and not has_table_privilege('authenticated', 'public.search_alert_runs', 'select'), 'tabelle dell''avviso senza permessi per i client');
select pg_temp.check(exists (select 1 from pg_policies where tablename = 'search_alerts' and policyname = 'verifica in due passaggi'),
  'search_alerts sotto la regola della verifica in due passaggi');
select pg_temp.check(prosrc like '%pg_advisory_xact_lock%', 'rate_hit con il lock per chiave') from pg_proc where proname = 'rate_hit';
