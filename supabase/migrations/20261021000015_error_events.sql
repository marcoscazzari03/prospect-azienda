-- Fase 3 (monitoraggio): errori del server registrati e segnalati all'admin via email.
create table if not exists public.error_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  signature text not null,      -- raggruppa lo stesso errore (messaggio + rotta)
  source text not null,         -- render, route, action, proxy, stripe, cron...
  route text not null default '',
  message text not null,
  digest text,
  emailed boolean not null default false
);
create index if not exists error_events_sig_idx on public.error_events (signature, at desc);
create index if not exists error_events_at_idx on public.error_events (at desc);
-- Solo il server (service role) legge e scrive.
alter table public.error_events enable row level security;
