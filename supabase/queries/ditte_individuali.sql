-- Quante aziende con un contatto sono probabilmente ditte individuali o professionisti (dati personali), e quante società
-- (fuori dal GDPR). Analisi privacy del 24/10, checklist 98. Sola lettura: incollare nell'SQL Editor di Supabase.
-- La forma si deduce solo dal nome: «altro» comprende ditte individuali con nome di fantasia («Pizzeria da Mario») e
-- società che non scrivono la forma nel nome.
with con_contatto as (
  select id, name, domain, site_email, contact_form_url,
         lower(' ' || regexp_replace(name, '[^[:alnum:]]+', ' ', 'g') || ' ') as n
    from companies
   where site_email <> '' or contact_form_url <> ''
), classificate as (
  select *,
         case
           when n ~ ' (s ?r ?l ?s?|s ?p ?a|s ?n ?c|s ?a ?s|s ?a ?p ?a|soc|societa|società|coop|cooperativa|scarl|s ?c ?a ?r ?l|consorzio|fondazione|associazione|onlus|ltd|gmbh|group|gruppo|holding|spa) '
             then 'società o ente'
           when n ~ ' (dott|dottssa|dottoressa|dr|avv|avvocato|arch|architetto|ing|ingegnere|geom|geometra|rag|ragioniere|notaio|commercialista|psicologo|psicologa|medico|dentista|veterinario|fisioterapista|osteopata|perito|agronomo) '
             then 'professionista con titolo'
           when n ~ ' studio ' then 'studio (senza forma societaria)'
           else 'altro (ditta individuale o forma non scritta)'
         end as tipo
    from con_contatto
)
select tipo, count(*) as aziende, round(100.0 * count(*) / sum(count(*)) over (), 1) as percentuale
  from classificate
 group by tipo
 order by aziende desc;

-- Esempi da controllare a occhio: eseguire di nuovo sostituendo la select finale qui sopra con
-- select tipo, name, domain, site_email from classificate where tipo <> 'società o ente' order by random() limit 40;
