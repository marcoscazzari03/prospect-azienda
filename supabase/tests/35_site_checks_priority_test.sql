-- Coda del controllo siti (061: torna la coda della 054, in ordine di arrivo; la priorità della 060 era troppo lenta).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000035', 'coda@alfa35.it', '{}');
create temp table o35 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000035') as org;
insert into searches (org_id, created_by, name, target, email_mode, quantity, status)
select org, 'a0a0a0a0-0000-4000-8000-000000000035', 'Hotel Trentino 35',
       '{"industry":"Albergo35","countries":["IT"],"regions":["Valsugana35"]}', 'company_only', 5, 'completed' from o35;

-- Inserite in ordine inverso: senza priorità uscirebbero d, c, b, a.
insert into companies (domain, name, website, city, places, tags, first_seen_at) values
  ('d35.it', 'Altro Lontano', 'https://d35.it', 'Lontano35', term_stems('Lontano35'), term_stems('Officina'), now() - interval '4 days'),
  ('c35.it', 'Albergo Lontano', 'https://c35.it', 'Lontano35', term_stems('Lontano35'), term_stems('Albergo35'), now() - interval '3 days'),
  ('b35.it', 'Officina Vicina', 'https://b35.it', 'Borgo', term_stems('Valsugana35'), term_stems('Officina'), now() - interval '2 days'),
  ('a35.it', 'Albergo Vicino', 'https://a35.it', 'Valsugana35', '{}', term_stems('Albergo35'), now() - interval '1 days');

create temp table q35 as
  select p.domain, p.n from pending_site_checks(300) with ordinality as p(company_id, domain, name, website, n) where p.domain like '%35.it';
select pg_temp.check((select array_agg(domain order by n) = '{d35.it,c35.it,b35.it,a35.it}' from q35),
                     'coda della 054 (061): in ordine di arrivo');

-- Ricerca vecchia (oltre 30 giorni) senza avviso: non dà più priorità.
update searches set created_at = now() - interval '40 days' where name = 'Hotel Trentino 35';
create temp table r35 as
  select p.domain, p.n from pending_site_checks(300) with ordinality as p(company_id, domain, name, website, n) where p.domain like '%35.it';
select pg_temp.check((select array_agg(domain order by n) = '{d35.it,c35.it,b35.it,a35.it}' from r35),
                     'ricerca di oltre 30 giorni: di nuovo in ordine di arrivo');
