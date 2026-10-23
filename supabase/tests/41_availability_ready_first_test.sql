-- Disponibilità: prima le aziende con un contatto (migrazione 070). Prima, nei settori con più di 500 aziende, il conteggio
-- leggeva le prime 501 come capitava (23/10: Ristorante in tutta Italia = 3 lead).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000041', 'pia@phi.it', '{}');
create temp table o41 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000041') as org;

-- 600 pizzerie già provate senza email (salvate per prime) e 20 con l'email (per ultime), tutte con il sito vivo.
select store_imported_companies('osm', (select jsonb_agg(jsonb_build_object('domain', 'pizza' || i || '-41.it', 'name', 'Pizzeria Numero ' || i,
  'city', 'Bari', 'province', 'Bari', 'region', 'Puglia', 'industry', 'Pizzeria Quarantuno', 'keywords', '["pizzeria"]'::jsonb)) from generate_series(1, 620) i));
-- store_company_checks ne salva al massimo 500 per chiamata: due chiamate.
select store_company_checks((select jsonb_agg(jsonb_build_object('company', jsonb_build_object('domain', 'pizza' || i || '-41.it'),
  'checks', '[{"code":"no_mobile","status":"fail","evidence":{}}]'::jsonb)) from generate_series(1, 400) i), '{}', 'seed');
select store_company_checks((select jsonb_agg(jsonb_build_object('company', jsonb_build_object('domain', 'pizza' || i || '-41.it'),
  'checks', '[{"code":"no_mobile","status":"fail","evidence":{}}]'::jsonb)) from generate_series(401, 620) i), '{}', 'seed');
update companies set email_missed_at = now() - interval '5 days' where domain ~ '^pizza([1-9]|[1-9][0-9]|[1-5][0-9][0-9]|600)-41\.it$';
update companies set site_email = 'info@' || domain where domain ~ '^pizza(60[1-9]|61[0-9]|620)-41\.it$';

create temp table a41 as select availability_contacts((select org from o41), '{"industry":"Pizzeria Quarantuno","countries":["IT"]}', 1, false) as a;
select pg_temp.check((select (a ->> 'total')::int = 501 from a41), 'oltre 500 aziende: se ne contano 501');
select pg_temp.check((select (a ->> 'with_email')::int = 20 from a41), 'le 20 con l''email ci sono tutte, anche se salvate per ultime');
select pg_temp.check((select (a ->> 'missed')::int = 481 from a41), 'il resto sono le provate senza email');
