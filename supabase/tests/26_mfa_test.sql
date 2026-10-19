-- Verifica in due passaggi: con un fattore verificato, la sessione solo con password non legge nulla (migrazione 044).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000026', 'mfa@due.it', '{}');

set role authenticated;
select set_config('request.jwt.claim.sub', 'a0a0a0a0-0000-4000-8000-000000000026', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select pg_temp.check((select count(*) = 1 from organizations), 'senza 2FA: la password basta');
reset role;

insert into auth.mfa_factors (user_id, status) values ('a0a0a0a0-0000-4000-8000-000000000026', 'verified');
set role authenticated;
select pg_temp.check((select count(*) = 0 from organizations) and (select count(*) = 0 from profiles), 'con 2FA attiva e sessione solo con password: nessun dato');
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
select pg_temp.check((select count(*) = 1 from organizations), 'con 2FA completata: dati visibili');
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', '', false);

select 'superati tutti i test verifica in due passaggi';
