-- Controllo dei siti del database (pending_site_checks + store_company_checks con origine seed).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

-- (Le aziende dei test precedenti restano nel database: si guardano solo quelle di questo test.)
insert into companies (domain, name, website, site_checked_at) values
  ('mai12.it', 'Mai Controllata', 'https://mai12.it', null),
  ('vecchio12.it', 'Controllo Vecchio', 'http://vecchio12.it', now() - interval '26 days'),
  ('recente12.it', 'Controllo Recente', 'https://recente12.it', now() - interval '3 days'),
  ('opposta12.it', 'In Opposizione', 'https://opposta12.it', null);
insert into suppression_list (domain_hash) values (sha256_hex('opposta12.it'));
create temp view q12 as select * from pending_site_checks(300) where domain like '%12.it';

select pg_temp.check((select array_agg(domain order by domain) = '{mai12.it,vecchio12.it}' from q12),
                     'da controllare: mai controllate e oltre 25 giorni, niente opposizioni');
select pg_temp.check((select domain = 'mai12.it' from q12 limit 1), 'prima quelle mai controllate');

select store_company_checks(jsonb_build_array(
  jsonb_build_object('company', jsonb_build_object('domain', 'vecchio12.it', 'name', 'Controllo Vecchio', 'technologies', '["wordpress"]'::jsonb),
    'checks', '[{"code":"outdated_cms","status":"pass","evidence":{"detail":"WordPress 5.2"}},{"code":"no_https","status":"pass","evidence":{"detail":"Il sito non risponde in HTTPS"}},{"code":"no_mobile","status":"fail","evidence":{}}]'::jsonb),
  jsonb_build_object('company', jsonb_build_object('domain', 'mai12.it', 'name', 'Mai Controllata'),
    'checks', '[{"code":"no_mobile","status":"undetermined","evidence":{}}]'::jsonb)), '{}', 'seed');
select pg_temp.check((select count(*) = 0 from q12), 'controllate: escono dalla coda');
select pg_temp.check((select array_agg(cs.code order by cs.code) = '{no_https,outdated_cms}'
                        from company_signals cs join companies c on c.id = cs.company_id where c.domain = 'vecchio12.it'),
                     'prove salvate per le ricerche opportunità');
select pg_temp.check((select technologies = '{wordpress}' and origin = '' and website = 'http://vecchio12.it'
                        from companies where domain = 'vecchio12.it'), 'azienda esistente: dati conservati');

-- Email aziendale dalla homepage (migrazione 050): salvata solo se del dominio, e toglie la memoria «email non trovata».
update companies set email_missed_at = now() where domain = 'vecchio12.it';
select store_company_checks(jsonb_build_array(
  jsonb_build_object('company', jsonb_build_object('domain', 'vecchio12.it', 'email', 'Info@Vecchio12.it'), 'checks', '[]'::jsonb),
  jsonb_build_object('company', jsonb_build_object('domain', 'altra12.it', 'email', 'info@estraneo.com'), 'checks', '[]'::jsonb)), '{}', 'seed');
select pg_temp.check((select site_email = 'info@vecchio12.it' and site_email_at is not null and email_missed_at is null
                        from companies where domain = 'vecchio12.it'), 'email del dominio salvata, memoria tolta');
select pg_temp.check((select site_email = '' from companies where domain = 'altra12.it'), 'email di un altro dominio ignorata');

select 'superati tutti i test controllo siti';
