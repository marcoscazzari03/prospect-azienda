-- Esempi reali per gli inviti della beta: aziende con segnali verificati sul sito nelle province delle agenzie
-- (solo lettura, nessun costo: niente crediti, niente AI). Solo dati d'azienda, nessuna email.
-- Cambiare l'elenco delle province qui sotto se serve.
with province(provincia) as (values ('Foggia'), ('Bari'), ('Napoli')),
aziende as (
  select p.provincia, c.id, c.name, c.city, c.industry, c.website, c.size_hint, c.domain
    from province p
    join companies c on c.places @> term_stems(p.provincia)
   where c.website <> ''
     and not is_large_company(c.id, c.domain, c.size_hint, c.name)
),
segnali as (
  select a.provincia, a.name, a.city, a.industry, a.website,
         count(*) filter (where s.code in ('outdated_cms', 'no_mobile', 'no_https')) as verificati,
         string_agg(case s.code when 'outdated_cms' then 'Software non aggiornato'
                                when 'no_mobile' then 'Non adatto ai cellulari'
                                when 'no_https' then 'Senza HTTPS'
                                when 'stale_copyright' then 'Copyright vecchio' end
                    || coalesce(': ' || nullif(s.evidence ->> 'detail', ''), '')
                    || ' (' || to_char(s.checked_at, 'DD/MM/YYYY') || ')', ' | ' order by s.code) as dettaglio,
         max(s.checked_at) as ultimo
    from aziende a
    join company_signals s on s.company_id = a.id
   where s.code in ('outdated_cms', 'no_mobile', 'no_https', 'stale_copyright')
     and s.checked_at > now() - interval '60 days'
   group by 1, 2, 3, 4, 5
),
ordinate as (
  select *, row_number() over (partition by provincia order by verificati desc, ultimo desc) as n
    from segnali where verificati > 0
)
select provincia, n, name as azienda, city as citta, industry as settore, website as sito, dettaglio as segnali
  from ordinate
 where n <= 8
 order by provincia, n;
