-- Ripasso di sicurezza del 19/10 (migrazione 046): limiti di frequenza ed eliminazione dei lead.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

-- Limite: 3 eventi in un'ora; il quarto no; il controllo senza registrazione non conta.
select pg_temp.check(rate_hit('u28', 'prova', interval '1 hour', 3) and rate_hit('u28', 'prova', interval '1 hour', 3)
                     and rate_hit('u28', 'prova', interval '1 hour', 3), 'limite: i primi tre passano');
select pg_temp.check(not rate_hit('u28', 'prova', interval '1 hour', 3), 'limite: il quarto no');
select pg_temp.check(rate_hit('altro28', 'prova', interval '1 hour', 1, false) and rate_hit('altro28', 'prova', interval '1 hour', 1, false),
                     'limite: il solo controllo non registra');
select pg_temp.check(not has_function_privilege('authenticated', 'public.rate_hit(text, text, interval, integer, boolean)', 'execute'),
                     'limite: non chiamabile dal browser');
select pg_temp.check(not has_table_privilege('authenticated', 'public.rate_events', 'select')
                     and not has_table_privilege('anon', 'public.it_provinces', 'select')
                     and not has_table_privilege('authenticated', 'public.large_companies', 'select'),
                     'tabelle del server senza permessi per i client');

-- Eliminazione: la chiave con il nome diventa un'impronta, quella dell'azienda resta, la nota della segnalazione si svuota.
insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000028', 'sic@ur.it', '{}');
create temp table o28 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000028') as org;
insert into searches (id, org_id, name, target, email_mode, quantity, status)
values ('b0b0b0b0-0000-4000-8000-000000000028', (select org from o28), 'S28', '{}', 'company_only', 2, 'completed');
insert into deliveries (id, org_id, search_id, person_key, company_domain, data, email_address, email_type, email_status, credits)
values ('c0c0c0c0-0000-4000-8000-000000000028', (select org from o28), 'b0b0b0b0-0000-4000-8000-000000000028', 'mario rossi|ditta28.it', 'ditta28.it', '{}', 'm@ditta28.it', 'personal', 'found_public', 1),
       ('c0c0c0c0-0000-4000-8000-000000000029', (select org from o28), 'b0b0b0b0-0000-4000-8000-000000000028', '|ditta29.it', 'ditta29.it', '{}', 'info@ditta29.it', 'generic', 'found_public', 1);
insert into lead_reports (delivery_id, org_id, reason, note)
values ('c0c0c0c0-0000-4000-8000-000000000028', (select org from o28), 'bounce', 'Mario mi ha detto che');
select pg_temp.check(forget_deliveries((select org from o28), array['c0c0c0c0-0000-4000-8000-000000000028', 'c0c0c0c0-0000-4000-8000-000000000029']::uuid[]) = 2,
                     'eliminazione: due lead');
select pg_temp.check((select person_key like 'del:%' and person_key not like '%mario%' from deliveries where id = 'c0c0c0c0-0000-4000-8000-000000000028'),
                     'eliminazione: nome non più leggibile');
select pg_temp.check((select person_key = '|ditta29.it' from deliveries where id = 'c0c0c0c0-0000-4000-8000-000000000029'),
                     'eliminazione: chiave dell''azienda conservata');
select pg_temp.check((select note = '' from lead_reports where delivery_id = 'c0c0c0c0-0000-4000-8000-000000000028'),
                     'eliminazione: nota della segnalazione svuotata');

select 'superati tutti i test ripasso di sicurezza';
