-- Punto 19 (22/10): inventario degli account e dei loro dati, per decidere cosa è collaudo da togliere.
-- Sola lettura, non cancella niente. Le email sono mascherate (prime 2 lettere + dominio): basta per riconoscere
-- i propri account di prova senza copiare indirizzi completi in chat. Una riga per organizzazione.
-- Dopo la scelta si prepara lo script di pulizia sulle sole organizzazioni indicate: le aziende, i controlli dei
-- siti, le prove dei segnali e il magazzino restano (servono a tutti).

select o.id as org_id,
       o.name as organizzazione,
       o.plan_id as piano,
       o.created_at::date as creata,
       (select string_agg(left(p.email, 2) || '…@' || split_part(p.email, '@', 2)
                          || case when p.is_admin then ' (admin)' else '' end, ', ')
          from memberships m join profiles p on p.user_id = m.user_id where m.org_id = o.id) as utenti,
       org_available_credits(o.id) as crediti,
       (select count(*) from searches s where s.org_id = o.id) as ricerche,
       (select count(*) from searches s where s.org_id = o.id and s.deleted_at is null) as ricerche_visibili,
       (select min(s.created_at)::date from searches s where s.org_id = o.id) as prima_ricerca,
       (select max(s.created_at)::date from searches s where s.org_id = o.id) as ultima_ricerca,
       (select count(*) from deliveries d where d.org_id = o.id) as lead_consegnati,
       (select count(*) from lead_reports r join deliveries d on d.id = r.delivery_id where d.org_id = o.id) as segnalazioni,
       (select count(*) from credit_ledger l where l.org_id = o.id and l.kind = 'purchase') as acquisti,
       (select count(*) from search_alerts a where a.org_id = o.id) as avvisi
  from organizations o
 order by o.created_at;
