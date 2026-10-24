-- Tetto di clienti per azienda (decisione dell'utente del 24/10, analisi privacy, checklist 98): la stessa azienda va al
-- massimo a 5 clienti diversi ogni 90 giorni. Garanzia per il bilanciamento del legittimo interesse (una piccola attività
-- non riceve proposte da troppi nostri clienti) e argomento per chi compra.
-- Dove: un trigger BEFORE INSERT su deliveries, l'unico punto in cui nascono le consegne (deliver_leads, 040, sia dal motore
-- sia dalla riserva). Un'azienda già consegnata ad altri 5 clienti negli ultimi 90 giorni non si inserisce: deliver_leads
-- la conta come doppione, non la addebita e passa alla successiva. Le riserve e la stima del wizard non lo sanno ancora:
-- con molti clienti nella stessa zona e settore la ricerca può consegnare meno del previsto (da rivedere con i volumi).
-- I numeri stanno in company_client_cap(): si cambiano solo lì.
-- Indietro: drop trigger deliveries_company_cap on public.deliveries.

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
