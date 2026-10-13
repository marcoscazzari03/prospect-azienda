// Catalogo dei "Segnali": fatti verificabili che indicano che un'azienda può
// avere bisogno di un servizio. Fonte unica per motore, database e app.
// Le regole complete (cosa vale, cosa si scarta, che prova si salva) sono in
// docs/07-segnali.md. Questo file contiene solo dati, nessuna logica.

export type SignalLevel = "verified" | "indicative";
export type SignalSource = "job_ad" | "website";

export type SignalDef = {
  code: string;
  source: SignalSource;
  level: SignalLevel;
  label: string; // nome per il cliente
  description: string; // spiegazione breve nel form
  evidence: string; // frase sul lead: {placeholder} riempiti dal motore
  freshDays: number; // dopo quanti giorni la prova va ricontrollata
};

// Regole comuni (fase 0, decise il 13/10).
export const SIGNAL_RULES = {
  maxSignalsPerSearch: 3,
  extraCredits: 1, // +1 credito per lead consegnato con almeno un segnale verificato
  refundWindowDays: 14, // motivo di segnalazione "segnale non corretto"
  jobAdMaxAgeDays: 60,
  websiteFreshDays: 30,
} as const;

export const SIGNALS: SignalDef[] = [
  {
    code: "job_ad",
    source: "job_ad",
    level: "verified",
    label: "Sta assumendo una figura",
    description: "Annuncio di lavoro pubblicato negli ultimi 60 giorni per la figura che scegli.",
    evidence: "Annuncio per «{title}» pubblicato il {date}",
    freshDays: SIGNAL_RULES.jobAdMaxAgeDays,
  },
  {
    code: "no_https",
    source: "website",
    level: "verified",
    label: "Sito senza connessione sicura",
    description: "Il sito non usa HTTPS o il certificato è scaduto o non valido.",
    evidence: "{detail} (controllato il {date})",
    freshDays: SIGNAL_RULES.websiteFreshDays,
  },
  {
    code: "no_mobile",
    source: "website",
    level: "verified",
    label: "Sito non adatto ai cellulari",
    description: "La homepage non ha l'impostazione per i dispositivi mobili.",
    evidence: "Homepage senza impostazione per dispositivi mobili (controllata il {date})",
    freshDays: SIGNAL_RULES.websiteFreshDays,
  },
  {
    code: "outdated_cms",
    source: "website",
    level: "verified",
    label: "Sito con software non aggiornato",
    description: "WordPress, Joomla o WooCommerce in una versione uscita da più di 2 anni.",
    evidence: "{cms} {version}, versione del {released} (controllato il {date})",
    freshDays: SIGNAL_RULES.websiteFreshDays,
  },
  {
    code: "single_language",
    source: "website",
    level: "verified",
    label: "Sito in una sola lingua",
    description: "Nessuna versione del sito in altre lingue.",
    evidence: "Nessuna versione in altre lingue trovata (controllato il {date})",
    freshDays: SIGNAL_RULES.websiteFreshDays,
  },
  {
    code: "stale_copyright",
    source: "website",
    level: "indicative",
    label: "Sito fermo da tempo",
    description: "L'anno del copyright è fermo da almeno 3 anni.",
    evidence: "Copyright fermo al {year}",
    freshDays: SIGNAL_RULES.websiteFreshDays,
  },
  {
    code: "under_construction",
    source: "website",
    level: "indicative",
    label: "Sito in costruzione",
    description: "La homepage è una pagina provvisoria o «in costruzione».",
    evidence: "Homepage provvisoria (controllata il {date})",
    freshDays: SIGNAL_RULES.websiteFreshDays,
  },
  {
    code: "no_booking_engine",
    source: "website",
    level: "indicative",
    label: "Nessun sistema di prenotazione riconosciuto",
    description: "Solo per hotel e strutture ricettive: nessun booking engine noto nella homepage.",
    evidence: "Nessun booking engine riconosciuto nella homepage (controllata il {date})",
    freshDays: SIGNAL_RULES.websiteFreshDays,
  },
];

// Tecnologie riconosciute: filtro di segmentazione, non un segnale di bisogno.
export const TECHNOLOGIES = ["wordpress", "woocommerce", "joomla", "wix", "shopify"] as const;
export type Technology = (typeof TECHNOLOGIES)[number];
export const TECHNOLOGY_LABEL: Record<Technology, string> = {
  wordpress: "WordPress",
  woocommerce: "WooCommerce",
  joomla: "Joomla",
  wix: "Wix",
  shopify: "Shopify",
};

// Lingue in cui riconosciamo i titoli degli annunci al lancio.
export const JOB_AD_LANGUAGES = ["it", "en", "es", "fr", "de", "pt"] as const;
export type JobLang = (typeof JOB_AD_LANGUAGES)[number];

// Paesi in cui il segnale "annuncio" è disponibile al lancio (lingua coperta).
export const JOB_AD_COUNTRIES = ["IT", "ES", "PT", "FR", "BE", "LU", "CH", "DE", "AT", "GB", "IE", "MT", "US", "CA", "AU"] as const;

