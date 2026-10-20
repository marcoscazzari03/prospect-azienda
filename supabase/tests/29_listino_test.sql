-- Listino (migrazione 049): nessun piano promette più utenti finché l'invito non esiste.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(not exists (select 1 from plans where features::text ilike '%utenti%'), 'listino: nessuna promessa di più utenti');
select pg_temp.check((select features ? '600 crediti al mese' from plans where id = 'growth'), 'listino: Growth con i suoi crediti');

select 'superati tutti i test listino';
