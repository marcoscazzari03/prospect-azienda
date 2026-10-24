-- Professionisti con titolo esclusi (decisione dell'utente del 24/10, analisi privacy, checklist 98): «Avv. Mario Rossi»,
-- «Studio Arch. Bianchi», «Dott.ssa Verdi» senza forma societaria. Il nome dell'attività è quello di una persona: sono i
-- casi più esposti (dati personali, regole deontologiche degli albi, punto 93). Circa 130 aziende con contatto al 24/10.
-- Gli studi senza titolo («Studio Rossi») restano, con le garanzie della valutazione del legittimo interesse.
-- 1) is_professional_name (stessa regola di isProfessionalName in src/lib/domain/engine.ts, che filtra i lead del motore);
-- 2) is_non_target_company la comprende: niente import, controllo siti, disponibilità, avvisi;
-- 3) quelli già nel database restano ma non si usano più; si cancellano dopo aver guardato l'elenco
--    (supabase/queries/professionisti_esclusi.sql), con la query di cancellazione in fondo allo stesso file.
-- Sigle solo con il punto («Ing.», «Arch.»), «Dr» mai, niente «dentista» e «perito»: marchi come «Farmacia Dr. Max»,
-- «Ing Direct», «Hotel Arch», «Perito Moreno Viaggi» (Code Reviewer, 24/10); con una parola di settore nel nome il titolo è
-- parte del marchio e l'attività resta («Farmacia Dott. Rossi», «Autofficina Ing. Verdi», QA 24/10).
-- Indietro: rieseguire is_non_target_company dalla 035 e reindicizzare companies_check_queue_idx.

create or replace function public.is_professional_name(p_name text)
returns boolean language sql immutable parallel safe set search_path = public as $$
  select translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu')
           ~ '(^|[^a-z0-9])((dott|dott\.ssa|avv|arch|ing|geom|rag)\.|(dottor|dottore|dottoressa|avvocato|avvocata|architetto|ingegnere|geometra|ragioniere|notaio|commercialista|psicologo|psicologa|fisioterapista|osteopata|agronomo)([^a-z0-9]|$))'
     and (' ' || regexp_replace(translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu'), '[^a-z0-9]+', ' ', 'g') || ' ')
           !~ ' (s ?r ?l ?s?|s ?p ?a|s ?n ?c|s ?a ?s|soc|societa|coop|cooperativa|scarl|consorzio|fondazione|associazione|onlus|ltd|gmbh|group|gruppo|holding|stp) '
     -- Parole di settore: il titolo è parte del marchio di un'attività («Farmacia Dott. Rossi», «Dottor Gelato»), QA 24/10.
     and (' ' || regexp_replace(translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu'), '[^a-z0-9]+', ' ', 'g') || ' ')
           !~ ' (farmacia|parafarmacia|ottica|ottico|ristorante|trattoria|osteria|pizzeria|bar|caffe|gelato|gelateria|pasticceria|hotel|albergo|b b|impresa|edile|edilizia|costruzioni|officina|autofficina|carrozzeria|clinica|ambulatorio|veterinaria|veterinario|poliambulatorio|laboratorio|centro|negozio|shop|store|market|bike|car|cars|auto|service|services|express|digitale|digital|facile|online|web|academy|scuola|agenzia|immobiliare|assicurazioni|viaggi|tour) '
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

-- L'indice parziale della coda del controllo siti (071) usa is_non_target_company: va ricostruito (blocca per qualche
-- secondo le scritture su companies: meglio fuori dagli orari degli import).
reindex index public.companies_check_queue_idx;
