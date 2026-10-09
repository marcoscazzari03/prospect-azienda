-- Test end-to-end delle funzioni SQL: registrazione, riserva crediti,
-- risultati del motore (deduplica, opposizioni, addebito), chiusura, RLS.
-- Ogni controllo fallito interrompe lo script con un errore.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

-- Due clienti
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'anna@alfa.it', '{"company":"Alfa Srl","full_name":"Anna"}'),
  ('22222222-2222-2222-2222-222222222222', 'bruno@beta.it', '{}');

select pg_temp.check((select count(*) = 2 from organizations), 'una organizzazione per utente');
select pg_temp.check((select name = 'Alfa Srl' from organizations o join memberships m on m.org_id = o.id
                      where m.user_id = '11111111-1111-1111-1111-111111111111'), 'nome azienda dai metadati');

create temp table t as
  select (select org_id from memberships where user_id = '11111111-1111-1111-1111-111111111111') as org_a,
         (select org_id from memberships where user_id = '22222222-2222-2222-2222-222222222222') as org_b;
grant select on t to authenticated;

select pg_temp.check(org_available_credits((select org_a from t)) = 15, '15 crediti di benvenuto');

-- Il piano gratuito non permette 50 lead
do $$ begin
  perform create_search('11111111-1111-1111-1111-111111111111', (select org_a from t), 'x', '{}', 'mixed', 50, 1);
  raise exception 'doveva fallire';
exception when others then
  if sqlerrm not like 'QUANTITY_LIMIT%' then raise; end if;
end $$;
select pg_temp.check(true, 'limite di quantità del piano');

-- Crediti insufficienti: 10 lead "mixed" = 30 crediti riservati > 15
do $$ begin
  perform create_search('11111111-1111-1111-1111-111111111111', (select org_a from t), 'x', '{}', 'mixed', 10, 1);
  raise exception 'doveva fallire';
exception when others then
  if sqlerrm not like 'INSUFFICIENT_CREDITS%' then raise; end if;
end $$;
select pg_temp.check(true, 'blocco per crediti insufficienti');

-- Un utente non può creare ricerche per un'altra organizzazione
do $$ begin
  perform create_search('22222222-2222-2222-2222-222222222222', (select org_a from t), 'x', '{}', 'generic_ok', 5, 1);
  raise exception 'doveva fallire';
exception when others then
  if sqlerrm <> 'NOT_MEMBER' then raise; end if;
end $$;
select pg_temp.check(true, 'nessuna ricerca su organizzazioni altrui');

-- Ricerca valida: 6 lead "generic_ok" (max 2 crediti) = 12 riservati
create temp table s as
  select * from create_search('11111111-1111-1111-1111-111111111111', (select org_a from t),
                              'Software house Milano', '{"industry":"software"}', 'generic_ok', 6, 1);
select pg_temp.check((select credits_reserved = 12 from s), 'riserva = quantità x massimo della modalità');
select pg_temp.check(org_available_credits((select org_a from t)) = 3, 'saldo scalato della riserva');

create temp table r as select * from start_run((select id from s), sha256_hex('token-1'), 6);
select pg_temp.check((select status = 'running' from searches where id = (select id from s)), 'ricerca in corso');

select pg_temp.check(not record_engine_progress((select id from r), sha256_hex('sbagliato'), 'planning', 'x', '{}'), 'token errato rifiutato');
select pg_temp.check(record_engine_progress((select id from r), sha256_hex('token-1'), 'planning', 'Pianificazione', '{}'), 'evento di avanzamento registrato');

-- Opposizione GDPR su un'email
insert into suppression_list (email_hash) values (sha256_hex('opposto@gamma.it'));

-- Risultati: 1 nominativa, 1 generica, 1 opposta, 1 duplicata interna, 1 ipotizzata, 1 seconda persona stessa azienda
create temp table res as select apply_engine_results((select id from r), sha256_hex('token-1'), $json$
{
  "leads": [
    {"company":{"name":"Acme","domain":"acme.it","website":"https://acme.it","country":"Italia"},
     "person":{"full_name":"Mario Rossi","job_title":"CEO","role_match":"exact"},
     "email":{"address":"mario.rossi@acme.it","type":"personal","status":"found_public","source":"website","source_url":"https://acme.it/team"},
     "keys":{"person_key":"mario rossi|acme.it","company_key":"acme.it"},
     "sources":{"discovery_url":"https://acme.it/team"}, "quality":{"score":90}},
    {"company":{"name":"Beta","domain":"beta.it","website":"https://beta.it"},
     "person":{"full_name":"Luca Verdi","job_title":"Founder"},
     "email":{"address":"info@beta.it","type":"generic","status":"found_public","source":"website"},
     "keys":{"person_key":"luca verdi|beta.it"}, "quality":{"score":70}},
    {"company":{"name":"Gamma","domain":"gamma.it"},
     "person":{"full_name":"Sara Neri"},
     "email":{"address":"opposto@gamma.it","type":"personal","status":"found_public"},
     "keys":{"person_key":"sara neri|gamma.it"}},
    {"company":{"name":"Acme","domain":"acme.it"},
     "person":{"full_name":"Mario Rossi"},
     "email":{"address":"mario.rossi@acme.it","type":"personal","status":"found_public"},
     "keys":{"person_key":"mario rossi|acme.it"}},
    {"company":{"name":"Delta","domain":"delta.it"},
     "person":{"full_name":"Ugo Blu"},
     "email":{"address":"ugo.blu@delta.it","type":"personal","status":"guessed"},
     "keys":{"person_key":"ugo blu|delta.it"}},
    {"company":{"name":"Acme","domain":"acme.it"},
     "person":{"full_name":"Paola Gialli"},
     "email":{"address":"paola@acme.it","type":"personal","status":"validated","source":"enrichment"},
     "keys":{"person_key":"paola gialli|acme.it"}}
  ],
  "stats":{"lots":2}, "usage":{"ai_search_calls":2,"ai_planner_calls":1,"enrichment_lookups":3,"pages_fetched":40},
  "n8n_execution_id":"999"
}
$json$::jsonb) as v;

