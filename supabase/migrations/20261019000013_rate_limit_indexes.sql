-- V12: indici per i conteggi dei limiti d'uso (export per utente, segnalazioni per organizzazione).
create index if not exists exports_user_recent_idx on public.exports (user_id, created_at desc);
create index if not exists lead_reports_org_recent_idx on public.lead_reports (org_id, created_at desc);
