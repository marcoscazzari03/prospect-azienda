-- V7: il tetto dei rimborsi automatici (es. 10% dei lead di una ricerca) viene
-- controllato e applicato in un'unica transazione, con blocco sulla ricerca:
-- segnalazioni inviate in parallelo non possono più superarlo.
create or replace function public.auto_refund_report(p_report uuid, p_max_share numeric)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_search uuid;
  v_delivered integer;
  v_refunded integer;
begin
  select d.search_id into v_search
    from lead_reports r join deliveries d on d.id = r.delivery_id
   where r.id = p_report and r.status = 'open';
  if v_search is null then return false; end if;

  perform 1 from searches where id = v_search for update;

  select count(*) into v_delivered from deliveries where search_id = v_search;
  select count(*) into v_refunded
    from lead_reports r join deliveries d on d.id = r.delivery_id
   where d.search_id = v_search and r.status = 'refunded';

  if v_refunded >= greatest(1, floor(v_delivered * p_max_share)) then return false; end if;

  perform refund_report(p_report, true);
  return true;
end;
$$;

revoke execute on function public.auto_refund_report(uuid, numeric) from public, anon, authenticated;
grant execute on function public.auto_refund_report(uuid, numeric) to service_role;
