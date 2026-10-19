-- Settore: i clienti dopo «per» non diventano etichette dell'azienda (migrazione 045).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(industry_client_stems('Distribuzione alimentare per ristorazione e hotel') @> term_stems('hotel ristorazione'),
                     'clienti: le parole dopo «per»');
select pg_temp.check(industry_client_stems('Distribuzione alimentare per ristorazione e hotel') @> term_stems('albergo'),
                     'clienti: anche i sinonimi');
select pg_temp.check(not industry_client_stems('Distribuzione alimentare per ristorazione e hotel') && term_stems('distribuzione alimentare'),
                     'clienti: la parte prima resta');
select pg_temp.check(industry_client_stems('Food distribution for hotels') <> '{}', 'clienti: anche in inglese');
select pg_temp.check(industry_client_stems('Hotel') = '{}' and industry_client_stems('') = '{}' and industry_client_stems(null) = '{}',
                     'senza «per» niente clienti');
select pg_temp.check(industry_client_stems('Agenzia per il lavoro') = '{}' and industry_client_stems('Articoli per animali') = '{}',
                     'categorie OSM con «per» nel nome: invariate');
select pg_temp.check(industry_client_stems('Hotel per famiglie') = '{}' or not industry_client_stems('Hotel per famiglie') && term_stems('hotel'),
                     'parola anche nella parte prima: resta');

-- Il trigger toglie le etichette dei clienti, da qualunque fonte arrivino.
insert into companies (domain, name, website, country, industry, tags)
values ('rossi27.it', 'Rossi S.p.A.', 'https://rossi27.it', 'Italia', 'Distribuzione alimentare per ristorazione e hotel',
        term_stems('distribuzione alimentare ristorazione hotel'));
select pg_temp.check((select not (tags && term_stems('hotel ristorazione albergo')) and tags @> term_stems('distribuzione alimentare')
                        from companies where domain = 'rossi27.it'), 'inserimento: niente hotel tra le etichette');
update companies set tags = tags || term_stems('hotel') where domain = 'rossi27.it';
select pg_temp.check((select not (tags && term_stems('hotel')) from companies where domain = 'rossi27.it'),
                     'etichetta «hotel» aggiunta da una ricerca: tolta');

insert into companies (domain, name, website, country, industry, tags)
values ('nuova27.it', 'Nuova Srl', 'https://nuova27.it', 'Italia', '', term_stems('hotel'));
update companies set industry = 'Software per hotel' where domain = 'nuova27.it';
select pg_temp.check((select not (tags && term_stems('hotel')) from companies where domain = 'nuova27.it'),
                     'settore scritto dopo: etichette ricalcolate');

insert into companies (domain, name, website, country, industry, tags)
values ('albergo27.it', 'Albergo Srl', 'https://albergo27.it', 'Italia', 'Hotel', term_stems('hotel'));
select pg_temp.check((select tags @> term_stems('hotel albergo') from companies where domain = 'albergo27.it'),
                     'un hotel resta un hotel (con i sinonimi)');

select 'superati tutti i test settore e clienti';
