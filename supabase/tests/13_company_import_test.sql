-- Popolamento del database aziende da OpenStreetMap (store_imported_companies).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into companies (domain, name, website, city, industry) values
  ('esistente13.it', 'Esistente', 'https://www.esistente13.it', '', 'Logistica');
insert into suppression_list (domain_hash) values (sha256_hex('opposta13.it'));

create temp table r13 as select store_imported_companies('osm', '[
  {"domain":"studiolegale13.it","name":"Studio Legale Bianchi","website":"https://www.studiolegale13.it/","city":"Modena","province":"Modena","region":"Emilia-Romagna","industry":"Studio legale","keywords":["avvocati","legale"]},
  {"domain":"esistente13.it","name":"Esistente Srl","city":"Parma","region":"Emilia-Romagna","industry":"Trasporti","keywords":["trasporti"]},
  {"domain":"opposta13.it","name":"In Opposizione","city":"Bologna"},
  {"domain":"non valido","name":"X"}
]') as r;
select pg_temp.check((select (r ->> 'new')::int = 1 and (r ->> 'updated')::int = 1 and (r ->> 'skipped')::int = 2 and (r ->> 'received')::int = 4 from r13),
                     'una nuova, una aggiornata, opposizione e dominio non valido saltati');
select pg_temp.check((select origin = 'osm' and country_code = 'IT' and city = 'Modena' and industry = 'Studio legale'
                         and tags @> term_stems('studio legale avvocati') and places @> term_stems('Modena Emilia-Romagna')
                      from companies where domain = 'studiolegale13.it'), 'azienda importata con settore, etichette e luoghi');
select pg_temp.check((select name = 'Esistente' and website = 'https://www.esistente13.it' and industry = 'Logistica' and city = 'Parma'
                         and tags @> term_stems('trasporti') and places @> term_stems('Parma')
                      from companies where domain = 'esistente13.it'), 'azienda esistente: dati conservati, luoghi ed etichette aggiunti');
select pg_temp.check(not exists (select 1 from companies where domain = 'opposta13.it'), 'opposizione rispettata');

-- Importata senza settore: entra nella coda del settore con Haiku.
select store_imported_companies('osm', '[{"domain":"senzasettore13.it","name":"Senza Settore","city":"Rimini"}]');
select pg_temp.check(exists (select 1 from pending_industry_companies(200) where company_name = 'Senza Settore'), 'senza settore: classificata da Haiku');
select pg_temp.check(not exists (select 1 from pending_industry_companies(200) where company_name = 'Studio Legale Bianchi'), 'con settore: niente Haiku');

-- La ricerca in target la trova nel database per settore e zona (riserva opportunità con segnale dal sito).
select store_company_checks('[{"company":{"domain":"studiolegale13.it"},"checks":[{"code":"no_https","status":"pass","evidence":{"detail":"Il sito non risponde in HTTPS"}}]}]', '{}', 'seed');
select pg_temp.check(opportunity_availability(null,
  '{"industry":"Studi legali","countries":["IT"],"regions":["Emilia-Romagna"],"signals":{"codes":["no_https"],"match":"any"}}', 1) = 1,
  'studio legale senza HTTPS in Emilia-Romagna disponibile');

-- Contatore (migrazione 048): una chiamata ripetuta dopo un errore di rete conta ancora come nuove
-- le aziende salvate dal primo tentativo; quelle vecchie restano aggiornate.
select store_imported_companies('osm', '[{"domain":"ripetuta13.it","name":"Ripetuta Srl","city":"Rimini"}]');
update companies set first_seen_at = now() - interval '2 minutes' where domain = 'ripetuta13.it';
select pg_temp.check((select (r ->> 'new')::int = 1 and (r ->> 'updated')::int = 0
                        from (select store_imported_companies('osm', '[{"domain":"ripetuta13.it","name":"Ripetuta Srl","city":"Rimini"}]') as r) x),
                     'chiamata ripetuta: ancora nuova');
update companies set first_seen_at = now() - interval '2 days' where domain = 'ripetuta13.it';
select pg_temp.check((select (r ->> 'new')::int = 0 and (r ->> 'updated')::int = 1
                        from (select store_imported_companies('osm', '[{"domain":"ripetuta13.it","name":"Ripetuta Srl","city":"Rimini"}]') as r) x),
                     'azienda già nel database: aggiornata');

select 'superati tutti i test popolamento aziende';
