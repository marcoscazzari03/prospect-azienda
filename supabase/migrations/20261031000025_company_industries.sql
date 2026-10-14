-- Settore delle aziende degli annunci.
--
-- Le aziende risolte dagli annunci (Adzuna) entrano senza settore e quindi uscivano solo
-- nelle ricerche «tutti i settori». Il workflow n8n «Annunci | Settore aziende» legge la
-- homepage e la fa classificare a Claude Haiku: settore in italiano più le parole con cui
-- un cliente cercherebbe quel settore («manifattura», «metalmeccanica»...). Le parole
-- finiscono in companies.tags, le stesse usate da magazzino e riserva.
-- Homepage illeggibile o senza indizi: si riprova dopo 60 giorni.

alter table public.companies add column if not exists industry_checked_at timestamptz;

-- Parole di collegamento che un cliente scrive nel settore («software house CHE sviluppano
-- gestionali») e che nessuna azienda avrebbe tra le etichette.
create or replace function public.term_stems(p text)
returns text[] language sql immutable set search_path = public as $$
  select coalesce(array_agg(distinct case when length(w) >= 5 then regexp_replace(w, '[aeio]$', '') else w end), '{}')
    from regexp_split_to_table(
           regexp_replace(
             lower(translate(coalesce(p, ''), 'àáâäèéêëìíîïòóôöùúûüçñÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜÇÑ',
                                              'aaaaeeeeiiiioooouuuucnaaaaeeeeiiiioooouuuucn')),
             '[^a-z0-9]+', ' ', 'g'),
           ' ') as w
   where length(w) >= 3
     and w not in ('del', 'dei', 'della', 'delle', 'degli', 'dell', 'nel', 'nella', 'nelle', 'per', 'con', 'tra', 'fra',
                   'and', 'the', 'for', 'with', 'azienda', 'aziende', 'societa', 'impresa', 'imprese', 'settore',
                   'studio', 'studi', 'srl', 'spa', 'snc', 'sas', 'ltd', 'gmbh', 'company', 'companies',
                   'piccole', 'medie', 'grandi', 'pmi', 'italia', 'italiane', 'italiani', 'italiana', 'italiano',
                   'che', 'chi', 'non', 'anche', 'come', 'sono', 'loro', 'una', 'uno', 'gli', 'alla', 'alle', 'allo',
                   'agli', 'dal', 'dalla', 'dalle', 'dai', 'sul', 'sulla', 'sui', 'nei', 'tipo', 'tutti', 'tutte',
                   'altri', 'altre', 'ecc', 'etc', 'oppure', 'cui', 'quali')
$$;

-- Aziende degli annunci ancora senza settore, le più attive per prime.
create or replace function public.pending_industry_companies(p_limit integer)
returns table (company_id uuid, company_name text, website text, city text, ads integer)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.website, c.city, count(j.id)::integer
    from companies c
    join job_ads j on j.company_id = c.id
   where c.industry = ''
     and (c.industry_checked_at is null or c.industry_checked_at < now() - interval '60 days')
   group by c.id
   order by count(j.id) desc, max(j.posted_at) desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
$$;
revoke all on function public.pending_industry_companies(integer) from public, anon, authenticated;

-- Esiti dal workflow. p_items: [{ company_id, industry, keywords: [] }] (industry vuoto =
-- non classificabile). Il settore già presente non viene sovrascritto; le parole si
-- aggiungono alle etichette.
create or replace function public.store_company_industries(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_industry text;
  v_words text[];
  v_classified integer := 0;
  v_unknown integer := 0;
  v_n integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('classified', 0, 'unknown', 0);
  end if;

  for v_item in select x from jsonb_array_elements(p_items) x limit 200 loop
    continue when coalesce(v_item ->> 'company_id', '') !~ '^[0-9a-f-]{36}$';
    v_industry := left(btrim(regexp_replace(coalesce(v_item ->> 'industry', ''), '\s+', ' ', 'g')), 120);
    v_words := case when v_industry = '' then '{}'::text[] else term_stems(v_industry) end;
    if v_industry <> '' and jsonb_typeof(v_item -> 'keywords') = 'array' then
      v_words := v_words || array(select distinct unnest(term_stems(left(k, 60)))
                                    from (select k from jsonb_array_elements_text(v_item -> 'keywords') k limit 20) x);
    end if;

    update companies c
       set industry = case when c.industry = '' then v_industry else c.industry end,
           tags = array(select distinct unnest(c.tags || v_words)),
           industry_checked_at = now()
     where c.id = (v_item ->> 'company_id')::uuid;
    get diagnostics v_n = row_count;
    continue when v_n = 0;
    if v_industry = '' then v_unknown := v_unknown + 1; else v_classified := v_classified + 1; end if;
  end loop;

  return jsonb_build_object('classified', v_classified, 'unknown', v_unknown);
end;
$$;
revoke all on function public.store_company_industries(jsonb) from public, anon, authenticated;
