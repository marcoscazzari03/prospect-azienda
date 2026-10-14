-- Annunci di lavoro raccolti dalle API (fase 2 della ricerca opportunità «API first»).
--
-- Il workflow n8n «Annunci | Raccolta Adzuna» scarica ogni giorno gli annunci delle
-- figure del catalogo (JOB_FAMILIES), scarta agenzie e titoli fuori tema e li manda
-- qui. Un annuncio NON è ancora un lead: è la prova (recente, verificabile, con link)
-- che un'azienda sta assumendo. Il sito dell'azienda si risolve dopo, solo per le
-- aziende che servono a una ricerca.
--
-- Collegamento alle aziende del database: per nome normalizzato (senza forma
-- giuridica), solo quando il nome corrisponde a UNA sola azienda.

-- Nome azienda normalizzato: minuscolo, senza accenti, punteggiatura e forma giuridica.
-- Stesse regole del confronto nomi in n8n/engine/nodes/09-verifica-annuncio.js.
create or replace function public.company_name_key(p_name text) returns text
language sql immutable parallel safe as $$
  select coalesce(string_agg(w, ' ' order by n), '')
  from unnest(regexp_split_to_array(
         trim(regexp_replace(
           translate(lower(coalesce(p_name, '')), 'àáâäãèéêëìíîïòóôöõùúûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
           '[^a-z0-9]+', ' ', 'g')),
         ' ')) with ordinality as t(w, n)
  where w <> '' and w not in ('srl', 'srls', 'spa', 'sas', 'snc', 'sl', 'sa', 'sarl', 'gmbh', 'ag', 'kg', 'ltd',
                              'limited', 'llc', 'inc', 'bv', 'nv', 'lda', 'the', 'and', 'di', 'de', 'del', 'della',
                              'group', 'gruppo', 's', 'r', 'l', 'p', 'a', 'c', 'e', 'unipersonale', 'societa',
                              'cooperativa', 'coop', 'italia', 'italy')
$$;

create index if not exists companies_name_key_idx on public.companies (public.company_name_key(name));

create table if not exists public.job_ads (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  family text not null,
  title text not null,
  company_name text not null,
  company_key text not null,
  company_id uuid references public.companies (id) on delete set null,
  country text not null default 'IT',
  region text not null default '',
  city text not null default '',
  posted_at timestamptz not null,
  url text not null,
  description text not null default '',
  contract text not null default '',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source, external_id)
);
create index if not exists job_ads_family_idx on public.job_ads (family, country, region, posted_at desc);
create index if not exists job_ads_company_key_idx on public.job_ads (company_key);
create index if not exists job_ads_company_idx on public.job_ads (company_id) where company_id is not null;
alter table public.job_ads enable row level security;
revoke all on public.job_ads from anon, authenticated;

-- Salva un lotto di annunci. p_ads: [{ external_id, family, title, company_name, country,
-- region, city, posted_at, url, description, contract }]. Gli annunci già visti
-- aggiornano solo last_seen_at (e il collegamento all'azienda se nel frattempo è
-- comparsa nel database). Gli annunci più vecchi di 180 giorni vengono cancellati.
create or replace function public.store_job_ads(p_source text, p_ads jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ad jsonb;
  v_key text;
  v_company uuid;
  v_posted timestamptz;
  v_url text;
  v_received integer := 0;
  v_saved integer := 0;
  v_new integer := 0;
  v_linked integer := 0;
  v_inserted boolean;
  v_deleted integer;
begin
  if coalesce(p_source, '') !~ '^[a-z0-9_]{2,20}$' or jsonb_typeof(p_ads) <> 'array' then
    return jsonb_build_object('received', 0, 'saved', 0, 'new', 0, 'linked', 0, 'deleted', 0);
  end if;

  for v_ad in select x from jsonb_array_elements(p_ads) x limit 2000 loop
    v_received := v_received + 1;
    v_key := company_name_key(v_ad ->> 'company_name');
    v_url := coalesce(v_ad ->> 'url', '');
    v_posted := case when coalesce(v_ad ->> 'posted_at', '') ~ '^\d{4}-\d{2}-\d{2}'
                     then (v_ad ->> 'posted_at')::timestamptz end;
    continue when coalesce(v_ad ->> 'external_id', '') = '' or coalesce(v_ad ->> 'title', '') = ''
               or coalesce(v_ad ->> 'family', '') = '' or length(v_key) < 2
               or v_url !~ '^https://' or v_posted is null or v_posted > now() + interval '1 day';

    -- Una sola azienda con quel nome: collegata. Omonimie: si decide dopo, col sito.
    select case when count(*) = 1 then min(c.id::text)::uuid end into v_company
    from (select id from companies where company_name_key(name) = v_key limit 2) c;

    insert into job_ads as j (source, external_id, family, title, company_name, company_key, company_id,
                              country, region, city, posted_at, url, description, contract)
    values (p_source, left(v_ad ->> 'external_id', 80), left(v_ad ->> 'family', 40), left(v_ad ->> 'title', 200),
            left(v_ad ->> 'company_name', 200), left(v_key, 200), v_company,
            left(coalesce(nullif(v_ad ->> 'country', ''), 'IT'), 2), left(coalesce(v_ad ->> 'region', ''), 80),
            left(coalesce(v_ad ->> 'city', ''), 80), v_posted, left(v_url, 600),
            left(coalesce(v_ad ->> 'description', ''), 600), left(coalesce(v_ad ->> 'contract', ''), 40))
    on conflict (source, external_id) do update
      set last_seen_at = now(),
          company_id = coalesce(j.company_id, excluded.company_id)
    returning (xmax = 0) into v_inserted;

    v_saved := v_saved + 1;
    if v_inserted then v_new := v_new + 1; end if;
    if v_company is not null then v_linked := v_linked + 1; end if;
  end loop;

  delete from job_ads where posted_at < now() - interval '180 days';
  get diagnostics v_deleted = row_count;

  return jsonb_build_object('received', v_received, 'saved', v_saved, 'new', v_new, 'linked', v_linked, 'deleted', v_deleted);
end;
$$;
revoke all on function public.store_job_ads(text, jsonb) from public, anon, authenticated;
