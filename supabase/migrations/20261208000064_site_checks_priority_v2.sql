-- Coda del controllo siti con priorità, seconda versione (punto 39, 22/10). Prima vengono le aziende nella zona e nel
-- settore di una ricerca degli ultimi 30 giorni (o con un avviso attivo), poi le altre; le regole su chi va controllato
-- (25 giorni, ricontrollo della 054, esclusioni) non cambiano.
-- Perché la 060 è stata tolta (061): sul banco di prova 0,9 s, in produzione oltre un minuto (misure del 22/10 in
-- supabase/queries/misura_039*.sql). L'elenco delle zone e dei settori cercati era una sottoquery che Postgres può
-- ricalcolare per ogni azienda in coda (13.600 aziende × 44 ricerche rilette e scomposte ogni volta); sul banco il piano
-- la memorizzava, in produzione no. Ora zone e settori si calcolano una volta sola, prima della query, e arrivano come
-- parametro; i luoghi di ogni azienda si calcolano una volta sola (CTE materializzata).
-- Indietro: rieseguire la 061 (coda della 054).

create or replace function public.pending_site_checks(p_limit integer)
returns table (company_id uuid, domain text, name text, website text)
language plpgsql stable security definer set search_path = public as $f$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 80), 1), 300);
  v_domanda jsonb;
begin
  -- Zone e settori cercati: una riga per zona e per settore (o parola chiave del settore, che è un'alternativa).
  -- Zona vuota = tutto il paese, settore vuoto = tutti i settori; una ricerca senza zona e senza settore non conta.
  -- Al massimo le 200 ricerche più recenti e 100 combinazioni.
  with recenti as (
    select se.target
      from searches se
     where se.deleted_at is null
       and (se.created_at > now() - interval '30 days' or exists (select 1 from search_alerts a where a.search_id = se.id))
     order by se.created_at desc
     limit 200
  ),
  coppie as (
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
  )
  select coalesce(jsonb_agg(jsonb_build_object('z', to_jsonb(zona), 's', to_jsonb(settore))), '[]') into v_domanda from coppie;

  return query execute $q$
  with domanda as materialized (
    select array(select jsonb_array_elements_text(e -> 'z')) as zona,
           array(select jsonb_array_elements_text(e -> 's')) as settore
      from jsonb_array_elements($2) e
  ),
  da_fare as materialized (
    select c.id, c.domain, c.name, c.website, c.site_checked_at, c.first_seen_at,
           coalesce(c.places, '{}') || term_stems(c.city) as luoghi, coalesce(c.tags, '{}') as tags,
           (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days') as scaduta
      from companies c
     where ((c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
            or (c.site_checked_at < timestamptz '2026-10-20 12:25:00+00'
                and coalesce(c.site_email, '') = ''
                and exists (select 1 from company_checks cc where cc.company_id = c.id and cc.status in ('pass', 'fail'))))
       and not is_non_target_company(c.name)
       and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
       and not exists (
         select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
          where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
  )
  select f.id, f.domain, f.name, f.website
    from da_fare f
   order by f.scaduta desc,
            exists (select 1 from domanda d
                     where (cardinality(d.zona) = 0 or f.luoghi @> d.zona)
                       and (cardinality(d.settore) = 0 or f.tags @> d.settore)) desc,
            f.site_checked_at nulls first, f.first_seen_at
   limit $1
  $q$ using v_limit, v_domanda;
end;
$f$;
revoke all on function public.pending_site_checks(integer) from public, anon, authenticated;
grant execute on function public.pending_site_checks(integer) to service_role;
