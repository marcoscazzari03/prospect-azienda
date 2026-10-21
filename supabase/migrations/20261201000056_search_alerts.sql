-- Avviso settimanale delle opportunità (punto 36 del 21/10). Su una ricerca opportunità il cliente attiva un avviso
-- gratuito: ogni lunedì si contano le aziende che soddisfano la ricerca, non ancora consegnate all'account e mai
-- segnalate da questo avviso; se sono almeno `min_new` parte un'email (la manda l'app) e quelle aziende si segnano
-- come segnalate. I crediti si spendono solo se il cliente avvia la ricerca dall'email.
-- «Nuove» = mai segnalate, non «con un segnale recente»: le prove si rinnovano ogni 25 giorni (checked_at) e le
-- stesse aziende sembrerebbero nuove ogni mese (Business Analyst, 21/10).
-- Indietro: drop delle tre tabelle e delle quattro funzioni (nessun dato esistente toccato).

create table public.search_alerts (
  search_id uuid primary key references public.searches (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  min_new integer not null default 3 check (min_new between 1 and 50),
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index search_alerts_due_idx on public.search_alerts (next_run_at);
alter table public.search_alerts enable row level security;
create policy "i miei avvisi" on public.search_alerts for select to authenticated using (public.is_org_member(org_id));

-- Aziende già segnalate (o già disponibili quando l'avviso è stato attivato).
create table public.search_alert_domains (
  search_id uuid not null references public.search_alerts (search_id) on delete cascade,
  domain text not null,
  notified_at timestamptz not null default now(),
  primary key (search_id, domain)
);
alter table public.search_alert_domains enable row level security;

-- Ogni giro dell'avviso, anche quando non parte l'email: per misurare se la funzione serve.
create table public.search_alert_runs (
  id bigserial primary key,
  search_id uuid not null references public.searches (id) on delete cascade,
  run_at timestamptz not null default now(),
  new_count integer not null,
  sent boolean not null
);
create index search_alert_runs_search_idx on public.search_alert_runs (search_id, run_at desc);
alter table public.search_alert_runs enable row level security;

-- Prossimo lunedì alle 00:00 (ora di Roma): il cron notturno lo trova scaduto il lunedì mattina.
create or replace function public.next_alert_monday(p_now timestamptz)
returns timestamptz language sql stable set search_path = public as $$
  select (date_trunc('week', p_now at time zone 'Europe/Rome') + interval '7 days') at time zone 'Europe/Rome'
$$;

-- Attiva l'avviso: solo ricerche opportunità dell'organizzazione, non cancellate o archiviate, senza ripetizione
-- automatica (mai due automatismi sulla stessa ricerca). Le aziende disponibili adesso si segnano come già viste
-- (tutte: un tetto farebbe annunciare come nuove al primo lunedì quelle oltre il tetto).
create or replace function public.start_search_alert(p_org uuid, p_search uuid, p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_search searches%rowtype;
begin
  select * into v_search from searches
   where id = p_search and org_id = p_org and deleted_at is null and archived_at is null;
  if not found or cardinality(search_signal_codes(v_search.target)) = 0 or v_search.repeat <> 'none' then
    return false;
  end if;
  insert into search_alerts (search_id, org_id, user_id, next_run_at)
  values (p_search, p_org, p_user, next_alert_monday(now()))
  on conflict (search_id) do nothing;
  if not found then return true; end if;
  insert into search_alert_domains (search_id, domain)
  select p_search, p.domain
    from opportunity_pool(p_org, v_search.target, v_search.contacts_per_company, '{}') p
   where not is_platform_domain(p.domain) and not is_hosted_page(p.website, p.name) and not is_non_target_company(p.name)
  on conflict do nothing;
  return true;
end;
$$;

create or replace function public.stop_search_alert(p_org uuid, p_search uuid)
returns void language sql security definer set search_path = public as $$
  delete from search_alerts where search_id = p_search and org_id = p_org
$$;

-- Avvisi da eseguire: scaduti, ricerca ancora valida, organizzazione attiva. La ripetizione automatica
-- attivata dopo l'avviso lo rende inutile: quegli avvisi si saltano.
create or replace function public.due_search_alerts(p_limit integer)
returns table (search_id uuid, org_id uuid, user_id uuid, name text)
language sql stable security definer set search_path = public as $$
  select a.search_id, a.org_id, a.user_id, s.name
    from search_alerts a
    join searches s on s.id = a.search_id
    join organizations o on o.id = a.org_id
   where a.next_run_at <= now()
     and s.deleted_at is null and s.archived_at is null and s.repeat = 'none'
     and o.status = 'active'
     -- Chi è uscito dall'organizzazione non riceve più l'avviso (Code Reviewer, 21/10).
     and exists (select 1 from memberships m where m.org_id = a.org_id and m.user_id = a.user_id)
   order by a.next_run_at
   limit greatest(1, least(coalesce(p_limit, 50), 200))
$$;

-- Un giro: conta le aziende nuove (non consegnate, mai segnalate). Se sono almeno min_new le segna come segnalate.
-- Sposta sempre la scadenza al lunedì successivo e registra il giro. L'email la manda l'app se sent = true.
create or replace function public.run_search_alert(p_search uuid)
returns table (new_count integer, sent boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_alert search_alerts%rowtype;
  v_search searches%rowtype;
  v_domains text[];
  v_sent boolean := false;
begin
  -- Prima si sposta la scadenza (riga bloccata): un cron ripetuto non manda due email.
  select * into v_alert from search_alerts a where a.search_id = p_search and a.next_run_at <= now() for update;
  if not found then return; end if;
  update search_alerts a set next_run_at = next_alert_monday(now()), last_run_at = now() where a.search_id = p_search;
  -- Scadenza vecchia di più di un giorno (ricerca archiviata e ripristinata, organizzazione sospesa e riattivata):
  -- niente email fuori giorno, si riparte dal lunedì successivo (QA, 21/10).
  if v_alert.next_run_at < now() - interval '1 day' then return; end if;
  select * into v_search from searches where id = p_search;
  -- Tutte le aziende nuove (senza tetto: segnarne solo una parte le farebbe tornare «nuove» la settimana dopo).
  select coalesce(array_agg(x.domain), '{}') into v_domains
    from opportunity_pool(v_alert.org_id, v_search.target, v_search.contacts_per_company, '{}') x
   -- Stessi filtri della riserva (migrazione 050): si contano solo aziende consegnabili.
   where not is_platform_domain(x.domain) and not is_hosted_page(x.website, x.name) and not is_non_target_company(x.name)
     and not exists (select 1 from search_alert_domains d where d.search_id = p_search and d.domain = x.domain);
  if cardinality(v_domains) >= v_alert.min_new then
    insert into search_alert_domains (search_id, domain) select p_search, unnest(v_domains) on conflict do nothing;
    update search_alerts set last_sent_at = now() where search_alerts.search_id = p_search;
    v_sent := true;
  end if;
  insert into search_alert_runs (search_id, new_count, sent) values (p_search, cardinality(v_domains), v_sent);
  return query select cardinality(v_domains), v_sent;
end;
$$;

revoke all on function public.next_alert_monday(timestamptz) from public, anon, authenticated;
revoke all on function public.start_search_alert(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.stop_search_alert(uuid, uuid) from public, anon, authenticated;
revoke all on function public.due_search_alerts(integer) from public, anon, authenticated;
revoke all on function public.run_search_alert(uuid) from public, anon, authenticated;

-- Il server le chiama con la chiave di servizio (come le altre funzioni del cron).
grant execute on function public.start_search_alert(uuid, uuid, uuid), public.stop_search_alert(uuid, uuid),
  public.due_search_alerts(integer), public.run_search_alert(uuid) to service_role;
