-- Coda del controllo siti veloce (checklist 97, 24/10). La 064 valutava ogni azienda da controllare (circa 150.000 con le
-- aziende di OSM e Common Crawl) contro le ricerche recenti prima di tenerne poche: 8-9 s in produzione, oltre il tempo
-- massimo delle richieste al database (il worker del VPS falliva con HTTP 500, n8n passava solo riprovando). Ora tre gruppi
-- piccoli presi con gli indici (vedi sotto); regole su chi va controllato, priorità della domanda ed esclusioni invariate.
-- Indici nuovi: ordine della coda (mai controllate, poi le più vecchie) e luoghi dell'azienda (places + città) per la domanda.
-- Indietro: rieseguire la funzione della 064; gli indici si possono lasciare (o drop index).

-- Luoghi dell'azienda come nella 064 (places più le parole della città), in una funzione immutabile per l'indice.
create or replace function public.company_places(p_places text[], p_city text)
returns text[] language sql immutable parallel safe set search_path = public as $$
  select coalesce(p_places, '{}') || term_stems(p_city)
$$;

create index if not exists companies_check_queue_idx on public.companies (site_checked_at nulls first, first_seen_at);
create index if not exists companies_places_idx on public.companies using gin (public.company_places(places, city));

create or replace function public.pending_site_checks(p_limit integer)
returns table (company_id uuid, domain text, name text, website text)
-- jit spento: sul banco 1,8 s di compilazione su 2 s (le stime dei costi sono alte, il lavoro vero circa 0,2 s).
language plpgsql stable security definer set search_path = public set jit = off as $f$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 80), 1), 300);
  v_domanda jsonb;
