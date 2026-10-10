-- Limiti al modulo di opposizione (audit V3): per indirizzo, per IP e in totale.
alter table public.optout_requests add column if not exists ip_hash text;
create index if not exists optout_requests_email_idx on public.optout_requests (email_hash, created_at desc);
create index if not exists optout_requests_ip_idx on public.optout_requests (ip_hash, created_at desc);
create index if not exists optout_requests_created_idx on public.optout_requests (created_at desc);
