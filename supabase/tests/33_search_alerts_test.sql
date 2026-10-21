-- Avviso settimanale delle opportunità (migrazione 056, punto 36).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('a0a0a0a0-0000-4000-8000-000000000033', 'avvisi@alfa33.it', '{}');
create temp table o33 as select (select org_id from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000033') as org;
select grant_credits((select org from o33), 200, 'grant', 'test');
update plans set max_active_searches = 10 where id = (select plan_id from organizations where id = (select org from o33));

create or replace function pg_temp.azienda(p_domain text) returns void language sql as $$
  insert into companies (domain, name, website, country, country_code, city, places, tags)
  values (p_domain, p_domain, 'https://' || p_domain, 'Italia', 'IT', 'Parma', term_stems('Parma') || term_stems('Emilia-Romagna'), '{}');
  insert into company_signals (company_id, code, evidence, checked_at)
  select id, 'outdated_cms', '{"detail":"WordPress 5.2"}', now() from companies where domain = p_domain;
$$;
select pg_temp.azienda('uno33.it'); select pg_temp.azienda('due33.it');

create temp table s33 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000033', (select org from o33), 'CMS vecchio Parma',
    '{"industry":"","countries":["IT"],"regions":["Parma"],"roles":["Titolare"],"signals":{"codes":["outdated_cms"],"match":"any","job_families":[]}}',
    'mixed', 5, 1);
create temp table n33 as
  select * from create_search('a0a0a0a0-0000-4000-8000-000000000033', (select org from o33), 'Senza segnali',
    '{"industry":"Hotel","countries":["IT"],"regions":["Parma"],"roles":["Titolare"]}', 'mixed', 5, 1);

select pg_temp.check((select extract(isodow from next_alert_monday(now()) at time zone 'Europe/Rome') = 1
                         and next_alert_monday(now()) > now()), 'prossimo avviso: lunedì a mezzanotte, nel futuro');
select pg_temp.check(not start_search_alert((select org from o33), (select id from n33), 'a0a0a0a0-0000-4000-8000-000000000033'),
  'solo sulle ricerche opportunità');
select pg_temp.check(not start_search_alert(gen_random_uuid(), (select id from s33), 'a0a0a0a0-0000-4000-8000-000000000033'),
  'solo sulle ricerche della propria organizzazione');
select pg_temp.check(start_search_alert((select org from o33), (select id from s33), 'a0a0a0a0-0000-4000-8000-000000000033'), 'avviso attivato');
select pg_temp.check((select count(*) = 2 from search_alert_domains where search_id = (select id from s33)),
  'le aziende già disponibili non contano come nuove');
select pg_temp.check(start_search_alert((select org from o33), (select id from s33), 'a0a0a0a0-0000-4000-8000-000000000033'),
  'riattivarlo non cambia niente');
select pg_temp.check((select count(*) = 0 from run_search_alert((select id from s33))), 'prima del lunedì non gira');
select pg_temp.check((select count(*) = 0 from due_search_alerts(50) where search_id = (select id from s33)), 'non ancora scaduto');

update search_alerts set next_run_at = now() - interval '1 minute' where search_id = (select id from s33);
select pg_temp.check((select count(*) = 1 from due_search_alerts(50) where search_id = (select id from s33)), 'scaduto: in coda');
select pg_temp.check((select new_count = 0 and not sent from run_search_alert((select id from s33))), 'nessuna azienda nuova: niente email');
select pg_temp.check((select next_run_at > now() from search_alerts where search_id = (select id from s33)), 'scadenza spostata');
select pg_temp.check((select count(*) = 0 from run_search_alert((select id from s33))), 'un secondo giro subito dopo non parte');

select pg_temp.azienda('tre33.it'); select pg_temp.azienda('quattro33.it');
update search_alerts set next_run_at = now() - interval '1 minute' where search_id = (select id from s33);
select pg_temp.check((select new_count = 2 and not sent from run_search_alert((select id from s33))), 'sotto la soglia di 3: niente email');
select pg_temp.azienda('cinque33.it');
update search_alerts set next_run_at = now() - interval '1 minute' where search_id = (select id from s33);
select pg_temp.check((select new_count = 3 and sent from run_search_alert((select id from s33))), 'tre nuove: email');
select pg_temp.check((select last_sent_at is not null from search_alerts where search_id = (select id from s33)), 'data dell''ultimo invio');
update search_alerts set next_run_at = now() - interval '1 minute' where search_id = (select id from s33);
select pg_temp.check((select new_count = 0 from run_search_alert((select id from s33))), 'già segnalate: non tornano nuove');
select pg_temp.check((select count(*) = 4 and count(*) filter (where sent) = 1 from search_alert_runs where search_id = (select id from s33)),
  'ogni giro registrato');

-- Scadenza vecchia (avviso rimasto fermo): nessuna email fuori giorno, si riparte dal lunedì.
select pg_temp.azienda('sei33.it'); select pg_temp.azienda('sette33.it'); select pg_temp.azienda('otto33.it');
update search_alerts set next_run_at = now() - interval '3 days' where search_id = (select id from s33);
select pg_temp.check((select count(*) = 0 from run_search_alert((select id from s33))), 'avviso fermo: niente email fuori giorno');
select pg_temp.check((select next_run_at > now() from search_alerts where search_id = (select id from s33)), 'avviso fermo: riparte dal lunedì');
update search_alerts set next_run_at = now() - interval '1 minute' where search_id = (select id from s33);
select pg_temp.check((select new_count = 3 and sent from run_search_alert((select id from s33))), 'il lunedì dopo le nuove arrivano');

-- Ripetizione automatica o ricerca archiviata: l'avviso non gira.
update searches set repeat = 'weekly', next_repeat_at = now() + interval '7 days' where id = (select id from s33);
update search_alerts set next_run_at = now() - interval '1 minute' where search_id = (select id from s33);
select pg_temp.check((select count(*) = 0 from due_search_alerts(50) where search_id = (select id from s33)), 'con la ripetizione automatica non gira');
update searches set repeat = 'none', next_repeat_at = null, archived_at = now() where id = (select id from s33);
select pg_temp.check((select count(*) = 0 from due_search_alerts(50) where search_id = (select id from s33)), 'ricerca archiviata: non gira');

update searches set archived_at = null where id = (select id from s33);
update search_alerts set next_run_at = now() - interval '1 minute' where search_id = (select id from s33);
select pg_temp.check((select count(*) = 1 from due_search_alerts(50) where search_id = (select id from s33)), 'ripristinata: di nuovo in coda');
delete from memberships where user_id = 'a0a0a0a0-0000-4000-8000-000000000033';
select pg_temp.check((select count(*) = 0 from due_search_alerts(50) where search_id = (select id from s33)), 'utente uscito dall''organizzazione: niente avviso');

select stop_search_alert((select org from o33), (select id from s33));
select pg_temp.check((select count(*) = 0 from search_alerts where search_id = (select id from s33))
                     and (select count(*) = 0 from search_alert_domains where search_id = (select id from s33)), 'avviso disattivato');
