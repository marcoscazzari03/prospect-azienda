-- Verifica in due passaggi (2FA, app di autenticazione), facoltativa per gli utenti (19/10).
--
-- Chi la attiva deve completarla a ogni accesso: l'app lo chiede subito dopo la password e il
-- proxy non apre l'area riservata finché la sessione non è al livello «aal2». Qui la stessa
-- regola vale anche per le letture dirette dal database: con un fattore verificato e una
-- sessione solo con password (aal1) le tabelle del cliente non restituiscono nulla.

create or replace function public.mfa_ok()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$$;
revoke all on function public.mfa_ok() from public, anon;
grant execute on function public.mfa_ok() to authenticated, service_role;

do $$
declare
  t text;
begin
  foreach t in array array['credit_ledger', 'deliveries', 'exports', 'lead_list_items', 'lead_lists', 'lead_reports',
                           'memberships', 'organizations', 'payments', 'profiles', 'search_events', 'searches',
                           'subscriptions', 'support_tickets'] loop
    execute format('drop policy if exists "verifica in due passaggi" on public.%I', t);
    execute format('create policy "verifica in due passaggi" on public.%I as restrictive for all to authenticated using (public.mfa_ok())', t);
  end loop;
end $$;
