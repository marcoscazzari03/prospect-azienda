-- Regione delle aziende dai loro dati, mai dalla ricerca in corso (collaudo del 19/10).
--
-- tag_company aggiungeva ai luoghi dell'azienda la regione cercata: un'azienda di Roma trovata
-- per sbaglio dall'AI in una ricerca sul Veneto restava «in Veneto» per tutte le ricerche
-- successive (Dinamica srl, Roma; A.m.A. Mobili, Porcia). Ora i luoghi vengono solo da città,
-- provincia e regione dell'azienda (OpenStreetMap) e, per le altre, dalla città quando è un
-- capoluogo di provincia (tabella it_provinces). Le aziende non importate da OpenStreetMap
-- vengono ricalcolate: dove la città non basta, la regione si toglie (meglio un'azienda in
-- meno che nella regione sbagliata).

create table if not exists public.it_provinces (
  sigla text primary key,
  nome text not null,
  regione text not null
);
alter table public.it_provinces enable row level security;

insert into public.it_provinces (sigla, nome, regione) values
  ('AL', 'Alessandria', 'Piemonte'),
  ('AT', 'Asti', 'Piemonte'),
  ('BI', 'Biella', 'Piemonte'),
  ('CN', 'Cuneo', 'Piemonte'),
  ('NO', 'Novara', 'Piemonte'),
  ('TO', 'Torino', 'Piemonte'),
  ('VB', 'Verbano-Cusio-Ossola', 'Piemonte'),
  ('VC', 'Vercelli', 'Piemonte'),
  ('AO', 'Aosta', 'Valle d''Aosta'),
  ('BG', 'Bergamo', 'Lombardia'),
  ('BS', 'Brescia', 'Lombardia'),
  ('CO', 'Como', 'Lombardia'),
  ('CR', 'Cremona', 'Lombardia'),
  ('LC', 'Lecco', 'Lombardia'),
  ('LO', 'Lodi', 'Lombardia'),
  ('MN', 'Mantova', 'Lombardia'),
  ('MI', 'Milano', 'Lombardia'),
  ('MB', 'Monza e Brianza', 'Lombardia'),
  ('PV', 'Pavia', 'Lombardia'),
  ('SO', 'Sondrio', 'Lombardia'),
  ('VA', 'Varese', 'Lombardia'),
  ('BZ', 'Bolzano', 'Trentino-Alto Adige'),
  ('TN', 'Trento', 'Trentino-Alto Adige'),
  ('BL', 'Belluno', 'Veneto'),
  ('PD', 'Padova', 'Veneto'),
  ('RO', 'Rovigo', 'Veneto'),
  ('TV', 'Treviso', 'Veneto'),
  ('VE', 'Venezia', 'Veneto'),
  ('VR', 'Verona', 'Veneto'),
  ('VI', 'Vicenza', 'Veneto'),
  ('GO', 'Gorizia', 'Friuli-Venezia Giulia'),
  ('PN', 'Pordenone', 'Friuli-Venezia Giulia'),
  ('TS', 'Trieste', 'Friuli-Venezia Giulia'),
  ('UD', 'Udine', 'Friuli-Venezia Giulia'),
  ('GE', 'Genova', 'Liguria'),
  ('IM', 'Imperia', 'Liguria'),
  ('SP', 'La Spezia', 'Liguria'),
  ('SV', 'Savona', 'Liguria'),
  ('BO', 'Bologna', 'Emilia-Romagna'),
  ('FE', 'Ferrara', 'Emilia-Romagna'),
  ('FC', 'Forlì-Cesena', 'Emilia-Romagna'),
  ('MO', 'Modena', 'Emilia-Romagna'),
  ('PR', 'Parma', 'Emilia-Romagna'),
  ('PC', 'Piacenza', 'Emilia-Romagna'),
  ('RA', 'Ravenna', 'Emilia-Romagna'),
  ('RE', 'Reggio Emilia', 'Emilia-Romagna'),
  ('RN', 'Rimini', 'Emilia-Romagna'),
  ('AR', 'Arezzo', 'Toscana'),
  ('FI', 'Firenze', 'Toscana'),
  ('GR', 'Grosseto', 'Toscana'),
  ('LI', 'Livorno', 'Toscana'),
  ('LU', 'Lucca', 'Toscana'),
  ('MS', 'Massa-Carrara', 'Toscana'),
  ('PI', 'Pisa', 'Toscana'),
  ('PT', 'Pistoia', 'Toscana'),
  ('PO', 'Prato', 'Toscana'),
  ('SI', 'Siena', 'Toscana'),
  ('PG', 'Perugia', 'Umbria'),
  ('TR', 'Terni', 'Umbria'),
  ('AN', 'Ancona', 'Marche'),
  ('AP', 'Ascoli Piceno', 'Marche'),
  ('FM', 'Fermo', 'Marche'),
  ('MC', 'Macerata', 'Marche'),
  ('PU', 'Pesaro e Urbino', 'Marche'),
  ('FR', 'Frosinone', 'Lazio'),
  ('LT', 'Latina', 'Lazio'),
  ('RI', 'Rieti', 'Lazio'),
  ('RM', 'Roma', 'Lazio'),
  ('VT', 'Viterbo', 'Lazio'),
  ('AQ', 'L''Aquila', 'Abruzzo'),
  ('CH', 'Chieti', 'Abruzzo'),
  ('PE', 'Pescara', 'Abruzzo'),
  ('TE', 'Teramo', 'Abruzzo'),
  ('CB', 'Campobasso', 'Molise'),
  ('IS', 'Isernia', 'Molise'),
  ('AV', 'Avellino', 'Campania'),
  ('BN', 'Benevento', 'Campania'),
  ('CE', 'Caserta', 'Campania'),
  ('NA', 'Napoli', 'Campania'),
  ('SA', 'Salerno', 'Campania'),
  ('BA', 'Bari', 'Puglia'),
  ('BT', 'Barletta-Andria-Trani', 'Puglia'),
  ('BR', 'Brindisi', 'Puglia'),
  ('FG', 'Foggia', 'Puglia'),
  ('LE', 'Lecce', 'Puglia'),
  ('TA', 'Taranto', 'Puglia'),
  ('MT', 'Matera', 'Basilicata'),
  ('PZ', 'Potenza', 'Basilicata'),
  ('CZ', 'Catanzaro', 'Calabria'),
  ('CS', 'Cosenza', 'Calabria'),
  ('KR', 'Crotone', 'Calabria'),
  ('RC', 'Reggio Calabria', 'Calabria'),
  ('VV', 'Vibo Valentia', 'Calabria'),
  ('AG', 'Agrigento', 'Sicilia'),
  ('CL', 'Caltanissetta', 'Sicilia'),
  ('CT', 'Catania', 'Sicilia'),
  ('EN', 'Enna', 'Sicilia'),
  ('ME', 'Messina', 'Sicilia'),
  ('PA', 'Palermo', 'Sicilia'),
  ('RG', 'Ragusa', 'Sicilia'),
  ('SR', 'Siracusa', 'Sicilia'),
  ('TP', 'Trapani', 'Sicilia'),
  ('CA', 'Cagliari', 'Sardegna'),
  ('NU', 'Nuoro', 'Sardegna'),
  ('OR', 'Oristano', 'Sardegna'),
  ('SS', 'Sassari', 'Sardegna'),
  ('SU', 'Sud Sardegna', 'Sardegna')
