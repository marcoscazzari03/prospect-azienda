-- Email aziendali su un dominio «fratello» (collaudo del 19/10): hotel con il sito su un
-- dominio e l'email su un altro dello stesso nome (zoello.it / info@zoello.com,
-- magnagallo-hotel.com / info@magnagallo.it). Stessa regola del motore (nodo «Estrai email»):
-- stesso nome con un'altra estensione (almeno 4 lettere) o un nome che contiene l'altro
-- (almeno 6 lettere). Il motore le accetta solo se pubblicate sul sito ufficiale.

-- Nome del dominio senza estensione: zoello.it -> zoello, albergo.mo.it -> albergo,
-- magnagallo-hotel.com -> magnagallohotel.
create or replace function public.domain_label(p_domain text)
returns text language sql immutable as $$
  select regexp_replace(coalesce(
           case when cardinality(l) >= 3 and length(l[cardinality(l) - 1]) <= 3 then l[cardinality(l) - 2]
                else l[greatest(cardinality(l) - 1, 1)] end, ''), '[^a-z0-9]', '', 'g')
    from (select string_to_array(regexp_replace(lower(trim(coalesce(p_domain, ''))), '^www\.', ''), '.') as l) x
$$;

create or replace function public.email_on_domain(p_email text, p_domain text)
returns boolean language sql immutable as $$
  select coalesce(
    lower(split_part(p_email, '@', 2)) = lower(p_domain)
    or lower(split_part(p_email, '@', 2)) like '%.' || lower(p_domain)
    or (a = b and length(a) >= 4)
    or (least(length(a), length(b)) >= 6 and (strpos(a, b) > 0 or strpos(b, a) > 0)),
    false)
    from (select domain_label(split_part(p_email, '@', 2)) as a, domain_label(p_domain) as b) x
$$;
