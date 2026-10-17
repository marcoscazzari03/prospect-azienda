-- Nome del referente come valore aggiunto: prezzo delle generiche con e senza nome, spesa
-- della ricerca, piattaforme escluse.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000016', 'nina@nu.it', '{}');
create temp table o16 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000016') as org;
select grant_credits((select org from o16), 100, 'grant', 'test');
create temp table s16 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000016', (select org from o16), 'Hotel',
    '{"industry":"Hotel","countries":["IT"],"roles":["Titolare"]}', 'mixed', 3, 1);
create temp table r16 as select * from start_run((select id from s16), sha256_hex('tok-16'), 3);

select apply_engine_results((select id from r16), sha256_hex('tok-16'), $json$
{"leads":[
  {"company":{"name":"Hotel Uno","domain":"hoteluno16.it","website":"https://hoteluno16.it","country":"Italia"},
   "person":{"full_name":"","first_name":"","last_name":"","job_title":"","role_match":"unknown"},
   "keys":{"person_key":"|hoteluno16.it","company_key":"hoteluno16.it"},
   "email":{"address":"info@hoteluno16.it","type":"generic","status":"found_public"},"quality":{"score":53}},
  {"company":{"name":"Hotel Due","domain":"hoteldue16.it","website":"https://hoteldue16.it","country":"Italia"},
   "person":{"full_name":"Mario Rossi","first_name":"Mario","last_name":"Rossi","job_title":"Titolare","role_match":"exact"},
   "keys":{"person_key":"mario rossi|hoteldue16.it","company_key":"hoteldue16.it"},
   "email":{"address":"info@hoteldue16.it","type":"generic","status":"found_public"},"quality":{"score":83}},
  {"company":{"name":"Hotel Tre","domain":"hoteltre16.it","website":"https://hoteltre16.it","country":"Italia"},
   "person":{"full_name":"Anna Bianchi","first_name":"Anna","last_name":"Bianchi","job_title":"Titolare","role_match":"exact"},
   "keys":{"person_key":"anna bianchi|hoteltre16.it","company_key":"hoteltre16.it"},
   "email":{"address":"anna.bianchi@hoteltre16.it","type":"personal","status":"validated"},"quality":{"score":100}}
],"usage":{"ai_planner_calls":0,"claude_input_tokens":34000,"claude_output_tokens":3000,"claude_web_searches":3}}
$json$);

select pg_temp.check((select credits = 1 from deliveries where company_domain = 'hoteluno16.it'), 'generica senza nome: 1 credito');
select pg_temp.check((select credits = 2 from deliveries where company_domain = 'hoteldue16.it'), 'generica con il nome: 2 crediti');
select pg_temp.check((select credits = 3 from deliveries where company_domain = 'hoteltre16.it'), 'nominativa verificata: 3 crediti (nome già nel prezzo)');
select pg_temp.check(search_cost_eur((select id from s16)) > 0.1 and search_cost_eur((select id from s16)) < 0.13, 'spesa della ricerca dai costi dei giri');

select pg_temp.check(is_platform_domain('thefork.it') and is_platform_domain('all.accor.com') and is_platform_domain('booking.com'), 'piattaforme riconosciute');
select pg_temp.check(not is_platform_domain('hotelbooking-puglia.it') and not is_platform_domain('pugliainpizza.it'), 'siti aziendali non toccati');

select pg_temp.check(is_hosted_page('https://www.creoadv.com/menudigitale/la-chicca/', 'La Chicca'), 'menù su sito di un''agenzia: pagina ospitata');
select pg_temp.check(not is_hosted_page('https://www.terranobile.it/hotel/', 'Terranobile Metaresort'), 'percorso sul proprio dominio: sito ufficiale');
select pg_temp.check(not is_hosted_page('https://masseriachiancone.it/it/home/', 'Masseria Chiancone Torricella'), 'percorso con lingua sul proprio dominio');
select pg_temp.check(not is_hosted_page('https://www.hotelsvevo.it/it/', 'Hotel Svevo') and not is_hosted_page('https://www.my-vets.it/', 'My Vets'), 'radice o sola lingua: sito ufficiale');
select pg_temp.check(not is_hosted_page('https://www.caffe-tiffany.it/contatti', 'Caffè Tiffany'), 'accenti e trattini nel nome e nel dominio');
select pg_temp.check(is_platform_domain('aiportici.vorreiordinare.it'), 'piattaforma di ordinazione');

-- Ricerca con la ricerca AI (filtri che il database non verifica): 1 credito in più a lead.
select pg_temp.check(search_ai_extra('{"industry":"Hotel","countries":["IT"]}') = 0, 'ricerca dal database: nessun sovrapprezzo');
select pg_temp.check(search_ai_extra('{"industry":"Hotel","countries":["IT"],"company_size":["11-50"]}') = 1, 'dimensione: ricerca AI');
select pg_temp.check(search_ai_extra('{"industry":"Hotel","countries":["ES"]}') = 1, 'fuori dall''Italia: ricerca AI');
select pg_temp.check(search_ai_extra('{"industry":"","countries":["IT"],"signals":{"codes":["no_mobile"]}}') = 0, 'opportunità: prezzo del segnale, niente sovrapprezzo');
create temp table s16b as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000016', (select org from o16), 'Hotel 11-50',
    '{"industry":"Hotel","countries":["IT"],"company_size":["11-50"],"roles":["Titolare"]}', 'mixed', 2, 1);
select pg_temp.check((select credits_reserved = 8 from s16b), 'riserva: (3 + 1) x 2 lead');
create temp table r16b as select * from start_run((select id from s16b), sha256_hex('tok-16b'), 2);
select apply_engine_results((select id from r16b), sha256_hex('tok-16b'), $json$
{"leads":[
  {"company":{"name":"Hotel Quattro","domain":"hotelquattro16.it","website":"https://hotelquattro16.it","country":"Italia"},
   "person":{"full_name":""},"keys":{"person_key":"|hotelquattro16.it"},
   "email":{"address":"info@hotelquattro16.it","type":"generic","status":"found_public"}}
]}
$json$);
select pg_temp.check((select credits = 2 from deliveries where company_domain = 'hotelquattro16.it'), 'generica senza nome in una ricerca AI: 1 + 1 crediti');

select 'superati tutti i test nome facoltativo';