on conflict (sigla) do update set nome = excluded.nome, regione = excluded.regione;

-- Luoghi ricavati dalla città: la città stessa e, se è un capoluogo (anche una parte del nome della
-- provincia: Forlì, Cesena, Massa, Pesaro, Monza…), provincia e regione. Nomi ambigui esclusi (Reggio).
create or replace function public.city_places(p_city text)
returns text[] language sql stable set search_path = public as $$
  with nomi as (
    select p.nome, p.regione, lower(trim(x)) as parte
      from it_provinces p, regexp_split_to_table(p.nome, '\s*(-|\se\s)\s*') x
    union
    select p.nome, p.regione, lower(p.nome) from it_provinces p
  ),
  unici as (
    select parte, min(nome) as nome, min(regione) as regione from nomi group by parte having count(distinct nome) = 1
  )
  select array(select distinct unnest(term_stems(p_city) || coalesce(
           (select term_stems(u.nome) || term_stems(u.regione) from unici u where u.parte = lower(trim(coalesce(p_city, '')))), '{}')))
$$;

create or replace function public.tag_company(p_company uuid, p_target jsonb)
returns void language sql security definer set search_path = public as $$
  update companies c
     set tags = array(select distinct unnest(c.tags || term_stems(p_target ->> 'industry') || term_stems(c.industry))),
         places = array(select distinct unnest(c.places || city_places(c.city))),
         country_code = case when jsonb_array_length(coalesce(p_target -> 'countries', '[]')) = 1
                             then upper(p_target -> 'countries' ->> 0) else c.country_code end
   where c.id = p_company
$$;

-- Pulizia: luoghi ricalcolati dalla città per le aziende non importate da OpenStreetMap.
update public.companies c
   set places = city_places(c.city)
 where c.origin <> 'osm'
   and c.places is distinct from city_places(c.city);
