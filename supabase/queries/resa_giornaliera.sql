-- Resa giornaliera del database (23/10, punto 92): quante aziende entrano e quante diventano lead pronti, e quali campi
-- copriamo. Sola lettura: eseguire una query alla volta nel SQL Editor di Supabase.
-- «Lead pronto» = azienda in target (non portale né pagina ospitata) con email aziendale o modulo di contatto.

-- R1 Ultimi 14 giorni, giorno per giorno: aziende nuove (per origine), siti controllati, email e moduli trovati
with giorni as (
  select generate_series(current_date - 13, current_date, interval '1 day')::date as g
), vive as (
  select c.* from companies c
   where not is_platform_domain(c.domain) and not is_hosted_page(c.website, c.name) and not is_non_target_company(c.name)
)
select to_char(g, 'DD/MM') as giorno,
       (select count(*) from vive v where v.first_seen_at::date = g) as nuove,
       (select count(*) from vive v where v.first_seen_at::date = g and v.origin = 'osm') as nuove_osm,
       (select count(*) from vive v where v.first_seen_at::date = g and v.origin = 'osm_sito') as nuove_osm_sito,
       (select count(*) from vive v where v.site_checked_at::date = g) as siti_controllati,
       (select count(*) from vive v where v.site_email_at::date = g) as email_nuove,
       (select count(*) from vive v where v.contacts_checked_at::date = g and coalesce(v.site_email, '') = ''
           and coalesce(v.contact_form_url, '') <> '') as solo_modulo_ultimo_giro
  from giorni
 order by g;

-- R2 Imbuto di oggi: quante aziende sono in ogni stato (lead pronti = con_email + solo_modulo)
select count(*) as aziende_vive,
       count(*) filter (where c.site_checked_at is null) as sito_mai_controllato,
       count(*) filter (where c.site_checked_at is not null and c.contacts_checked_at is null
                          and coalesce(c.site_email, '') = '' and coalesce(c.contact_form_url, '') = '') as contatti_da_cercare,
       count(*) filter (where coalesce(c.site_email, '') <> '') as con_email,
       count(*) filter (where coalesce(c.site_email, '') = '' and coalesce(c.contact_form_url, '') <> '') as solo_modulo,
       count(*) filter (where c.contacts_checked_at is not null
                          and coalesce(c.site_email, '') = '' and coalesce(c.contact_form_url, '') = '') as cercati_senza_contatto
  from companies c
 where not is_platform_domain(c.domain) and not is_hosted_page(c.website, c.name) and not is_non_target_company(c.name);

-- R3 Campi coperti, in percentuale sulle aziende vive e sui lead pronti
with vive as (
  select c.*, (coalesce(c.site_email, '') <> '' or coalesce(c.contact_form_url, '') <> '') as pronto
    from companies c
   where not is_platform_domain(c.domain) and not is_hosted_page(c.website, c.name) and not is_non_target_company(c.name)
)
select gruppo,
       count(*) as aziende,
       round(100.0 * count(*) filter (where industry <> '') / count(*), 1) as settore,
       round(100.0 * count(*) filter (where city <> '') / count(*), 1) as citta,
       round(100.0 * count(*) filter (where coalesce(site_email, '') <> '') / count(*), 1) as email,
       round(100.0 * count(*) filter (where coalesce(contact_form_url, '') <> '') / count(*), 1) as modulo,
       round(100.0 * count(*) filter (where technologies is not null and technologies::text not in ('', '[]', '{}')) / count(*), 1) as tecnologie,
       round(100.0 * count(*) filter (where exists (select 1 from company_checks k where k.company_id = v.id and k.status = 'pass')) / count(*), 1) as almeno_un_segnale
  from vive v
 cross join lateral (values ('tutte'), (case when v.pronto then 'lead pronti' end)) as x(gruppo)
 where gruppo is not null
 group by gruppo
 order by gruppo desc;
