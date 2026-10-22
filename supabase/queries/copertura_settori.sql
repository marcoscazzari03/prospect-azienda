-- Copertura del database per settore e regione (punti 83-85, 22/10). SOLA LETTURA, nessun costo, pochi secondi.
-- «Vive» = almeno un controllo pass/fail negli ultimi 60 giorni, come target_pool (059). Solo Italia.
-- «con_contatto» = email del sito o modulo di contatto; «con_email» = solo email del sito.
-- Restituisce una riga con tre JSON: totali, primi 30 settori per industry, primi 30 per tags, 20 regioni (per places).
-- Le radici dei tags sono parole intere o radici (term_stems): servono a capire quali settori si possono cercare.
with vive as materialized (
  select c.id, lower(btrim(c.industry)) as industry, coalesce(c.tags, '{}') as tags, coalesce(c.places, '{}') as places,
         (coalesce(c.site_email, '') <> '') as email,
         (coalesce(c.site_email, '') <> '' or coalesce(c.contact_form_url, '') <> '') as contatto
    from companies c
   where (c.country_code = 'IT' or (c.country_code is null and lower(c.country) in ('italia', 'italy', 'it')))
     and exists (select 1 from company_checks cc
                  where cc.company_id = c.id and cc.status in ('pass', 'fail')
                    and cc.checked_at > now() - interval '60 days')
),
tot as (
  select count(*) as vive, count(*) filter (where email) as con_email, count(*) filter (where contatto) as con_contatto,
         count(*) filter (where industry is null or industry = '') as senza_industry,
         count(*) filter (where cardinality(tags) = 0) as senza_tags
    from vive
),
per_industry as (
  select industry as settore, count(*) as aziende, count(*) filter (where email) as con_email,
         count(*) filter (where contatto) as con_contatto
    from vive where industry <> '' group by 1 order by 2 desc, 1 limit 30
),
per_tag as (
  select t as tag, count(*) as aziende, count(*) filter (where email) as con_email,
         count(*) filter (where contatto) as con_contatto
    from vive, unnest(tags) t group by 1 order by 2 desc, 1 limit 30
),
regioni(regione) as (values
  ('Lombardia'), ('Veneto'), ('Emilia-Romagna'), ('Piemonte'), ('Toscana'), ('Lazio'), ('Campania'), ('Puglia'),
  ('Sicilia'), ('Friuli-Venezia Giulia'), ('Trentino-Alto Adige'), ('Liguria'), ('Marche'), ('Umbria'), ('Abruzzo'),
  ('Sardegna'), ('Calabria'), ('Basilicata'), ('Molise'), ('Valle d''Aosta')
),
per_regione as (
  select r.regione, count(*) as aziende, count(*) filter (where v.email) as con_email,
         count(*) filter (where v.contatto) as con_contatto
    from regioni r
    join vive v on v.places @> term_stems(r.regione)
   group by 1 order by 2 desc
)
select jsonb_build_object(
  'totali', (select to_jsonb(tot) from tot),
  'per_industry', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from per_industry x),
  'per_tag', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from per_tag x),
  'per_regione', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from per_regione x)
) as copertura;
