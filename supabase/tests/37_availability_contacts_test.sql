-- Disponibilità divisa per contatto (migrazione 063, punto 40).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000037', 'ugo@upsilon.it', '{}');
create temp table o37 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000037') as org;

-- Quattro falegnamerie con il sito vivo: una con l'email, una con il solo modulo, una provata senza niente, una da provare.
select store_imported_companies('osm', '[
  {"domain":"legnoemail37.it","name":"Falegnameria Email","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Falegnameria","keywords":["falegnameria"]},
  {"domain":"legnomodulo37.it","name":"Falegnameria Modulo","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Falegnameria","keywords":["falegnameria"]},
  {"domain":"legnoprovata37.it","name":"Falegnameria Provata","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Falegnameria","keywords":["falegnameria"]},
  {"domain":"legnonuova37.it","name":"Falegnameria Nuova","city":"Lecce","province":"Lecce","region":"Puglia","industry":"Falegnameria","keywords":["falegnameria"]}
]');
select store_company_checks('[
  {"company":{"domain":"legnoemail37.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"legnomodulo37.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"legnoprovata37.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"legnonuova37.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]}
]', '{}', 'seed');
update companies set site_email = 'info@legnoemail37.it' where domain = 'legnoemail37.it';
update companies set contact_form_url = 'https://legnomodulo37.it/contatti' where domain = 'legnomodulo37.it';
update companies set email_missed_at = now() - interval '5 days' where domain = 'legnoprovata37.it';
update companies set email_missed_at = now() - interval '120 days' where domain = 'legnonuova37.it';

create temp table a37 as select availability_contacts((select org from o37),
  '{"industry":"Falegnameria","countries":["IT"],"regions":["Puglia"]}', 1, false) as a;
select pg_temp.check((select (a ->> 'total')::int = 4 from a37), 'quattro aziende disponibili, come target_availability');
select pg_temp.check((select (a ->> 'total')::int from a37) = target_availability((select org from o37),
  '{"industry":"Falegnameria","countries":["IT"],"regions":["Puglia"]}', 1), 'stesso totale di target_availability');
select pg_temp.check((select (a ->> 'with_email')::int = 1 and (a ->> 'form_only')::int = 1 from a37), 'una con email, una con il solo modulo');
select pg_temp.check((select (a ->> 'missed')::int = 1 and (a ->> 'to_try')::int = 1 from a37),
                     'provata da poco senza contatto; provata oltre 90 giorni fa: di nuovo da provare');
select pg_temp.check((select (a ->> 'total')::int = 0 and (a ->> 'to_try')::int = 0
                        from (select availability_contacts((select org from o37), '{"industry":"Commercialisti","countries":["IT"]}', 1, false) as a) x),
                     'nessuna azienda: tutti zero');
select pg_temp.check((select (a ->> 'total')::int = 0
                        from (select availability_contacts((select org from o37),
                          '{"industry":"Falegnameria","countries":["IT"],"signals":{"codes":["no_mobile"],"match":"any"}}', 1, true) as a) x)
                     = (opportunity_availability((select org from o37),
                          '{"industry":"Falegnameria","countries":["IT"],"signals":{"codes":["no_mobile"],"match":"any"}}', 1) = 0),
                     'opportunità: stesso totale di opportunity_availability');
select pg_temp.check(not has_function_privilege('authenticated', 'public.availability_contacts(uuid, jsonb, integer, boolean)', 'execute'),
                     'non chiamabile dai clienti');
