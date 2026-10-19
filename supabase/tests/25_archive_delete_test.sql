-- Archiviazione ed eliminazione di lead e ricerche (migrazione 043).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000025', 'arc@hi.it', '{}');
create temp table o25 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000025') as org;
select grant_credits((select org from o25), 100, 'grant', 'test');
create temp table s25 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000025', (select org from o25), 'Hotel',
    '{"industry":"Hotel","countries":["IT"]}', 'company_only', 5, 1);
create temp table r25 as select * from start_run((select id from s25), sha256_hex('tok-25'), 5);
select apply_engine_results((select id from r25), sha256_hex('tok-25'), $json$
{"leads":[
  {"company":{"name":"Uno","domain":"uno25.it","website":"https://uno25.it","country":"Italia"},"keys":{"person_key":"|uno25.it"},
   "email":{"address":"info@uno25.it","type":"generic","status":"found_public"}},
  {"company":{"name":"Due","domain":"due25.it","website":"https://due25.it","country":"Italia"},"keys":{"person_key":"|due25.it"},
   "email":{"address":"info@due25.it","type":"generic","status":"found_public"}}
]}
$json$);
update searches set status = 'completed' where id = (select id from s25);

-- Archivio della ricerca: anche i lead; il ripristino li riporta.
select archive_search((select org from o25), (select id from s25), true);
select pg_temp.check((select count(*) = 2 from deliveries where search_id = (select id from s25) and archived_at is not null), 'ricerca archiviata: archiviati anche i lead');
select archive_search((select org from o25), (select id from s25), false);
select pg_temp.check((select count(*) = 0 from deliveries where search_id = (select id from s25) and archived_at is not null)
                     and (select archived_at is null from searches where id = (select id from s25)), 'ripristino: ricerca e lead di nuovo visibili');

-- Eliminazione di un lead: dati cancellati, chiave conservata (niente riconsegna).
select forget_deliveries((select org from o25), array(select id from deliveries where company_domain = 'uno25.it'));
select pg_temp.check((select deleted_at is not null and email_address = '' and not (data ? 'email') and data #>> '{company,domain}' = 'uno25.it'
                        and person_key = '|uno25.it' from deliveries where company_domain = 'uno25.it'), 'lead eliminato: dati cancellati, chiave conservata');
select pg_temp.check((select forget_deliveries(gen_random_uuid(), array(select id from deliveries where company_domain = 'due25.it')) = 0), 'un''altra organizzazione non può eliminare');

-- Eliminazione della ricerca: non se è in corso.
update searches set status = 'running' where id = (select id from s25);
do $$ begin
  perform forget_search((select org from o25), (select id from s25));
  raise exception 'TEST FALLITO: ricerca in corso eliminata';
exception when others then
  if sqlerrm not like '%SEARCH_RUNNING%' then raise; end if;
  raise notice 'ok  ricerca in corso: non si elimina';
end $$;
update searches set status = 'completed' where id = (select id from s25);
select pg_temp.check((select forget_search((select org from o25), (select id from s25)) = 1), 'ricerca eliminata');
select pg_temp.check((select count(*) = 2 from deliveries where search_id = (select id from s25) and deleted_at is not null), 'ricerca eliminata: eliminati anche i lead');

select 'superati tutti i test archivio ed eliminazione';
