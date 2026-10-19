-- Consegna con il modulo di contatto e ricostruzione del magazzino (migrazione 040).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000022', 'mod@ul.it', '{}');
create temp table o22 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000022') as org;
select grant_credits((select org from o22), 100, 'grant', 'test');

-- Ricerca con «Email aziendale o modulo di contatto».
create temp table s22 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000022', (select org from o22), 'Hotel',
    '{"industry":"Hotel","countries":["IT"],"contact":"email_or_form"}', 'company_only', 5, 1);
create temp table r22 as select * from start_run((select id from s22), sha256_hex('tok-22'), 5);

select apply_engine_results((select id from r22), sha256_hex('tok-22'), $json$
{"leads":[
  {"company":{"name":"Hotel Mail","domain":"hotelmail22.it","website":"https://hotelmail22.it","country":"Italia","contact_form":"https://hotelmail22.it/contatti"},
   "keys":{"person_key":"|hotelmail22.it"},"email":{"address":"info@hotelmail22.it","type":"generic","status":"found_public"},"quality":{"score":63}},
  {"company":{"name":"Hotel Modulo","domain":"hotelmodulo22.it","website":"https://hotelmodulo22.it","country":"Italia","contact_form":"https://www.hotelmodulo22.it/contatti"},
   "person":{"full_name":"Mario Rossi"},"keys":{"person_key":"mario rossi|hotelmodulo22.it"},"quality":{"score":40},"_form_only":true},
  {"company":{"name":"Hotel Altrui","domain":"hotelaltrui22.it","website":"https://hotelaltrui22.it","country":"Italia","contact_form":"https://moduli-di-terzi.it/form"},
   "keys":{"person_key":"|hotelaltrui22.it"},"_form_only":true},
  {"company":{"name":"Hotel Modulo","domain":"hotelmodulo22.it","website":"https://hotelmodulo22.it","country":"Italia","contact_form":"https://hotelmodulo22.it/"},
   "keys":{"person_key":"|hotelmodulo22.it"},"_form_only":true}
]}
$json$);

select pg_temp.check((select count(*) = 2 from deliveries where search_id = (select id from s22)), 'consegnate l''azienda con email e quella con il solo modulo');
select pg_temp.check((select email_type = 'form' and email_address = '' and credits = 1 and person_key = '|hotelmodulo22.it'
                        from deliveries where company_domain = 'hotelmodulo22.it'), 'solo modulo: nessuna email, chiave dell''azienda, 1 credito');
select pg_temp.check((select not (data ? 'email') and data #>> '{company,contact_form}' = 'https://www.hotelmodulo22.it/contatti'
                             and coalesce(data #>> '{person,full_name}', '') = ''
                        from deliveries where company_domain = 'hotelmodulo22.it'), 'solo modulo: pagina del modulo consegnata, nessun nome');
select pg_temp.check(not exists (select 1 from deliveries where company_domain = 'hotelaltrui22.it'), 'modulo su un altro dominio scartato');
select pg_temp.check((select data #>> '{company,contact_form}' = 'https://hotelmail22.it/contatti' from deliveries where company_domain = 'hotelmail22.it'),
                     'con email: il modulo resta come informazione in più');
select pg_temp.check(not exists (select 1 from people where person_key in ('|hotelmodulo22.it', 'mario rossi|hotelmodulo22.it')), 'il lead con il solo modulo non va nel magazzino');

-- Ricerca senza l'opzione: i lead con il solo modulo si ignorano (nemmeno contati come non validi).
create temp table s22b as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000022', (select org from o22), 'Hotel 2',
    '{"industry":"Hotel","countries":["IT"]}', 'company_only', 5, 1);
create temp table r22b as select * from start_run((select id from s22b), sha256_hex('tok-22b'), 5);
create temp table a22b as select apply_engine_results((select id from r22b), sha256_hex('tok-22b'), $json$
{"leads":[{"company":{"name":"Hotel Nuovo","domain":"hotelnuovo22.it","website":"https://hotelnuovo22.it","country":"Italia","contact_form":"https://hotelnuovo22.it/contatti"},
           "keys":{"person_key":"|hotelnuovo22.it"},"_form_only":true}]}
$json$) as r;
select pg_temp.check((select (r ->> 'new')::int = 0 and (r #>> '{skipped,invalid}')::int = 0 from a22b), 'senza l''opzione: nessuna consegna e nessuno scarto');

-- Magazzino ricostruito dalle email generiche del dominio aziendale.
insert into companies (domain, name, website, country, contact_form_url) values ('magazzino22.it', 'Magazzino Srl', 'https://magazzino22.it', 'Italia', 'https://magazzino22.it/contatti');
insert into emails (company_id, address, type, status, source)
select id, x.addr, 'generic', 'found_public', 'website' from companies, (values ('vendite@magazzino22.it'), ('info@magazzino22.it'), ('magazzino@gmail.com')) x (addr)
 where domain = 'magazzino22.it';
select pg_temp.check((select rebuild_company_stock() >= 1), 'magazzino: schede ricostruite');
select pg_temp.check((select full_name = '' and lead #>> '{email,address}' = 'info@magazzino22.it'
                             and lead #>> '{company,contact_form}' = 'https://magazzino22.it/contatti'
                             and email_id = (select id from emails where address = 'info@magazzino22.it')
                        from people where person_key = '|magazzino22.it'), 'magazzino: scheda senza nome con info@ (non gmail) e il modulo');
select pg_temp.check((select rebuild_company_stock() = 0), 'magazzino: la ricostruzione non duplica le schede');

select 'superati tutti i test moduli di contatto';
