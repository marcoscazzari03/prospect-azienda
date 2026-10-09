-- Scadenza dei crediti.
-- Ogni accredito con data di scadenza (benvenuto, pacchetti, abbonamenti) è un
-- "lotto". Il consumo viene assegnato ai lotti in ordine di scadenza (prima
-- quelli che scadono prima: il più favorevole per il cliente); gli accrediti
-- senza scadenza (es. regali dell'admin) si consumano per ultimi.
-- Alla scadenza, la parte non consumata di un lotto viene tolta con un
-- movimento 'expire' (uno solo per lotto, idempotente).

create or replace function public.credit_lots(p_org uuid)
returns table (lot_id bigint, kind text, expires_at timestamptz, granted integer, remaining integer, expired integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_used integer;
  v_lot record;
  v_take integer;
  v_capacity integer;
begin
  -- Consumo netto: riserve e rettifiche negative, meno restituzioni e rimborsi.
  -- Le scadenze già registrate non contano come consumo.
  select coalesce(-sum(l.delta), 0)::integer into v_used
    from credit_ledger l
   where l.org_id = p_org
     and l.kind not in ('grant', 'purchase', 'subscription', 'expire')
     and not (l.kind = 'adjust' and l.delta > 0);
  v_used := greatest(v_used, 0);

  for v_lot in
    select l.id, l.kind, l.expires_at, l.delta,
           coalesce((select -e.delta from credit_ledger e where e.external_ref = 'expire:' || l.id), 0)::integer as gone
      from credit_ledger l
     where l.org_id = p_org
       and l.delta > 0
       and (l.kind in ('grant', 'purchase', 'subscription') or l.kind = 'adjust')
     order by coalesce(l.expires_at, 'infinity'::timestamptz), l.id
  loop
    v_capacity := v_lot.delta - v_lot.gone;
    v_take := least(v_used, v_capacity);
    v_used := v_used - v_take;
    lot_id := v_lot.id;
    kind := v_lot.kind;
    expires_at := v_lot.expires_at;
    granted := v_lot.delta;
    remaining := v_capacity - v_take;
    expired := v_lot.gone;
    return next;
  end loop;
end;
$$;

-- Registra le scadenze maturate. Restituisce il numero di crediti tolti.
create or replace function public.expire_credits(p_org uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_lot record;
  v_available integer;
  v_amount integer;
  v_total integer := 0;
begin
  for v_org in
    select distinct l.org_id
      from credit_ledger l
     where l.expires_at <= now()
       and l.delta > 0
       and (p_org is null or l.org_id = p_org)
       and not exists (select 1 from credit_ledger e where e.external_ref = 'expire:' || l.id)
  loop
    perform pg_advisory_xact_lock(hashtext(v_org::text));
    for v_lot in
      select * from credit_lots(v_org) c
       where c.expires_at <= now() and c.remaining > 0 and c.expired = 0
       order by c.expires_at, c.lot_id
    loop
      v_available := org_available_credits(v_org);
      v_amount := least(v_lot.remaining, greatest(v_available, 0));
      if v_amount > 0 then
        insert into credit_ledger (org_id, delta, kind, description, external_ref)
        values (v_org, -v_amount, 'expire',
                'Crediti scaduti il ' || to_char(v_lot.expires_at at time zone 'Europe/Rome', 'DD/MM/YYYY'),
                'expire:' || v_lot.lot_id)
        on conflict (external_ref) where external_ref is not null do nothing;
        if found then v_total := v_total + v_amount; end if;
      end if;
    end loop;
  end loop;
  return v_total;
end;
$$;

revoke execute on function public.credit_lots(uuid), public.expire_credits(uuid) from public, anon, authenticated;
grant execute on function public.credit_lots(uuid), public.expire_credits(uuid) to service_role;
