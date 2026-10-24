-- Tetto di clienti per azienda (decisione dell'utente del 24/10, analisi privacy, checklist 98): la stessa azienda va al
-- massimo a 5 clienti diversi ogni 90 giorni. Garanzia per il bilanciamento del legittimo interesse (una piccola attività
-- non riceve proposte da troppi nostri clienti) e argomento per chi compra.
-- Dove: un trigger BEFORE INSERT su deliveries, l'unico punto in cui nascono le consegne (deliver_leads, 040, sia dal motore
-- sia dalla riserva). Un'azienda già consegnata ad altri 5 clienti negli ultimi 90 giorni non si inserisce: deliver_leads
-- la conta come doppione, non la addebita e passa alla successiva. Le riserve e la stima del wizard non lo sanno ancora:
-- con molti clienti nella stessa zona e settore la stima del wizard può essere più alta del consegnato (da rivedere con i
-- volumi). Le ricerche invece le escludono subito (capped_domains).
-- I numeri stanno in company_client_cap(): si cambiano solo lì.
-- Indietro: drop trigger deliveries_company_cap on public.deliveries (e togliere capped_domains da loadExclusions).

create or replace function public.company_client_cap(out clients integer, out days integer)
language sql immutable parallel safe set search_path = public as $$
  select 5, 90
$$;

create index if not exists deliveries_company_recent_idx on public.deliveries (company_domain, delivered_at desc);

create or replace function public.deliveries_company_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cap record;
begin
  if coalesce(new.company_domain, '') = '' then return new; end if;
  -- Consegne simultanee della stessa azienda a clienti diversi: una alla volta, così il conteggio non supera il tetto
  -- (Code Reviewer, 24/10).
  perform pg_advisory_xact_lock(hashtext('company_cap:' || new.company_domain));
  select * into v_cap from company_client_cap();
  if (select count(distinct d.org_id)
        from deliveries d
       where d.company_domain = new.company_domain
         and d.org_id <> new.org_id
         and d.delivered_at > now() - make_interval(days => v_cap.days)) >= v_cap.clients then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists deliveries_company_cap on public.deliveries;
create trigger deliveries_company_cap before insert on public.deliveries
  for each row execute function public.deliveries_company_cap();

revoke execute on function public.deliveries_company_cap() from public, anon, authenticated;

-- Aziende già al tetto per un cliente: l'app le mette tra le esclusioni della ricerca (src/lib/server/searches.ts,
-- loadExclusions), così riserve e motore non le ripropongono a ogni giro facendo pagare verifiche inutili (Code Reviewer).
create or replace function public.capped_domains(p_org uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(x.company_domain), '{}')
    from (select d.company_domain
            from deliveries d, company_client_cap() cap
           where d.delivered_at > now() - make_interval(days => cap.days)
             and d.org_id <> p_org
             and d.company_domain <> ''
           group by d.company_domain, cap.clients
          having count(distinct d.org_id) >= cap.clients
           limit 5000) x
$$;

revoke execute on function public.capped_domains(uuid) from public, anon, authenticated;
grant execute on function public.capped_domains(uuid) to service_role;
