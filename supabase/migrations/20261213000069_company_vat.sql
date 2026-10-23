-- Partita IVA delle aziende (punto 92, 23/10, decisione dell'utente): per non creare doppioni quando la stessa azienda
-- arriva da fonti diverse (OSM, annunci, Common Crawl) con domini diversi, e per mostrarla in futuro nei lead.
--   vat_valid(text)          11 cifre, prima cifra da 0 a 7 (8 e 9 sono codici fiscali di enti e associazioni), ufficio
--                            provinciale valido, cifra di controllo: stesse regole di worker/cc.mjs (pivaValida).
--   companies.vat_number     '' se non nota; indice per la ricerca dei doppioni (non unico: due aziende vecchie con la stessa
--                            partita IVA non devono far fallire un salvataggio).
--   vat_sightings            ogni coppia partita IVA–dominio vista (import e controllo siti). vat_seen() la registra e dice
--                            su quanti domini è comparsa: 1 = è dell'azienda; 2 = probabilmente la stessa azienda con due
--                            siti (niente doppione); 3 o più = di un fornitore (web agency, hosting nel piè di pagina):
--                            si toglie da tutte le aziende e non blocca più nessuna (Code Reviewer, 23/10).
--   store_imported_companies come la 048, più «vat»: un'azienda nuova con la partita IVA già di un altro dominio (vista su 2
--                            domini) non si importa (conta tra le scartate); un'azienda già presente si aggiorna sempre e
--                            riceve la partita IVA solo se le manca e se è soltanto sua.
--   store_company_checks     come la 055, più «company.vat» dal controllo siti: stessa regola.
-- Indietro: ripristinare le due funzioni dalla 048 e dalla 055; colonna e tabella si possono lasciare (nessuno le legge).

-- Su un database in uso: se una query lunga tiene la tabella, meglio fallire subito e rilanciare che bloccare le letture.
set lock_timeout = '5s';

create or replace function public.vat_valid(p text) returns boolean language plpgsql immutable as $$
declare
  v_sum integer := 0;
  v_d integer;
  v_office integer;
begin
  if p is null or p !~ '^[0-7][0-9]{10}$' or p ~ '^0+$' then return false; end if;
  v_office := substr(p, 8, 3)::integer;
  if not ((v_office between 1 and 100) or v_office in (120, 121, 888, 999)) then return false; end if;
  for i in 1..11 loop
    v_d := substr(p, i, 1)::integer;
    if i % 2 = 0 then v_d := v_d * 2; if v_d > 9 then v_d := v_d - 9; end if; end if;
    v_sum := v_sum + v_d;
  end loop;
  return v_sum % 10 = 0;
end;
$$;

alter table public.companies add column if not exists vat_number text not null default '';
alter table public.companies drop constraint if exists companies_vat_number_check;
alter table public.companies add constraint companies_vat_number_check check (vat_number = '' or vat_valid(vat_number));
create index if not exists companies_vat_number_idx on public.companies (vat_number) where vat_number <> '';

create table if not exists public.vat_sightings (
  vat text not null check (vat_valid(vat)),
  domain text not null,
  seen_at timestamptz not null default now(),
  primary key (vat, domain)
);
alter table public.vat_sightings enable row level security;
revoke all on public.vat_sightings from public, anon, authenticated;

