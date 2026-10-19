-- Archiviazione ed eliminazione di lead e ricerche da parte del cliente (19/10).
--
-- Archiviare nasconde dalle viste principali e si annulla con «Ripristina». Archiviare una
-- ricerca archivia anche i suoi lead (stesso istante: il ripristino li riporta tutti).
-- Eliminare è definitivo per il cliente: il lead sparisce da pagine ed export e i suoi dati
-- vengono cancellati, ma resta la chiave (azienda/dominio) perché la stessa azienda non gli
-- venga riproposta e addebitata di nuovo. I crediti già usati non tornano.

alter table public.deliveries
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;
alter table public.searches
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;
create index if not exists deliveries_visible_idx on public.deliveries (org_id, delivered_at desc) where deleted_at is null;

-- Elimina i lead indicati (solo dell'organizzazione): dati cancellati, chiave conservata.
create or replace function public.forget_deliveries(p_org uuid, p_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_rows integer;
begin
  delete from lead_list_items li using deliveries d
   where li.delivery_id = d.id and d.org_id = p_org and d.id = any (p_ids);
  update deliveries d
     set deleted_at = now(),
         data = jsonb_build_object('company', jsonb_build_object('domain', d.company_domain)),
         email_address = '', notes = '', person_id = null, email_id = null
   where d.org_id = p_org and d.id = any (p_ids) and d.deleted_at is null;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
revoke all on function public.forget_deliveries(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.forget_deliveries(uuid, uuid[]) to service_role;

-- Elimina una ricerca conclusa e i suoi lead. Le ricerche in corso non si eliminano.
create or replace function public.forget_search(p_org uuid, p_search uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_search searches%rowtype;
begin
  select * into v_search from searches where id = p_search and org_id = p_org and deleted_at is null for update;
  if v_search.id is null then return 0; end if;
  if v_search.status in ('queued', 'running') then raise exception 'SEARCH_RUNNING'; end if;
  perform forget_deliveries(p_org, array(select id from deliveries where search_id = p_search and org_id = p_org));
  update searches set deleted_at = now(), repeat = 'none', next_repeat_at = null where id = p_search;
  return 1;
end;
$$;
revoke all on function public.forget_search(uuid, uuid) from public, anon, authenticated;
grant execute on function public.forget_search(uuid, uuid) to service_role;

-- Archivia o ripristina una ricerca insieme ai suoi lead.
create or replace function public.archive_search(p_org uuid, p_search uuid, p_archive boolean)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_search searches%rowtype;
  v_now timestamptz := now();
begin
  select * into v_search from searches where id = p_search and org_id = p_org and deleted_at is null for update;
  if v_search.id is null then return 0; end if;
  if p_archive then
    if v_search.archived_at is not null then return 0; end if;
    update searches set archived_at = v_now, repeat = 'none', next_repeat_at = null where id = p_search;
    update deliveries set archived_at = v_now where search_id = p_search and org_id = p_org and archived_at is null;
  else
    update deliveries set archived_at = null where search_id = p_search and org_id = p_org and archived_at = v_search.archived_at;
    update searches set archived_at = null where id = p_search;
  end if;
  return 1;
end;
$$;
revoke all on function public.archive_search(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.archive_search(uuid, uuid, boolean) to service_role;
