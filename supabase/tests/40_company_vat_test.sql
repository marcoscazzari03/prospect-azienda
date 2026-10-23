-- Partita IVA delle aziende (migrazione 069, punto 92): validazione, import senza doppioni, controllo siti.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(vat_valid('02023170042') and vat_valid('04304320619'), 'partite IVA vere valide (come pivaValida del worker)');
select pg_temp.check(not vat_valid('02023170043') and not vat_valid('00000000000') and not vat_valid('0202317004') and not vat_valid(null),
  'cifra di controllo, zeri, lunghezza, null');
select pg_temp.check(not vat_valid('94000410178') and not vat_valid('92078070601'), 'codici fiscali di enti (8 e 9) non validi');

create temp table r40 as select store_imported_companies('cc', '[
  {"domain":"rossi40.it","name":"Rossi Mobili","city":"Modena","vat":"02023170042"},
  {"domain":"rossi40-shop.it","name":"Rossi Mobili Shop","city":"Modena","vat":"02023170042"},
  {"domain":"bianchi40.it","name":"Bianchi Srl","vat":"02023170043"}
]') as r;
select pg_temp.check((select (r ->> 'new')::int = 2 and (r ->> 'skipped')::int = 1 from r40), 'stessa partita IVA su un secondo dominio: non importata');
select pg_temp.check((select vat_number = '02023170042' and origin = 'cc' from companies where domain = 'rossi40.it'), 'partita IVA salvata');
select pg_temp.check((select vat_number = '' from companies where domain = 'bianchi40.it'), 'partita IVA non valida: azienda salvata senza');

-- Azienda già presente da OSM senza partita IVA: Common Crawl la completa, senza cambiare il resto.
select store_imported_companies('osm', '[{"domain":"verdi40.it","name":"Verdi Officina","city":"Lecco","industry":"Officina"}]');
select store_imported_companies('cc', '[{"domain":"verdi40.it","name":"Altro nome","city":"Como","vat":"04304320619"}]');
select pg_temp.check((select vat_number = '04304320619' and name = 'Verdi Officina' and city = 'Lecco' and origin = 'osm' from companies where domain = 'verdi40.it'),
  'azienda già presente: si aggiunge solo la partita IVA');
-- Azienda già presente con una partita IVA vista anche altrove: aggiornata (non scartata), partita IVA non scritta.
select store_imported_companies('osm', '[{"domain":"blu40.it","name":"Blu","city":"Lecco"}]');
create temp table r40b as select store_imported_companies('cc', '[{"domain":"blu40.it","name":"Blu","city":"Como","province":"Como","vat":"04304320619"}]') as r;
select pg_temp.check((select (r ->> 'updated')::int = 1 and (r ->> 'skipped')::int = 0 from r40b), 'dominio già presente: aggiornato, non scartato (Code Reviewer)');
select pg_temp.check((select vat_number = '' from companies where domain = 'blu40.it')
                     and (select vat_number = '04304320619' from companies where domain = 'verdi40.it'), 'partita IVA di un altro dominio: non copiata');

-- Controllo siti: la partita IVA della homepage si scrive solo se manca e se finora è comparsa solo su quel dominio.
select store_imported_companies('osm', '[{"domain":"neri40.it","name":"Neri","city":"Lecco"},{"domain":"gialli40.it","name":"Gialli","city":"Lecco"}]');
select store_company_checks('[{"company":{"domain":"neri40.it","vat":"02011920358"},"checks":[]},
                              {"company":{"domain":"gialli40.it","vat":"12345600360"},"checks":[]},
                              {"company":{"domain":"rossi40.it","vat":"12345670363"},"checks":[]}]', '{}', 'seed');
select pg_temp.check((select vat_number = '02011920358' from companies where domain = 'neri40.it'), 'controllo siti: partita IVA salvata');
select pg_temp.check((select vat_number = '12345600360' from companies where domain = 'gialli40.it'), 'controllo siti: seconda azienda');
select pg_temp.check((select vat_number = '02023170042' from companies where domain = 'rossi40.it'), 'già nota: non sovrascritta');
select store_company_checks('[{"company":{"domain":"gialli40.it","vat":"99999999999"},"checks":[]},{"company":{"domain":"neri40.it","vat":2011920358},"checks":[]}]', '{}', 'seed');
select pg_temp.check((select vat_number = '12345600360' from companies where domain = 'gialli40.it'), 'non valida o numero: ignorata, il salvataggio non fallisce');

-- Partita IVA della web agency nel piè di pagina di tre clienti: dalla terza volta non è di nessuno e non blocca nessuno.
select store_imported_companies('osm', '[{"domain":"cliente1-40.it","name":"Cliente Uno"},{"domain":"cliente2-40.it","name":"Cliente Due"}]');
select store_company_checks('[{"company":{"domain":"cliente1-40.it","vat":"12345740364"},"checks":[]}]', '{}', 'seed');
select pg_temp.check((select vat_number = '12345740364' from companies where domain = 'cliente1-40.it'), 'prima volta: sembra del cliente');
select store_company_checks('[{"company":{"domain":"cliente2-40.it","vat":"12345740364"},"checks":[]}]', '{}', 'seed');
select pg_temp.check((select vat_number = '' from companies where domain = 'cliente2-40.it'), 'seconda volta: non copiata');
create temp table r40c as select store_imported_companies('cc', '[{"domain":"cliente3-40.it","name":"Cliente Tre","vat":"12345740364"}]') as r;
select pg_temp.check((select (r ->> 'new')::int = 1 from r40c), 'terza volta: il nuovo cliente entra');
select pg_temp.check(not exists (select 1 from companies where vat_number = '12345740364'), 'e la partita IVA del fornitore si toglie da tutti');
select store_company_checks('[{"company":{"domain":"cliente1-40.it","vat":"12345740364"},"checks":[]}]', '{}', 'seed');
select pg_temp.check((select vat_number = '' from companies where domain = 'cliente1-40.it'), 'e non torna più');
