-- Correzione della 052 trovata dal Code Reviewer (21/10).
-- 1. Un settore scritto ma senza termini utili («Studio», «PMI», «I.T.»: parole escluse o troppo corte) toglieva ogni filtro:
--    la riserva in target prendeva qualsiasi azienda della zona. Ora non corrisponde a nulla (come la 029), e il motore
--    passa alla ricerca AI.
-- 2. Scritta senza CTE, con i nomi delle funzioni completi (public.term_stems).
-- Indietro: rieseguire sector_matches dalla 052.
create or replace function public.sector_matches(p_target jsonb, p_industry text[], p_tags text[], p_name text, p_industry_text text)
returns boolean language sql stable as $$
  select case
    -- Settore scritto ma senza termini utili: nessuna corrispondenza.
    when cardinality(coalesce(p_industry, '{}')) = 0 and coalesce(btrim(p_target ->> 'industry'), '') <> '' then false
    -- Nessun settore: le parole chiave sono alternative (settori del servizio nelle ricerche «tutti i settori»).
    when cardinality(coalesce(p_industry, '{}')) = 0 then
      jsonb_array_length(coalesce(p_target -> 'industry_keywords', '[]')) = 0
      or exists (select 1 from jsonb_array_elements_text(coalesce(p_target -> 'industry_keywords', '[]')) k
                  where cardinality(public.term_stems(k)) > 0 and coalesce(p_tags, '{}') @> public.term_stems(k))
    -- Settore: tutte le sue parole e, se ci sono parole chiave utili, almeno una (etichette, nome, descrizione).
    else
      coalesce(p_tags, '{}') @> p_industry
      and (not exists (select 1 from jsonb_array_elements_text(coalesce(p_target -> 'industry_keywords', '[]')) k
                        where cardinality(public.term_stems(k)) > 0)
           or exists (select 1 from jsonb_array_elements_text(coalesce(p_target -> 'industry_keywords', '[]')) k
                       where cardinality(public.term_stems(k)) > 0
                         and (coalesce(p_tags, '{}') || public.term_stems(p_name) || public.term_stems(p_industry_text))
                             @> public.term_stems(k)))
  end
$$;
revoke all on function public.sector_matches(jsonb, text[], text[], text, text) from public, anon, authenticated;
