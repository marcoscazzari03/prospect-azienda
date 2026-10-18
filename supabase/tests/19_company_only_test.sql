-- Modalità «Solo azienda»: interruttore dei referenti, consegna senza persone, solo email
-- generiche del dominio aziendale, magazzino senza nomi.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

update app_settings set value = 'false' where key = 'people_enabled';
insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000019', 'olga@ou.it', '{}');
create temp table o19 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000019') as org;
select grant_credits((select org from o19), 100, 'grant', 'test');

-- Interruttore spento: le modalità con i referenti sono rifiutate.
do $$ begin
  perform create_search('a0a0a0a0-0000-4000-8000-000000000019', (select org from o19), 'No',
    '{"industry":"Hotel","countries":["IT"]}', 'mixed', 3, 1);
  raise exception 'TEST FALLITO: mista accettata con i referenti spenti';
exception when others then
  if sqlerrm not like '%MODE_DISABLED%' then raise; end if;
  raise notice 'ok  referenti spenti: modalità mista rifiutata';
end $$;

create temp table s19 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000019', (select org from o19), 'Hotel',
    '{"industry":"Hotel","countries":["IT"]}', 'company_only', 5, 3);
select pg_temp.check((select credits_reserved = 5 and contacts_per_company = 1 from s19), 'solo azienda: 1 credito a lead, 1 contatto per azienda');
create temp table r19 as select * from start_run((select id from s19), sha256_hex('tok-19'), 5);

select apply_engine_results((select id from r19), sha256_hex('tok-19'), $json$
{"leads":[
  {"company":{"name":"Hotel Uno","domain":"hoteluno19.it","website":"https://hoteluno19.it","country":"Italia"},
   "person":{"full_name":"Mario Rossi","first_name":"Mario","last_name":"Rossi","job_title":"Titolare"},
   "keys":{"person_key":"mario rossi|hoteluno19.it","company_key":"hoteluno19.it"},
   "email":{"address":"info@hoteluno19.it","type":"generic","status":"found_public",
            "alternatives":[{"address":"mario.rossi@hoteluno19.it","type":"personal"}]},
   "email_patterns":[{"address":"mario.rossi@hoteluno19.it","status":"guessed"}],"quality":{"score":70}},
  {"company":{"name":"Hotel Due","domain":"hoteldue19.it","website":"https://hoteldue19.it","country":"Italia"},
   "person":{"full_name":""},"keys":{"person_key":"|hoteldue19.it"},
   "email":{"address":"hoteldue@gmail.com","type":"generic","status":"found_public"}},
  {"company":{"name":"Hotel Tre","domain":"hoteltre19.it","website":"https://hoteltre19.it","country":"Italia"},
   "person":{"full_name":"Anna Bianchi"},"keys":{"person_key":"anna bianchi|hoteltre19.it"},
   "email":{"address":"anna.bianchi@hoteltre19.it","type":"personal","status":"validated"}},
  {"company":{"name":"Hotel Quattro","domain":"hotelquattro19.it","website":"https://hotelquattro19.it","country":"Italia"},
   "person":{"full_name":""},"keys":{"person_key":"|hotelquattro19.it"},
   "email":{"address":"prenotazioni@booking.hotelquattro19.it","type":"generic","status":"found_public"}}
]}
$json$);

select pg_temp.check((select count(*) = 2 from deliveries where search_id = (select id from s19)), 'consegnate solo le generiche del dominio (anche sottodominio)');
select pg_temp.check((select person_key = '|hoteluno19.it' and credits = 1 from deliveries where company_domain = 'hoteluno19.it'),
                     'chiave dell''azienda e 1 credito, anche se il motore indica un nome');
