-- Settore delle aziende degli annunci (pending_industry_companies, store_company_industries).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000011', 'ugo@upsilon.it', '{}');
create temp table o11 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000011') as org;
select grant_credits((select org from o11), 200, 'grant', 'test');
update plans set max_active_searches = 5 where id = (select plan_id from organizations where id = (select org from o11));

insert into companies (domain, name, website, country, city, origin) values
  ('meccanicazeta.it', 'Meccanica Zeta', 'https://meccanicazeta.it', 'Italia', 'Reggio Emilia', 'adzuna'),
  ('omegasoft.it', 'Omega Soft', 'https://omegasoft.it', 'Italia', 'Modena', 'adzuna'),
  ('senzaannunci.it', 'Senza Annunci', 'https://senzaannunci.it', 'Italia', 'Modena', 'adzuna');
insert into companies (domain, name, website, country, city, industry) values
  ('giaclassificata.it', 'Già Classificata', 'https://giaclassificata.it', 'Italia', 'Parma', 'Logistica');
select store_job_ads('adzuna', format('[
  {"external_id":"i1","family":"it_systems","title":"Sistemista","company_name":"Meccanica Zeta","region":"Emilia-Romagna","city":"Reggio Emilia","posted_at":"%1$s","url":"https://www.adzuna.it/details/i1"},
  {"external_id":"i2","family":"accounting","title":"Contabile","company_name":"Meccanica Zeta","region":"Emilia-Romagna","city":"Reggio Emilia","posted_at":"%1$s","url":"https://www.adzuna.it/details/i2"},
  {"external_id":"i3","family":"it_systems","title":"Sistemista","company_name":"Omega Soft","region":"Emilia-Romagna","city":"Modena","posted_at":"%1$s","url":"https://www.adzuna.it/details/i3"},
  {"external_id":"i4","family":"it_systems","title":"Sistemista","company_name":"Già Classificata","region":"Emilia-Romagna","city":"Parma","posted_at":"%1$s","url":"https://www.adzuna.it/details/i4"}
]', to_char(now() - interval '2 days', 'YYYY-MM-DD'))::jsonb);

-- (Le aziende dei test precedenti restano nel database: si guardano solo quelle di questo test.)
create temp view p11 as select * from pending_industry_companies(200)
  where company_name in ('Meccanica Zeta', 'Omega Soft', 'Senza Annunci', 'Già Classificata');
select pg_temp.check((select array_agg(company_name order by ads desc) = '{Meccanica Zeta,Omega Soft}' and max(ads) = 2 from p11),
                     'solo aziende con annunci e senza settore, le più attive per prime');

create temp table r11 as select store_company_industries(jsonb_build_array(
  jsonb_build_object('company_id', (select id from companies where domain = 'meccanicazeta.it'),
    'industry', 'Produzione di macchine per il packaging',
    'keywords', jsonb_build_array('manifattura', 'manifatturiero', 'metalmeccanica', 'packaging', 'macchine automatiche')),
  jsonb_build_object('company_id', (select id from companies where domain = 'omegasoft.it'), 'industry', '', 'keywords', '[]'::jsonb),
  jsonb_build_object('company_id', (select id from companies where domain = 'giaclassificata.it'), 'industry', 'Trasporti', 'keywords', '["trasporti"]'::jsonb),
  jsonb_build_object('company_id', 'non-un-id', 'industry', 'X'))) as r;
select pg_temp.check((select (r ->> 'classified')::int = 2 and (r ->> 'unknown')::int = 1 from r11), 'due classificate, una no');
select pg_temp.check((select industry = 'Produzione di macchine per il packaging'
                         and tags @> term_stems('manifatturiero metalmeccanica macchine')
                         -- «per il packaging»: clienti, non settore (migrazione 045).
                         and not tags && term_stems('packaging')
                         and industry_checked_at is not null
                      from companies where domain = 'meccanicazeta.it'), 'settore e parole nelle etichette');
select pg_temp.check((select industry = 'Logistica' and tags @> term_stems('trasporti') from companies where domain = 'giaclassificata.it'),
                     'settore esistente non sovrascritto, parole aggiunte');
select pg_temp.check((select industry = '' and tags = '{}' from companies where domain = 'omegasoft.it'), 'non classificabile: nessuna etichetta');
select pg_temp.check((select count(*) = 0 from p11), 'nessun nuovo tentativo subito');
update companies set industry_checked_at = now() - interval '61 days' where domain = 'omegasoft.it';
select pg_temp.check((select array_agg(company_name) = '{Omega Soft}' from p11), 'dopo 60 giorni si riprova');

select pg_temp.check(term_stems('Software house che sviluppano gestionali') = term_stems('software house sviluppano gestionali'),
                     'parole di collegamento ignorate nel settore');

-- La riserva opportunità ora trova l'azienda degli annunci anche con un settore richiesto.
create temp table s11 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000011', (select org from o11), 'Manifattura ER',
    '{"industry":"Aziende manifatturiere","countries":["IT"],"regions":["Emilia-Romagna"],"roles":["Titolare"],
      "signals":{"codes":["job_ad"],"match":"any","job_families":[{"code":"it_systems"}]}}', 'mixed', 5, 1);
select pg_temp.check((select r -> 0 ->> 'website' = 'https://meccanicazeta.it' and jsonb_array_length(r) = 1
                      from (select opportunity_reserve((select id from s11), '{}', 40) as r) x), 'riserva per settore');

select 'superati tutti i test settore aziende';
