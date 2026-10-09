-- Row Level Security: ogni cliente vede solo la propria organizzazione.
-- Nessuna policy di scrittura per i client: le scritture passano dal server.

alter table public.plans enable row level security;
alter table public.email_modes enable row level security;
alter table public.credit_prices enable row level security;
alter table public.cost_rates enable row level security;
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.searches enable row level security;
alter table public.search_runs enable row level security;
alter table public.search_events enable row level security;
alter table public.run_costs enable row level security;
alter table public.companies enable row level security;
alter table public.people enable row level security;
alter table public.emails enable row level security;
alter table public.deliveries enable row level security;
alter table public.lead_reports enable row level security;
alter table public.exports enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.suppression_list enable row level security;
alter table public.optout_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_log enable row level security;

-- Catalogo pubblico (prezzi visibili anche senza login)
create policy "catalogo leggibile" on public.plans for select to anon, authenticated using (active);
create policy "modalita leggibili" on public.email_modes for select to anon, authenticated using (true);
create policy "prezzi crediti leggibili" on public.credit_prices for select to anon, authenticated using (true);

-- Dati personali e dell'organizzazione
create policy "il mio profilo" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "le mie organizzazioni" on public.organizations for select to authenticated using (public.is_org_member(id));
create policy "membri della mia organizzazione" on public.memberships for select to authenticated using (public.is_org_member(org_id));
create policy "i miei movimenti" on public.credit_ledger for select to authenticated using (public.is_org_member(org_id));
create policy "le mie ricerche" on public.searches for select to authenticated using (public.is_org_member(org_id));
create policy "eventi delle mie ricerche" on public.search_events for select to authenticated
  using (exists (select 1 from public.searches s where s.id = search_id and public.is_org_member(s.org_id)));
create policy "i miei lead" on public.deliveries for select to authenticated using (public.is_org_member(org_id));
create policy "le mie segnalazioni" on public.lead_reports for select to authenticated using (public.is_org_member(org_id));
create policy "i miei export" on public.exports for select to authenticated using (public.is_org_member(org_id));
create policy "i miei pagamenti" on public.payments for select to authenticated using (public.is_org_member(org_id));
create policy "il mio abbonamento" on public.subscriptions for select to authenticated using (public.is_org_member(org_id));
create policy "i miei ticket" on public.support_tickets for select to authenticated using (public.is_org_member(org_id));
-- search_runs (contiene l'hash del token), magazzino, costi, opposizioni,
-- eventi Stripe e audit: nessuna policy => accessibili solo al service role.

-- Saldo crediti calcolato con i permessi di chi legge (RLS del registro).
create view public.org_balances with (security_invoker = true) as
  select org_id, coalesce(sum(delta), 0)::integer as available
    from public.credit_ledger
   group by org_id;

-- ---------------------------------------------------------------------------
-- Catalogo iniziale (modificabile dal pannello admin)
-- ---------------------------------------------------------------------------

insert into public.email_modes (mode, label, description, max_credits, sort) values
  ('generic_ok', 'Email generiche incluse',
   'Nominative quando le troviamo, altrimenti email aziendali come info@ o sales@ riconducibili all''azienda.', 2, 1),
  ('mixed', 'Mista',
   'Cerchiamo prima email nominative (anche con arricchimento verificato), poi accettiamo le generiche.', 3, 2),
  ('personal_only', 'Solo nominative',
   'Solo email riferibili alla persona, trovate sul sito ufficiale o verificate tecnicamente.', 3, 3);

insert into public.credit_prices (email_type, email_status, credits) values
  ('generic', 'found_public', 1),
  ('generic', 'validated', 1),
  ('generic', 'unverified', 1),
  ('personal', 'found_public', 2),
  ('personal', 'validated', 3),
  ('personal', 'unverified', 2);

insert into public.plans
  (id, name, kind, price_cents, credits, credits_valid_months, max_users, max_active_searches, max_quantity_per_search, enrichment_per_run_max, features, highlighted, sort)
values
  ('free', 'Gratis', 'free', 0, 15, 12, 1, 1, 10, 3,
   '["15 crediti di prova", "1 ricerca alla volta", "Export CSV"]', false, 0),
  ('pack_100', 'Pacchetto 100', 'pack', 4900, 100, 12, 1, 2, 100, 40,
   '["100 crediti validi 12 mesi", "Export CSV"]', false, 10),
  ('pack_500', 'Pacchetto 500', 'pack', 19900, 500, 12, 1, 3, 250, 120,
   '["500 crediti validi 12 mesi", "Export CSV"]', false, 11),
  ('pack_2000', 'Pacchetto 2.000', 'pack', 69000, 2000, 12, 1, 3, 500, 250,
   '["2.000 crediti validi 12 mesi", "Export CSV"]', false, 12),
  ('starter', 'Starter', 'subscription', 4900, 150, 2, 1, 2, 150, 60,
   '["150 crediti al mese", "Crediti non usati validi un mese in più", "Fino a 150 lead per ricerca", "2 ricerche in parallelo"]', false, 20),
  ('growth', 'Growth', 'subscription', 14900, 600, 2, 3, 5, 500, 200,
   '["600 crediti al mese", "Fino a 500 lead per ricerca", "5 ricerche in parallelo", "Più verifiche delle email nominative"]', true, 21),
  ('scale', 'Scale', 'subscription', 39900, 2000, 2, 10, 10, 1000, 500,
   '["2.000 crediti al mese", "Fino a 1.000 lead per ricerca", "10 ricerche in parallelo", "Supporto prioritario"]', false, 22);

insert into public.cost_rates (provider, unit, unit_cost_eur, description) values
  ('openai_search_lot', 'lotto di ricerca', 0.12, 'Agent OpenAI con web search, ~20 candidati'),
  ('openai_planner', 'chiamata', 0.01, 'Pianificazione dei lotti'),
  ('rocketreach_lookup', 'lookup', 0.45, 'Ricerca persona RocketReach (stima, verificare il piano)'),
  ('page_fetch', 'pagina', 0.0002, 'Download pagine dei siti (infrastruttura n8n)');