select pg_temp.check((select (v ->> 'new')::int = 2 from res), '2 lead consegnati');
select pg_temp.check((select (v #>> '{skipped,suppressed}')::int = 1 from res), 'opposizione GDPR rispettata');
select pg_temp.check((select (v #>> '{skipped,duplicates}')::int = 1 from res), 'duplicato scartato');
select pg_temp.check((select (v #>> '{skipped,invalid}')::int = 1 from res), 'email ipotizzata mai consegnata');
select pg_temp.check((select (v #>> '{skipped,company_full}')::int = 1 from res), 'un solo contatto per azienda');
select pg_temp.check((select credits_charged = 3 from searches where id = (select id from s)), 'addebito 2 (nominativa) + 1 (generica)');
select pg_temp.check((select count(*) = 4 from run_costs where run_id = (select id from r)), 'costi del giro registrati per 4 fornitori');
select pg_temp.check((select sum(total_eur) > 0 from run_costs where run_id = (select id from r)), 'costi > 0');

-- Idempotenza: lo stesso evento non viene applicato due volte
select pg_temp.check((select apply_engine_results((select id from r), sha256_hex('token-1'), '{"leads":[]}') ->> 'reason') = 'already_processed', 'risultati idempotenti');

-- Top-up: secondo giro con un lead nuovo e uno già consegnato
create temp table r2 as select * from start_run((select id from s), sha256_hex('token-2'), 4);
select apply_engine_results((select id from r2), sha256_hex('token-2'), $json$
{"leads":[
  {"company":{"name":"Beta","domain":"beta.it"},"person":{"full_name":"Luca Verdi"},
   "email":{"address":"info@beta.it","type":"generic","status":"found_public"},"keys":{"person_key":"luca verdi|beta.it"}},
  {"company":{"name":"Epsilon","domain":"epsilon.it"},"person":{"full_name":"Ivo Rosa"},
   "email":{"address":"ivo@epsilon.it","type":"personal","status":"validated","source":"enrichment"},"keys":{"person_key":"ivo rosa|epsilon.it"}}
]}
$json$::jsonb);
select pg_temp.check((select delivered = 3 and credits_charged = 5 from searches where id = (select id from s)),
                     'top-up: +1 lead, validata limitata a 2 crediti in generic_ok');

-- Chiusura: 3 lead su 6, restituiti 12 - 5 = 7 crediti
select finalize_search((select id from s));
select pg_temp.check((select status = 'partial' from searches where id = (select id from s)), 'stato parziale');
select pg_temp.check(org_available_credits((select org_a from t)) = 10, 'saldo finale 15 - 5 = 10');
select pg_temp.check((select finalize_search((select id from s))).status = 'partial'
                     and org_available_credits((select org_a from t)) = 10, 'chiusura idempotente');

-- Rimborso di un lead segnalato
insert into lead_reports (delivery_id, org_id, reason)
  select id, org_id, 'bounce' from deliveries where person_key = 'mario rossi|acme.it';
select refund_report((select id from lead_reports limit 1), true);
select pg_temp.check(org_available_credits((select org_a from t)) = 12, 'rimborso di 2 crediti');
select refund_report((select id from lead_reports limit 1), true);
select pg_temp.check(org_available_credits((select org_a from t)) = 12, 'rimborso non duplicabile');

-- Accrediti Stripe idempotenti
select grant_credits((select org_b from t), 100, 'purchase', 'Pacchetto 100', 'cs_test_1', now() + interval '12 months');
select grant_credits((select org_b from t), 100, 'purchase', 'Pacchetto 100', 'cs_test_1', now() + interval '12 months');
select pg_temp.check(org_available_credits((select org_b from t)) = 115, 'acquisto accreditato una sola volta');

-- RLS: Bruno non vede i lead né le ricerche di Anna
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select pg_temp.check((select count(*) = 0 from deliveries), 'RLS: nessun lead altrui');
select pg_temp.check((select count(*) = 0 from searches), 'RLS: nessuna ricerca altrui');
select pg_temp.check((select count(*) = 1 from organizations), 'RLS: solo la propria organizzazione');
select pg_temp.check((select available = 115 from org_balances), 'RLS: saldo proprio visibile');
select pg_temp.check((select count(*) = 0 from companies), 'RLS: magazzino non leggibile');
select pg_temp.check((select count(*) = 0 from search_runs), 'RLS: token dei giri non leggibili');
select pg_temp.check((select count(*) > 0 from plans), 'catalogo pubblico leggibile');
do $$ begin
  perform grant_credits((select org_b from t), 1000, 'grant', 'furbo');
  raise exception 'doveva fallire';
exception when insufficient_privilege then null;
end $$;
select pg_temp.check(true, 'un utente non può accreditarsi crediti');

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select pg_temp.check((select count(*) = 3 from deliveries), 'RLS: Anna vede i suoi 3 lead');
select pg_temp.check((select count(*) >= 4 from search_events), 'RLS: Anna vede gli eventi della sua ricerca');
reset role;

\echo 'Tutti i test SQL superati.'