begin
  -- Zone e settori cercati: una riga per zona e per settore (o parola chiave del settore, che è un'alternativa).
  -- Zona vuota = tutto il paese, settore vuoto = tutti i settori; una ricerca senza zona e senza settore non conta.
  -- Al massimo le 200 ricerche più recenti e le 100 combinazioni delle ricerche più recenti. Solo elenchi: una ricerca
  -- con zone o parole chiave in un altro formato non deve fermare la coda (Code Reviewer, 22/10).
  begin
  with recenti as (
    select se.target, se.created_at,
           case when jsonb_typeof(se.target -> 'regions') = 'array' then se.target -> 'regions' else '[]'::jsonb end as zone,
           case when jsonb_typeof(se.target -> 'industry_keywords') = 'array' then se.target -> 'industry_keywords' else '[]'::jsonb end as parole
      from searches se
     where se.deleted_at is null
       and (se.created_at > now() - interval '30 days' or exists (select 1 from search_alerts a where a.search_id = se.id))
     order by se.created_at desc
     limit 200
  ),
  coppie as (
    select z.stems as zona, s.stems as settore
      from recenti r
      cross join lateral (
        select term_stems(g) as stems from jsonb_array_elements_text(r.zone) g
         where cardinality(term_stems(g)) > 0
        union all
        select '{}'::text[] where not exists (
          select 1 from jsonb_array_elements_text(r.zone) g where cardinality(term_stems(g)) > 0)
      ) z
      cross join lateral (
        select term_stems(r.target ->> 'industry') as stems where cardinality(term_stems(r.target ->> 'industry')) > 0
        union all
        select term_stems(k) from jsonb_array_elements_text(r.parole) k
         where cardinality(term_stems(k)) > 0
        union all
        select '{}'::text[] where coalesce(btrim(r.target ->> 'industry'), '') = '' and jsonb_array_length(r.parole) = 0
      ) s
     where cardinality(z.stems) > 0 or cardinality(s.stems) > 0
     group by 1, 2
     order by max(r.created_at) desc
     limit 100
  )
  select coalesce(jsonb_agg(jsonb_build_object('z', to_jsonb(zona), 's', to_jsonb(settore))), '[]') into v_domanda from coppie;
  exception when others then
    -- Qualsiasi errore nel leggere le ricerche: coda senza priorità (ordine della 061) invece di fermarsi.
    v_domanda := '[]';
  end;

  -- Tre gruppi piccoli, presi con gli indici, invece di valutare ogni azienda da controllare (24/10: 9-15 s con circa
  -- 150.000 aziende in coda, oltre il tempo massimo delle richieste al database):
  --   A. le aziende da controllare (mai o da più di 25 giorni) nella zona e nel settore di una ricerca recente, le prime N
  --      per combinazione e poi le prime N in tutto;
  --   B. le prime N aziende da controllare in assoluto (mai controllate, poi le più vecchie);
  --   C. le prime N del ricontrollo della 054 (controllate prima dell'email dal sito, il 20/10, senza email).
  -- N = 4 volte il limite: le esclusioni (non in target, opposizioni, aziende chiuse) si applicano solo a questi, e ne tolgono
  -- molte meno. L'ordine finale è quello della 064: prima le scadute, tra queste prima quelle della domanda, poi mai
  -- controllate e più vecchie.
  return query execute $q$
  with domanda as materialized (
    select array(select jsonb_array_elements_text(e -> 'z')) as zona,
           array(select jsonb_array_elements_text(e -> 's')) as settore
      from jsonb_array_elements($2) e
  ),
  gruppo_a as materialized (
    select x.id from domanda d
    -- Tre rami senza «oppure», perché Postgres usi gli indici: zona e settore, solo settore, solo zona.
    cross join lateral (
      (select c.id, c.site_checked_at, c.first_seen_at
         from companies c
        where cardinality(d.settore) > 0 and cardinality(d.zona) > 0 and c.tags @> d.settore
          and public.company_places(c.places, c.city) @> d.zona
          and (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
        order by c.site_checked_at nulls first, c.first_seen_at
        limit $1 * 4)
      union all
      (select c.id, c.site_checked_at, c.first_seen_at
         from companies c
        where cardinality(d.settore) > 0 and cardinality(d.zona) = 0 and c.tags @> d.settore
          and (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
        order by c.site_checked_at nulls first, c.first_seen_at
        limit $1 * 4)
      union all
      (select c.id, c.site_checked_at, c.first_seen_at
         from companies c
        where cardinality(d.settore) = 0 and cardinality(d.zona) > 0 and public.company_places(c.places, c.city) @> d.zona
          and (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
        order by c.site_checked_at nulls first, c.first_seen_at
        limit $1 * 4)
    ) x
    group by x.id, x.site_checked_at, x.first_seen_at
    order by x.site_checked_at nulls first, x.first_seen_at
    limit $1 * 4
  ),
  gruppo_b as materialized (
    select c.id from companies c
     where c.site_checked_at is null or c.site_checked_at < now() - interval '25 days'
     order by c.site_checked_at nulls first, c.first_seen_at
     limit $1 * 4
  ),
  gruppo_c as materialized (
    select c.id from companies c
     where c.site_checked_at >= now() - interval '25 days'
       and c.site_checked_at < timestamptz '2026-10-20 12:25:00+00'
       and coalesce(c.site_email, '') = ''
       and exists (select 1 from company_checks cc where cc.company_id = c.id and cc.status in ('pass', 'fail'))
     order by c.site_checked_at
     limit $1 * 4
  ),
  candidati as (
    select id from gruppo_a union select id from gruppo_b union select id from gruppo_c
  )
  select c.id, c.domain, c.name, c.website
    from candidati k
    join companies c on c.id = k.id
   where not is_non_target_company(c.name)
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
     and not exists (
       select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
        where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
   order by (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days') desc,
            exists (select 1 from gruppo_a a where a.id = c.id) desc,
            c.site_checked_at nulls first, c.first_seen_at
   limit $1
  $q$ using v_limit, v_domanda;
end;
$f$;
revoke all on function public.pending_site_checks(integer) from public, anon, authenticated;
grant execute on function public.pending_site_checks(integer) to service_role;
