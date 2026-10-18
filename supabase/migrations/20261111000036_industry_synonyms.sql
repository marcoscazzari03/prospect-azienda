-- Sinonimi dei settori (checklist di messa in produzione, fase 4): chi cerca «albergo» deve
-- trovare le aziende etichettate «hotel», chi cerca «odontoiatra» gli studi dentistici.
-- Le etichette delle aziende si allargano a tutto il gruppo di sinonimi quando ne contengono
-- uno: la ricerca (stesso confronto sulle etichette ovunque: riserva, disponibilità, magazzino)
-- resta com'è. Solo parole specifiche: «meccanico» non sta con «autofficina» perché vale anche
-- per la metalmeccanica.

create table if not exists public.industry_synonyms (
  grp integer not null,
  word text not null,
  stems text[] not null,
  primary key (grp, word)
);
alter table public.industry_synonyms enable row level security;
revoke all on public.industry_synonyms from public, anon, authenticated;

insert into public.industry_synonyms (grp, word, stems)
select g, w, term_stems(w)
  from (values
    (1, array['hotel', 'albergo', 'alberghi', 'alberghiero']),
    (2, array['dentista', 'dentisti', 'dentistico', 'odontoiatra', 'odontoiatri', 'odontoiatria', 'odontoiatrico']),
    (3, array['avvocato', 'avvocati', 'legale']),
    (4, array['commercialista', 'commercialisti', 'tributarista']),
    (5, array['ristorante', 'ristoranti', 'ristorazione', 'trattoria', 'osteria']),
    (6, array['parrucchiere', 'parrucchieri', 'acconciature', 'barbiere']),
    (7, array['estetista', 'estetica', 'estetico']),
    (8, array['elettricista', 'elettricisti', 'elettrico', 'elettrici']),
    (9, array['idraulico', 'idraulica', 'idraulici', 'termoidraulica']),
    (10, array['edilizia', 'edile', 'edili', 'costruzioni']),
    (11, array['informatica', 'informatico', 'software']),
    (12, array['bed and breakfast', 'affittacamere']),
    (13, array['autofficina', 'autoriparazioni']),
    (14, array['veterinario', 'veterinaria', 'veterinari']),
    (15, array['immobiliare', 'immobiliari']),
    (16, array['palestra', 'palestre', 'fitness']),
    (17, array['fisioterapia', 'fisioterapista', 'fisioterapisti']),
    (18, array['psicologo', 'psicologi', 'psicoterapia', 'psicoterapeuta']),
    (19, array['campeggio', 'camping']),
    (20, array['gelateria', 'gelato']),
    (21, array['panificio', 'panetteria', 'panifici']),
    (22, array['serramenti', 'infissi']),
    (23, array['falegnameria', 'falegname']),
    (24, array['ottica', 'ottico', 'occhiali']),
    (25, array['agriturismo', 'agriturismi']),
    (26, array['fioraio', 'fiorista']),
    (27, array['notaio', 'notai', 'notarile']),
    (28, array['architetto', 'architetti', 'architettura']),
    (29, array['geometra', 'geometri']),
    (30, array['assicurazioni', 'assicurativo']),
    (31, array['autoscuola', 'autoscuole']),
    (32, array['pasticceria', 'pasticcere'])
  ) v(g, words), unnest(words) w
on conflict (grp, word) do update set stems = excluded.stems;

-- Etichette allargate ai sinonimi: un gruppo si aggiunge quando una sua voce è già tutta
-- contenuta nelle etichette (per le voci di più parole servono tutte).
create or replace function public.expand_industry_tags(p_tags text[])
returns text[] language sql stable set search_path = public as $$
  select array(select distinct t from (
    select unnest(coalesce(p_tags, '{}')) as t
    union
    select unnest(s2.stems)
      from industry_synonyms s1
      join industry_synonyms s2 on s2.grp = s1.grp
     where cardinality(s1.stems) > 0 and s1.stems <@ coalesce(p_tags, '{}')
  ) x where t is not null)
$$;
revoke all on function public.expand_industry_tags(text[]) from public, anon, authenticated;

create or replace function public.companies_expand_tags()
returns trigger language plpgsql set search_path = public as $$
begin
  new.tags := expand_industry_tags(new.tags);
  return new;
end;
$$;

drop trigger if exists companies_expand_tags on public.companies;
create trigger companies_expand_tags
  before insert or update of tags on public.companies
  for each row execute function public.companies_expand_tags();

-- Aziende già nel database.
update public.companies c
   set tags = c.tags
 where exists (select 1 from industry_synonyms s where cardinality(s.stems) > 0 and s.stems <@ c.tags);
