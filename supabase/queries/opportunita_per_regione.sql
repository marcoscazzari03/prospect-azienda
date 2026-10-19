-- Opportunità pronte nel database, per servizio e regione (solo lettura, nessun costo).
-- Stesso calcolo del contatore del wizard, per un cliente nuovo (che non ha ancora ricevuto niente).
-- Senza il tetto di 501 del contatore. Regole dei servizi: quelle predefinite (non le modifiche dall'admin).
with servizi(servizio, target) as (values
  ('Rifacimento del sito', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"web_redesign","look_for":"un sito datato: software non aggiornato o pagine non adatte ai cellulari","codes":["outdated_cms","no_mobile","stale_copyright"],"match":"any","job_families":[],"max_age_days":60}}'::jsonb),
  ('Manutenzione WordPress', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"wp_maintenance","look_for":"un sito WordPress, Joomla o WooCommerce con una versione uscita da più di 2 anni","codes":["outdated_cms"],"match":"any","job_families":[],"max_age_days":60}}'::jsonb),
  ('Sicurezza del sito', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"site_security","look_for":"un sito senza connessione sicura (HTTPS) o con software non aggiornato","codes":["no_https","outdated_cms"],"match":"any","job_families":[],"max_age_days":60}}'::jsonb),
  ('Assistenza IT e sistemistica', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"it_support","look_for":"un annuncio di lavoro recente per sistemista o tecnico IT","codes":["job_ad"],"match":"any","job_families":[{"code":"it_systems","label":"Sistemista / tecnico IT","titles":["sistemista","tecnico informatico","tecnico it","amministratore di sistema","amministratore di rete","help desk","supporto it","system administrator","sysadmin","systems engineer","network administrator","network engineer","it technician","it support","administrador de sistemas","tecnico de sistemas","administrador de redes","soporte it","administrateur systeme","administrateur reseau","technicien informatique","technicien support","ingenieur systeme","systemadministrator","netzwerkadministrator","it-techniker","it-support","fachinformatiker systemintegration","tecnico de informatica","suporte it"]}],"max_age_days":60}}'::jsonb),
  ('Sviluppo software', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"software_dev","look_for":"un annuncio di lavoro recente per sviluppatore","codes":["job_ad"],"match":"any","job_families":[{"code":"software_dev","label":"Programmatore / sviluppatore","titles":["programmatore","sviluppatore","developer","software engineer","full stack","frontend","backend","software developer","programmer","web developer","programador","desarrollador","ingeniero de software","developpeur","ingenieur logiciel","programmeur","softwareentwickler","entwickler","programmierer","fachinformatiker anwendungsentwicklung","desenvolvedor","engenheiro de software"]}],"max_age_days":60}}'::jsonb),
  ('Sicurezza informatica', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"cybersecurity","look_for":"un annuncio per figure di sicurezza o IT, oppure un sito senza HTTPS o con software non aggiornato","codes":["job_ad","no_https","outdated_cms"],"match":"any","job_families":[{"code":"cybersecurity","label":"Sicurezza informatica","titles":["cyber security","cybersecurity","sicurezza informatica","security analyst","security engineer","information security","soc analyst","ciberseguridad","seguridad informatica","analista de seguridad","cybersecurite","securite informatique","analyste securite","it-sicherheit","informationssicherheit","ciberseguranca","seguranca informatica","analista de seguranca"]},{"code":"it_systems","label":"Sistemista / tecnico IT","titles":["sistemista","tecnico informatico","tecnico it","amministratore di sistema","amministratore di rete","help desk","supporto it","system administrator","sysadmin","systems engineer","network administrator","network engineer","it technician","it support","administrador de sistemas","tecnico de sistemas","administrador de redes","soporte it","administrateur systeme","administrateur reseau","technicien informatique","technicien support","ingenieur systeme","systemadministrator","netzwerkadministrator","it-techniker","it-support","fachinformatiker systemintegration","tecnico de informatica","suporte it"]}],"max_age_days":60}}'::jsonb),
  ('Marketing digitale', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"digital_marketing","look_for":"un annuncio di lavoro recente per marketing digitale o social media","codes":["job_ad"],"match":"any","job_families":[{"code":"digital_marketing","label":"Marketing digitale","titles":["digital marketing","marketing specialist","social media manager","seo specialist","marketing manager","web marketing","growth marketer","marketing digital","especialista en marketing","community manager","responsable de marketing","chef de projet marketing","responsable marketing","online-marketing","seo-manager","gestor de marketing","especialista em marketing"]}],"max_age_days":60}}'::jsonb),
  ('Grafica e comunicazione', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"graphic_design","look_for":"un annuncio di lavoro recente per grafico o web designer","codes":["job_ad"],"match":"any","job_families":[{"code":"design","label":"Grafica / web design","titles":["grafico","web designer","graphic designer","ui designer","ux designer","visual designer","disenador grafico","disenador web","graphiste","webdesigner","designer ui","designer ux","grafikdesigner","mediengestalter","designer grafico"]}],"max_age_days":60}}'::jsonb),
  ('Traduzioni ed export', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"translation","look_for":"un sito disponibile in una sola lingua","codes":["single_language"],"match":"any","job_families":[],"max_age_days":60}}'::jsonb),
  ('Selezione del personale', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"recruiting","look_for":"annunci di lavoro recenti per figure commerciali, amministrative o tecniche","codes":["job_ad"],"match":"any","job_families":[{"code":"sales","label":"Commerciale / vendite","titles":["commerciale","agente di commercio","sales manager","account manager","venditore","business developer","sales representative","account executive","comercial","representante de ventas","responsable comercial","commercial","attache commercial","responsable commercial","charge d affaires","vertriebsmitarbeiter","vertriebsleiter","aussendienst","key account manager","gestor de vendas","representante de vendas"]},{"code":"accounting","label":"Amministrazione / contabilità","titles":["contabile","impiegato amministrativo","addetto contabilita","controller","responsabile amministrativo","accountant","bookkeeper","finance assistant","accounts payable","contable","administrativo contable","controller financiero","auxiliar contable","comptable","assistant comptable","controleur de gestion","gestionnaire comptable","buchhalter","finanzbuchhalter","kaufmannische sachbearbeiter","contabilista","tecnico de contabilidade","controller financeiro","assistente administrativo"]},{"code":"it_systems","label":"Sistemista / tecnico IT","titles":["sistemista","tecnico informatico","tecnico it","amministratore di sistema","amministratore di rete","help desk","supporto it","system administrator","sysadmin","systems engineer","network administrator","network engineer","it technician","it support","administrador de sistemas","tecnico de sistemas","administrador de redes","soporte it","administrateur systeme","administrateur reseau","technicien informatique","technicien support","ingenieur systeme","systemadministrator","netzwerkadministrator","it-techniker","it-support","fachinformatiker systemintegration","tecnico de informatica","suporte it"]}],"max_age_days":60}}'::jsonb),
  ('Consulenza HR', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"hr_consulting","look_for":"un annuncio di lavoro recente per risorse umane o paghe","codes":["job_ad"],"match":"any","job_families":[{"code":"hr","label":"Risorse umane","titles":["risorse umane","hr specialist","hr manager","recruiter","selezione del personale","addetto paghe","human resources","talent acquisition","payroll","recursos humanos","tecnico de seleccion","nominas","ressources humaines","charge de recrutement","responsable rh","gestionnaire de paie","personalreferent","personalsachbearbeiter","lohnbuchhalter","tecnico de recrutamento","processamento salarial"]}],"max_age_days":60}}'::jsonb),
  ('Rete vendita e consulenza commerciale', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"sales_consulting","look_for":"un annuncio di lavoro recente per commerciali o account","codes":["job_ad"],"match":"any","job_families":[{"code":"sales","label":"Commerciale / vendite","titles":["commerciale","agente di commercio","sales manager","account manager","venditore","business developer","sales representative","account executive","comercial","representante de ventas","responsable comercial","commercial","attache commercial","responsable commercial","charge d affaires","vertriebsmitarbeiter","vertriebsleiter","aussendienst","key account manager","gestor de vendas","representante de vendas"]}],"max_age_days":60}}'::jsonb),
  ('Contabilità e amministrazione', '{"industry":"","industry_keywords":[],"countries":["IT"],"exclude_keywords":[],"signals":{"offer":"accounting","look_for":"un annuncio di lavoro recente per contabilità o amministrazione","codes":["job_ad"],"match":"any","job_families":[{"code":"accounting","label":"Amministrazione / contabilità","titles":["contabile","impiegato amministrativo","addetto contabilita","controller","responsabile amministrativo","accountant","bookkeeper","finance assistant","accounts payable","contable","administrativo contable","controller financiero","auxiliar contable","comptable","assistant comptable","controleur de gestion","gestionnaire comptable","buchhalter","finanzbuchhalter","kaufmannische sachbearbeiter","contabilista","tecnico de contabilidade","controller financeiro","assistente administrativo"]}],"max_age_days":60}}'::jsonb)
),
regioni(regione) as (values
  ('Lombardia'),
  ('Veneto'),
  ('Emilia-Romagna'),
  ('Piemonte'),
  ('Toscana'),
  ('Lazio'),
  ('Campania'),
  ('Puglia'),
  ('Sicilia'),
  ('Friuli-Venezia Giulia'),
  ('Trentino-Alto Adige'),
  ('Liguria'),
  ('Marche'),
  ('Umbria'),
  ('Abruzzo'),
  ('Sardegna'),
  ('Calabria'),
  ('Basilicata'),
  ('Molise'),
  ('Valle d''Aosta')
),
pool as (
  select s.servizio, p.id
    from servizi s
   cross join lateral opportunity_pool('00000000-0000-0000-0000-000000000000'::uuid, s.target, 1, '{}') p
),
per_regione as (
  select p.servizio, r.regione, count(*) as n
    from pool p
    join companies c on c.id = p.id
    -- Zona: come la ricerca (luoghi dell'azienda, città, regione e città dei suoi annunci).
    join regioni r on (c.places || term_stems(c.city)
                       || coalesce((select array_agg(distinct w) from job_ads j, unnest(term_stems(j.region) || term_stems(j.city)) w
                                     where j.company_id = c.id), '{}')) @> term_stems(r.regione)
   group by 1, 2
)
select s.servizio,
       (select count(*) from pool p where p.servizio = s.servizio) as italia,
       coalesce((select string_agg(regione || ' ' || n, ' · ' order by n desc, regione)
                   from per_regione x where x.servizio = s.servizio), '') as per_regione
  from servizi s
 order by italia desc, s.servizio;
