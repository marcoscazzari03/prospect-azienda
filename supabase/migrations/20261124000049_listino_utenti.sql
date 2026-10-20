-- Listino: «Fino a 3 utenti» tolto dal piano Growth (20/10). L'invito di altri utenti in un account non
-- esiste ancora (punto 43 della checklist): il listino non promette quello che l'app non fa.
update public.plans
   set features = '["600 crediti al mese", "Fino a 500 lead per ricerca", "5 ricerche in parallelo"]'
 where id = 'growth' and features ? 'Fino a 3 utenti';
