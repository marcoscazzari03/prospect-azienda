-- Settore: chi vende a un settore non è di quel settore. Collaudo del 19/10: Rossi S.p.A.
-- («Distribuzione alimentare per ristorazione e hotel») è uscita in una ricerca di «Hotel»,
-- perché le etichette dell'azienda contenevano «hotel».
--
-- Regola: nel settore di un'azienda, quello che viene dopo «per», «for», «rivolto a»,
-- «destinato a», «al servizio di» descrive i suoi clienti. Quelle parole (e i loro sinonimi)
-- non restano tra le etichette, a meno che non stiano anche nella parte prima. Vale per ogni
-- fonte delle etichette (settore, parole chiave dell'AI, settore della ricerca) perché si
-- applica nel trigger che già allarga le etichette ai sinonimi.
--
-- Eccezioni: le categorie di OpenStreetMap che contengono «per» nel nome (agenzia per il
-- lavoro, articoli per animali...), dove la seconda parte è il settore stesso.
--
-- Limite accettato: un'azienda «Software per hotel» non esce più cercando «Software per
-- hotel» nel database (la ricerca non tiene conto di «per»): la trova la ricerca AI. Meglio
-- un'azienda in meno dal database che un'azienda fuori target.

create or replace function public.industry_client_stems(p_industry text)
returns text[] language sql stable set search_path = public as $$
  with n as (
    select regexp_replace(lower(btrim(coalesce(p_industry, ''))), '\s+', ' ', 'g') as t
  ), m as (
    select t, regexp_match(t, '^(.*?) (?:per|for|rivolt[aoie]|destinat[aoie]|al servizio|a servizio) (.*)$') as p from n
  )
  select case
           when p is null or t in ('agenzia per il lavoro', 'articoli per animali', 'location per eventi',
                                   'prodotti per l''agricoltura')
             then '{}'::text[]
           else array(select x from unnest(expand_industry_tags(term_stems(p[2]))) x
                       where not x = any (expand_industry_tags(term_stems(p[1]))))
         end
    from m
$$;
revoke all on function public.industry_client_stems(text) from public, anon, authenticated;

create or replace function public.companies_expand_tags()
returns trigger language plpgsql set search_path = public as $$
begin
  new.tags := array(select t from unnest(expand_industry_tags(new.tags)) t
                     where not t = any (industry_client_stems(new.industry)));
  return new;
end;
$$;

-- Anche quando cambia il settore (la classificazione AI lo scrive dopo).
drop trigger if exists companies_expand_tags on public.companies;
create trigger companies_expand_tags
  before insert or update of tags, industry on public.companies
  for each row execute function public.companies_expand_tags();

-- Aziende già nel database con i clienti nel settore.
update public.companies c
   set tags = c.tags
 where cardinality(industry_client_stems(c.industry)) > 0
   and c.tags && industry_client_stems(c.industry);
