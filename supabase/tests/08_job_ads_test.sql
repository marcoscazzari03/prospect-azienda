-- Annunci di lavoro raccolti dalle API (job_ads).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(company_name_key('Ferrari S.p.A.') = 'ferrari', 'nome senza forma giuridica');
select pg_temp.check(company_name_key('Società Agricola Città Srl') = 'agricola citta', 'nome senza accenti');
select pg_temp.check(company_name_key('Bianchi & Rossi s.r.l. unipersonale') = 'bianchi rossi', 'nome senza punteggiatura');

insert into companies (domain, name, website) values ('meccanicaemiliana.it', 'Meccanica Emiliana Srl', 'https://meccanicaemiliana.it');
insert into companies (domain, name, website) values ('alfa1.it', 'Alfa', 'https://alfa1.it'), ('alfa2.it', 'Alfa S.p.A.', 'https://alfa2.it');

create temp table r8 as select store_job_ads('adzuna', format('[
  {"external_id":"1","family":"it_systems","title":"Sistemista Windows","company_name":"MECCANICA EMILIANA S.R.L.",
   "region":"Emilia-Romagna","city":"Modena","posted_at":"%1$s","url":"https://www.adzuna.it/details/1","description":"Cerchiamo sistemista"},
  {"external_id":"2","family":"it_systems","title":"Help desk","company_name":"Alfa","posted_at":"%1$s","url":"https://www.adzuna.it/details/2"},
  {"external_id":"3","family":"it_systems","title":"Help desk","company_name":"Nuova Beta Srl","posted_at":"%1$s","url":"https://www.adzuna.it/details/3"},
  {"external_id":"4","family":"it_systems","title":"Senza link","company_name":"Gamma","posted_at":"%1$s","url":"javascript:alert(1)"},
  {"external_id":"5","family":"it_systems","title":"Senza data","company_name":"Gamma","url":"https://www.adzuna.it/details/5"},
  {"external_id":"6","family":"it_systems","title":"Senza azienda","company_name":"S.r.l.","posted_at":"%1$s","url":"https://www.adzuna.it/details/6"}
]', to_char(now() - interval '2 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::jsonb) as r;

select pg_temp.check((select (r ->> 'received')::int = 6 and (r ->> 'saved')::int = 3 and (r ->> 'new')::int = 3 from r8),
                     'salvati solo gli annunci validi (link https, data, azienda)');
select pg_temp.check((select company_id = (select id from companies where domain = 'meccanicaemiliana.it') from job_ads where external_id = '1'),
                     'annuncio collegato all''azienda del database');
select pg_temp.check((select company_id is null from job_ads where external_id = '2'), 'omonimie: nessun collegamento');
select pg_temp.check((select company_key = 'nuova beta' and company_id is null from job_ads where external_id = '3'), 'azienda nuova: solo il nome');

-- Secondo giro: stesso annuncio rivisto, nel frattempo l'azienda è entrata nel database.
insert into companies (domain, name, website) values ('nuovabeta.it', 'Nuova Beta', 'https://nuovabeta.it');
update job_ads set last_seen_at = now() - interval '1 day', title = 'Help desk' where external_id = '3';
select pg_temp.check((select (store_job_ads('adzuna', format('[{"external_id":"3","family":"it_systems","title":"Altro titolo","company_name":"Nuova Beta Srl","posted_at":"%s","url":"https://www.adzuna.it/details/3"}]',
                       to_char(now() - interval '2 days', 'YYYY-MM-DD'))::jsonb) ->> 'new')::int = 0), 'annuncio già visto: non è nuovo');
select pg_temp.check((select last_seen_at > now() - interval '1 minute' and company_id is not null and title = 'Help desk'
                      from job_ads where external_id = '3'), 'annuncio rivisto: aggiornati visto il e collegamento');

-- Pulizia annunci vecchi e fonte non valida.
update job_ads set posted_at = now() - interval '200 days' where external_id = '2';
select pg_temp.check((select (store_job_ads('adzuna', '[]') ->> 'deleted')::int = 1), 'annunci oltre 180 giorni cancellati');
select pg_temp.check((select (store_job_ads('Adzuna; drop', '[{"external_id":"9"}]') ->> 'received')::int = 0), 'fonte non valida rifiutata');

select 'superati tutti i test annunci';
