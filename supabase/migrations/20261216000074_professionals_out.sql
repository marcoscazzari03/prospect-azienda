-- Professionisti con titolo esclusi (decisione dell'utente del 24/10, analisi privacy, checklist 98): «Avv. Mario Rossi»,
-- «Studio Arch. Bianchi», «Dott.ssa Verdi» senza forma societaria. Il nome dell'attività è quello di una persona: sono i
-- casi più esposti (dati personali, regole deontologiche degli albi, punto 93). Circa 130 aziende con contatto al 24/10.
-- Gli studi senza titolo («Studio Rossi») restano, con le garanzie della valutazione del legittimo interesse.
-- 1) is_professional_name (stessa regola di isProfessionalName in src/lib/domain/engine.ts, che filtra i lead del motore);
-- 2) is_non_target_company la comprende: niente import, controllo siti, disponibilità, avvisi;
-- 3) quelli già nel database si cancellano (con email, controlli e segnali, a cascata).
-- Indietro: rieseguire is_non_target_company dalla 035 e reindicizzare companies_check_queue_idx; le aziende cancellate
-- tornano solo con i prossimi import.

create or replace function public.is_professional_name(p_name text)
returns boolean language sql immutable parallel safe set search_path = public as $$
  select translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu')
           ~ '(^|[^a-z0-9])(dott|dottssa|dottoressa|dr|avv|avvocato|avvocata|arch|architetto|ing|ingegnere|geom|geometra|rag|ragioniere|notaio|commercialista|psicologo|psicologa|dentista|fisioterapista|osteopata|perito|agronomo)([^a-z0-9]|$)'
     and (' ' || regexp_replace(translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu'), '[^a-z0-9]+', ' ', 'g') || ' ')
           !~ ' (s ?r ?l ?s?|s ?p ?a|s ?n ?c|s ?a ?s|soc|societa|coop|cooperativa|scarl|consorzio|fondazione|associazione|onlus|ltd|gmbh|group|gruppo|holding|stp) '
$$;

-- Come nella 035, più i professionisti.
create or replace function public.is_non_target_company(p_name text)
returns boolean language sql immutable set search_path = public as $$
  select translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu') ~
    ('(^|[^a-z])(a\.? ?s\.? ?d|s\.? ?s\.? ?d)\.?([^a-z]|$)'
     || '|\m(polisportiva|associazione sportiva|pro loco|parrocchia|comune di|consorzio di bonifica|servizio idrico|acquedotto)\M'
     || '|\m(parco commerciale|centro commerciale|outlet village|porto turistico)\M'
     || '|^ato\M|\macque s\.?p\.?a'
     || '|\m(sede di|filiale di|headquarters?)\M')
    or public.is_professional_name(p_name)
$$;

-- L'indice parziale della coda del controllo siti (071) usa is_non_target_company: va ricostruito.
reindex index public.companies_check_queue_idx;

do $$
declare
  v_n integer;
begin
  delete from companies where is_professional_name(name);
  get diagnostics v_n = row_count;
  raise notice 'professionisti con titolo cancellati: %', v_n;
end;
$$;
