-- Opposizione anche sui lead già consegnati (analisi privacy del 24/10, checklist 98; art. 19 GDPR: chi ha ricevuto i dati
-- va avvisato della cancellazione). Quando un indirizzo o un dominio entra nella lista di esclusione, i lead dei clienti con
-- quell'email o quel dominio vengono segnati (opted_out_at): l'app li mostra come «Si è opposta: non contattare», ne nasconde
-- email e modulo e li esporta senza contatto. I dati restano del cliente (titolare autonomo); noi smettiamo di mostrarli.
-- Indietro: togliere la colonna e rieseguire suppression_purge_trigger dalla migrazione 014.

alter table public.deliveries add column if not exists opted_out_at timestamptz;

create or replace function public.mark_opted_out_deliveries(p_email_hash text, p_domain_hash text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_n integer;
begin
  update deliveries d
     set opted_out_at = now()
   where d.opted_out_at is null
     and ((p_email_hash is not null and d.email_address <> '' and sha256_hex(lower(d.email_address)) = p_email_hash)
       or (p_domain_hash is not null and (sha256_hex(lower(d.company_domain)) = p_domain_hash
            or (position('@' in d.email_address) > 0 and sha256_hex(lower(split_part(d.email_address, '@', 2))) = p_domain_hash))));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Stesso trigger della 014: cancellazione dal magazzino e, in più, segno sui lead consegnati.
create or replace function public.suppression_purge_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform purge_suppressed(new.email_hash, new.domain_hash);
  perform mark_opted_out_deliveries(new.email_hash, new.domain_hash);
  return new;
end;
$$;

revoke execute on function public.mark_opted_out_deliveries(text, text) from public, anon, authenticated;

-- Opposizioni già ricevute: segnate anche sui lead consegnati prima di oggi.
do $$
declare
  r record;
begin
  for r in select email_hash, domain_hash from suppression_list loop
    perform mark_opted_out_deliveries(r.email_hash, r.domain_hash);
  end loop;
end;
$$;
