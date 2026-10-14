-- Ricerca opportunità «database first»: riserva dal database (opportunity_reserve).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000010', 'olga@omega.it', '{}');
create temp table o10 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000010') as org;
select grant_credits((select org from o10), 200, 'grant', 'test');
update plans set max_active_searches = 5 where id = (select plan_id from organizations where id = (select org from o10));

-- Aziende: due dagli annunci (Emilia-Romagna e Lombardia), una con CMS vecchio, una in opposizione.
insert into companies (domain, name, website, country, city, origin) values
  ('alfasoft.it', 'Alfa Soft', 'https://alfasoft.it', 'Italia', 'Modena', 'adzuna'),
  ('betamilano.it', 'Beta Milano', 'https://betamilano.it', 'Italia', 'Milano', 'adzuna'),
  ('vietata10.it', 'Vietata', 'https://vietata10.it', 'Italia', 'Bologna', 'adzuna');
insert into companies (domain, name, website, country, country_code, city, places, tags) values
  ('gammaweb.it', 'Gamma Web', 'https://gammaweb.it', 'Italia', 'IT', 'Parma', term_stems('Parma') || term_stems('Emilia-Romagna'), '{}');
insert into suppression_list (domain_hash) values (sha256_hex('vietata10.it'));
select store_job_ads('adzuna', format('[
  {"external_id":"o1","family":"it_systems","title":"Sistemista","company_name":"Alfa Soft","region":"Emilia-Romagna","city":"Modena","posted_at":"%1$s","url":"https://www.adzuna.it/details/o1"},
  {"external_id":"o2","family":"design","title":"Grafico","company_name":"Alfa Soft","region":"Emilia-Romagna","city":"Modena","posted_at":"%1$s","url":"https://www.adzuna.it/details/o2"},
  {"external_id":"o3","family":"it_systems","title":"Sistemista","company_name":"Beta Milano","region":"Lombardia","city":"Milano","posted_at":"%1$s","url":"https://www.adzuna.it/details/o3"},
  {"external_id":"o4","family":"it_systems","title":"Sistemista","company_name":"Vietata","region":"Emilia-Romagna","city":"Bologna","posted_at":"%1$s","url":"https://www.adzuna.it/details/o4"},
  {"external_id":"o5","family":"it_systems","title":"Sistemista vecchio","company_name":"Alfa Soft","region":"Emilia-Romagna","city":"Modena","posted_at":"%2$s","url":"https://www.adzuna.it/details/o5"}
]', to_char(now() - interval '3 days', 'YYYY-MM-DD'), to_char(now() - interval '90 days', 'YYYY-MM-DD'))::jsonb);
insert into company_signals (company_id, code, evidence, checked_at)
  select id, 'outdated_cms', '{"detail":"WordPress 5.2"}', now() from companies where domain = 'gammaweb.it';

-- Ricerca: aziende che assumono sistemisti in Emilia-Romagna, tutti i settori.
create temp table s10 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000010', (select org from o10), 'Sistemisti ER',
    '{"industry":"","countries":["IT"],"regions":["Emilia-Romagna"],"roles":["Titolare"],
      "signals":{"codes":["job_ad"],"match":"any","job_families":[{"code":"it_systems"}]}}', 'mixed', 5, 1);
create temp table r10 as select opportunity_reserve((select id from s10), '{}', 40) as r;
select pg_temp.check((select jsonb_array_length(r) = 1 from r10), 'solo l''azienda in zona, non in opposizione');
select pg_temp.check((select r -> 0 ->> 'website' = 'https://alfasoft.it' and r -> 0 ->> 'origin' = 'database' from r10), 'Alfa Soft dalla regione dei suoi annunci');
select pg_temp.check((select r #>> '{0,signals,0,code}' = 'job_ad'
                         and r #>> '{0,signals,0,evidence,family}' = 'it_systems'
                         and r #>> '{0,signals,0,evidence,url}' = 'https://www.adzuna.it/details/o1'
                         and r #>> '{0,source_url}' = 'https://www.adzuna.it/details/o1' from r10),
                     'prova: l''annuncio recente della famiglia scelta');
select pg_temp.check((select jsonb_array_length(opportunity_reserve((select id from s10), '{alfasoft.it}', 40)) = 0),
                     'aziende già controllate in questa ricerca escluse');

-- Famiglia diversa: nessuna prova.
create temp table s10b as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000010', (select org from o10), 'Developer ER',
    '{"industry":"","countries":["IT"],"regions":["Emilia-Romagna"],"roles":["Titolare"],
      "signals":{"codes":["job_ad"],"match":"any","job_families":[{"code":"software_dev"}]}}', 'mixed', 5, 1);
select pg_temp.check((select jsonb_array_length(opportunity_reserve((select id from s10b), '{}', 40)) = 0), 'famiglia diversa: nessuna azienda');

-- Segnale dal sito con prova fresca; con un settore richiesto le aziende senza etichetta restano fuori.
create temp table s10c as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000010', (select org from o10), 'CMS vecchio ER',
    '{"industry":"","countries":["IT"],"regions":["Emilia-Romagna"],"roles":["Titolare"],
      "signals":{"codes":["outdated_cms","job_ad"],"match":"any","job_families":[{"code":"it_systems"}]}}', 'mixed', 5, 1);
select pg_temp.check((select jsonb_array_length(opportunity_reserve((select id from s10c), '{}', 40)) = 2), '«basta uno»: annuncio o CMS vecchio');
update company_signals set checked_at = now() - interval '40 days' where code = 'outdated_cms';
select pg_temp.check((select jsonb_array_length(opportunity_reserve((select id from s10c), '{}', 40)) = 1), 'prova dal sito scaduta: esclusa');

create temp table s10d as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000010', (select org from o10), 'Software house ER',
    '{"industry":"Software house","countries":["IT"],"regions":["Emilia-Romagna"],"roles":["Titolare"],
      "signals":{"codes":["job_ad"],"match":"any","job_families":[{"code":"it_systems"}]}}', 'mixed', 5, 1);
select pg_temp.check((select jsonb_array_length(opportunity_reserve((select id from s10d), '{}', 40)) = 0), 'settore richiesto: aziende senza settore escluse');

-- Ricerca senza segnali (target): nessuna riserva.
create temp table s10e as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000010', (select org from o10), 'Target',
    '{"industry":"Software house","countries":["IT"],"regions":["Emilia-Romagna"],"roles":["Titolare"]}', 'mixed', 5, 1);
select pg_temp.check((select opportunity_reserve((select id from s10e), '{}', 40) = '[]'::jsonb), 'ricerca target: niente riserva dal database');

-- Disponibilità nel wizard: stesso calcolo della riserva, senza creare la ricerca.
select pg_temp.check(opportunity_availability((select org from o10),
  '{"industry":"","countries":["IT"],"regions":["Emilia-Romagna"],"signals":{"codes":["job_ad"],"match":"any","job_families":[{"code":"it_systems"}]}}', 1) = 1,
  'disponibilità: un''azienda con annuncio in zona');
select pg_temp.check(opportunity_availability((select org from o10),
  '{"industry":"","countries":["IT"],"regions":[],"signals":{"codes":["job_ad"],"match":"any","job_families":[{"code":"it_systems"}]}}', 1) = 3,
  'disponibilità: tutta Italia (anche Var Group del test annunci)');
select pg_temp.check(opportunity_availability((select org from o10), '{"industry":"","countries":["IT"]}', 1) = 0,
  'disponibilità: senza segnali nessuna azienda');

select 'superati tutti i test riserva opportunità';
