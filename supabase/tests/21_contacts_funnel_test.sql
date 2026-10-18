-- Moduli di contatto salvati dai controlli dei siti e qualità del database (migrazione 039).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

create temp table f0 as select database_funnel() as f;

select store_company_checks($json$[
  {"company":{"name":"Modulo Srl","domain":"modulo21.it","website":"https://modulo21.it","country":"Italia","industry":"Hotel","contact_form":"https://www.modulo21.it/contatti"},
   "checks":[{"code":"outdated_cms","status":"pass","evidence":{"detail":"WordPress 5.2"}}]},
  {"company":{"name":"Altro Srl","domain":"altro21.it","website":"https://altro21.it","country":"Italia","industry":"Hotel","contact_form":"https://sito-di-terzi.it/form"},
   "checks":[]}
]$json$, '{}', 'target');
update companies set country_code = 'IT' where domain in ('modulo21.it', 'altro21.it');

select pg_temp.check((select contact_form_url = 'https://www.modulo21.it/contatti' from companies where domain = 'modulo21.it'), 'modulo del dominio salvato');
select pg_temp.check((select contact_form_url = '' from companies where domain = 'altro21.it'), 'modulo su un altro dominio ignorato');
select store_company_checks('[{"company":{"domain":"modulo21.it","contact_form":""},"checks":[]}]', '{}', 'target');
select pg_temp.check((select contact_form_url <> '' from companies where domain = 'modulo21.it'), 'un controllo senza modulo non cancella quello trovato');

create temp table f1 as select database_funnel() as f;
select pg_temp.check((select (f1.f ->> 'raccolte')::int = (f0.f ->> 'raccolte')::int + 2 from f0, f1), 'funnel: aziende raccolte');
select pg_temp.check((select (f1.f ->> 'con_modulo')::int = (f0.f ->> 'con_modulo')::int + 1 from f0, f1), 'funnel: con modulo di contatto');
select pg_temp.check((select (f1.f ->> 'solo_modulo_con_opportunita')::int = (f0.f ->> 'solo_modulo_con_opportunita')::int + 1 from f0, f1), 'funnel: opportunità raggiungibili solo con il modulo');
select pg_temp.check((select (f ->> 'con_contatto')::int >= greatest((f ->> 'con_email')::int, (f ->> 'con_modulo')::int)
                          and (f ->> 'raccolte')::int >= (f ->> 'con_sito_settore')::int from f1), 'funnel: numeri coerenti');

select 'superati tutti i test contatti e funnel';
