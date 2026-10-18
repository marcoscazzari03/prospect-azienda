-- Database delle aziende più pulito: non clienti esclusi, settore dal nome.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

-- Nomi reali dell'analisi del 18/10.
select pg_temp.check(is_non_target_company('A.S.D The Frogmen team'), 'associazione sportiva');
select pg_temp.check(is_non_target_company('Parco Commerciale "Le Ninfee"'), 'parco commerciale');
select pg_temp.check(is_non_target_company('Girgenti Acque S.p.A.') and is_non_target_company('Ato Gesa Ag2'), 'servizi pubblici');
select pg_temp.check(is_non_target_company('Miccolis S.P.A Sede di Bari') and is_non_target_company('G.T.S. SpA Headquarter'), 'sedi di grandi gruppi');
select pg_temp.check(not is_non_target_company('Tutto Montaggi S.r.l.') and not is_non_target_company('Masseria Le Torri')
                     and not is_non_target_company('Assodental') and not is_non_target_company('Basdeco Srl'), 'aziende vere non toccate');

select pg_temp.check((select industry = 'Centro estetico' from industry_from_name('Estetica Dimensione Donna')), 'estetica');
select pg_temp.check((select industry = 'Montaggi e installazioni' from industry_from_name('Tutto Montaggi S.r.l.')), 'montaggi');
select pg_temp.check((select industry = 'Manutenzioni' from industry_from_name('Manutenzioni srl')), 'manutenzioni');
select pg_temp.check((select industry = 'Impianti e materiale elettrico' from industry_from_name('Omega - Negozio elettrico')), 'negozio elettrico');
select pg_temp.check((select industry = 'Hotel' from industry_from_name('Le Club Boutique Hotel')), 'boutique hotel = hotel');
select pg_temp.check((select industry = 'Bar e caffetteria' from industry_from_name('Bar Roma')), 'bar');
select pg_temp.check(not exists (select 1 from industry_from_name('Barilla Group')) and not exists (select 1 from industry_from_name('Officina degli Esordi')),
                     'nessun settore inventato');

-- Importazione: non clienti scartati, settore dal nome, pagine ospitate scartate.
select store_imported_companies('osm', '[
  {"domain":"esteticadonna17.it","name":"Estetica Dimensione Donna","city":"Agrigento","region":"Sicilia","industry":"","keywords":[]},
  {"domain":"frogmen17.it","name":"A.S.D The Frogmen team","city":"Bari","region":"Puglia","industry":"","keywords":[]},
  {"domain":"agenzia17.it","name":"La Chicca","website":"https://www.agenzia17.it/menudigitale/la-chicca/","city":"Ruvo","region":"Puglia","industry":"Ristorante","keywords":[]}
]');
select pg_temp.check((select industry = 'Centro estetico' and tags @> array['estetic'] from companies where domain = 'esteticadonna17.it'), 'importata con il settore dal nome');
select pg_temp.check(not exists (select 1 from companies where domain in ('frogmen17.it', 'agenzia17.it')), 'associazione e pagina ospitata scartate');

-- Haiku non riesce a classificare: settore dal nome.
insert into companies (domain, name, website, industry) values ('montaggi17.it', 'Tutto Montaggi S.r.l.', 'https://montaggi17.it', '');
select store_company_industries(jsonb_build_array(jsonb_build_object('company_id', (select id from companies where domain = 'montaggi17.it'), 'industry', '', 'keywords', '[]'::jsonb)));
select pg_temp.check((select industry = 'Montaggi e installazioni' and industry_checked_at is not null from companies where domain = 'montaggi17.it'), 'settore dal nome dopo Haiku');

select 'superati tutti i test pulizia aziende';
