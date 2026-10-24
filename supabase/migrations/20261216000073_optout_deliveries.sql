-- Opposizione anche sui lead già consegnati (analisi privacy del 24/10, checklist 98; art. 19 GDPR: chi ha ricevuto i dati
-- va avvisato della cancellazione). Quando un indirizzo o un dominio entra nella lista di esclusione, i lead dei clienti con
-- quell'email o quel dominio vengono segnati (opted_out_at) e svuotati dei contatti (email, email alternative e ipotizzate,
-- referente, modulo): restano solo nome e dominio dell'azienda, per dire al cliente «Si è opposta: non contattare». Il cliente
-- (titolare autonomo) cancella i dati che ha già esportato; nel nostro database non restano contatti (Code Reviewer, 24/10).
-- Indietro: togliere la colonna e il trigger companies_suppressed_email, rieseguire suppression_purge_trigger dalla 014.

alter table public.deliveries add column if not exists opted_out_at timestamptz;

create or replace function public.mark_opted_out_deliveries(p_email_hash text, p_domain_hash text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_n integer;
begin
  update deliveries d
     set opted_out_at = now(),
         email_address = '',
         -- Chiave con il nome del referente (modalità con referente, fino al 18/10): resta solo un'impronta, come in
         -- forget_deliveries (046). Le chiavi «|dominio» dei lead solo azienda non hanno dati di persone e restano.
         person_key = case when left(d.person_key, 1) = '|' then d.person_key else 'opp:' || sha256_hex(d.person_key) end,
         data = ((d.data - 'email' - 'email_patterns' - 'person') #- '{company,contact_form}')
   where d.opted_out_at is null
     and ((p_email_hash is not null and d.email_address <> '' and sha256_hex(lower(d.email_address)) = p_email_hash)
       or (p_domain_hash is not null and (sha256_hex(lower(d.company_domain)) = p_domain_hash
            or (position('@' in d.email_address) > 0 and sha256_hex(lower(split_part(d.email_address, '@', 2))) = p_domain_hash))));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Stesso trigger della 014: cancellazione dal magazzino e, in più, segno sui lead consegnati e email della homepage
-- (companies.site_email, migrazione 050) tolta dalle aziende anche con l'opposizione per sola email (QA, 24/10).
create or replace function public.suppression_purge_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform purge_suppressed(new.email_hash, new.domain_hash);
  perform mark_opted_out_deliveries(new.email_hash, new.domain_hash);
  if new.email_hash is not null then
    update companies set site_email = '', site_email_at = null
     where site_email <> '' and sha256_hex(site_email) = new.email_hash;
  end if;
  return new;
end;
$$;

-- Un'email in opposizione non torna nelle aziende con i controlli successivi (controllo siti, contatti): si svuota prima
-- di essere salvata, qualunque funzione la scriva.
create or replace function public.companies_suppressed_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.site_email, '') <> '' and exists (select 1 from suppression_list where email_hash = sha256_hex(new.site_email)) then
    new.site_email := '';
    new.site_email_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists companies_suppressed_email on public.companies;
create trigger companies_suppressed_email before insert or update of site_email on public.companies
  for each row execute function public.companies_suppressed_email();

revoke execute on function public.companies_suppressed_email() from public, anon, authenticated;

revoke execute on function public.mark_opted_out_deliveries(text, text) from public, anon, authenticated;

-- Opposizioni già ricevute: segnate anche sui lead consegnati prima di oggi.
do $$
declare
  r record;
begin
  for r in select email_hash, domain_hash from suppression_list loop
    perform mark_opted_out_deliveries(r.email_hash, r.domain_hash);
  end loop;
  update companies c set site_email = '', site_email_at = null
   where c.site_email <> '' and exists (select 1 from suppression_list sl where sl.email_hash = sha256_hex(c.site_email));
end;
$$;