export type JobFamily = {
  code: string;
  label: string;
  // Titoli che fanno valere l'annuncio (minuscolo, senza accenti; confronto per parole).
  titles: Record<JobLang, string[]>;
};

export const JOB_FAMILIES: JobFamily[] = [
  {
    code: "it_systems",
    label: "Sistemista / tecnico IT",
    titles: {
      it: ["sistemista", "tecnico informatico", "tecnico it", "amministratore di sistema", "amministratore di rete", "help desk", "supporto it"],
      en: ["system administrator", "sysadmin", "systems engineer", "network administrator", "network engineer", "it technician", "it support", "help desk"],
      es: ["administrador de sistemas", "tecnico de sistemas", "tecnico informatico", "administrador de redes", "soporte it"],
      fr: ["administrateur systeme", "administrateur reseau", "technicien informatique", "technicien support", "ingenieur systeme"],
      de: ["systemadministrator", "netzwerkadministrator", "it-techniker", "it-support", "fachinformatiker systemintegration"],
      pt: ["administrador de sistemas", "tecnico de informatica", "administrador de redes", "suporte it"],
    },
  },
  {
    code: "software_dev",
    label: "Programmatore / sviluppatore",
    titles: {
      it: ["programmatore", "sviluppatore", "developer", "software engineer", "full stack", "frontend", "backend"],
      en: ["software developer", "software engineer", "developer", "programmer", "full stack", "frontend", "backend", "web developer"],
      es: ["programador", "desarrollador", "developer", "ingeniero de software"],
      fr: ["developpeur", "ingenieur logiciel", "programmeur", "developer"],
      de: ["softwareentwickler", "entwickler", "programmierer", "developer", "fachinformatiker anwendungsentwicklung"],
      pt: ["programador", "desenvolvedor", "developer", "engenheiro de software"],
    },
  },
  {
    code: "cybersecurity",
    label: "Sicurezza informatica",
    titles: {
      it: ["cyber security", "cybersecurity", "sicurezza informatica", "security analyst", "security engineer"],
      en: ["cyber security", "cybersecurity", "security analyst", "security engineer", "information security", "soc analyst"],
      es: ["ciberseguridad", "seguridad informatica", "analista de seguridad"],
      fr: ["cybersecurite", "securite informatique", "analyste securite"],
      de: ["it-sicherheit", "cybersecurity", "informationssicherheit", "security engineer"],
      pt: ["ciberseguranca", "seguranca informatica", "analista de seguranca"],
    },
  },
  {
    code: "digital_marketing",
    label: "Marketing digitale",
    titles: {
      it: ["digital marketing", "marketing specialist", "social media manager", "seo specialist", "marketing manager", "web marketing"],
      en: ["digital marketing", "marketing specialist", "social media manager", "seo specialist", "marketing manager", "growth marketer"],
      es: ["marketing digital", "especialista en marketing", "community manager", "responsable de marketing"],
      fr: ["marketing digital", "chef de projet marketing", "community manager", "responsable marketing"],
      de: ["online-marketing", "marketing manager", "social media manager", "seo-manager"],
      pt: ["marketing digital", "gestor de marketing", "social media manager", "especialista em marketing"],
    },
  },
  {
    code: "sales",
    label: "Commerciale / vendite",
    titles: {
      it: ["commerciale", "agente di commercio", "sales manager", "account manager", "venditore", "business developer"],
      en: ["sales manager", "account manager", "sales representative", "business developer", "account executive"],
      es: ["comercial", "representante de ventas", "account manager", "responsable comercial"],
      fr: ["commercial", "attache commercial", "business developer", "responsable commercial", "charge d affaires"],
      de: ["vertriebsmitarbeiter", "account manager", "vertriebsleiter", "aussendienst", "key account manager"],
      pt: ["comercial", "gestor de vendas", "account manager", "representante de vendas"],
    },
  },
  {
    code: "hr",
    label: "Risorse umane",
    titles: {
      it: ["risorse umane", "hr specialist", "hr manager", "recruiter", "selezione del personale", "addetto paghe"],
      en: ["hr specialist", "hr manager", "human resources", "recruiter", "talent acquisition", "payroll"],
      es: ["recursos humanos", "tecnico de seleccion", "hr manager", "nominas"],
      fr: ["ressources humaines", "charge de recrutement", "responsable rh", "gestionnaire de paie"],
      de: ["personalreferent", "personalsachbearbeiter", "recruiter", "hr manager", "lohnbuchhalter"],
      pt: ["recursos humanos", "tecnico de recrutamento", "hr manager", "processamento salarial"],
    },
  },
  {
    code: "accounting",
    label: "Amministrazione / contabilità",
    titles: {
      it: ["contabile", "impiegato amministrativo", "addetto contabilita", "controller", "responsabile amministrativo"],
      en: ["accountant", "bookkeeper", "finance assistant", "controller", "accounts payable"],
      es: ["contable", "administrativo contable", "controller financiero", "auxiliar contable"],
      fr: ["comptable", "assistant comptable", "controleur de gestion", "gestionnaire comptable"],
      de: ["buchhalter", "finanzbuchhalter", "controller", "kaufmannische sachbearbeiter"],
      pt: ["contabilista", "tecnico de contabilidade", "controller financeiro", "assistente administrativo"],
    },
  },
  {
    code: "design",
    label: "Grafica / web design",
    titles: {
      it: ["grafico", "web designer", "graphic designer", "ui designer", "ux designer"],
      en: ["graphic designer", "web designer", "ui designer", "ux designer", "visual designer"],
      es: ["disenador grafico", "disenador web", "ui designer", "ux designer"],
      fr: ["graphiste", "webdesigner", "designer ui", "designer ux"],
      de: ["grafikdesigner", "webdesigner", "ui designer", "ux designer", "mediengestalter"],
      pt: ["designer grafico", "web designer", "ui designer", "ux designer"],
    },
  },
];

