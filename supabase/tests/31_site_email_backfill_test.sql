-- Ricontrollo anticipato delle aziende senza email (migrazione 054, punto 60).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

insert into companies (domain, name, website, site_checked_at, site_email) values
  ('senzaemail31.it', 'Senza Email', 'https://senzaemail31.it', timestamptz '2026-10-18 10:00+00', ''),
  ('conemail31.it', 'Con Email', 'https://conemail31.it', timestamptz '2026-10-18 10:00+00', 'info@conemail31.it'),
  ('dopo31.it', 'Controllata Dopo', 'https://dopo31.it', timestamptz '2026-10-20 13:00+00', ''),
  ('irraggiungibile31.it', 'Sito Spento', 'https://irraggiungibile31.it', timestamptz '2026-10-18 10:00+00', ''),
  ('mai31.it', 'Mai Controllata', 'https://mai31.it', null, '');
insert into company_checks (company_id, code, status, checked_at)
  select id, 'no_mobile', 'fail', site_checked_at from companies where domain in ('senzaemail31.it', 'conemail31.it', 'dopo31.it');
insert into company_checks (company_id, code, status, checked_at)
  select id, 'no_mobile', 'undetermined', site_checked_at from companies where domain = 'irraggiungibile31.it';
create temp view q31 as select p.domain, p.n from pending_site_checks(300) with ordinality as p(company_id, domain, name, website, n)
  where p.domain like '%31.it';

select pg_temp.check((select array_agg(domain order by domain) = '{mai31.it,senzaemail31.it}' from q31),
  'in coda: le dovute e quelle controllate prima del 20/10 12:25 con il sito leggibile e senza email');
select pg_temp.check((select domain = 'mai31.it' from q31 order by n limit 1), 'prima le dovute');
select store_company_checks(jsonb_build_array(jsonb_build_object('company', jsonb_build_object('domain', 'senzaemail31.it', 'name', 'Senza Email'),
  'checks', '[{"code":"no_mobile","status":"fail","evidence":{}}]'::jsonb)), '{}', 'seed');
select pg_temp.check((select count(*) = 0 from q31 where domain = 'senzaemail31.it'), 'ricontrollata (anche senza email trovata): esce e non rientra');
