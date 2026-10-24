-- Minimizzazione (analisi privacy del 24/10, checklist 98): la descrizione degli annunci di lavoro non serve dopo i filtri
-- del workflow «Annunci | Raccolta Adzuna» e può contenere nomi e contatti di persone (selezionatori, «manda il CV a…»).
-- Da ora l'app non la salva più (src/app/api/engine/job-ads/route.ts); qui si svuotano quelle già salvate.
-- Indietro: non si recupera (i testi tornano solo dai prossimi giri, togliendo il filtro nella route).
update public.job_ads set description = '' where description <> '';
