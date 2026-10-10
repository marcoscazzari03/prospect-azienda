-- Arricchimento email: Icypeas al posto di RocketReach.
-- Il costo è per email trovata (Icypeas scala un credito solo quando trova).
-- Il fornitore diventa generico ('email_finder') così un cambio futuro non
-- richiede di toccare il database.

update public.cost_rates
   set provider = 'email_finder', unit = 'email trovata', unit_cost_eur = 0.017,
       description = 'Email nominativa trovata da Icypeas (piano Basic ~19 $ / 1.000)'
 where provider = 'rocketreach_lookup';
insert into public.cost_rates (provider, unit, unit_cost_eur, description)
values ('email_finder', 'email trovata', 0.017, 'Email nominativa trovata da Icypeas (piano Basic ~19 $ / 1.000)')
on conflict (provider) do nothing;
-- Lo storico resta col costo di allora, sotto il nuovo nome.
update public.run_costs set provider = 'email_finder' where provider = 'rocketreach_lookup';

create or replace function public.enrichment_usage(p_search uuid)
returns table (search_used integer, month_used integer, month_budget integer)
language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(c.units) from run_costs c join search_runs r on r.id = c.run_id
               where r.search_id = p_search and c.provider = 'email_finder'), 0)::integer,
    (coalesce((select sum(c.units) from run_costs c
                where c.provider = 'email_finder'
                  and c.created_at >= date_trunc('month', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome'), 0)
     + coalesce((select sum(r.enrichment_cap) from search_runs r where r.status in ('dispatched', 'running')), 0))::integer,
    -- null = nessun limite mensile; 0 = arricchimento a pagamento spento.
    (select (value #>> '{}')::integer from app_settings where key = 'enrichment_monthly_budget')
$$;

create or replace function public.apply_engine_results(p_run uuid, p_token_hash text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_run search_runs%rowtype;
  v_search searches%rowtype;
  v_res jsonb;
begin
  select * into v_run from search_runs where id = p_run and run_token_hash = p_token_hash for update;
  if v_run.id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_token');
  end if;
  if v_run.status not in ('dispatched', 'running') then
    return jsonb_build_object('ok', false, 'reason', 'already_processed', 'search_id', v_run.search_id);
  end if;

  select * into v_search from searches where id = v_run.search_id for update;
  if v_search.status not in ('queued', 'running') then
    update search_runs set status = 'completed', finished_at = now(), stats = p_payload -> 'stats', usage = p_payload -> 'usage'
     where id = p_run;
    return jsonb_build_object('ok', false, 'reason', 'search_closed', 'search_id', v_search.id);
  end if;

  v_res := deliver_leads(v_search.id, p_run, p_payload -> 'leads', 'engine');

  update search_runs
     set status = 'completed', finished_at = now(), last_event_at = now(),
         stats = p_payload -> 'stats', usage = p_payload -> 'usage',
         n8n_execution_id = p_payload ->> 'n8n_execution_id'
   where id = p_run;

  insert into run_costs (run_id, provider, units, unit_cost_eur, total_eur)
  select p_run, r.provider, u.units, r.unit_cost_eur, round(u.units * r.unit_cost_eur, 4)
    from (values
      ('openai_search_lot', coalesce((p_payload #>> '{usage,ai_search_calls}')::numeric, 0)),
      ('openai_planner', coalesce((p_payload #>> '{usage,ai_planner_calls}')::numeric, 0)),
      ('email_finder', coalesce((p_payload #>> '{usage,enrichment_lookups}')::numeric, 0)),
      ('page_fetch', coalesce((p_payload #>> '{usage,pages_fetched}')::numeric, 0))
    ) as u (provider, units)
    join cost_rates r on r.provider = u.provider
   where u.units > 0;

  insert into search_events (search_id, run_id, stage, message, counters)
  values (v_search.id, p_run, 'delivered',
          (v_res ->> 'new') || ' nuovi lead consegnati'
          || case when coalesce((p_payload #>> '{stats,mailbox_rejected}')::int, 0) > 0
                  then ' (' || (p_payload #>> '{stats,mailbox_rejected}') || ' scartati: casella inesistente)' else '' end,
          jsonb_build_object('new', (v_res ->> 'new')::int, 'delivered', (v_res ->> 'delivered')::int,
                             'quantity', v_search.quantity,
                             'duplicates', (v_res #>> '{skipped,duplicates}')::int,
                             'suppressed', (v_res #>> '{skipped,suppressed}')::int,
                             'mailbox_rejected', coalesce((p_payload #>> '{stats,mailbox_rejected}')::int, 0)));

  return v_res || jsonb_build_object(
    'ok', true, 'search_id', v_search.id, 'org_id', v_search.org_id,
    'remaining', v_search.quantity - (v_res ->> 'delivered')::int, 'attempts', v_search.attempts,
    'credits_reserved', v_search.credits_reserved);
end;
$$;
