-- Suggerimenti del settore (industry_suggestions).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select store_imported_companies('osm', '[
  {"domain":"ottica15a.it","name":"Ottica Uno","city":"Parma","province":"Parma","region":"Emilia-Romagna","industry":"Ottica quindici","keywords":["ottica"]},
  {"domain":"ottica15b.it","name":"Ottica Due","city":"Parma","province":"Parma","region":"Emilia-Romagna","industry":"Ottica quindici","keywords":["ottica"]},
  {"domain":"ottica15c.it","name":"Ottica Tre","city":"Parma","province":"Parma","region":"Emilia-Romagna","industry":"Ottica quindici","keywords":["ottica"]}
]');
select store_company_checks('[
  {"company":{"domain":"ottica15a.it"},"checks":[{"code":"no_mobile","status":"fail","evidence":{}}]},
  {"company":{"domain":"ottica15b.it"},"checks":[{"code":"no_mobile","status":"pass","evidence":{}}]},
  {"company":{"domain":"ottica15c.it"},"checks":[{"code":"no_mobile","status":"undetermined","evidence":{}}]}
]', '{}', 'seed');

select pg_temp.check((select companies = 2 from industry_suggestions('quindic', 8) where industry = 'Ottica quindici'),
                     'conta solo le aziende con il sito controllato');
select pg_temp.check((select count(*) = 0 from industry_suggestions('q', 8)), 'almeno 2 caratteri');
select pg_temp.check((select count(*) = 0 from industry_suggestions('%_', 8)), 'caratteri jolly ignorati');
