-- Contatti per tutto il database (migrazione 066, punto 86).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select store_imported_companies('osm', '[
  {"domain":"vuota38.it","name":"Officina Vuota","city":"Lecco","province":"Lecco","region":"Lombardia","industry":"Officina","keywords":["officina"]},
  {"domain":"conemail38.it","name":"Officina Email","city":"Lecco","province":"Lecco","region":"Lombardia","industry":"Officina","keywords":["officina"]},
  {"domain":"conmodulo38.it","name":"Officina Modulo","city":"Lecco","province":"Lecco","region":"Lombardia","industry":"Officina","keywords":["officina"]},
  {"domain":"provata38.it","name":"Officina Provata","city":"Lecco","province":"Lecco","region":"Lombardia","industry":"Officina","keywords":["officina"]},
  {"domain":"maicontrollata38.it","name":"Officina Mai","city":"Lecco","province":"Lecco","region":"Lombardia","industry":"Officina","keywords":["officina"]},
  {"domain":"bonifica38.it","name":"Consorzio di Bonifica Lecco","city":"Lecco","province":"Lecco","region":"Lombardia","industry":"Consorzio","keywords":["consorzio"]}
]');
select store_company_checks('[
  {"company":{"domain":"vuota38.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"conemail38.it","email":"info@conemail38.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"conmodulo38.it","contact_form":"https://conmodulo38.it/contatti"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"provata38.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"bonifica38.it","name":"Consorzio di Bonifica Lecco"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]}
]', '{}', 'seed');
update companies set email_missed_at = now() - interval '3 days' where domain = 'provata38.it';

create temp table p38 as select domain from pending_contact_checks(300) where domain like '%38.it';
select pg_temp.check((select array_agg(domain order by domain) = '{vuota38.it}' from p38),
  'in coda solo il sito vivo senza contatto: non chi ha email o modulo, non provata dal motore, non mai controllata, non fuori target');

-- Email di un altro dominio e modulo su un altro sito: scartati; pagine lette senza email: «email non trovata».
create temp table s1 as select store_contact_checks('[
  {"domain":"vuota38.it","email":"mario@gmail.com","contact_form":"https://altrosito.it/contatti","pages_read":3}
]') as r;
select pg_temp.check((select (r ->> 'saved')::int = 1 and (r ->> 'emails')::int = 0 and (r ->> 'forms')::int = 0 from s1), 'email e modulo estranei scartati');
select pg_temp.check((select site_email = '' and contact_form_url = '' and email_missed_at > now() - interval '1 minute'
                        and contacts_checked_at > now() - interval '1 minute' from companies where domain = 'vuota38.it'),
                     'pagine lette senza email: email non trovata e cercata ora');
select pg_temp.check(not exists (select 1 from pending_contact_checks(300) where domain = 'vuota38.it'), 'appena cercata: fuori dalla coda');

-- Email e modulo del dominio: salvati; una seconda email non sostituisce la prima.
update companies set contacts_checked_at = null, email_missed_at = null where domain = 'vuota38.it';
select store_contact_checks('[{"domain":"vuota38.it","email":"Ufficio@Vuota38.it","contact_form":"https://www.vuota38.it/contatti","pages_read":2}]');
select pg_temp.check((select site_email = 'ufficio@vuota38.it' and contact_form_url = 'https://www.vuota38.it/contatti' and email_missed_at is null
                        from companies where domain = 'vuota38.it'), 'email e modulo del dominio salvati');
select store_contact_checks('[{"domain":"vuota38.it","email":"altro@vuota38.it","pages_read":1}]');
select pg_temp.check((select site_email = 'ufficio@vuota38.it' from companies where domain = 'vuota38.it'), 'la prima email resta');

-- Sito non letto (nessuna pagina): niente «email non trovata».
update companies set site_email = '', contact_form_url = '', contacts_checked_at = null, email_missed_at = null where domain = 'vuota38.it';
select store_contact_checks('[{"domain":"vuota38.it","pages_read":0}]');
select pg_temp.check((select email_missed_at is null and contacts_checked_at between now() - interval '84 days' and now() - interval '82 days'
                        from companies where domain = 'vuota38.it'),
                     'sito non letto: senza «email non trovata», si riprova tra 7 giorni');

-- Domini sconosciuti o malformati: ignorati.
select pg_temp.check((select (store_contact_checks('[{"domain":"sconosciuto38.it","email":"info@sconosciuto38.it"},{"domain":"x"}]') ->> 'saved')::int = 0),
                     'aziende sconosciute ignorate, nessuna creata');
select pg_temp.check(not exists (select 1 from companies where domain = 'sconosciuto38.it'), 'nessuna azienda nuova');

select pg_temp.check(not has_function_privilege('authenticated', 'public.store_contact_checks(jsonb)', 'execute')
                     and not has_function_privilege('anon', 'public.pending_contact_checks(integer)', 'execute'),
                     'non chiamabili dai clienti');
