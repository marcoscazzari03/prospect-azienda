-- «Senza HTTPS» del vecchio controllo (fino al 19/10): provava il dominio nudo e contava come
-- difetto anche catena incompleta ed errori di handshake. Le prove «Certificato HTTPS non valido
-- o scaduto» tornano «non determinabile» e le aziende vanno in testa alla coda di
-- «Aziende | Controllo siti», che le ricontrolla con le regole nuove (150 l'ora).
-- «Il sito non risponde in HTTPS» resta: il sito salvato è in http e la porta 443 è chiusa.

-- 1) Solo lettura: quante sono.
select c.detail, count(*) as aziende
  from company_checks c
 where c.code = 'no_https' and c.status = 'pass'
 group by c.detail order by aziende desc;

-- 2) Correzione (eseguire dopo aver visto il conteggio).
-- begin;
-- with vecchie as (
--   update company_checks
--      set status = 'undetermined', detail = '', evidence = '{}'::jsonb
--    where code = 'no_https' and status = 'pass' and detail = 'Certificato HTTPS non valido o scaduto'
--   returning company_id
-- ), segnali as (
--   delete from company_signals s using vecchie v where s.company_id = v.company_id and s.code = 'no_https'
-- )
-- update companies set site_checked_at = null where id in (select company_id from vecchie);
-- commit;

-- 3) Seconda passata (20/10): «Certificato HTTPS non valido per questo sito» ora conta solo sull'host
--    che il sito usa davvero e se il certificato non è del marchio su un altro dominio.
--    Conteggio (sola lettura):
select count(*) from company_checks where code = 'no_https' and status = 'pass' and detail = 'Certificato HTTPS non valido per questo sito';
-- Correzione:
-- begin;
-- with vecchie as (
--   update company_checks
--      set status = 'undetermined', detail = '', evidence = '{}'::jsonb
--    where code = 'no_https' and status = 'pass' and detail = 'Certificato HTTPS non valido per questo sito'
--   returning company_id
-- ), segnali as (
--   delete from company_signals s using vecchie v where s.company_id = v.company_id and s.code = 'no_https'
-- )
-- update companies set site_checked_at = null where id in (select company_id from vecchie);
-- commit;
