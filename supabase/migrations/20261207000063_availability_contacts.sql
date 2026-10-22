-- Stima realistica nel wizard (punto 40, 22/10). Le aziende «disponibili» (target_pool / opportunity_pool) non sono
-- tutte lead: il pool non chiede un contatto, e una parte delle aziende non ha né email né modulo. Questa funzione conta,
-- sulle stesse aziende di target_availability / opportunity_availability (al massimo 501), quante hanno già l'email del
-- sito, quante solo il modulo di contatto, quante sono state provate di recente senza trovare niente (email_missed_at,
-- 90 giorni, come la riserva) e quante sono ancora da provare. La resa delle «da provare» la applica l'app.
-- Le funzioni di prima restano (le usa l'app già pubblicata). Indietro: drop function public.availability_contacts.

create or replace function public.availability_contacts(p_org uuid, p_target jsonb, p_contacts integer, p_opportunity boolean)
returns jsonb language plpgsql stable security definer set search_path = public as $f$
declare
  v_ids uuid[];
begin
  if p_opportunity then
    select array_agg(x.id) into v_ids from (select id from opportunity_pool(p_org, p_target, p_contacts, '{}') limit 501) x;
  else
    select array_agg(x.id) into v_ids from (select id from target_pool(p_org, p_target, p_contacts, '{}') limit 501) x;
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
