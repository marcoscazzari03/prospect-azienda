-- Disponibilità: prima le aziende con un contatto (23/10, ricerche consigliate). availability_contacts (065) contava solo
-- le prime 501 aziende del settore, prese come capitava: nei settori grandi (Ristorante in tutta Italia) erano quasi tutte
-- aziende con «email non trovata», e il conteggio dava 3 lead invece di centinaia, nel wizard come nelle ricerche
-- consigliate. Ora tra le 501 entrano prima quelle con email o modulo, poi le altre: stessi campi nella risposta, e oltre
-- 500 il wizard mostra come prima il tetto della richiesta. Le funzioni pool restituiscono già tutto il gruppo (plpgsql
-- lo calcola per intero prima del limite), quindi l'ordinamento costa poco.
-- Indietro: ripristinare la funzione dalla 065.

create or replace function public.availability_contacts(p_org uuid, p_target jsonb, p_contacts integer, p_opportunity boolean)
returns jsonb language plpgsql stable security definer set search_path = public as $f$
declare
  v_ids uuid[];
begin
  if p_opportunity then
    select array_agg(x.id) into v_ids from (
      select p.id from opportunity_pool(p_org, p_target, p_contacts, '{}') p
        join companies c on c.id = p.id
       where not is_platform_domain(p.domain) and not is_hosted_page(p.website, p.name) and not is_non_target_company(p.name)
       order by (coalesce(c.site_email, '') <> '' or coalesce(c.contact_form_url, '') <> '') desc
       limit 501) x;
  else
    select array_agg(x.id) into v_ids from (
      select p.id from target_pool(p_org, p_target, p_contacts, '{}') p
        join companies c on c.id = p.id
       where not is_platform_domain(p.domain) and not is_hosted_page(p.website, p.name) and not is_non_target_company(p.name)
       order by (coalesce(c.site_email, '') <> '' or coalesce(c.contact_form_url, '') <> '') desc
       limit 501) x;
  end if;
  return (
    select jsonb_build_object(
      'total', count(*),
      'with_email', count(*) filter (where c.site_email <> ''),
      'form_only', count(*) filter (where c.site_email = '' and c.contact_form_url <> ''),
      'missed', count(*) filter (where c.site_email = '' and c.contact_form_url = ''
                                   and c.email_missed_at > now() - interval '90 days'),
      'to_try', count(*) filter (where c.site_email = '' and c.contact_form_url = ''
                                   and (c.email_missed_at is null or c.email_missed_at <= now() - interval '90 days')))
      from companies c
     where c.id = any (coalesce(v_ids, '{}'))
  );
end;
$f$;
revoke all on function public.availability_contacts(uuid, jsonb, integer, boolean) from public, anon, authenticated;
