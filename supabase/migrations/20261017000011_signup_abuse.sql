-- Abusi dei crediti di benvenuto (audit V4).
-- 1. Email "normalizzata": nome+qualcosa@dominio = nome@dominio; per Gmail i
--    punti non contano e googlemail.com = gmail.com.
-- 2. Crediti di benvenuto una sola volta per email normalizzata, e con un
--    tetto giornaliero complessivo: vale anche per chi chiama direttamente
--    l'API di registrazione di Supabase saltando il sito.

create or replace function public.normalize_email(p text)
returns text language sql immutable set search_path = public as $$
  with parts as (
    select split_part(lower(trim(coalesce(p, ''))), '@', 1) as local,
           replace(split_part(lower(trim(coalesce(p, ''))), '@', 2), 'googlemail.com', 'gmail.com') as domain
  ), clean as (
    select split_part(local, '+', 1) as local, domain from parts
  )
  select case when domain = 'gmail.com' then replace(local, '.', '') else local end || '@' || domain from clean
$$;

alter table public.profiles
  add column if not exists email_norm text,
  add column if not exists signup_ip_hash text;
update public.profiles set email_norm = normalize_email(email) where email_norm is null;
create index if not exists profiles_email_norm_idx on public.profiles (email_norm);
create index if not exists profiles_signup_ip_idx on public.profiles (signup_ip_hash, created_at desc);

insert into public.app_settings (key, value) values ('welcome_credits_daily_cap', '30')
on conflict (key) do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_name text;
  v_free plans%rowtype;
  v_norm text := normalize_email(new.email);
  v_cap integer;
  v_dupes integer;
  v_today integer;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company'), ''), split_part(new.email, '@', 2), 'La mia azienda');

  -- Il controllo dei duplicati va fatto prima di inserire il nuovo profilo.
  perform pg_advisory_xact_lock(hashtext('welcome:' || v_norm));
  -- Già registrato con una variante dello stesso indirizzo: niente crediti gratis.
  select count(*) into v_dupes from profiles where email_norm = v_norm;

  insert into profiles (user_id, email, full_name, email_norm)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), v_norm);

  insert into organizations (name) values (v_name) returning id into v_org;
  insert into memberships (org_id, user_id, role) values (v_org, new.id, 'owner');

  select * into v_free from plans where id = 'free';
  if found and v_free.credits > 0 and v_dupes = 0 then
    v_cap := coalesce((select (value #>> '{}')::integer from app_settings where key = 'welcome_credits_daily_cap'), 30);
    select count(*) into v_today from credit_ledger
     where external_ref like 'welcome:%' and created_at > now() - interval '24 hours';
    if v_today < v_cap then
      insert into credit_ledger (org_id, delta, kind, description, external_ref, expires_at)
      values (v_org, v_free.credits, 'grant', 'Crediti di benvenuto', 'welcome:' || v_org,
              now() + make_interval(months => v_free.credits_valid_months));
    end if;
  end if;
  return new;
end;
$$;