-- Registra che la partita IVA compare sul dominio e restituisce su quanti domini è comparsa; dal terzo la toglie da tutte
-- le aziende.
create or replace function public.vat_seen(p_vat text, p_domain text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into vat_sightings (vat, domain) values (p_vat, p_domain) on conflict do nothing;
  select count(*) into v_count from vat_sightings where vat = p_vat;
  if v_count >= 3 then
    update companies set vat_number = '' where vat_number = p_vat and vat_number <> '';
  end if;
  return v_count;
end;
$$;
revoke all on function public.vat_seen(text, text) from public, anon, authenticated;

create or replace function public.store_imported_companies(p_source text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_domain text;
  v_industry text;
  v_city text;
  v_places text[];
  v_tags text[];
  v_new boolean;
  v_first timestamptz;
  v_origin text;
  v_name_industry text;
  v_name_keywords text[];
  v_vat text;
  v_seen integer;
  v_received integer := 0;
  v_new_count integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or coalesce(p_source, '') !~ '^[a-z_]{2,20}$' then
    return jsonb_build_object('received', 0, 'new', 0, 'updated', 0, 'skipped', 0);
  end if;

  for v_item in select x from jsonb_array_elements(p_items) x limit 5000 loop
    v_received := v_received + 1;
    v_domain := lower(trim(coalesce(v_item ->> 'domain', '')));
    if v_domain !~ '^[a-z0-9.-]+\.[a-z]{2,24}$' or length(v_domain) > 200
       or exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(v_domain))
       -- Non clienti (enti, associazioni sportive, centri commerciali, sedi di grandi gruppi),
       -- piattaforme e pagine ospitate su siti altrui.
       or is_non_target_company(v_item ->> 'name')
       or is_platform_domain(v_domain)
       or is_hosted_page(v_item ->> 'website', v_item ->> 'name') then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    -- Partita IVA (dalla 069): solo se valida; la stessa partita IVA già su un altro dominio è la stessa azienda con un
    -- altro sito (o il sito di un fornitore): non si crea un doppione.
    v_vat := case when vat_valid(v_item ->> 'vat') then v_item ->> 'vat' else '' end;
    if v_vat <> '' then
      v_seen := vat_seen(v_vat, v_domain);
      if v_seen = 2 and not exists (select 1 from companies x where x.domain = v_domain)
         and exists (select 1 from companies o where o.vat_number = v_vat and o.vat_number <> '' and o.domain <> v_domain) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      if v_seen <> 1 then v_vat := ''; end if;
    end if;
    v_industry := left(btrim(coalesce(v_item ->> 'industry', '')), 120);
    v_city := left(btrim(coalesce(v_item ->> 'city', '')), 80);
    v_places := term_stems(v_city) || term_stems(v_item ->> 'province') || term_stems(v_item ->> 'region');
    -- Senza categoria riconosciuta: settore dal nome quando è evidente («Estetica…», «…Montaggi»).
    if v_industry = '' then
      select n.industry, n.keywords into v_name_industry, v_name_keywords from industry_from_name(v_item ->> 'name') n;
      v_industry := coalesce(v_name_industry, '');
    end if;
    v_tags := term_stems(v_industry) || coalesce(array(select distinct unnest(term_stems(k)) from unnest(v_name_keywords) k), '{}');
    v_name_keywords := null;
    if jsonb_typeof(v_item -> 'keywords') = 'array' then
      v_tags := v_tags || array(select distinct unnest(term_stems(left(k, 60)))
                                  from (select k from jsonb_array_elements_text(v_item -> 'keywords') k limit 10) x);
    end if;

    insert into companies as c (domain, name, website, country, country_code, city, industry, origin, tags, places, vat_number)
    values (v_domain, left(coalesce(nullif(btrim(v_item ->> 'name'), ''), v_domain), 200),
            left(coalesce(nullif(v_item ->> 'website', ''), 'https://' || v_domain), 300),
            'Italia', 'IT', v_city, v_industry, left(p_source, 20),
            array(select distinct unnest(v_tags)), array(select distinct unnest(v_places)), v_vat)
    on conflict (domain) do update
      set city = coalesce(nullif(c.city, ''), excluded.city),
          industry = coalesce(nullif(c.industry, ''), excluded.industry),
          country_code = coalesce(c.country_code, excluded.country_code),
          tags = array(select distinct unnest(c.tags || excluded.tags)),
          places = array(select distinct unnest(c.places || excluded.places)),
          vat_number = coalesce(nullif(c.vat_number, ''), excluded.vat_number)
    returning (xmax = 0), c.first_seen_at, c.origin into v_new, v_first, v_origin;
    -- Nuova anche se salvata pochi minuti fa dalla stessa fonte: n8n ripete la chiamata dopo un
    -- errore di rete anche quando il primo tentativo è andato a buon fine (import del 20/10:
    -- 1.038 aziende nuove contate come aggiornate).
    if v_new or (v_origin = left(p_source, 20) and v_first > now() - interval '30 minutes') then
      v_new_count := v_new_count + 1;
    else
      v_updated := v_updated + 1;
    end if;
  end loop;

  return jsonb_build_object('received', v_received, 'new', v_new_count, 'updated', v_updated, 'skipped', v_skipped);
end;
$$;
revoke all on function public.store_imported_companies(text, jsonb) from public, anon, authenticated;

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
  v_form text;
  v_email text;
  v_vat text;
begin
  if jsonb_typeof(p_items) <> 'array' then return 0; end if;

  for v_item in select x from jsonb_array_elements(p_items) x limit 500 loop
    v_domain := lower(trim(coalesce(v_item #>> '{company,domain}', '')));
    continue when v_domain !~ '^[a-z0-9.-]+\.[a-z]{2,24}$' or length(v_domain) > 200;
    continue when exists (select 1 from suppression_list sl where sl.domain_hash = sha256_hex(v_domain));

    v_tech := case when jsonb_typeof(v_item #> '{company,technologies}') = 'array'
                   then array(select t from jsonb_array_elements_text(v_item #> '{company,technologies}') t limit 10)
                   else '{}'::text[] end;

    -- Modulo di contatto trovato sul sito (pagina del dominio dell'azienda).
    v_form := left(coalesce(v_item #>> '{company,contact_form}', ''), 300);
    if v_form !~* ('^https?://([a-z0-9-]+\.)*' || replace(v_domain, '.', '\.') || '(/|$)') then v_form := ''; end if;

    insert into companies as c (domain, name, website, country, city, industry, size_hint, technologies, origin, site_checked_at, contact_form_url)
    values (v_domain,
            left(coalesce(nullif(v_item #>> '{company,name}', ''), v_domain), 200),
            left(coalesce(nullif(v_item #>> '{company,website}', ''), 'https://' || v_domain), 300),
            left(coalesce(v_item #>> '{company,country}', ''), 80), left(coalesce(v_item #>> '{company,city}', ''), 80),
            left(coalesce(v_item #>> '{company,industry}', ''), 120), left(coalesce(v_item #>> '{company,size_hint}', ''), 60),
            v_tech, left(coalesce(p_origin, ''), 20), now(), v_form)
    on conflict (domain) do update
      set name = coalesce(nullif(c.name, ''), excluded.name),
          country = coalesce(nullif(excluded.country, ''), c.country),
          city = coalesce(nullif(excluded.city, ''), c.city),
          industry = coalesce(nullif(c.industry, ''), excluded.industry),
          size_hint = coalesce(nullif(excluded.size_hint, ''), c.size_hint),
          technologies = case when cardinality(excluded.technologies) > 0 then excluded.technologies else c.technologies end,
          site_checked_at = now(),
          contact_form_url = coalesce(nullif(excluded.contact_form_url, ''), c.contact_form_url),
          last_verified_at = now()
    returning c.id into v_company;
    perform tag_company(v_company, coalesce(p_target, '{}'::jsonb));

    -- Email aziendale trovata nella homepage dal controllo siti (migrazione 050): solo del dominio
    -- dell'azienda o di un suo dominio fratello. Toglie anche la memoria «email non trovata».
    v_email := lower(trim(coalesce(v_item #>> '{company,email}', '')));
    if v_email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$' and length(v_email) <= 200 and email_on_domain(v_email, v_domain) then
      update companies set site_email = v_email, site_email_at = now(), email_missed_at = null where id = v_company;
    end if;

    -- Partita IVA letta nella homepage dal worker (dalla 069): solo valida, solo se l'azienda non ne ha una e se finora è
    -- comparsa soltanto su questo dominio (vat_seen).
    v_vat := coalesce(v_item #>> '{company,vat}', '');
    if vat_valid(v_vat) and vat_seen(v_vat, v_domain) = 1 then
      update companies set vat_number = v_vat where id = v_company and vat_number = '';
    end if;

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
      elsif v_status = 'fail' or (v_check #>> '{evidence,invalid_page}') = 'true' then
        -- Il problema non c'è più, oppure la pagina scaricata non è il sito (blocco, trasloco, pagina
        -- provvisoria: migrazione 055): la vecchia prova non vale.
        delete from company_signals cs where cs.company_id = v_company and cs.code = v_check ->> 'code';
      end if;
    end loop;
    v_saved := v_saved + 1;
  end loop;
  return v_saved;
end;
$$;
revoke all on function public.store_company_checks(jsonb, jsonb, text) from public, anon, authenticated;
