-- Disponibilità nel wizard come la riserva del motore (22/10, dopo il QA del punto 40). availability_contacts (063) contava
-- anche le aziende che target_reserve / opportunity_reserve scartano sempre: portali e piattaforme (is_platform_domain),
-- pagine ospitate (is_hosted_page) e aziende fuori target dal nome (is_non_target_company). Le aziende con email potevano
-- risultare di più di quelle che la ricerca userà davvero. Stessa funzione della 063 con gli stessi tre filtri.
-- Indietro: rieseguire availability_contacts dalla 063.

create or replace function public.availability_contacts(p_org uuid, p_target jsonb, p_contacts integer, p_opportunity boolean)
returns jsonb language plpgsql stable security definer set search_path = public as $f$
declare
  v_ids uuid[];
begin
  if p_opportunity then
    select array_agg(x.id) into v_ids from (
      select p.id from opportunity_pool(p_org, p_target, p_contacts, '{}') p
       where not is_platform_domain(p.domain) and not is_hosted_page(p.website, p.name) and not is_non_target_company(p.name)
       limit 501) x;
  else
    select array_agg(x.id) into v_ids from (
      select p.id from target_pool(p_org, p_target, p_contacts, '{}') p
       where not is_platform_domain(p.domain) and not is_hosted_page(p.website, p.name) and not is_non_target_company(p.name)
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
