-- Tetto di clienti per azienda (migrazione 075): al massimo 5 clienti diversi ogni 90 giorni.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data)
select ('a0a0a0a0-0000-4000-8000-0000000044' || lpad(i::text, 2, '0'))::uuid, 'cap' || i || '@ur.it', '{}' from generate_series(1, 7) i;
create temp table o44 as
select i, (select org_id from memberships where user_id = ('a0a0a0a0-0000-4000-8000-0000000044' || lpad(i::text, 2, '0'))::uuid) as org
  from generate_series(1, 7) i;
insert into searches (id, org_id, name, target, email_mode, quantity, status)
select ('b0b0b0b0-0000-4000-8000-0000000044' || lpad(i::text, 2, '0'))::uuid, org, 'S44', '{}', 'company_only', 5, 'completed' from o44;

create or replace function pg_temp.consegna(p_i integer, p_domain text, p_quando timestamptz default now()) returns integer language plpgsql as $$
declare v integer;
begin
  insert into deliveries (org_id, search_id, person_key, company_domain, data, email_address, email_type, email_status, credits, delivered_at)
  values ((select org from o44 where i = p_i), ('b0b0b0b0-0000-4000-8000-0000000044' || lpad(p_i::text, 2, '0'))::uuid,
          '|' || p_domain, p_domain, '{}', 'info@' || p_domain, 'generic', 'found_public', 1, p_quando);
  get diagnostics v = row_count;
  return v;
end $$;

select pg_temp.check((select sum(pg_temp.consegna(i, 'cap44.it')) from generate_series(1, 5) i) = 5, 'i primi 5 clienti la ricevono');
select pg_temp.check(pg_temp.consegna(6, 'cap44.it') = 0, 'il sesto no');
select pg_temp.check(pg_temp.consegna(1, 'altra44.it') = 1, 'un''altra azienda: nessun limite');
-- Consegne di più di 90 giorni fa non contano.
select pg_temp.check((select sum(pg_temp.consegna(i, 'vecchia44.it', now() - interval '100 days')) from generate_series(1, 5) i) = 5
                     and pg_temp.consegna(6, 'vecchia44.it') = 1, 'consegne oltre 90 giorni non contano');
select pg_temp.check((select clients = 5 and days = 90 from company_client_cap()), 'numeri in un punto solo');
select pg_temp.check('cap44.it' = any (capped_domains((select org from o44 where i = 6))) and not ('altra44.it' = any (capped_domains((select org from o44 where i = 6)))),
                     'capped_domains: l''azienda al tetto è tra le esclusioni del sesto cliente');
select pg_temp.check(not ('cap44.it' = any (capped_domains((select org from o44 where i = 1)))), 'per chi l''ha già avuta conta come gli altri 4: non al tetto');
select pg_temp.check(not has_function_privilege('authenticated', 'public.capped_domains(uuid)', 'execute'), 'capped_domains non chiamabile dal browser');
