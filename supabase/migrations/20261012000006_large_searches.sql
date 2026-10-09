-- Ricerche grandi e protezione della quota di arricchimento (RocketReach).
-- - app_settings: impostazioni modificabili dall'admin (es. budget mensile).
-- - search_runs.enrichment_cap: verifiche concesse a ogni giro, per contare
--   anche quelle dei giri ancora in corso.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.app_settings enable row level security; -- nessuna policy: solo il server

insert into public.app_settings (key, value) values ('enrichment_monthly_budget', '900')
on conflict (key) do nothing;

alter table public.search_runs add column if not exists enrichment_cap integer not null default 0;

-- Verifiche già usate: dalla ricerca (tutti i giri) e nel mese corrente
-- (giri conclusi + tetti dei giri ancora in corso), e budget mensile.
create or replace function public.enrichment_usage(p_search uuid)
returns table (search_used integer, month_used integer, month_budget integer)
language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(c.units) from run_costs c join search_runs r on r.id = c.run_id
               where r.search_id = p_search and c.provider = 'rocketreach_lookup'), 0)::integer,
    (coalesce((select sum(c.units) from run_costs c
                where c.provider = 'rocketreach_lookup'
                  and c.created_at >= date_trunc('month', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome'), 0)
     + coalesce((select sum(r.enrichment_cap) from search_runs r where r.status in ('dispatched', 'running')), 0))::integer,
    -- null = nessun limite mensile; 0 = verifiche a pagamento spente.
    (select (value #>> '{}')::integer from app_settings where key = 'enrichment_monthly_budget')
$$;

revoke execute on function public.enrichment_usage(uuid) from public, anon, authenticated;
grant execute on function public.enrichment_usage(uuid) to service_role;
