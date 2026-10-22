-- Punto 39 (22/10): la 060 in produzione supera il minuto (timeout dell'editor), sul banco di prova 0,9 s.
-- Questa query non la esegue: guarda la forma dei dati (ricerche, zone, parole chiave, etichette delle aziende).
-- Sola lettura, pochi secondi. Il risultato è una riga sola in JSON.

with recenti as (
  select se.target
    from searches se
   where se.deleted_at is null
     and (se.created_at > now() - interval '30 days' or exists (select 1 from search_alerts a where a.search_id = se.id))
)
select jsonb_build_object(
  'ricerche', (select count(*) from recenti),
  'zone_per_ricerca_max', (select max(jsonb_array_length(coalesce(target -> 'regions', '[]'))) from recenti),
  'zone_per_ricerca_media', (select round(avg(jsonb_array_length(coalesce(target -> 'regions', '[]'))), 1) from recenti),
  'parole_settore_max', (select max(jsonb_array_length(coalesce(target -> 'industry_keywords', '[]'))) from recenti),
  'parole_settore_media', (select round(avg(jsonb_array_length(coalesce(target -> 'industry_keywords', '[]'))), 1) from recenti),
  'esempi_ricerche', (select jsonb_agg(jsonb_build_object('zone', target -> 'regions', 'settore', target -> 'industry',
                                                          'parole', target -> 'industry_keywords'))
                        from (select target from recenti limit 8) x),
  'etichette_azienda_media', (select round(avg(cardinality(tags)), 1) from companies),
  'etichette_azienda_max', (select max(cardinality(tags)) from companies),
  'luoghi_azienda_media', (select round(avg(cardinality(places)), 1) from companies),
  'luoghi_azienda_max', (select max(cardinality(places)) from companies),
  'citta_lunghezza_max', (select max(length(city)) from companies),
  'controlli_per_azienda', (select round(count(*)::numeric / greatest((select count(*) from companies), 1), 1) from company_checks),
  'da_ricontrollare_054', (select count(*) from companies c
                            where c.site_checked_at >= now() - interval '25 days'
                              and c.site_checked_at < timestamptz '2026-10-20 12:25:00+00'
                              and coalesce(c.site_email, '') = ''),
  'jit', current_setting('jit')
) as forma;
