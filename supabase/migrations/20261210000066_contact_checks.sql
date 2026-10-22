-- Contatti per tutto il database (punto 86, 22/10). Solo il 22% delle aziende vive ha un'email o un modulo: il controllo
-- siti legge solo la homepage, e le pagine «Contatti», «Note legali» e «Chi siamo» le apre il motore soltanto durante una
-- ricerca. Il worker sul VPS (worker/contacts.mjs) le apre per tutte le aziende senza contatto e salva quello che trova.
--   pending_contact_checks(n)  aziende da cercare: sito vivo (controllato negli ultimi 60 giorni con un esito leggibile),
--                              senza email né modulo, mai cercate o cercate da oltre 90 giorni, non provate dal motore negli
--                              ultimi 90 giorni; prima quelle controllate più di recente.
--   store_contact_checks(items) email (solo del dominio o di un dominio fratello, come la 050) e modulo (solo una pagina del
--                              dominio); senza email trovata, la memoria «email non trovata» come fa il motore.
-- Indietro: drop delle due funzioni; la colonna contacts_checked_at si può lasciare.

alter table public.companies add column if not exists contacts_checked_at timestamptz;

create or replace function public.pending_contact_checks(p_limit integer)
returns table (company_id uuid, domain text, name text, website text)
language plpgsql stable security definer set search_path = public as $f$
begin
  return query execute $q$
  select c.id, c.domain, c.name, c.website
    from companies c
   where c.site_checked_at > now() - interval '60 days'
     and coalesce(c.site_email, '') = '' and coalesce(c.contact_form_url, '') = ''
     and (c.contacts_checked_at is null or c.contacts_checked_at < now() - interval '90 days')
     and (c.email_missed_at is null or c.email_missed_at < now() - interval '90 days')
     and exists (select 1 from company_checks cc where cc.company_id = c.id and cc.status in ('pass', 'fail'))
     and not is_non_target_company(c.name)
     and not exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(c.domain))
   order by c.contacts_checked_at nulls first, c.site_checked_at desc
   limit $1
  $q$ using least(greatest(coalesce(p_limit, 100), 1), 300);
end;
$f$;
revoke all on function public.pending_contact_checks(integer) from public, anon, authenticated;
grant execute on function public.pending_contact_checks(integer) to service_role;

create or replace function public.store_contact_checks(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $f$
declare
  v_item jsonb;
  v_domain text;
  v_company uuid;
  v_email text;
  v_form text;
  v_read boolean;
  v_saved integer := 0;
  v_emails integer := 0;
  v_forms integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' then return jsonb_build_object('saved', 0); end if;
  for v_item in select x from jsonb_array_elements(p_items) x limit 300 loop
    v_domain := lower(trim(coalesce(v_item ->> 'domain', '')));
    continue when v_domain !~ '^[a-z0-9.-]+\.[a-z]{2,24}$' or length(v_domain) > 200;
    select id into v_company from companies where domain = v_domain;
    continue when v_company is null;
    continue when exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(v_domain));

    v_email := lower(trim(coalesce(v_item ->> 'email', '')));
    if not (v_email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$' and length(v_email) <= 200 and email_on_domain(v_email, v_domain)) then
      v_email := '';
    end if;
    -- Il modulo vale solo se sta su una pagina del dominio dell'azienda (come store_company_checks).
    v_form := left(coalesce(v_item ->> 'contact_form', ''), 300);
    if v_form !~* ('^https?://([a-z0-9-]+\.)*' || replace(v_domain, '.', '\.') || '(/|$)') then v_form := ''; end if;
    -- Pagine lette davvero: senza, non si scrive «email non trovata» (sito spento o bloccato in quel momento).
    v_read := coalesce((v_item ->> 'pages_read')::int, 0) > 0;

    update companies c
       set contacts_checked_at = now(),
           site_email = case when v_email <> '' and coalesce(c.site_email, '') = '' then v_email else c.site_email end,
           site_email_at = case when v_email <> '' and coalesce(c.site_email, '') = '' then now() else c.site_email_at end,
           email_missed_at = case when v_email <> '' then null
                                  when v_read and coalesce(c.site_email, '') = '' then now()
                                  else c.email_missed_at end,
           contact_form_url = case when v_form <> '' and coalesce(c.contact_form_url, '') = '' then v_form else c.contact_form_url end
     where c.id = v_company;
    v_saved := v_saved + 1;
    if v_email <> '' then v_emails := v_emails + 1; end if;
    if v_form <> '' then v_forms := v_forms + 1; end if;
  end loop;
  return jsonb_build_object('saved', v_saved, 'emails', v_emails, 'forms', v_forms);
end;
$f$;
revoke all on function public.store_contact_checks(jsonb) from public, anon, authenticated;
grant execute on function public.store_contact_checks(jsonb) to service_role;
