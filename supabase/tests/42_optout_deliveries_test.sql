-- Opposizione sui lead già consegnati (migrazione 073, art. 19): segno, contatti svuotati, solo i lead giusti, magazzino come 014.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000042', 'opp@ur.it', '{}');
create temp table o42 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000042') as org;
insert into searches (id, org_id, name, target, email_mode, quantity, status)
values ('b0b0b0b0-0000-4000-8000-000000000042', (select org from o42), 'S42', '{}', 'company_only', 4, 'completed');
insert into deliveries (id, org_id, search_id, person_key, company_domain, data, email_address, email_type, email_status, credits) values
  ('c0c0c0c0-0000-4000-8000-000000000041', (select org from o42), 'b0b0b0b0-0000-4000-8000-000000000042', '|uno42.it', 'uno42.it',
   '{"company":{"name":"Uno","domain":"uno42.it","contact_form":"https://uno42.it/contatti"},"email":{"source_url":"https://uno42.it"}}', 'Info@Uno42.it', 'generic', 'found_public', 1),
  ('c0c0c0c0-0000-4000-8000-000000000042', (select org from o42), 'b0b0b0b0-0000-4000-8000-000000000042', '|due42.it', 'due42.it',
   '{"company":{"name":"Due","domain":"due42.it","contact_form":"https://due42.it/contatti"}}', '', 'form', 'found_public', 1),
  ('c0c0c0c0-0000-4000-8000-000000000043', (select org from o42), 'b0b0b0b0-0000-4000-8000-000000000042', 'mario rossi|tre42.it', 'tre42.it',
   '{"company":{"name":"Tre","domain":"tre42.it"},"person":{"full_name":"Mario Rossi"}}', 'mario@tre42.it', 'personal', 'found_public', 1),
  ('c0c0c0c0-0000-4000-8000-000000000044', (select org from o42), 'b0b0b0b0-0000-4000-8000-000000000042', '|quattro42.it', 'quattro42.it',
   '{"company":{"name":"Quattro","domain":"quattro42.it"}}', 'info@quattro42.it', 'generic', 'found_public', 1);
insert into companies (domain, name, website) values ('due42.it', 'Due', 'https://due42.it');

-- Email (con maiuscole nel lead), dominio di un lead solo modulo, dominio dell'email di un referente.
insert into suppression_list (email_hash, reason) values (sha256_hex('info@uno42.it'), 'test');
insert into suppression_list (domain_hash, reason) values (sha256_hex('due42.it'), 'test');
insert into suppression_list (domain_hash, reason) values (sha256_hex('tre42.it'), 'test');

select pg_temp.check((select opted_out_at is not null and email_address = '' and data #> '{company,contact_form}' is null
                             and data -> 'email' is null and data #>> '{company,name}' = 'Uno'
                        from deliveries where id = 'c0c0c0c0-0000-4000-8000-000000000041'), 'opposizione per email: segnato, contatti svuotati, nome resta');
select pg_temp.check((select opted_out_at is not null and data #> '{company,contact_form}' is null from deliveries where id = 'c0c0c0c0-0000-4000-8000-000000000042'),
                     'opposizione per dominio: lead solo modulo segnato');
select pg_temp.check((select opted_out_at is not null and data -> 'person' is null and person_key like 'opp:%' and person_key not like '%mario%'
                        from deliveries where id = 'c0c0c0c0-0000-4000-8000-000000000043'), 'referente tolto, chiave con il nome resa impronta');
select pg_temp.check((select opted_out_at is null and email_address = 'info@quattro42.it' from deliveries where id = 'c0c0c0c0-0000-4000-8000-000000000044'),
                     'gli altri lead non si toccano');
select pg_temp.check(not exists (select 1 from companies where domain = 'due42.it'), 'magazzino: azienda del dominio cancellata come nella 014');
select pg_temp.check(not has_function_privilege('authenticated', 'public.mark_opted_out_deliveries(text, text)', 'execute'), 'funzione non chiamabile dal browser');

-- Email della homepage: tolta con l'opposizione per sola email e mai più salvata dai controlli successivi (QA).
insert into companies (domain, name, website, site_email) values ('cinque42.it', 'Cinque', 'https://cinque42.it', 'info@cinque42.it');
insert into suppression_list (email_hash, reason) values (sha256_hex('info@cinque42.it'), 'test');
select pg_temp.check((select site_email = '' and site_email_at is null from companies where domain = 'cinque42.it'), 'opposizione per email: email tolta dall''azienda');
update companies set site_email = 'info@cinque42.it', site_email_at = now() where domain = 'cinque42.it';
select pg_temp.check((select site_email = '' from companies where domain = 'cinque42.it'), 'email in opposizione: non si risalva');
update companies set site_email = 'vendite@cinque42.it' where domain = 'cinque42.it';
select pg_temp.check((select site_email = 'vendite@cinque42.it' from companies where domain = 'cinque42.it'), 'un''altra email della stessa azienda: salvata');
