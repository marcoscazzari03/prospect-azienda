-- V6 (GDPR): il magazzino non conserva dati oltre quanto dichiarato.
-- 1) Opposizione confermata (o esclusione dall'admin): i dati di quella email
--    o di quel dominio vengono cancellati subito dal magazzino.
-- 2) Ogni notte: cancellati i dati non riverificati da 24 mesi.
-- I lead già consegnati restano ai clienti che li hanno ricevuti (titolari
-- autonomi); la lista di esclusione impedisce nuove consegne.

create or replace function public.purge_suppressed(p_email_hash text, p_domain_hash text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_people uuid[];
  v_n integer := 0;
  v_k integer;
begin
  if p_email_hash is not null then
    -- La persona collegata a un'email nominativa esce dal magazzino insieme all'email.
    select array_agg(person_id) into v_people
      from emails where sha256_hex(address) = p_email_hash and type = 'personal' and person_id is not null;
    delete from emails where sha256_hex(address) = p_email_hash;
    get diagnostics v_k = row_count; v_n := v_n + v_k;
    if v_people is not null then
      delete from emails where person_id = any (v_people);
      delete from people where id = any (v_people);
      get diagnostics v_k = row_count; v_n := v_n + v_k;
    end if;
  end if;
  if p_domain_hash is not null then
    -- Azienda, persone ed email (a cascata), più eventuali email su quel dominio.
    delete from emails where sha256_hex(split_part(address, '@', 2)) = p_domain_hash;
    get diagnostics v_k = row_count; v_n := v_n + v_k;
    delete from companies where sha256_hex(domain) = p_domain_hash;
    get diagnostics v_k = row_count; v_n := v_n + v_k;
  end if;
  return v_n;
end;
$$;

create or replace function public.suppression_purge_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform purge_suppressed(new.email_hash, new.domain_hash);
  return new;
end;
$$;

drop trigger if exists suppression_purge on public.suppression_list;
create trigger suppression_purge after insert or update on public.suppression_list
  for each row execute function public.suppression_purge_trigger();

-- Conservazione: dati non riverificati da p_months mesi.
create or replace function public.purge_stale_warehouse(p_months integer default 24)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cutoff timestamptz := now() - make_interval(months => p_months);
  v_emails integer;
  v_people integer;
  v_companies integer;
  v_optouts integer;
begin
  delete from emails
   where verified_at < v_cutoff
      or person_id in (select id from people where last_verified_at < v_cutoff);
  get diagnostics v_emails = row_count;
  delete from people where last_verified_at < v_cutoff;
  get diagnostics v_people = row_count;
  delete from companies c
   where c.last_verified_at < v_cutoff
     and not exists (select 1 from people p where p.company_id = c.id)
     and not exists (select 1 from emails e where e.company_id = c.id);
  get diagnostics v_companies = row_count;
  -- Richieste di opposizione mai confermate: il link vale poco, non servono oltre 30 giorni.
  delete from optout_requests where status = 'pending' and created_at < now() - interval '30 days';
  get diagnostics v_optouts = row_count;
  return jsonb_build_object('emails', v_emails, 'people', v_people, 'companies', v_companies, 'optout_requests', v_optouts);
end;
$$;

revoke execute on function public.purge_suppressed(text, text), public.suppression_purge_trigger(),
  public.purge_stale_warehouse(integer) from public, anon, authenticated;
grant execute on function public.purge_stale_warehouse(integer) to service_role;

-- Pulizia una tantum: esclusioni già presenti prima di questa migrazione.
select purge_suppressed(email_hash, domain_hash) from suppression_list;
