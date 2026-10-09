-- Schema della piattaforma di lead generation.
-- Regola generale: i client (browser) LEGGONO solo i dati della propria
-- organizzazione tramite RLS; tutte le SCRITTURE passano dalle API del server
-- (service role) e, per soldi e crediti, da funzioni SQL transazionali.

-- ---------------------------------------------------------------------------
-- Catalogo: piani, prezzi in crediti, modalità email, costi unitari
-- ---------------------------------------------------------------------------

create table public.plans (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('free', 'pack', 'subscription', 'enterprise')),
  price_cents integer not null default 0,
  currency text not null default 'eur',
  credits integer not null default 0,
  credits_valid_months integer not null default 12,
  max_users integer not null default 1,
  max_active_searches integer not null default 1,
  max_quantity_per_search integer not null default 50,
  enrichment_per_run_max integer not null default 0,
  features jsonb not null default '[]'::jsonb,
  highlighted boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0
);

create table public.email_modes (
  mode text primary key check (mode in ('generic_ok', 'mixed', 'personal_only')),
  label text not null,
  description text not null,
  max_credits integer not null check (max_credits > 0),
  sort integer not null default 0
);

-- Crediti per lead in base all'email consegnata (tipo + stato).
create table public.credit_prices (
  email_type text not null check (email_type in ('generic', 'personal')),
  email_status text not null check (email_status in ('found_public', 'validated', 'unverified')),
  credits integer not null check (credits >= 0),
  primary key (email_type, email_status)
);

-- Costi unitari stimati dei fornitori, modificabili dall'admin (per i margini).
create table public.cost_rates (
  provider text primary key,
  unit text not null,
  unit_cost_eur numeric(12, 5) not null,
  description text not null default ''
);

-- ---------------------------------------------------------------------------
-- Utenti e organizzazioni
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'IT',
  vat_id text,
  plan_id text not null default 'free' references public.plans (id),
  stripe_customer_id text unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------------
-- Crediti: registro append-only. Saldo disponibile = somma dei delta.
-- ---------------------------------------------------------------------------

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  delta integer not null,
  kind text not null check (kind in ('grant', 'purchase', 'subscription', 'reserve', 'release', 'refund', 'adjust', 'expire')),
  description text not null default '',
  search_id uuid,
  external_ref text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index credit_ledger_org_idx on public.credit_ledger (org_id, created_at desc);
-- Idempotenza degli accrediti da Stripe e degli altri eventi esterni.
create unique index credit_ledger_external_ref_idx on public.credit_ledger (external_ref) where external_ref is not null;

-- ---------------------------------------------------------------------------
-- Ricerche
-- ---------------------------------------------------------------------------

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  name text not null,
  target jsonb not null,
  email_mode text not null references public.email_modes (mode),
  quantity integer not null check (quantity between 1 and 1000),
  contacts_per_company integer not null default 1 check (contacts_per_company between 1 and 3),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  delivered integer not null default 0,
  credits_reserved integer not null default 0,
  credits_charged integer not null default 0,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  check (credits_charged <= credits_reserved),
  check (delivered <= quantity)
);
create index searches_org_idx on public.searches (org_id, created_at desc);
create index searches_status_idx on public.searches (status) where status in ('queued', 'running');

create table public.search_runs (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.searches (id) on delete cascade,
  attempt integer not null,
  run_token_hash text not null,
  requested integer not null,
  status text not null default 'dispatched'
    check (status in ('dispatched', 'running', 'completed', 'failed', 'dispatch_failed')),
  stats jsonb,
  usage jsonb,
  n8n_execution_id text,
  error text,
  created_at timestamptz not null default now(),
  last_event_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (search_id, attempt)
);
create index search_runs_open_idx on public.search_runs (last_event_at) where status in ('dispatched', 'running');

create table public.search_events (
  id bigint generated always as identity primary key,
  search_id uuid not null references public.searches (id) on delete cascade,
  run_id uuid references public.search_runs (id) on delete cascade,
  stage text not null,
  message text not null default '',
  counters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index search_events_search_idx on public.search_events (search_id, created_at);

create table public.run_costs (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.search_runs (id) on delete cascade,
  provider text not null,
  units numeric(12, 2) not null,
  unit_cost_eur numeric(12, 5) not null,
  total_eur numeric(12, 4) not null,
  created_at timestamptz not null default now()
);
create index run_costs_created_idx on public.run_costs (created_at);

-- ---------------------------------------------------------------------------
-- Magazzino dei lead (mai leggibile dai clienti)
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  name text not null,
  website text not null,
  country text not null default '',
  city text not null default '',
  industry text not null default '',
  size_hint text not null default '',
  first_seen_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  person_key text not null unique,
  full_name text not null,
  first_name text not null default '',
  last_name text not null default '',
  job_title text not null default '',
  linkedin_url text not null default '',
  discovery_url text not null default '',
  first_seen_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now()
);

create table public.emails (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  address text not null unique,
  type text not null check (type in ('generic', 'personal')),
  status text not null check (status in ('found_public', 'validated', 'unverified')),
  source text not null check (source in ('website', 'enrichment')),
  source_url text not null default '',
  bounce_reports integer not null default 0,
  first_seen_at timestamptz not null default now(),
  verified_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Consegne: ciò che il cliente ha acquistato (copia immutabile)
-- ---------------------------------------------------------------------------

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  search_id uuid not null references public.searches (id) on delete cascade,
  run_id uuid references public.search_runs (id) on delete set null,
  person_id uuid references public.people (id) on delete set null,
  email_id uuid references public.emails (id) on delete set null,
  person_key text not null,
  company_domain text not null,
  data jsonb not null,
  email_address text not null,
  email_type text not null,
  email_status text not null,
  credits integer not null check (credits >= 0),
  quality_score integer not null default 0,
  delivered_at timestamptz not null default now(),
  -- Mai lo stesso contatto due volte allo stesso cliente.
  unique (org_id, person_key)
);
create index deliveries_org_idx on public.deliveries (org_id, delivered_at desc);
create index deliveries_search_idx on public.deliveries (search_id);

create table public.lead_reports (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  reason text not null check (reason in ('bounce', 'wrong_role', 'company_closed', 'out_of_target', 'duplicate', 'other')),
  note text not null default '',
  status text not null default 'open' check (status in ('open', 'refunded', 'rejected')),
  refund_credits integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  unique (delivery_id)
);

create table public.exports (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  format text not null,
  rows integer not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pagamenti
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  plan_id text references public.plans (id),
  kind text not null check (kind in ('pack', 'subscription')),
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null,
  stripe_ref text not null unique,
  invoice_url text,
  created_at timestamptz not null default now()
);
create index payments_org_idx on public.payments (org_id, created_at desc);

create table public.subscriptions (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  stripe_subscription_id text not null unique,
  plan_id text not null references public.plans (id),
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- GDPR, supporto, audit
-- ---------------------------------------------------------------------------

create table public.suppression_list (
  id bigint generated always as identity primary key,
  email_hash text unique,
  domain_hash text unique,
  reason text not null default 'opt_out',
  created_at timestamptz not null default now(),
  check (email_hash is not null or domain_hash is not null)
);

create table public.optout_requests (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  token_hash text not null unique,
  whole_domain boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  search_id uuid references public.searches (id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
