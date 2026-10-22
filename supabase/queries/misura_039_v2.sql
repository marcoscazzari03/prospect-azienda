-- Punto 39 (22/10): prova in produzione della coda con priorità della migrazione 064, come semplice lettura (non installa
-- niente). Stessa logica della funzione: zone e settori calcolati una volta sola (CTE materializzate), poi la coda.
-- Il risultato è una riga sola in JSON: tempo in millisecondi, combinazioni zona/settore, quante delle 150 aziende scelte
-- sono nella zona e nel settore di una ricerca.
set statement_timeout = '60s';
with t0 as materialized (select clock_timestamp() as t),
recenti as materialized (
  select se.target
    from searches se, t0
   where se.deleted_at is null
     and (se.created_at > now() - interval '30 days' or exists (select 1 from search_alerts a where a.search_id = se.id))
   order by se.created_at desc
   limit 200
),
domanda as materialized (
  select distinct z.stems as zona, s.stems as settore
    from recenti r
    cross join lateral (
      select term_stems(g) as stems from jsonb_array_elements_text(coalesce(r.target -> 'regions', '[]')) g
       where cardinality(term_stems(g)) > 0
      union all
      select '{}'::text[] where not exists (
        select 1 from jsonb_array_elements_text(coalesce(r.target -> 'regions', '[]')) g where cardinality(term_stems(g)) > 0)
    ) z
    cross join lateral (
      select term_stems(r.target ->> 'industry') as stems where cardinality(term_stems(r.target ->> 'industry')) > 0
      union all
      select term_stems(k) from jsonb_array_elements_text(coalesce(r.target -> 'industry_keywords', '[]')) k
       where cardinality(term_stems(k)) > 0
      union all
      select '{}'::text[] where coalesce(btrim(r.target ->> 'industry'), '') = ''
                           and jsonb_array_length(coalesce(r.target -> 'industry_keywords', '[]')) = 0
    ) s
   where cardinality(z.stems) > 0 or cardinality(s.stems) > 0
   limit 100
),
da_fare as materialized (
  select c.id, c.site_checked_at, c.first_seen_at,
         coalesce(c.places, '{}') || term_stems(c.city) as luoghi, coalesce(c.tags, '{}') as tags,
         (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days') as scaduta
    from companies c, t0
   where ((c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
          or (c.site_checked_at < timestamptz '2026-10-20 12:25:00+00'
              and coalesce(c.site_email, '') = ''
              and exists (select 1 from company_checks cc where cc.company_id = c.id and cc.status in ('pass', 'fail'))))
     and not is_non_target_company(c.name)
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
),
scelte as materialized (
  select f.id, f.scaduta, p.cercata
    from da_fare f
    cross join lateral (select exists (select 1 from domanda d
                                        where (cardinality(d.zona) = 0 or f.luoghi @> d.zona)
                                          and (cardinality(d.settore) = 0 or f.tags @> d.settore)) as cercata) p
   order by f.scaduta desc, p.cercata desc, f.site_checked_at nulls first, f.first_seen_at
   limit 150
)
select jsonb_build_object(
  'ms', (select round(extract(epoch from (clock_timestamp() - t0.t)) * 1000) from t0, (select count(*) from scelte) x),
  'combinazioni', (select count(*) from domanda),
  'in_coda', (select count(*) from da_fare),
  'scelte', (select count(*) from scelte),
  'scelte_cercate', (select count(*) filter (where cercata) from scelte),
  'scelte_scadute', (select count(*) filter (where scaduta) from scelte)
) as prova;