// "Cosa offri?": servizi del cliente -> segnali consigliati. L'AI (fase 4)
// può proporre solo combinazioni presenti qui.
export type ServiceDef = { code: string; label: string; jobFamilies: string[]; signals: string[] };

export const SERVICES: ServiceDef[] = [
  { code: "it_services", label: "Sistemistica e assistenza IT", jobFamilies: ["it_systems"], signals: ["job_ad"] },
  { code: "software", label: "Sviluppo software", jobFamilies: ["software_dev"], signals: ["job_ad"] },
  { code: "security", label: "Sicurezza informatica", jobFamilies: ["cybersecurity", "it_systems"], signals: ["job_ad", "no_https", "outdated_cms"] },
  { code: "websites", label: "Siti web e restyling", jobFamilies: ["design"], signals: ["no_mobile", "no_https", "stale_copyright", "under_construction"] },
  { code: "wp_maintenance", label: "Manutenzione WordPress / WooCommerce", jobFamilies: [], signals: ["outdated_cms", "no_https"] },
  { code: "marketing", label: "Marketing digitale", jobFamilies: ["digital_marketing"], signals: ["job_ad"] },
  { code: "sales_outsourcing", label: "Consulenza commerciale / vendite", jobFamilies: ["sales"], signals: ["job_ad"] },
  { code: "hr_consulting", label: "Consulenza HR e selezione", jobFamilies: ["hr"], signals: ["job_ad"] },
  { code: "accounting_services", label: "Contabilità e consulenza amministrativa", jobFamilies: ["accounting"], signals: ["job_ad"] },
  { code: "translation", label: "Traduzioni ed export", jobFamilies: [], signals: ["single_language"] },
  { code: "hotel_booking", label: "Prenotazioni online per hotel", jobFamilies: [], signals: ["no_booking_engine", "no_mobile"] },
];

// Date di rilascio (per "outdated_cms": più di 2 anni). Regola prudente: una
// versione V è vecchia se la sua data nota è oltre i 2 anni, oppure se esiste
// in tabella una versione successiva a V già uscita da oltre 2 anni. Versioni
// più recenti dell'ultima in tabella non vengono mai segnalate.
export const CMS_RELEASES: Record<"wordpress" | "joomla" | "woocommerce", [string, string][]> = {
  wordpress: [
    ["4.9", "2017-11-16"], ["5.0", "2018-12-06"], ["5.1", "2019-02-21"], ["5.2", "2019-05-07"], ["5.3", "2019-11-12"],
    ["5.4", "2020-03-31"], ["5.5", "2020-08-11"], ["5.6", "2020-12-08"], ["5.7", "2021-03-09"], ["5.8", "2021-07-20"],
    ["5.9", "2022-01-25"], ["6.0", "2022-05-24"], ["6.1", "2022-11-01"], ["6.2", "2023-03-29"], ["6.3", "2023-08-08"],
    ["6.4", "2023-11-07"], ["6.5", "2024-04-02"], ["6.6", "2024-07-16"], ["6.7", "2024-11-12"], ["6.8", "2025-04-15"],
  ],
  joomla: [
    ["3.9", "2018-10-30"], ["3.10", "2021-08-17"], ["4.0", "2021-08-17"], ["4.1", "2022-02-15"], ["4.2", "2022-08-16"],
    ["4.3", "2023-04-18"], ["4.4", "2023-10-17"], ["5.0", "2023-10-17"], ["5.1", "2024-04-16"], ["5.2", "2024-10-15"],
    ["5.3", "2025-04-15"],
  ],
  // Solo le versioni principali, prudenzialmente (da ricontrollare sul changelog in fase 2).
  woocommerce: [
    ["5.0", "2021-02-09"], ["6.0", "2021-12-14"], ["7.0", "2022-10-11"], ["8.0", "2023-08-08"], ["9.0", "2024-06-11"],
  ],
};

export const signalByCode = (code: string) => SIGNALS.find((s) => s.code === code);
export const jobFamilyByCode = (code: string) => JOB_FAMILIES.find((f) => f.code === code);