select pg_temp.check((select coalesce(data #>> '{person,full_name}', '') = '' and jsonb_array_length(data -> 'email_patterns') = 0
                             and not (data -> 'email' ? 'alternatives')
                        from deliveries where company_domain = 'hoteluno19.it'), 'consegna: nessun nome, nessuna email ipotizzata o alternativa');
select pg_temp.check(not exists (select 1 from deliveries where company_domain in ('hoteldue19.it', 'hoteltre19.it')), 'gmail e nominative scartate');
select pg_temp.check(not exists (select 1 from people where person_key like '%|hoteluno19.it' and full_name <> ''), 'magazzino: nessun nome salvato');
select pg_temp.check(not exists (select 1 from people where person_key = 'anna bianchi|hoteltre19.it'), 'magazzino: la nominativa scartata non si salva');

-- Magazzino: un'altra organizzazione riceve l'azienda senza la persona salvata con la modalità mista.
update app_settings set value = 'true' where key = 'people_enabled';
insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000119', 'piero@pu.it', '{}');
create temp table p19 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000119') as org;
select grant_credits((select org from p19), 100, 'grant', 'test');
create temp table m19 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000119', (select org from p19), 'Hotel misto',
    '{"industry":"Hotel","countries":["IT"],"roles":["Titolare"]}', 'mixed', 2, 1);
select pg_temp.check((select email_mode = 'mixed' from m19), 'referenti accesi: modalità mista accettata');
create temp table rm19 as select * from start_run((select id from m19), sha256_hex('tok-m19'), 2);
select apply_engine_results((select id from rm19), sha256_hex('tok-m19'), $json$
{"leads":[
  {"company":{"name":"Hotel Cinque","domain":"hotelcinque19.it","website":"https://hotelcinque19.it","country":"Italia","industry":"Hotel"},
   "person":{"full_name":"Luca Verdi","first_name":"Luca","last_name":"Verdi","job_title":"Titolare"},
   "keys":{"person_key":"luca verdi|hotelcinque19.it"},
   "email":{"address":"info@hotelcinque19.it","type":"generic","status":"found_public"},"quality":{"score":80}},
  {"company":{"name":"Hotel Sei","domain":"hotelsei19.it","website":"https://hotelsei19.it","country":"Italia","industry":"Hotel"},
   "person":{"full_name":"Sara Neri","first_name":"Sara","last_name":"Neri","job_title":"Titolare"},
   "keys":{"person_key":"sara neri|hotelsei19.it"},
   "email":{"address":"sara.neri@hotelsei19.it","type":"personal","status":"validated"},"quality":{"score":100}}
]}
$json$);
update app_settings set value = 'false' where key = 'people_enabled';

update companies set country_code = 'IT', tags = array['hotel'] where domain in ('hotelcinque19.it', 'hotelsei19.it');
create temp table w19 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000019', (select org from o19), 'Hotel dal magazzino',
    '{"industry":"Hotel","countries":["IT"]}', 'company_only', 5, 1);
select pg_temp.check((select count(*) = 1 from warehouse_candidates((select id from w19)) c where c.lead #>> '{company,domain}' in ('hotelcinque19.it', 'hotelsei19.it')),
                     'magazzino solo azienda: solo la scheda con l''email generica');
select deliver_from_warehouse((select id from w19),
  (select jsonb_agg(jsonb_build_object('person_id', person_id, 'role_match', 'exact')) from warehouse_candidates((select id from w19))));
select pg_temp.check((select person_key = '|hotelcinque19.it' and coalesce(data #>> '{person,full_name}', '') = '' and email_address = 'info@hotelcinque19.it'
                        from deliveries where search_id = (select id from w19) and company_domain = 'hotelcinque19.it'),
                     'dal magazzino: azienda ed email generica, senza il referente');
select pg_temp.check(not exists (select 1 from deliveries where search_id = (select id from w19) and company_domain = 'hotelsei19.it'), 'dal magazzino: la nominativa non si consegna');

select pg_temp.check(email_on_domain('info@hotel.it', 'hotel.it') and email_on_domain('a@mail.hotel.it', 'hotel.it')
                     and not email_on_domain('hotel@gmail.com', 'hotel.it') and not email_on_domain('a@nohotel.it', 'hotel.it'), 'email del dominio aziendale');
update app_settings set value = 'true' where key = 'people_enabled';

select 'superati tutti i test solo azienda';
