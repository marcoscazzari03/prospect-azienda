-- Test della scadenza dei crediti: consumo in ordine di scadenza,
-- scadenza della sola parte non usata, idempotenza, saldo mai negativo.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-3333-3333-3333-333333333333', 'carla@gamma.it', '{}'),
  ('44444444-4444-4444-4444-444444444444', 'dario@delta.it', '{}');
create temp table e as
  select (select org_id from memberships where user_id = '33333333-3333-3333-3333-333333333333') as org_c,
         (select org_id from memberships where user_id = '44444444-4444-4444-4444-444444444444') as org_d;

-- Carla: tolgo il benvenuto per partire da zero.
delete from credit_ledger where org_id = (select org_c from e);
-- Lotto A: 50 crediti già scaduti; lotto B: 100 crediti che scadono tra un anno.
insert into credit_ledger (org_id, delta, kind, description, expires_at, created_at)
  values ((select org_c from e), 50, 'purchase', 'A', now() - interval '1 day', now() - interval '13 months'),
         ((select org_c from e), 100, 'purchase', 'B', now() + interval '1 year', now() - interval '1 month');
-- Consumati 80 crediti: coprono tutto A e 30 di B.
insert into credit_ledger (org_id, delta, kind, description) values ((select org_c from e), -80, 'reserve', 'uso');

select pg_temp.check((select remaining = 0 from credit_lots((select org_c from e)) where kind = 'purchase' and granted = 50),
                     'il consumo usa prima il lotto che scade prima');
select pg_temp.check((select remaining = 70 from credit_lots((select org_c from e)) where granted = 100), 'restano 70 sul lotto B');
select pg_temp.check(expire_credits((select org_c from e)) = 0, 'lotto scaduto ma interamente usato: niente da togliere');
select pg_temp.check(org_available_credits((select org_c from e)) = 70, 'saldo invariato');

-- Dario: lotto di 100 scaduto, 30 usati -> scadono 70 (più i 15 di benvenuto se scaduti: qui no).
insert into credit_ledger (org_id, delta, kind, description, expires_at)
  values ((select org_d from e), 100, 'purchase', 'vecchio', now() - interval '1 hour');
insert into credit_ledger (org_id, delta, kind, description) values ((select org_d from e), -45, 'reserve', 'uso'),
                                                                    ((select org_d from e), 15, 'release', 'restituiti');
-- Uso netto 30: tocca prima il lotto scaduto (scade prima del benvenuto).
select pg_temp.check(org_available_credits((select org_d from e)) = 85, 'saldo prima della scadenza');
select pg_temp.check(expire_credits() = 70, 'scadono i 70 crediti non usati');
select pg_temp.check(org_available_credits((select org_d from e)) = 15, 'resta solo il benvenuto');
select pg_temp.check((select description like 'Crediti scaduti il %' from credit_ledger
                      where org_id = (select org_d from e) and kind = 'expire'), 'movimento con descrizione leggibile');
select pg_temp.check(expire_credits() = 0, 'scadenza idempotente');
select pg_temp.check((select expired = 70 and remaining = 0 from credit_lots((select org_d from e)) where granted = 100),
                     'lotto scaduto segnato come tale');
select pg_temp.check((select remaining = 15 from credit_lots((select org_d from e)) where kind = 'grant'),
                     'il benvenuto resta intero');

-- Saldo mai negativo: rettifica negativa che ha già tolto i crediti.
insert into credit_ledger (org_id, delta, kind, description, expires_at)
  values ((select org_c from e), 40, 'grant', 'C', now() - interval '1 minute');
insert into credit_ledger (org_id, delta, kind, description) values ((select org_c from e), -100, 'adjust', 'correzione');
select pg_temp.check(org_available_credits((select org_c from e)) = 10, 'saldo prima');
select expire_credits((select org_c from e));
select pg_temp.check(org_available_credits((select org_c from e)) >= 0, 'la scadenza non manda mai il saldo sotto zero');

-- Solo il servizio può eseguire le funzioni.
set role authenticated;
do $$ begin
  perform expire_credits();
  raise exception 'doveva fallire';
exception when insufficient_privilege then null;
end $$;
reset role;
select pg_temp.check(true, 'un utente non può eseguire la scadenza');

\echo 'Test scadenza superati.'
