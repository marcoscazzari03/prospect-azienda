-- Ricerche con opportunità solo su piccole e medie imprese (migrazione 038).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000020', 'ugo@uu.it', '{}');
create temp table o20 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000020') as org;
select grant_credits((select org from o20), 200, 'grant', 'test');

-- Cinque aziende in Liguria con WordPress vecchio: una piccola, una nell'elenco, una con 201+
-- dipendenti, una banca, una che assume in tre regioni.
insert into companies (domain, name, website, country, country_code, city, places, size_hint) values
  ('piccola20.it', 'Piccola Srl', 'https://piccola20.it', 'Italia', 'IT', 'Genova', term_stems('Genova') || term_stems('Liguria'), '11-50'),
  ('negozio.leroymerlin.it', 'Leroy Merlin Genova', 'https://negozio.leroymerlin.it', 'Italia', 'IT', 'Genova', term_stems('Genova') || term_stems('Liguria'), ''),
  ('grande20.it', 'Grande Spa', 'https://grande20.it', 'Italia', 'IT', 'Genova', term_stems('Genova') || term_stems('Liguria'), '201-500'),
  ('banca20.it', 'Banca di Genova', 'https://banca20.it', 'Italia', 'IT', 'Genova', term_stems('Genova') || term_stems('Liguria'), ''),
  ('assume20.it', 'Assume Srl', 'https://assume20.it', 'Italia', 'IT', 'Genova', term_stems('Genova') || term_stems('Liguria'), '');
insert into company_signals (company_id, code, evidence, checked_at)
  select id, 'outdated_cms', '{"detail":"WordPress 5.2"}', now() from companies where domain like '%20.it' or domain = 'negozio.leroymerlin.it';
select store_job_ads('adzuna', format('[
  {"external_id":"g1","family":"sales","title":"Commerciale","company_name":"Assume Srl","region":"Liguria","city":"Genova","posted_at":"%1$s","url":"https://www.adzuna.it/details/g1"},
  {"external_id":"g2","family":"sales","title":"Commerciale","company_name":"Assume Srl","region":"Piemonte","city":"Torino","posted_at":"%1$s","url":"https://www.adzuna.it/details/g2"},
  {"external_id":"g3","family":"sales","title":"Commerciale","company_name":"Assume Srl","region":"Lombardia","city":"Milano","posted_at":"%1$s","url":"https://www.adzuna.it/details/g3"}
]', to_char(now() - interval '3 days', 'YYYY-MM-DD'))::jsonb);
update job_ads set company_id = (select id from companies where domain = 'assume20.it') where company_name = 'Assume Srl';

select pg_temp.check(not is_large_company(c.id, c.domain, c.size_hint, c.name), 'piccola impresa: resta')
  from companies c where domain = 'piccola20.it';
select pg_temp.check(is_large_company(c.id, c.domain, c.size_hint, c.name), 'nell''elenco (anche un sottodominio)')
  from companies c where domain = 'negozio.leroymerlin.it';
select pg_temp.check(is_large_company(c.id, c.domain, c.size_hint, c.name), 'da 201 dipendenti')
  from companies c where domain = 'grande20.it';
select pg_temp.check(is_large_company(c.id, c.domain, c.size_hint, c.name), 'banca')
  from companies c where domain = 'banca20.it';
select pg_temp.check(is_large_company(c.id, c.domain, c.size_hint, c.name), 'annunci in tre regioni')
  from companies c where domain = 'assume20.it';
select pg_temp.check(not is_large_company(null, 'bancomat-shop.it', '51-200', 'Bancomat Shop'), 'parola simile a banca: resta');

create temp table s20 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000020', (select org from o20), 'Siti vecchi Liguria',
    '{"industry":"","countries":["IT"],"regions":["Liguria"],"signals":{"codes":["outdated_cms"],"match":"any"}}', 'company_only', 5, 1);
select pg_temp.check((select jsonb_array_length(r) = 1 and r #>> '{0,website}' = 'https://piccola20.it'
                        from (select opportunity_reserve((select id from s20), '{}', 40) as r) x), 'riserva con opportunità: solo la piccola impresa');
select pg_temp.check(opportunity_availability((select org from o20),
  '{"industry":"","countries":["IT"],"regions":["Liguria"],"signals":{"codes":["outdated_cms"],"match":"any"}}', 1) = 1, 'disponibilità coerente con la riserva');

select 'superati tutti i test grandi aziende';
