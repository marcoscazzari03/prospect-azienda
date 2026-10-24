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
  v_k integer := greatest(least(greatest(coalesce(p_limit, 80), 1), 300) * 4, 1000); -- aziende per gruppo prima delle esclusioni
  v_ids uuid[];
  v_completo boolean;
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
  --   A. le aziende da controllare (mai o da più di 25 giorni) nella zona e nel settore di una ricerca recente;
  --   B. le prime aziende da controllare in assoluto (mai controllate, poi le più vecchie);
  --   C. il ricontrollo della 054 (controllate prima dell'email dal sito, il 20/10, senza email), le più vecchie, e (CD) quelle
  --      del ricontrollo nella zona e nel settore di una ricerca recente.
  -- Ogni gruppo prende le prime K senza le esclusioni (non in target, opposizioni, aziende chiuse), che costano: le esclusioni
  -- si tolgono dopo, solo da queste. Le escluse non si ricontrollano mai e restano in testa all'indice (Code Reviewer): se in un
  -- gruppo troncato ne restano meno del limite, si riprova con K quattro volte più grande. Così il risultato è esattamente
  -- quello della 064 (stesse aziende, stesso ordine: prima le scadute, poi le altre; in ognuna prima quelle della
  -- domanda, poi mai controllate e più vecchie).
  loop
    execute $q$
    with domanda as materialized (
      select array(select jsonb_array_elements_text(e -> 'z')) as zona,
             array(select jsonb_array_elements_text(e -> 's')) as settore
        from jsonb_array_elements($2) e
    ),
    -- Tre rami senza «oppure», perché Postgres usi gli indici: zona e settore, solo settore, solo zona.
    gruppo_a as materialized (
      select x.id, x.site_checked_at, x.first_seen_at from domanda d
      cross join lateral (
        (select c.id, c.site_checked_at, c.first_seen_at from companies c
          where cardinality(d.settore) > 0 and cardinality(d.zona) > 0 and c.tags @> d.settore
            and public.company_places(c.places, c.city) @> d.zona
            and (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
          order by c.site_checked_at nulls first, c.first_seen_at limit $3)
        union all
        (select c.id, c.site_checked_at, c.first_seen_at from companies c
          where cardinality(d.settore) > 0 and cardinality(d.zona) = 0 and c.tags @> d.settore
            and (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
          order by c.site_checked_at nulls first, c.first_seen_at limit $3)
        union all
        (select c.id, c.site_checked_at, c.first_seen_at from companies c
          where cardinality(d.settore) = 0 and cardinality(d.zona) > 0 and public.company_places(c.places, c.city) @> d.zona
            and (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days')
          order by c.site_checked_at nulls first, c.first_seen_at limit $3)
      ) x
      group by x.id, x.site_checked_at, x.first_seen_at
      order by x.site_checked_at nulls first, x.first_seen_at
      limit $3
    ),
    gruppo_b as materialized (
      select c.id from companies c
       where c.site_checked_at is null or c.site_checked_at < now() - interval '25 days'
       order by c.site_checked_at nulls first, c.first_seen_at
       limit $3
    ),
    gruppo_c as materialized (
      select c.id from companies c
       where c.site_checked_at >= now() - interval '25 days'
         and c.site_checked_at < timestamptz '2026-10-20 12:25:00+00'
         and coalesce(c.site_email, '') = ''
         and exists (select 1 from company_checks cc where cc.company_id = c.id and cc.status in ('pass', 'fail'))
       order by c.site_checked_at
       limit $3
    ),
    -- Come A, tra le aziende del gruppo C: la priorità della domanda vale anche lì (QA).
    gruppo_cd as materialized (
      select x.id, x.site_checked_at from domanda d
      cross join lateral (
        (select c.id, c.site_checked_at, c.first_seen_at from companies c
          where cardinality(d.settore) > 0 and cardinality(d.zona) > 0 and c.tags @> d.settore
            and public.company_places(c.places, c.city) @> d.zona
            and c.site_checked_at >= now() - interval '25 days'
            and c.site_checked_at < timestamptz '2026-10-20 12:25:00+00'
            and coalesce(c.site_email, '') = ''
            and exists (select 1 from company_checks cc where cc.company_id = c.id and cc.status in ('pass', 'fail'))
          order by c.site_checked_at nulls first, c.first_seen_at limit $3)
        union all
        (select c.id, c.site_checked_at, c.first_seen_at from companies c
          where cardinality(d.settore) > 0 and cardinality(d.zona) = 0 and c.tags @> d.settore
            and c.site_checked_at >= now() - interval '25 days'
            and c.site_checked_at < timestamptz '2026-10-20 12:25:00+00'
            and coalesce(c.site_email, '') = ''
            and exists (select 1 from company_checks cc where cc.company_id = c.id and cc.status in ('pass', 'fail'))
          order by c.site_checked_at nulls first, c.first_seen_at limit $3)
        union all
        (select c.id, c.site_checked_at, c.first_seen_at from companies c
          where cardinality(d.settore) = 0 and cardinality(d.zona) > 0 and public.company_places(c.places, c.city) @> d.zona
            and c.site_checked_at >= now() - interval '25 days'
            and c.site_checked_at < timestamptz '2026-10-20 12:25:00+00'
            and coalesce(c.site_email, '') = ''
            and exists (select 1 from company_checks cc where cc.company_id = c.id and cc.status in ('pass', 'fail'))
          order by c.site_checked_at nulls first, c.first_seen_at limit $3)
      ) x
      group by x.id, x.site_checked_at, x.first_seen_at
      order by x.site_checked_at nulls first, x.first_seen_at
      limit $3
    ),
    candidati as materialized (
      select id from gruppo_a union select id from gruppo_b union select id from gruppo_c union select id from gruppo_cd
    ),
    -- Le aziende della domanda (A e CD) in un elenco solo: «in» si risolve con una tabella hash, «exists» con «union» no.
    abbinate as materialized (
      select id from gruppo_a union select id from gruppo_cd
    ),
    escluse as materialized (
      select c.id from candidati k join companies c on c.id = k.id
       where is_non_target_company(c.name)
          or exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
          or exists (
            select 1 from lead_reports r join deliveries x on x.id = r.delivery_id
             where r.status = 'refunded' and r.reason = 'company_closed' and x.company_domain = c.domain)
    ),
    scelte as (
      select c.id
        from candidati k
        join companies c on c.id = k.id
       where k.id not in (select id from escluse)
       order by (c.site_checked_at is null or c.site_checked_at < now() - interval '25 days') desc,
                (c.id in (select id from abbinate)) desc,
                c.site_checked_at nulls first, c.first_seen_at
       limit $1
    )
    select coalesce((select array_agg(id) from scelte), '{}'),
           -- Ogni gruppo è completo (meno di K righe) o ha almeno il limite di aziende valide.
           ((select count(*) from gruppo_a) < $3 or (select count(*) from gruppo_a where id not in (select id from escluse)) >= $1)
       and ((select count(*) from gruppo_b) < $3 or (select count(*) from gruppo_b where id not in (select id from escluse)) >= $1)
       and ((select count(*) from gruppo_c) < $3 or (select count(*) from gruppo_c where id not in (select id from escluse)) >= $1)
       and ((select count(*) from gruppo_cd) < $3 or (select count(*) from gruppo_cd where id not in (select id from escluse)) >= $1)
    $q$ into v_ids, v_completo using v_limit, v_domanda, v_k;
    exit when v_completo or v_k >= 50000;
    v_k := v_k * 4;
  end loop;

  return query
    select c.id, c.domain, c.name, c.website
      from unnest(v_ids) with ordinality u(id, n)
      join companies c on c.id = u.id
     order by u.n;
end;
$f$;
revoke all on function public.pending_site_checks(integer) from public, anon, authenticated;
grant execute on function public.pending_site_checks(integer) to service_role;
