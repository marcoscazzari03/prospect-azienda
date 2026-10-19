-- Ripasso di sicurezza del 19/10.
-- 1) Limiti di frequenza generici (codice della verifica in due passaggi, contatore del wizard):
--    un evento per chiave e tipo; rate_hit conta quelli nella finestra e registra il nuovo.
-- 2) Eliminazione dei lead: anche la chiave del lead (con il nome, per i lead nominativi) e la nota
--    della segnalazione non restano leggibili.
-- 3) Tabelle solo del server senza i permessi predefiniti per anon/authenticated.

create table if not exists public.rate_events (
  id bigint generated always as identity primary key,
  key text not null,
  kind text not null,
  at timestamptz not null default now()
);
create index if not exists rate_events_key_idx on public.rate_events (kind, key, at desc);
alter table public.rate_events enable row level security; -- nessuna policy: solo il server
revoke all on public.rate_events from public, anon, authenticated;

-- true se c'è ancora posto: meno di p_max eventi nella finestra. p_record = false conta senza registrare.
create or replace function public.rate_hit(p_key text, p_kind text, p_window interval, p_max integer, p_record boolean default true)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  -- Pulizia leggera: gli eventi di questa chiave oltre il giorno non servono più.
  delete from rate_events where kind = p_kind and key = p_key and at < now() - greatest(p_window, interval '1 day');
  select count(*) into v_count from rate_events where kind = p_kind and key = p_key and at > now() - p_window;
  if v_count >= p_max then return false; end if;
  if p_record then insert into rate_events (key, kind) values (p_key, p_kind); end if;
  return true;
end;
$$;
revoke all on function public.rate_hit(text, text, interval, integer, boolean) from public, anon, authenticated;
grant execute on function public.rate_hit(text, text, interval, integer, boolean) to service_role;

create or replace function public.forget_deliveries(p_org uuid, p_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_rows integer;
begin
  delete from lead_list_items li using deliveries d
   where li.delivery_id = d.id and d.org_id = p_org and d.id = any (p_ids);
  -- La chiave dell'azienda («|dominio») resta: il lead non viene riproposto né riaddebitato.
  -- Quella con il nome della persona diventa un'impronta non leggibile.
  -- (Con i referenti spenti non succede; se si riaccendono, la stessa persona eliminata potrebbe
  -- essere riproposta allo stesso cliente: accettato, l'eliminazione vale di più.)
  update deliveries d
     set deleted_at = now(),
         data = jsonb_build_object('company', jsonb_build_object('domain', d.company_domain)),
         email_address = '', notes = '', person_id = null, email_id = null,
         person_key = case when left(d.person_key, 1) = '|' then d.person_key else 'del:' || sha256_hex(d.person_key) end
   where d.org_id = p_org and d.id = any (p_ids) and d.deleted_at is null;
  get diagnostics v_rows = row_count;
  update lead_reports r set note = ''
    from deliveries d
   where r.delivery_id = d.id and d.org_id = p_org and d.id = any (p_ids);
  return v_rows;
end;
$$;
revoke all on function public.forget_deliveries(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.forget_deliveries(uuid, uuid[]) to service_role;

-- Lead già eliminati prima di questa migrazione.
update deliveries set person_key = 'del:' || sha256_hex(person_key)
 where deleted_at is not null and left(person_key, 1) <> '|' and left(person_key, 4) <> 'del:';
update lead_reports r set note = '' from deliveries d where r.delivery_id = d.id and d.deleted_at is not null;

revoke all on public.it_provinces from anon, authenticated;
revoke all on public.large_companies from anon, authenticated;
