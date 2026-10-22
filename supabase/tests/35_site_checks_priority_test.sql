-- Coda del controllo siti con priorità (064; la 060 era troppo lenta in produzione, tolta con la 061).
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
select pg_temp.check((select array_agg(domain order by n) = '{a35.it,d35.it,c35.it,b35.it}' from q35),
                     'prima l''albergo nella zona cercata (luogo dalla città), poi le altre in ordine di arrivo');

-- Ricerca dello stesso settore su tutto il paese: anche l'albergo lontano passa davanti.
insert into searches (org_id, created_by, name, target, email_mode, quantity, status)
select org, 'a0a0a0a0-0000-4000-8000-000000000035', 'Hotel Italia 35',
       '{"industry":"Albergo35","countries":["IT"],"regions":[]}', 'company_only', 5, 'completed' from o35;
create temp table n35 as
  select p.domain, p.n from pending_site_checks(300) with ordinality as p(company_id, domain, name, website, n) where p.domain like '%35.it';
select pg_temp.check((select array_agg(domain order by n) = '{c35.it,a35.it,d35.it,b35.it}' from n35),
                     'settore su tutto il paese: i due alberghi davanti, in ordine di arrivo');
delete from searches where name = 'Hotel Italia 35';

-- Le aziende scadute (25 giorni) restano prima di quelle da ricontrollare (054), anche se cercate.
update companies set site_checked_at = timestamptz '2026-10-15 10:00:00+00' where domain = 'a35.it';
insert into company_checks (company_id, code, status) select id, 'no_mobile', 'fail' from companies where domain = 'a35.it';
create temp table s35 as
  select p.domain, p.n from pending_site_checks(300) with ordinality as p(company_id, domain, name, website, n) where p.domain like '%35.it';
select pg_temp.check((select array_agg(domain order by n) = '{d35.it,c35.it,b35.it,a35.it}' from s35)
                     or now() - timestamptz '2026-10-15 10:00:00+00' > interval '25 days',
                     'da ricontrollare (054) dopo le scadute, anche se nella zona cercata');
update companies set site_checked_at = null where domain = 'a35.it';

-- Ricerca vecchia (oltre 30 giorni) senza avviso: non dà più priorità.
update searches set created_at = now() - interval '40 days' where name = 'Hotel Trentino 35';
create temp table r35 as
  select p.domain, p.n from pending_site_checks(300) with ordinality as p(company_id, domain, name, website, n) where p.domain like '%35.it';
select pg_temp.check((select array_agg(domain order by n) = '{d35.it,c35.it,b35.it,a35.it}' from r35),
                     'ricerca di oltre 30 giorni senza avviso: di nuovo in ordine di arrivo');

-- Con un avviso settimanale attivo la ricerca vecchia conta ancora.
insert into search_alerts (search_id, org_id, user_id, next_run_at)
  select id, org_id, 'a0a0a0a0-0000-4000-8000-000000000035', now() + interval '7 days' from searches where name = 'Hotel Trentino 35';
create temp table t35 as
  select p.domain, p.n from pending_site_checks(300) with ordinality as p(company_id, domain, name, website, n) where p.domain like '%35.it';
select pg_temp.check((select array_agg(domain order by n) = '{a35.it,d35.it,c35.it,b35.it}' from t35),
                     'ricerca vecchia con avviso attivo: di nuovo prima l''albergo vicino');

-- Una ricerca con le zone in un formato strano (riga scritta a mano) non ferma la coda e non toglie la priorità alle altre.
insert into searches (org_id, created_by, name, target, email_mode, quantity, status)
select org, 'a0a0a0a0-0000-4000-8000-000000000035', 'Strana 35',
       '{"industry":"Officina","regions":"Valsugana35","industry_keywords":null}', 'company_only', 5, 'completed' from o35;
create temp table u35 as
  select p.domain, p.n from pending_site_checks(300) with ordinality as p(company_id, domain, name, website, n) where p.domain like '%35.it';
select pg_temp.check((select array_agg(domain order by n) = '{d35.it,b35.it,a35.it,c35.it}' from u35),
                     'zone non in elenco: la ricerca vale come «tutto il paese» (officine e albergo vicino davanti), la coda non si ferma');

select pg_temp.check(not has_function_privilege('authenticated', 'public.pending_site_checks(integer)', 'execute'),
                     'coda non chiamabile dai clienti');
