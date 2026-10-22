-- Punto 19 (22/10): pulizia dei dati di collaudo, decisa dall'utente dopo `inventario_collaudo.sql`.
-- CANCELLA DATI: le organizzazioni di prova «Scazza» e «Prova» (nessuna ricerca, nessun lead, nessun acquisto, solo i 15
-- crediti di benvenuto) e i loro utenti. «Webora» (admin, storico dei collaudi) resta com'è.
-- Sicurezze: si ferma senza toccare niente se una delle due ha ricerche, lead, segnalazioni, acquisti, pagamenti,
-- abbonamenti, un cliente Stripe, ticket, esportazioni, liste o avvisi, se il nome non corrisponde o se non le trova entrambe. Cancella un utente solo se non è admin e non appartiene ad altre
-- organizzazioni. Restano aziende, controlli dei siti, prove dei segnali, annunci e tutto il resto.
-- Tutto o niente: è un solo blocco, un errore annulla ogni cancellazione. Non si torna indietro (solo dal backup).

do $$
declare
  v_orgs uuid[] := array['3c021e86-4003-4f8c-b909-d58e6fcbb2dc', 'df44f7fc-25d1-4d68-86f3-20d03a7686e5']::uuid[];
  v_users uuid[];
  v_n integer;
begin
  -- Righe bloccate fino alla fine: niente ricerche o acquisti nuovi tra il controllo e la cancellazione (Code Reviewer).
  perform 1 from organizations where id = any (v_orgs) for update;
  select count(*) into v_n from organizations
   where id = any (v_orgs) and name in ('Scazza', 'Prova') and plan_id = 'free' and stripe_customer_id is null;
  if v_n <> 2 then
    raise exception 'Fermato: trovate % organizzazioni su 2 con nome, piano e senza cliente Stripe come attesi', v_n;
  end if;
  if exists (select 1 from searches where org_id = any (v_orgs))
     or exists (select 1 from deliveries where org_id = any (v_orgs))
     or exists (select 1 from lead_reports r join deliveries d on d.id = r.delivery_id where d.org_id = any (v_orgs))
     or exists (select 1 from credit_ledger where org_id = any (v_orgs) and kind not in ('grant', 'expire'))
     or exists (select 1 from search_alerts where org_id = any (v_orgs))
     or exists (select 1 from payments where org_id = any (v_orgs))
     or exists (select 1 from subscriptions where org_id = any (v_orgs))
     or exists (select 1 from support_tickets where org_id = any (v_orgs))
     or exists (select 1 from exports where org_id = any (v_orgs))
     or exists (select 1 from lead_lists where org_id = any (v_orgs)) then
    raise exception 'Fermato: una delle due organizzazioni ha ricerche, lead, segnalazioni, acquisti, pagamenti, ticket, esportazioni, liste o avvisi';
  end if;

  -- Utenti da togliere: solo membri di queste due, non admin, senza altre organizzazioni.
  select coalesce(array_agg(distinct m.user_id), '{}') into v_users
    from memberships m
   where m.org_id = any (v_orgs)
     and not exists (select 1 from memberships m2 where m2.user_id = m.user_id and not (m2.org_id = any (v_orgs)))
     and not exists (select 1 from profiles p where p.user_id = m.user_id and p.is_admin);

  delete from organizations where id = any (v_orgs);  -- a cascata: iscrizioni e crediti
  get diagnostics v_n = row_count;
  raise notice 'Organizzazioni cancellate: %', v_n;
  delete from auth.users where id = any (v_users);    -- a cascata: profili, accessi, sessioni
  get diagnostics v_n = row_count;
  raise notice 'Utenti cancellati: %', v_n;
end $$;

-- Controllo: deve restare solo «Webora».
select o.name, o.plan_id, (select count(*) from memberships m where m.org_id = o.id) as utenti from organizations o;
