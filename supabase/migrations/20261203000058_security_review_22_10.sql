-- Ripasso di sicurezza del 22/10 (punti 70–71 della checklist).
--
-- 1) rate_hit conta e registra sotto un lock per chiave: due richieste partite insieme non vedono più lo stesso
--    conteggio e non superano il tetto (prima i limiti si superavano inviando i tentativi in parallelo).
-- 2) Tabelle dell'avviso settimanale (056) senza i permessi predefiniti per anon/authenticated, come le altre tabelle
--    solo del server (046); search_alerts sotto la regola della verifica in due passaggi (044).
--
-- Come tornare indietro: rieseguire la definizione di rate_hit della 046; i revoke e la policy non tolgono nulla
-- all'app (che legge search_alerts con la sessione dell'utente e le altre due tabelle solo dal server).

create or replace function public.rate_hit(p_key text, p_kind text, p_window interval, p_max integer, p_record boolean default true)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('rate_hit:' || p_kind || ':' || p_key));
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

revoke all on public.search_alert_domains, public.search_alert_runs from anon, authenticated;

drop policy if exists "verifica in due passaggi" on public.search_alerts;
create policy "verifica in due passaggi" on public.search_alerts as restrictive for all to authenticated using (public.mfa_ok());
