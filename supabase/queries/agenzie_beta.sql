-- Agenzie web, di comunicazione e marketing nel database, nelle regioni già coperte (solo lettura, nessun costo).
-- Serve a scegliere le agenzie da invitare alla beta. Cambiare l'elenco delle regioni qui sotto se serve.
with regioni(regione) as (values ('Puglia'), ('Campania'), ('Sicilia'), ('Emilia-Romagna'), ('Calabria'), ('Basilicata')),
agenzie as (
  select c.id, c.name, c.website, c.city, c.industry, c.contact_form_url,
         (select r.regione from regioni r where c.places @> term_stems(r.regione) limit 1) as regione
    from companies c
   where c.website <> ''
     and (c.industry ilike any (array['%pubblicit%', '%grafica%', '%comunicazione%', '%marketing%', '%web%', '%design%'])
          or c.tags @> term_stems('agenzia pubblicità')
          or c.tags @> term_stems('web agency'))
)
select a.regione, a.city as citta, a.name as agenzia, a.industry as settore, a.website as sito,
       coalesce((select e.address from emails e
                  where e.company_id = a.id and e.type = 'generic' order by e.address limit 1), '') as email,
       a.contact_form_url as modulo
  from agenzie a
 where a.regione is not null
 order by a.regione, a.city, a.name
 limit 200;
