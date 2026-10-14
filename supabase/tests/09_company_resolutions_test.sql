-- Sito delle aziende degli annunci (company_resolutions).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select store_job_ads('adzuna', format('[
  {"external_id":"r1","family":"it_systems","title":"Sistemista","company_name":"Var Group S.p.A.","city":"Bologna","posted_at":"%1$s","url":"https://www.adzuna.it/details/r1"},
  {"external_id":"r2","family":"software_dev","title":"Developer","company_name":"Var Group","city":"Empoli","posted_at":"%1$s","url":"https://www.adzuna.it/details/r2"},
  {"external_id":"r3","family":"design","title":"Grafico","company_name":"Bottega Sconosciuta","posted_at":"%1$s","url":"https://www.adzuna.it/details/r3"},
  {"external_id":"r4","family":"design","title":"Grafico","company_name":"Vietata Srl","posted_at":"%1$s","url":"https://www.adzuna.it/details/r4"}
]', to_char(now() - interval '1 day', 'YYYY-MM-DD'))::jsonb);

select pg_temp.check((select count(*) = 3 from pending_ad_companies(10)), 'tre aziende senza sito');
select pg_temp.check((select company_key = 'var' and ads = 2 from pending_ad_companies(1)), 'la più attiva per prima');

insert into suppression_list (domain_hash) values (sha256_hex('vietata.it'));
create temp table r9 as select store_company_resolutions('[
  {"company_key":"var","company_name":"Var Group","city":"Bologna","domain":"vargroup.it","method":"guess"},
  {"company_key":"bottega sconosciuta","company_name":"Bottega Sconosciuta","domain":"","method":"guess"},
  {"company_key":"vietata","company_name":"Vietata Srl","domain":"vietata.it","method":"guess"},
  {"company_key":"strano","company_name":"Strano","domain":"non valido","method":"guess"}
]') as r;
select pg_temp.check((select (r ->> 'found')::int = 1 and (r ->> 'not_found')::int = 3 and (r ->> 'linked_ads')::int = 2 from r9),
                     'trovata una, tre no (opposizione e dominio non valido compresi)');
select pg_temp.check((select origin = 'adzuna' and country = 'Italia' and city = 'Bologna' and website = 'https://vargroup.it'
                      from companies where domain = 'vargroup.it'), 'azienda salvata con origine adzuna');
select pg_temp.check((select count(*) = 2 from job_ads where company_id = (select id from companies where domain = 'vargroup.it')),
                     'annunci collegati all''azienda');
select pg_temp.check(not exists (select 1 from companies where domain = 'vietata.it'), 'azienda in opposizione non salvata');
select pg_temp.check((select count(*) = 0 from pending_ad_companies(10)), 'non trovate: niente nuovi tentativi subito');

update company_resolutions set tried_at = now() - interval '31 days' where company_key = 'bottega sconosciuta';
select pg_temp.check((select company_key = 'bottega sconosciuta' from pending_ad_companies(10)), 'dopo 30 giorni si riprova');
select store_company_resolutions('[{"company_key":"bottega sconosciuta","company_name":"Bottega Sconosciuta","domain":""}]');
select pg_temp.check((select attempts = 2 from company_resolutions where company_key = 'bottega sconosciuta'), 'tentativi contati');

select 'superati tutti i test siti aziende';
