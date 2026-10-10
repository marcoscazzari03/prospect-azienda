-- Riepilogo "dall'ultimo accesso" nella panoramica del cliente.
-- seen_at: ultima visita; since_at: inizio della finestra da riassumere
-- (la visita precedente, se è passata più di mezz'ora).
alter table public.profiles
  add column if not exists seen_at timestamptz,
  add column if not exists since_at timestamptz;
