-- Punto 40 (22/10): quanto rendono davvero le aziende che il wizard mostra come «disponibili».
-- Sola lettura. Da eseguire nell'editor SQL di Supabase; il risultato è una riga sola in JSON.

with vive as (
  -- Come target_pool: sito controllato negli ultimi 60 giorni con almeno un esito leggibile, Italia.
  select c.*
    from companies c
   where exists (select 1 from company_checks cc
                  where cc.company_id = c.id and cc.status in ('pass', 'fail')
                    and cc.checked_at > now() - interval '60 days')
     and (c.country_code = 'IT' or (c.country_code is null and lower(c.country) in ('italia', 'italy', 'it')))
),
composizione as (
  select count(*) as aziende_vive,
         count(*) filter (where site_email <> '') as con_email,
         count(*) filter (where site_email = '' and contact_form_url <> '') as solo_modulo,
         count(*) filter (where site_email = '' and contact_form_url = ''
                            and email_missed_at > now() - interval '90 days') as provate_senza_contatto,
         count(*) filter (where site_email = '' and contact_form_url = ''
                            and (email_missed_at is null or email_missed_at <= now() - interval '90 days')) as mai_provate
    from vive
),
giri as (
  -- Giri del motore degli ultimi 30 giorni: lead validi e motivi di scarto.
  select r.id, s.target ? 'signals' and jsonb_array_length(coalesce(s.target #> '{signals,codes}', '[]')) > 0 as opportunita,
         coalesce((r.stats ->> 'leads')::int, 0) as lead,
         coalesce(r.stats -> 'rejected_reasons', '{}') as motivi,
         r.requested
    from search_runs r join searches s on s.id = r.search_id
   where r.created_at > now() - interval '30 days' and r.status = 'completed'
),
motivi as (
  select g.opportunita, m.key as motivo, sum((m.value)::text::int) as quante
    from giri g, jsonb_each(g.motivi) m
   where jsonb_typeof(m.value) = 'number'
   group by 1, 2
),
consegne as (
  select count(*) as lead_consegnati_30g,
         count(*) filter (where coalesce(d.data #>> '{email,address}', '') = '') as consegnati_solo_modulo
    from deliveries d
   where d.delivered_at > now() - interval '30 days'
)
select jsonb_build_object(
  'composizione', (select to_jsonb(composizione) from composizione),
  'giri_30g', (select jsonb_build_object('giri', count(*), 'richiesti', sum(requested), 'lead_validi', sum(lead),
                                         'opportunita', count(*) filter (where opportunita)) from giri),
  'scarti_30g', (select coalesce(jsonb_agg(jsonb_build_object('opportunita', opportunita, 'motivo', motivo, 'quante', quante)
                                           order by quante desc), '[]') from motivi),
  'consegne_30g', (select to_jsonb(consegne) from consegne)
) as resa;
