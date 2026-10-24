-- Professionisti con titolo esclusi dalla migrazione 074: elenco da guardare prima di cancellarli. Sola lettura.
-- Da eseguire DOPO la migrazione 074. Se nell'elenco c'è un marchio o un'azienda vera, dimmelo prima di cancellare.
select name, domain, city, site_email <> '' as con_email
  from companies
 where is_professional_name(name)
 order by name;

-- Dopo il controllo, per cancellarli (con email, controlli e segnali, a cascata; non si recuperano):
-- delete from companies where is_professional_name(name);
