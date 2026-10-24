-- Professionisti con titolo esclusi (migrazione 074): stessa regola del codice dell'app, import bloccato.
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(is_professional_name('Avv. Mario Rossi') and is_professional_name('Studio Arch. Bianchi')
                     and is_professional_name('Dott.ssa Laura Verdi') and is_professional_name('Geom. Neri') and is_professional_name('Dottor Rossi'),
                     'titoli riconosciuti');
select pg_temp.check(not is_professional_name('Studio Ing. Rossi & C. S.r.l.') and not is_professional_name('Architetti Associati STP')
                     and not is_professional_name('Studio Rossi') and not is_professional_name('Marketing Ingenium')
                     and not is_professional_name('Drago Srl') and not is_professional_name('Centro Medico San Luca')
                     and not is_professional_name('Farmacia Dr. Max') and not is_professional_name('Ing Direct') and not is_professional_name('Hotel Arch')
                     and not is_professional_name('Rag Doll Bar') and not is_professional_name('Perito Moreno Viaggi') and not is_professional_name('Il Tuo Dentista'),
                     'società, studi senza titolo e nomi comuni restano');
select pg_temp.check(is_non_target_company('Avv. Mario Rossi') and is_non_target_company('ASD Calcio') and not is_non_target_company('Rossi Srl'),
                     'fuori target: professionisti e regole di prima');
create temp table r43 as select store_imported_companies('osm', '[{"domain":"avvrossi43.it","name":"Avv. Mario Rossi","city":"Modena"},
                                                                {"domain":"rossi43.it","name":"Rossi Srl","city":"Modena"}]') as r;
select pg_temp.check(not exists (select 1 from companies where domain = 'avvrossi43.it') and exists (select 1 from companies where domain = 'rossi43.it'),
                     'import: il professionista non entra');
