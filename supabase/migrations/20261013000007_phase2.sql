-- Fase 2: verifica delle caselle, stato e note dei lead, liste, ricerche ricorrenti.

-- ---------------------------------------------------------------------------
-- Verifica delle caselle (MillionVerifier): costo unitario per i margini.
-- ---------------------------------------------------------------------------
insert into public.cost_rates (provider, unit, unit_cost_eur, description) values
  ('email_verifier', 'verifica', 0.0025, 'Verifica casella MillionVerifier (stima, verificare il piano)')
on conflict (provider) do nothing;

-- Risultati del motore: il giro viene bloccato per evitare doppie elaborazioni
-- quando n8n ritenta l'invio mentre il primo è ancora in corso.
create or replace function public.apply_engine_results(p_run uuid, p_token_hash text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_run search_runs%rowtype;
  v_search searches%rowtype;
  v_res jsonb;
begin
  select * into v_run from search_runs where id = p_run and run_token_hash = p_token_hash for update;
  if v_run.id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_token');
  end if;
  if v_run.status not in ('dispatched', 'running') then
    return jsonb_build_object('ok', false, 'reason', 'already_processed', 'search_id', v_run.search_id);
  end if;

  select * into v_search from searches where id = v_run.search_id for update;
  if v_search.status not in ('queued', 'running') then
    update search_runs set status = 'completed', finished_at = now(), stats = p_payload -> 'stats', usage = p_payload -> 'usage'
     where id = p_run;
    return jsonb_build_object('ok', false, 'reason', 'search_closed', 'search_id', v_search.id);
  end if;

  v_res := deliver_leads(v_search.id, p_run, p_payload -> 'leads', 'engine');

  update search_runs
     set status = 'completed', finished_at = now(), last_event_at = now(),
         stats = p_payload -> 'stats', usage = p_payload -> 'usage',
         n8n_execution_id = p_payload ->> 'n8n_execution_id'
   where id = p_run;

  insert into run_costs (run_id, provider, units, unit_cost_eur, total_eur)
  select p_run, r.provider, u.units, r.unit_cost_eur, round(u.units * r.unit_cost_eur, 4)
    from (values
      ('openai_search_lot', coalesce((p_payload #>> '{usage,ai_search_calls}')::numeric, 0)),
      ('openai_planner', coalesce((p_payload #>> '{usage,ai_planner_calls}')::numeric, 0)),
      ('rocketreach_lookup', coalesce((p_payload #>> '{usage,enrichment_lookups}')::numeric, 0)),
      ('page_fetch', coalesce((p_payload #>> '{usage,pages_fetched}')::numeric, 0))
    ) as u (provider, units)
    join cost_rates r on r.provider = u.provider
   where u.units > 0;

  insert into search_events (search_id, run_id, stage, message, counters)
  values (v_search.id, p_run, 'delivered',
          (v_res ->> 'new') || ' nuovi lead consegnati'
          || case when coalesce((p_payload #>> '{stats,mailbox_rejected}')::int, 0) > 0
                  then ' (' || (p_payload #>> '{stats,mailbox_rejected}') || ' scartati: casella inesistente)' else '' end,
          jsonb_build_object('new', (v_res ->> 'new')::int, 'delivered', (v_res ->> 'delivered')::int,
                             'quantity', v_search.quantity,
                             'duplicates', (v_res #>> '{skipped,duplicates}')::int,
                             'suppressed', (v_res #>> '{skipped,suppressed}')::int,
                             'mailbox_rejected', coalesce((p_payload #>> '{stats,mailbox_rejected}')::int, 0)));

  return v_res || jsonb_build_object(
    'ok', true, 'search_id', v_search.id, 'org_id', v_search.org_id,
    'remaining', v_search.quantity - (v_res ->> 'delivered')::int, 'attempts', v_search.attempts,
    'credits_reserved', v_search.credits_reserved);
end;
$$;

-- ---------------------------------------------------------------------------
-- Stato del contatto, note e liste (scritture solo dal server).
-- ---------------------------------------------------------------------------
alter table public.deliveries
  add column if not exists stage text not null default 'new'
    check (stage in ('new', 'contacted', 'replied', 'meeting', 'won', 'lost')),
  add column if not exists notes text not null default '' check (length(notes) <= 2000),
  add column if not exists stage_changed_at timestamptz;
create index if not exists deliveries_org_stage_idx on public.deliveries (org_id, stage);

create table if not exists public.lead_lists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists public.lead_list_items (
  list_id uuid not null references public.lead_lists (id) on delete cascade,
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, delivery_id)
);
create index if not exists lead_list_items_delivery_idx on public.lead_list_items (delivery_id);

alter table public.lead_lists enable row level security;
alter table public.lead_list_items enable row level security;
drop policy if exists "le mie liste" on public.lead_lists;
create policy "le mie liste" on public.lead_lists for select to authenticated using (public.is_org_member(org_id));
drop policy if exists "i lead delle mie liste" on public.lead_list_items;
create policy "i lead delle mie liste" on public.lead_list_items for select to authenticated
  using (exists (select 1 from public.lead_lists l where l.id = list_id and public.is_org_member(l.org_id)));

-- ---------------------------------------------------------------------------
-- Ricerche ricorrenti: la ricerca "madre" porta la cadenza; ogni ripetizione
-- è una ricerca nuova (repeat_of) che esclude i contatti già consegnati.
-- ---------------------------------------------------------------------------
alter table public.searches
  add column if not exists repeat text not null default 'none' check (repeat in ('none', 'weekly', 'monthly')),
  add column if not exists next_repeat_at timestamptz,
  add column if not exists repeat_of uuid references public.searches (id) on delete set null;
create index if not exists searches_repeat_idx on public.searches (next_repeat_at) where repeat <> 'none';
