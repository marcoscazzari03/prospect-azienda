-- Fase 2 (14/10):
--   * costi AI reali per giro, dai token e dalle ricerche web di Claude;
--   * il motore comunica subito l'ID della sua esecuzione (n8n_execution_id) e,
--     se si interrompe, il workflow di errore fa chiudere la ricerca subito.

-- Tariffe di Claude Sonnet 5.5 (listino in dollari: 2 $ / 10 $ per milione di token,
-- 10 $ ogni 1.000 ricerche web), convertite in euro a 0,92: modificabili in «Prezzi e costi».
insert into public.cost_rates (provider, unit, unit_cost_eur, description) values
  ('claude_input_mtok', 'milione di token', 1.84, 'Claude: token in ingresso (2 $ / milione)'),
  ('claude_output_mtok', 'milione di token', 9.2, 'Claude: token in uscita (10 $ / milione)'),
  ('claude_web_search', 'ricerca web', 0.0092, 'Claude: ricerca web (10 $ / 1.000)')
on conflict (provider) do nothing;
update public.cost_rates set description = 'Pianificazione dei lotti (AI, stima a chiamata)' where provider = 'openai_planner';
update public.cost_rates set description = 'Vecchio motore OpenAI: stima a lotto (non usato con Claude)' where provider = 'openai_search_lot';

alter table public.run_costs alter column units type numeric;

create or replace function public.record_engine_progress(
  p_run uuid, p_token_hash text, p_stage text, p_message text, p_counters jsonb
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_run search_runs%rowtype;
begin
  select * into v_run from check_run(p_run, p_token_hash);
  if v_run.id is null or v_run.status not in ('dispatched', 'running') then return false; end if;
  update search_runs
     set status = 'running', last_event_at = now(),
         n8n_execution_id = coalesce(nullif(left(p_counters ->> 'n8n_execution_id', 40), ''), n8n_execution_id)
   where id = p_run;
  insert into search_events (search_id, run_id, stage, message, counters)
  values (v_run.search_id, p_run, left(p_stage, 40), left(coalesce(p_message, ''), 300),
          coalesce(p_counters, '{}'::jsonb) - 'n8n_execution_id');
  return true;
end;
$$;

-- Esecuzione del motore interrotta: il giro viene segnato come fallito.
-- Restituisce la ricerca da chiudere (null se il giro non c'è o è già concluso).
create or replace function public.fail_engine_run(p_execution text, p_error text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_run search_runs%rowtype;
begin
  select * into v_run from search_runs
   where n8n_execution_id = left(p_execution, 40) and status in ('dispatched', 'running')
   order by created_at desc limit 1
   for update;
  if v_run.id is null then return null; end if;
  update search_runs set status = 'failed', error = left(coalesce(p_error, 'esecuzione interrotta'), 300), finished_at = now()
   where id = v_run.id;
  insert into search_events (search_id, run_id, stage, message)
  values (v_run.search_id, v_run.id, 'engine_error', 'Il motore di ricerca si è interrotto');
  return v_run.search_id;
end;
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
  select p_run, r.provider, round(u.units, 6), r.unit_cost_eur, round(u.units * r.unit_cost_eur, 4)
    from (values
      -- Motore con Claude: costo reale dai token e dalle ricerche web del giro.
      ('claude_input_mtok', coalesce((p_payload #>> '{usage,claude_input_tokens}')::numeric, 0) / 1000000),
      ('claude_output_mtok', coalesce((p_payload #>> '{usage,claude_output_tokens}')::numeric, 0) / 1000000),
      ('claude_web_search', coalesce((p_payload #>> '{usage,claude_web_searches}')::numeric, 0)),
      -- Vecchio motore (senza token nel resoconto): stima a lotto.
      ('openai_search_lot', case when p_payload #> '{usage,claude_input_tokens}' is null
                                 then coalesce((p_payload #>> '{usage,ai_search_calls}')::numeric, 0) else 0 end),
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

revoke execute on function public.fail_engine_run(text, text) from public, anon, authenticated;
grant execute on function public.fail_engine_run(text, text) to service_role;
