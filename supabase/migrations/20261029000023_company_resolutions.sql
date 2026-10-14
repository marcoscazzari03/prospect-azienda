-- Sito delle aziende degli annunci (Adzuna non lo fornisce).
--
-- Il workflow n8n «Annunci | Siti aziende» chiede le aziende degli annunci senza
-- sito, prova i domini più probabili e accetta un sito solo se la pagina contiene il
-- nome dell'azienda. Ogni tentativo viene ricordato qui (per nome normalizzato), così
-- non si ripete ogni giorno: un'azienda non trovata si riprova dopo 30 giorni.
-- Le aziende trovate entrano in companies (origine «adzuna») e i loro annunci vengono
-- collegati.

create table if not exists public.company_resolutions (
  company_key text primary key,
  company_name text not null,
  status text not null check (status in ('found', 'not_found')),
  domain text not null default '',
  method text not null default '',
  attempts integer not null default 1,
  tried_at timestamptz not null default now()
);
alter table public.company_resolutions enable row level security;
revoke all on public.company_resolutions from anon, authenticated;

-- Aziende degli annunci ancora senza sito, le più attive per prime.
create or replace function public.pending_ad_companies(p_limit integer)
returns table (company_key text, company_name text, city text, ads integer)
language sql stable security definer set search_path = public as $$
  select j.company_key,
         (array_agg(j.company_name order by j.posted_at desc))[1],
         (array_agg(j.city order by j.posted_at desc))[1],
         count(*)::integer
  from job_ads j
  left join company_resolutions r on r.company_key = j.company_key
  where j.company_id is null
    and (r.company_key is null or (r.status = 'not_found' and r.tried_at < now() - interval '30 days'))
  group by j.company_key
  order by count(*) desc, max(j.posted_at) desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500)
$$;
revoke all on function public.pending_ad_companies(integer) from public, anon, authenticated;

-- Esiti dal workflow. p_items: [{ company_key, company_name, city, domain, method }]
-- (domain vuoto = non trovato). Le aziende in opposizione non vengono salvate.
create or replace function public.store_company_resolutions(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_key text;
  v_domain text;
  v_company uuid;
  v_found integer := 0;
  v_not_found integer := 0;
  v_linked integer := 0;
  v_n integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('found', 0, 'not_found', 0, 'linked_ads', 0);
  end if;

  for v_item in select x from jsonb_array_elements(p_items) x limit 500 loop
    v_key := coalesce(v_item ->> 'company_key', '');
    continue when v_key = '' or length(v_key) > 200;
    v_domain := lower(trim(coalesce(v_item ->> 'domain', '')));
    if v_domain !~ '^[a-z0-9.-]+\.[a-z]{2,24}$' or length(v_domain) > 200
       or exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(v_domain)) then
      v_domain := '';
    end if;

    if v_domain = '' then
      insert into company_resolutions as r (company_key, company_name, status, domain, method)
      values (v_key, left(coalesce(v_item ->> 'company_name', ''), 200), 'not_found', '', left(coalesce(v_item ->> 'method', ''), 40))
      on conflict (company_key) do update
        set status = 'not_found', domain = '', method = excluded.method,
            attempts = r.attempts + 1, tried_at = now();
      v_not_found := v_not_found + 1;
      continue;
    end if;

    insert into companies as c (domain, name, website, country, city, origin)
    values (v_domain, left(coalesce(nullif(v_item ->> 'company_name', ''), v_domain), 200), 'https://' || v_domain,
            'Italia', left(coalesce(v_item ->> 'city', ''), 80), 'adzuna')
    on conflict (domain) do update set name = coalesce(nullif(c.name, ''), excluded.name)
    returning c.id into v_company;

    update job_ads set company_id = v_company where company_key = v_key and company_id is null;
    get diagnostics v_n = row_count;
    v_linked := v_linked + v_n;

    insert into company_resolutions as r (company_key, company_name, status, domain, method)
    values (v_key, left(coalesce(v_item ->> 'company_name', ''), 200), 'found', v_domain, left(coalesce(v_item ->> 'method', ''), 40))
    on conflict (company_key) do update
      set status = 'found', domain = excluded.domain, method = excluded.method,
          attempts = r.attempts + 1, tried_at = now();
    v_found := v_found + 1;
  end loop;

  return jsonb_build_object('found', v_found, 'not_found', v_not_found, 'linked_ads', v_linked);
end;
$$;
revoke all on function public.store_company_resolutions(jsonb) from public, anon, authenticated;
