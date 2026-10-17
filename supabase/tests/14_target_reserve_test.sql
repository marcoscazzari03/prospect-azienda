-- Ricerche in target «database first» (target_is_simple, target_pool, target_reserve).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000014', 'tina@tau.it', '{}');
create temp table o14 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000014') as org;
select grant_credits((select org from o14), 200, 'grant', 'test');
update plans set max_active_searches = 5 where id = (select plan_id from organizations where id = (select org from o14));

-- Studi dentistici importati da OpenStreetMap: uno con sito vivo, uno mai controllato, uno con sito spento.
select store_imported_companies('osm', '[
  {"domain":"dentistavivo14.it","name":"Studio Dentistico Vivo","city":"Modena","province":"Modena","region":"Emilia-Romagna","industry":"Studio dentistico","keywords":["dentista","dentisti","odontoiatria"]},
  {"domain":"dentistamai14.it","name":"Studio Dentistico Mai","city":"Modena","province":"Modena","region":"Emilia-Romagna","industry":"Studio dentistico","keywords":["dentista"]},
  {"domain":"dentistaspento14.it","name":"Studio Dentistico Spento","city":"Carpi","province":"Modena","region":"Emilia-Romagna","industry":"Studio dentistico","keywords":["dentista"]},
  {"domain":"dentistamilano14.it","name":"Studio Dentistico Milano","city":"Milano","province":"Milano","region":"Lombardia","industry":"Studio dentistico","keywords":["dentista"]}
]');
select store_company_checks('[
  {"company":{"domain":"dentistavivo14.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"dentistaspento14.it"},"checks":[{"code":"no_mobile","status":"undetermined","evidence":{}}]},
  {"company":{"domain":"dentistamilano14.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]}
]', '{}', 'seed');

create temp table s14 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000014', (select org from o14), 'Dentisti ER',
    '{"industry":"Studi dentistici","countries":["IT"],"regions":["Emilia-Romagna"],"roles":["Titolare"],"company_size":[],"revenue_range":"","keywords":[],"exclude_keywords":[],"notes":""}', 'mixed', 5, 1);
create temp table r14 as select target_reserve((select id from s14), '{}', 40) as r;
select pg_temp.check((select jsonb_array_length(r) = 1 and r -> 0 ->> 'website' = 'https://dentistavivo14.it' from r14),
                     'solo lo studio della zona con il sito vivo');
select pg_temp.check((select r -> 0 -> 'signals' = '[]'::jsonb and r -> 0 ->> 'origin' = 'database' from r14), 'riserva senza segnali');
select pg_temp.check(target_availability((select org from o14),
  '{"industry":"Studi dentistici","countries":["IT"],"regions":[],"roles":["Titolare"]}', 1) = 2, 'disponibilità: tutta Italia');

-- Vincoli che il database non sa verificare: niente riserva.
select pg_temp.check(not target_is_simple('{"industry":"Studi dentistici","company_size":["10-49"]}'), 'dimensione: ricerca non semplice');
select pg_temp.check(not target_is_simple('{"industry":"Studi dentistici","notes":"solo con più sedi"}'), 'note: ricerca non semplice');
select pg_temp.check(not target_is_simple('{"industry":"Studi dentistici","keywords":["implantologia"]}'), 'parole chiave: ricerca non semplice');
select pg_temp.check(not target_is_simple('{"industry":"","countries":["IT"]}'), 'senza settore: non semplice');
select pg_temp.check(not target_is_simple('{"industry":"Studi dentistici","signals":{"codes":["no_mobile"],"match":"any"}}'), 'con segnali: è una ricerca opportunità');
select pg_temp.check(target_availability((select org from o14),
  '{"industry":"Studi dentistici","countries":["IT"],"company_size":["10-49"]}', 1) = 0, 'non semplice: nessuna azienda dal database');

-- Settore diverso: niente.
select pg_temp.check(target_availability((select org from o14), '{"industry":"Commercialisti","countries":["IT"]}', 1) = 0, 'settore diverso');

-- Referente non trovato di recente (anche in un'altra ricerca): in fondo alla riserva.
create temp table s14b as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000014', (select org from o14), 'Dentisti Italia',
    '{"industry":"Studi dentistici","countries":["IT"],"regions":[],"roles":["Titolare"],"company_size":[],"revenue_range":"","keywords":[],"exclude_keywords":[],"notes":""}', 'mixed', 5, 1);
update companies set referente_missed_at = now() - interval '1 day' where domain = 'dentistavivo14.it';
select pg_temp.check((select jsonb_array_length(r) = 2 and r -> 1 ->> 'website' = 'https://dentistavivo14.it'
                        from (select target_reserve((select id from s14b), '{}', 40) as r) x), 'referente mancato: in fondo');
update companies set referente_missed_at = now() - interval '120 days' where domain = 'dentistavivo14.it';
select pg_temp.check((select r -> 0 ->> 'website' = 'https://dentistavivo14.it' or r -> 1 ->> 'website' = 'https://dentistavivo14.it'
                        from (select target_reserve((select id from s14b), '{}', 40) as r) x), 'referente mancato da più di 90 giorni: ancora in riserva');

select 'superati tutti i test riserva target';
