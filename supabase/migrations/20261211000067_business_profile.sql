-- Ricerche consigliate (punti 84–85, 23/10): «Di cosa si occupa la tua attività?» alla prima apertura dell'app.
-- Sull'organizzazione: la descrizione e la zona scritte dal cliente, le ricerche proposte da Haiku (già filtrate: solo
-- verso aziende e con lead nel database) e quando le ha saltate. Si scrivono solo dal server (azione dell'app con la
-- chiave di servizio, dopo il controllo dell'utente): nessuna regola RLS nuova, i membri leggono già la propria
-- organizzazione. L'interruttore sta in app_settings «suggested_searches» ("off", "admin", "all"; senza riga: "admin").
-- Indietro: drop delle cinque colonne.

alter table public.organizations
  add column if not exists business_description text not null default '' check (length(business_description) <= 500),
  add column if not exists business_area text not null default '' check (length(business_area) <= 120),
  add column if not exists business_suggestions jsonb,
  add column if not exists business_suggested_at timestamptz,
  add column if not exists business_skipped_at timestamptz;
