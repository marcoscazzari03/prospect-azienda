-- Database delle aziende (fase 1 della ricerca opportunità «database first»).
--
-- Ogni azienda controllata dal motore viene salvata, anche se non diventa un
-- lead, con l'esito di OGNI controllo tecnico (positivo, negativo o non
-- determinabile) e la data. Così le ricerche successive, di qualsiasi cliente,
-- non ripagano lo stesso lavoro: basta ricontrollare (gratis) quando l'esito è
-- vecchio.
--
-- company_signals resta la tabella delle PROVE (solo segnali positivi, usata da
-- magazzino, consegne e rimborsi); company_checks è lo storico dei controlli.
-- Un controllo negativo più recente cancella la vecchia prova positiva.

create table if not exists public.company_checks (
  company_id uuid not null references public.companies (id) on delete cascade,
  code text not null,
  status text not null check (status in ('pass', 'fail', 'undetermined')),
  detail text not null default '',
  evidence jsonb not null default '{}',
  source text not null default 'website',
  checked_at timestamptz not null default now(),
  primary key (company_id, code)
);
create index if not exists company_checks_code_idx on public.company_checks (code, status, checked_at desc);
alter table public.company_checks enable row level security;
revoke all on public.company_checks from anon, authenticated;

-- Da dove arriva l'azienda la prima volta (target, opportunity, seed, adzuna, theirstack)
-- e quando il sito è stato controllato l'ultima volta.
alter table public.companies add column if not exists origin text not null default '';
alter table public.companies add column if not exists site_checked_at timestamptz;
create index if not exists companies_site_checked_idx on public.companies (site_checked_at);

-- Controlli tecnici sul sito che salviamo (gli annunci di lavoro hanno la loro tabella più avanti).
create or replace function public.site_check_codes() returns text[] language sql immutable as $$
  select array['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright', 'under_construction', 'no_booking_engine']
$$;

-- Salva aziende ed esiti dei controlli. p_items: [{ company: {domain, name, website,
-- country, city, industry, size_hint, technologies}, checks: [{code, status, evidence}] }].
-- Le aziende che hanno chiesto di non essere contattate (opposizione) non vengono salvate.
create or replace function public.store_company_checks(p_items jsonb, p_target jsonb, p_origin text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_check jsonb;
  v_domain text;
  v_company uuid;
  v_tech text[];
  v_status text;
  v_saved integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' then return 0; end if;

  for v_item in select x from jsonb_array_elements(p_items) x limit 500 loop
    v_domain := lower(trim(coalesce(v_item #>> '{company,domain}', '')));
    continue when v_domain !~ '^[a-z0-9.-]+\.[a-z]{2,24}$' or length(v_domain) > 200;
    continue when exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(v_domain));

    v_tech := case when jsonb_typeof(v_item #> '{company,technologies}') = 'array'
                   then array(select t from jsonb_array_elements_text(v_item #> '{company,technologies}') t limit 10)
                   else '{}'::text[] end;

    insert into companies as c (domain, name, website, country, city, industry, size_hint, technologies, origin, site_checked_at)
    values (v_domain,
            left(coalesce(nullif(v_item #>> '{company,name}', ''), v_domain), 200),
            left(coalesce(nullif(v_item #>> '{company,website}', ''), 'https://' || v_domain), 300),
            left(coalesce(v_item #>> '{company,country}', ''), 80), left(coalesce(v_item #>> '{company,city}', ''), 80),
            left(coalesce(v_item #>> '{company,industry}', ''), 120), left(coalesce(v_item #>> '{company,size_hint}', ''), 60),
            v_tech, left(coalesce(p_origin, ''), 20), now())
    on conflict (domain) do update
      set name = coalesce(nullif(c.name, ''), excluded.name),
          country = coalesce(nullif(excluded.country, ''), c.country),
          city = coalesce(nullif(excluded.city, ''), c.city),
          industry = coalesce(nullif(c.industry, ''), excluded.industry),
          size_hint = coalesce(nullif(excluded.size_hint, ''), c.size_hint),
          technologies = case when cardinality(excluded.technologies) > 0 then excluded.technologies else c.technologies end,
          site_checked_at = now(),
          last_verified_at = now()
    returning c.id into v_company;
    perform tag_company(v_company, coalesce(p_target, '{}'::jsonb));

    for v_check in select x from jsonb_array_elements(
        case when jsonb_typeof(v_item -> 'checks') = 'array' then v_item -> 'checks' else '[]'::jsonb end) x loop
      v_status := v_check ->> 'status';
      continue when not (v_check ->> 'code' = any (site_check_codes()))
                 or v_status is null or v_status not in ('pass', 'fail', 'undetermined');

      insert into company_checks as cc (company_id, code, status, detail, evidence, source, checked_at)
      values (v_company, v_check ->> 'code', v_status, left(coalesce(v_check #>> '{evidence,detail}', ''), 300),
              coalesce(v_check -> 'evidence', '{}'::jsonb), 'website', now())
      on conflict (company_id, code) do update
        set status = excluded.status, detail = excluded.detail, evidence = excluded.evidence,
            source = excluded.source, checked_at = excluded.checked_at;

      if v_status = 'pass' then
        insert into company_signals as cs (company_id, code, evidence, checked_at)
        values (v_company, v_check ->> 'code', coalesce(v_check -> 'evidence', '{}'::jsonb), now())
        on conflict (company_id, code) do update set evidence = excluded.evidence, checked_at = excluded.checked_at;
      elsif v_status = 'fail' then
        -- Il problema non c'è più: la vecchia prova non vale.
        delete from company_signals cs where cs.company_id = v_company and cs.code = v_check ->> 'code';
      end if;
    end loop;
    v_saved := v_saved + 1;
  end loop;
  return v_saved;
end;
$$;
revoke all on function public.store_company_checks(jsonb, jsonb, text) from public, anon, authenticated;

-- Dal motore: stessi controlli del callback (token del giro). L'origine dipende
-- dal tipo di ricerca: con segnali è una ricerca opportunità.
create or replace function public.record_company_checks(p_run uuid, p_token_hash text, p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_run search_runs%rowtype;
  v_target jsonb;
begin
  select * into v_run from check_run(p_run, p_token_hash);
  if v_run.id is null then return 0; end if;
  select target into v_target from searches where id = v_run.search_id;
  return store_company_checks(
    p_items, v_target,
    case when cardinality(search_signal_codes(v_target)) > 0 then 'opportunity' else 'target' end);
end;
$$;
revoke all on function public.record_company_checks(uuid, text, jsonb) from public, anon, authenticated;
