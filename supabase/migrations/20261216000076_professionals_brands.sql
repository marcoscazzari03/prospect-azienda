-- Professionisti con titolo: regola più precisa dopo l'elenco del 24/10 (supabase/queries/professionisti_esclusi.sql, circa
-- 300 nomi guardati dall'utente). Restano fuori dall'esclusione le attività in cui il titolo è parte del marchio: «Apoteca
-- Dottor Puce», «Autoscuola Geom. Matteuzzi», «Cantine del Notaio», «Dottor Materasso», «Dottor Grandine», «Dottor Moto»,
-- «Ediltoscana di Geom. Panichi», «Bio Erboristeria Dott.ssa…», «Azienda agricola… dott. Paolo», «Ing. Polin & C.»,
-- «La Casa dell'Architetto», «Studio Dott. Tosiani – Amministrazioni Condominiali e Immobiliari». Stessa regola di
-- isProfessionalName in src/lib/domain/engine.ts.
-- Indietro: rieseguire is_professional_name dalla 074 e reindicizzare.

create or replace function public.is_professional_name(p_name text)
returns boolean language sql immutable parallel safe set search_path = public as $$
  select translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu')
           ~ '(^|[^a-z0-9])((dott|dott\.ssa|avv|arch|ing|geom|rag)\.|(dottor|dottore|dottoressa|avvocato|avvocata|architetto|ingegnere|geometra|ragioniere|notaio|commercialista|psicologo|psicologa|fisioterapista|osteopata|agronomo)([^a-z0-9]|$))'
     and (' ' || regexp_replace(translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu'), '[^a-z0-9]+', ' ', 'g') || ' ')
           !~ ' (s ?r ?l ?s?|s ?p ?a|s ?n ?c|s ?a ?s|soc|societa|coop|cooperativa|scarl|consorzio|fondazione|associazione|onlus|ltd|gmbh|group|gruppo|holding|stp) '
     -- Parole di settore: il titolo è parte del marchio di un'attività («Farmacia Dott. Rossi», «Dottor Gelato»), QA 24/10.
     and (' ' || regexp_replace(translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu'), '[^a-z0-9]+', ' ', 'g') || ' ')
           !~ ' (farmacia|parafarmacia|ottica|ottico|ristorante|trattoria|osteria|pizzeria|bar|caffe|gelato|gelateria|pasticceria|hotel|albergo|b b|impresa|edile|edilizia|costruzioni|officina|autofficina|carrozzeria|clinica|ambulatorio|veterinaria|veterinario|poliambulatorio|laboratorio|centro|negozio|shop|store|market|bike|car|cars|auto|service|services|express|digitale|digital|facile|online|web|academy|scuola|agenzia|immobiliare|assicurazioni|viaggi|tour|apoteca|apotheke|asilo|breakfast|casa|cantina|cantine|grandine|moto|com|acustica) | (edil|agricol|vinic|materass|erborist|autoscuol|immobiliar|condomin|amministrazion)[a-z]* '
     -- «Ing. Polin & C.»: società scritta con «& C.» (elenco del 24/10).
     and translate(lower(coalesce(p_name, '')), 'àáèéìíòóùú', 'aaeeiioouu') !~ '& ?c(\.|[^a-z]|$)'
$$;

-- is_non_target_company (074) la usa: l'indice parziale della coda del controllo siti va ricostruito.
reindex index public.companies_check_queue_idx;
