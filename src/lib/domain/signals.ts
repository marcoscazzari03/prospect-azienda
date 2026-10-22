import cmsReleases from "./cms-releases.json";

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
  {
    // Indicativo (20/10): un fatto osservato, non un'accusa di irregolarità. Mai decisivo da solo.
    code: "no_privacy",
    source: "website",
    level: "indicative",
    label: "Sito senza informativa privacy o cookie",
    description: "Nella homepage nessun link all'informativa privacy e nessun banner dei cookie.",
    evidence: "Nessun link all'informativa privacy né banner dei cookie nella homepage (controllata il {date})",
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

// Paesi con annunci di lavoro nel database: per ora solo l'Italia (la raccolta Adzuna è
// italiana; gli altri paesi si aggiungono quando estendiamo la raccolta).
export const JOB_AD_COUNTRIES = ["IT"] as const;

export type JobFamily = {
  code: string;
  label: string;
  // Titoli che fanno valere l'annuncio (minuscolo, senza accenti; confronto per parole).
  titles: Record<JobLang, string[]>;
  // Titoli cercati su Adzuna, se diversi da italiano + inglese: per le figure con molti annunci (manifattura) si cercano
  // solo i titoli principali, per stare nel limite di 2.500 chiamate al mese; gli altri titoli valgono per riconoscerli.
  adzuna?: string[];
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
  // Manifattura (punto 89, 22/10): operai, tecnici di impianto e magazzino, per chi seleziona personale per l'industria.
  // Per la raccolta Adzuna pochi titoli, quasi solo italiani: sono annunci numerosi e il limite è 2.500 chiamate al mese.
  {
    code: "production",
    label: "Operai specializzati / produzione",
    // Niente «operaio» da solo: porterebbe operai edili e agricoli e riempirebbe le 5 pagine di Adzuna (Code Reviewer).
    adzuna: ["operaio produzione", "operaio metalmeccanico", "operaio specializzato", "addetto produzione", "tornitore", "fresatore", "saldatore", "operatore cnc", "montatore meccanico", "welder"],
    titles: {
      it: ["operaio produzione", "operaio metalmeccanico", "operaio specializzato", "addetto produzione", "addetto alla produzione", "tornitore", "fresatore", "saldatore", "operatore cnc", "programmatore cnc", "programmatore cad", "programmatore cam", "attrezzista", "montatore meccanico", "verniciatore", "disegnatore meccanico", "responsabile di produzione"],
      en: ["welder", "cnc operator", "machine operator", "production operator"],
      es: ["operario de produccion", "soldador", "tornero", "operador cnc"],
      fr: ["operateur de production", "soudeur", "tourneur", "fraiseur", "operateur cnc"],
      de: ["produktionsmitarbeiter", "schweisser", "zerspanungsmechaniker", "cnc-fraser", "maschinenfuhrer"],
      pt: ["operador de producao", "soldador", "torneiro", "operador cnc"],
    },
  },
  {
    code: "maintenance",
    label: "Manutentori / tecnici di impianto e qualità",
    adzuna: ["manutentore", "elettricista industriale", "elettromeccanico", "tecnico plc", "addetto qualita", "maintenance technician"],
    titles: {
      it: ["manutentore", "elettricista industriale", "elettromeccanico", "programmatore plc", "tecnico plc", "addetto qualita", "responsabile qualita"],
      en: ["maintenance technician", "industrial electrician", "plc programmer", "quality technician"],
      es: ["tecnico de mantenimiento", "electricista industrial", "tecnico de calidad"],
      fr: ["technicien de maintenance", "electricien industriel", "technicien qualite"],
      de: ["instandhalter", "industrieelektriker", "elektroniker fur betriebstechnik", "qualitatsprufer"],
      pt: ["tecnico de manutencao", "eletricista industrial", "tecnico de qualidade"],
    },
  },
  {
    code: "logistics",
    label: "Magazzino / logistica",
    adzuna: ["magazziniere", "carrellista", "mulettista", "addetto magazzino", "warehouse operator"],
    titles: {
      it: ["magazziniere", "carrellista", "mulettista", "addetto magazzino", "responsabile magazzino", "responsabile logistica"],
      en: ["warehouse operator", "forklift driver", "warehouse manager"],
      es: ["mozo de almacen", "carretillero", "jefe de almacen"],
      fr: ["magasinier", "cariste", "responsable logistique"],
      de: ["lagerist", "staplerfahrer", "lagerleiter"],
      pt: ["operador de armazem", "operador de empilhador", "responsavel de armazem"],
    },
  },
];

// "Che servizio vendi?": aree e servizi della ricerca opportunità. Il cliente
// sceglie il servizio; i segnali li scegliamo noi con la regola del servizio
// (quali segnali, quali figure negli annunci, "basta uno" o "servono tutti").
// Un servizio esiste solo se ha almeno un segnale VERIFICATO che lo distingue.
export type OfferArea = { code: string; label: string; description: string; icon: "globe" | "cpu" | "megaphone" | "users" | "handshake" | "calculator" };

export const OFFER_AREAS: OfferArea[] = [
  { code: "web", label: "Siti web", description: "Siti nuovi, rifacimenti, manutenzione e sicurezza", icon: "globe" },
  { code: "it", label: "IT e sistemistica", description: "Assistenza, sviluppo, sicurezza informatica", icon: "cpu" },
  { code: "marketing", label: "Marketing e comunicazione", description: "Marketing digitale, grafica, traduzioni", icon: "megaphone" },
  { code: "hr", label: "HR e selezione", description: "Ricerca del personale, consulenza HR", icon: "users" },
  { code: "sales", label: "Commerciale", description: "Rete vendita, consulenza commerciale", icon: "handshake" },
  { code: "admin", label: "Amministrazione", description: "Contabilità e consulenza amministrativa", icon: "calculator" },
];

export type OfferDef = {
  code: string;
  area: string;
  label: string;
  description: string; // per il cliente: a chi serve
  lookFor: string; // cosa cerchiamo, in parole semplici (riepilogo e anteprima)
  signals: string[]; // al massimo 3
  jobFamilies: string[]; // solo se tra i segnali c'è "job_ad"
  match: "any" | "all";
  // Settori adatti, usati quando il cliente non sceglie un settore («tutti i settori»): per i
  // segnali che da soli dicono poco (un sito in una sola lingua ce l'ha quasi ogni piccola impresa).
  // Parole delle etichette delle aziende (categorie OSM e settori dell'AI), almeno una deve esserci.
  sectors?: string[];
  sectorsLabel?: string; // per il cliente, nel wizard
  sectorsWho?: string; // nell'anteprima: «Cercheremo <sectorsWho> con …»
};

export const OFFERS: OfferDef[] = [
  {
    code: "web_redesign", area: "web", label: "Rifacimento del sito",
    description: "Per chi realizza siti e restyling.",
    lookFor: "un sito datato: software non aggiornato o pagine non adatte ai cellulari",
    signals: ["outdated_cms", "no_mobile", "stale_copyright"], jobFamilies: [], match: "any",
  },
  {
    code: "wp_maintenance", area: "web", label: "Manutenzione WordPress",
    description: "Per chi gestisce e aggiorna siti WordPress, Joomla o WooCommerce.",
    lookFor: "un sito WordPress, Joomla o WooCommerce con una versione uscita da più di 2 anni",
    signals: ["outdated_cms"], jobFamilies: [], match: "any",
  },
  {
    code: "site_security", area: "web", label: "Sicurezza del sito",
    description: "Per chi mette in sicurezza siti e server.",
    lookFor: "un sito senza connessione sicura (HTTPS) o con software non aggiornato",
    signals: ["no_https", "outdated_cms", "no_privacy"], jobFamilies: [], match: "any",
  },
  {
    code: "it_support", area: "it", label: "Assistenza IT e sistemistica",
    description: "Per sistemisti, tecnici e aziende di assistenza informatica.",
    lookFor: "un annuncio di lavoro recente per sistemista o tecnico IT",
    signals: ["job_ad"], jobFamilies: ["it_systems"], match: "any",
  },
  {
    code: "software_dev", area: "it", label: "Sviluppo software",
    description: "Per software house e sviluppatori.",
    lookFor: "un annuncio di lavoro recente per sviluppatore",
    signals: ["job_ad"], jobFamilies: ["software_dev"], match: "any",
  },
  {
    code: "cybersecurity", area: "it", label: "Sicurezza informatica",
    description: "Per consulenti e aziende di cybersecurity.",
    lookFor: "un annuncio per figure di sicurezza o IT, oppure un sito senza HTTPS o con software non aggiornato",
    signals: ["job_ad", "no_https", "outdated_cms"], jobFamilies: ["cybersecurity", "it_systems"], match: "any",
  },
  {
    code: "digital_marketing", area: "marketing", label: "Marketing digitale",
    description: "Per agenzie e consulenti di marketing.",
    lookFor: "un annuncio di lavoro recente per marketing digitale o social media",
    signals: ["job_ad"], jobFamilies: ["digital_marketing"], match: "any",
  },
  {
    code: "graphic_design", area: "marketing", label: "Grafica e comunicazione",
    description: "Per grafici, studi creativi e web designer.",
    lookFor: "un annuncio di lavoro recente per grafico o web designer",
    signals: ["job_ad"], jobFamilies: ["design"], match: "any",
  },
  {
    code: "translation", area: "marketing", label: "Traduzioni ed export",
    description: "Per traduttori e consulenti per l'estero.",
    lookFor: "un sito disponibile in una sola lingua",
    signals: ["single_language"], jobFamilies: [], match: "any",
    // 19/10: senza settori 3.342 aziende, quasi tutte piccole attività locali (bar, parrucchieri).
    sectors: ["manifattura", "industria", "metalmeccanica", "agroalimentare", "cantina", "turismo", "ricettivo"],
    sectorsLabel: "Aziende che esportano o accolgono clienti stranieri: industria, agroalimentare, vino, turismo.",
    sectorsWho: "aziende di industria, agroalimentare, vino e turismo",
  },
  {
    code: "recruiting", area: "hr", label: "Selezione del personale",
    description: "Per agenzie e consulenti di selezione.",
    lookFor: "annunci di lavoro recenti per figure commerciali, amministrative o tecniche",
    signals: ["job_ad"], jobFamilies: ["sales", "accounting", "it_systems"], match: "any",
  },
  {
    code: "recruiting_industry", area: "hr", label: "Selezione di operai e tecnici",
    description: "Per agenzie per il lavoro e selezionatori di personale operativo nell'industria.",
    lookFor: "annunci di lavoro recenti per operai, manutentori o magazzinieri",
    signals: ["job_ad"], jobFamilies: ["production", "maintenance", "logistics"], match: "any",
  },
  {
    code: "hr_consulting", area: "hr", label: "Consulenza HR",
    description: "Per consulenti HR, paghe e organizzazione.",
    lookFor: "un annuncio di lavoro recente per risorse umane o paghe",
    signals: ["job_ad"], jobFamilies: ["hr"], match: "any",
  },
  {
    code: "sales_consulting", area: "sales", label: "Rete vendita e consulenza commerciale",
    description: "Per consulenti commerciali e agenzie di vendita.",
    lookFor: "un annuncio di lavoro recente per commerciali o account",
    signals: ["job_ad"], jobFamilies: ["sales"], match: "any",
  },
  {
    code: "accounting", area: "admin", label: "Contabilità e amministrazione",
    description: "Per commercialisti, consulenti e servizi amministrativi.",
    lookFor: "un annuncio di lavoro recente per contabilità o amministrazione",
    signals: ["job_ad"], jobFamilies: ["accounting"], match: "any",
  },
];

export const offerByCode = (code: string, offers: OfferDef[] = OFFERS) => offers.find((o) => o.code === code);
export const offersOfArea = (area: string, offers: OfferDef[] = OFFERS) => offers.filter((o) => o.area === area);
export const offerUsesJobAds = (o: OfferDef) => o.signals.includes("job_ad");

// Regole dei servizi modificabili dall'admin (app_settings "offer_rules"): per ogni
// servizio si può cambiare la regola o nasconderlo. Nomi e aree restano nel codice.
export type OfferRule = { enabled: boolean; signals: string[]; jobFamilies: string[]; match: "any" | "all"; lookFor: string };
export type OfferRules = Record<string, Partial<OfferRule>>;
export type ActiveOffer = OfferDef & { enabled: boolean; customized: boolean };

// Stessi vincoli del catalogo: errore in italiano, oppure null se la regola è valida.
export function validateOfferRule(r: Pick<OfferRule, "signals" | "jobFamilies" | "match" | "lookFor">): string | null {
  const codes = [...new Set(r.signals)];
  if (!codes.length) return "Scegli almeno un segnale.";
  if (codes.length > SIGNAL_RULES.maxSignalsPerSearch) return `Al massimo ${SIGNAL_RULES.maxSignalsPerSearch} segnali.`;
  if (codes.some((c) => !signalByCode(c))) return "Segnale sconosciuto.";
  if (!chargesSignal(codes)) return "Serve almeno un segnale verificato: gli indicativi da soli non bastano.";
  if (codes.includes("job_ad") && !r.jobFamilies.length) return "Con gli annunci di lavoro scegli almeno una figura.";
  if (r.jobFamilies.length > 3 || r.jobFamilies.some((f) => !jobFamilyByCode(f))) return "Figure degli annunci non valide (massimo 3).";
  if (r.match !== "any" && r.match !== "all") return "Combinazione non valida.";
  if (r.lookFor.trim().length < 10 || r.lookFor.length > 300) return "Scrivi cosa cerchiamo (da 10 a 300 caratteri).";
  return null;
}

// Catalogo + modifiche dell'admin. Una modifica non valida viene ignorata (vale il catalogo).
export function applyOfferRules(rules: OfferRules | null | undefined): ActiveOffer[] {
  return OFFERS.map((o) => {
    const r = rules?.[o.code];
    if (!r) return { ...o, enabled: true, customized: false };
    const merged = {
      signals: Array.isArray(r.signals) ? r.signals.map(String) : o.signals,
      jobFamilies: Array.isArray(r.jobFamilies) ? r.jobFamilies.map(String) : o.jobFamilies,
      match: r.match === "all" || r.match === "any" ? r.match : o.match,
      lookFor: typeof r.lookFor === "string" && r.lookFor.trim() ? r.lookFor.trim() : o.lookFor,
    };
    const fixed = { ...merged, jobFamilies: merged.signals.includes("job_ad") ? merged.jobFamilies : [] };
    const ok = !validateOfferRule(fixed);
    return { ...o, ...(ok ? fixed : {}), enabled: r.enabled !== false, customized: ok };
  });
}

// Date di rilascio (per "outdated_cms": più di 2 anni). Regola prudente: una
// versione V è vecchia se la sua data nota è oltre i 2 anni, oppure se esiste
// in tabella una versione successiva a V già uscita da oltre 2 anni. Versioni
// più recenti dell'ultima in tabella non vengono mai segnalate.
// I dati sono in cms-releases.json, letto anche dal motore n8n (build.py).
// WooCommerce: solo le versioni principali, prudenzialmente.
export const CMS_RELEASES: Record<"wordpress" | "joomla" | "woocommerce", [string, string][]> = cmsReleases as Record<
  "wordpress" | "joomla" | "woocommerce",
  [string, string][]
>;

export const signalByCode = (code: string) => SIGNALS.find((s) => s.code === code);
export const jobFamilyByCode = (code: string) => JOB_FAMILIES.find((f) => f.code === code);

// Nomi brevi per le etichette (tabelle, homepage).
export const SIGNAL_SHORT: Record<string, string> = {
  job_ad: "Annuncio attivo",
  no_https: "Senza HTTPS",
  no_mobile: "Non adatto ai cellulari",
  outdated_cms: "Software non aggiornato",
  single_language: "Una sola lingua",
  stale_copyright: "Fermo da tempo",
  under_construction: "In costruzione",
  no_booking_engine: "Senza prenotazioni online",
  no_privacy: "Senza informativa privacy",
};

export const VERIFIED_SIGNAL_CODES = SIGNALS.filter((s) => s.level === "verified").map((s) => s.code);

// Segnali scelti dal cliente -> target per motore e database (target.signals).
// I titoli degli annunci vanno al motore in tutte le lingue: confronta per parole.
export type SignalsChoice = { codes: string[]; match: "any" | "all"; jobFamilies: string[]; offer?: string; lookFor?: string };

export function toSignalsTarget(choice: SignalsChoice) {
  const codes = [...new Set(choice.codes)].filter((c) => signalByCode(c)).slice(0, SIGNAL_RULES.maxSignalsPerSearch);
  const families = codes.includes("job_ad")
    ? [...new Set(choice.jobFamilies)].map(jobFamilyByCode).filter((f): f is JobFamily => Boolean(f)).slice(0, 3)
    : [];
  return {
    ...(choice.offer && offerByCode(choice.offer) ? { offer: choice.offer } : {}),
    ...(choice.offer && choice.lookFor ? { look_for: choice.lookFor.slice(0, 300) } : {}),
    codes,
    match: choice.match,
    job_families: families.map((f) => ({
      code: f.code,
      label: f.label,
      titles: [...new Set(JOB_AD_LANGUAGES.flatMap((l) => f.titles[l]))],
    })),
    max_age_days: SIGNAL_RULES.jobAdMaxAgeDays,
  };
}

// Il servizio scelto dal cliente -> regola dei segnali (decisa da noi).
export function offerChoice(code: string, offers: OfferDef[] = OFFERS): SignalsChoice | null {
  const o = offerByCode(code, offers);
  return o ? { offer: o.code, codes: o.signals, match: o.match, jobFamilies: o.jobFamilies, lookFor: o.lookFor } : null;
}

// Anteprima della ricerca opportunità per servizio: cosa cerchiamo, in parole semplici.
export function describeOffer(args: { offer: string; industry: string; where: string; lookFor?: string; offers?: OfferDef[] }) {
  const found = offerByCode(args.offer, args.offers);
  const o = found ? { ...found, lookFor: args.lookFor || found.lookFor } : null;
  if (!o) return "";
  const sector = args.industry.trim().replace(/^\p{Lu}(?=\p{Ll})/u, (c) => c.toLowerCase());
  const who = `${sector || o.sectorsWho || "aziende di ogni settore"}${args.where ? ` in ${args.where}` : ""}`;
  return `Cercheremo ${who} con ${o.lookFor}. Ogni lead ha la prova (link e data): le aziende senza prova vengono escluse.`;
}

// Il lead con questi segnali costa crediti in più? (solo segnali verificati)
export const chargesSignal = (codes: string[]) => codes.some((c) => VERIFIED_SIGNAL_CODES.includes(c));

// Crediti in più per lead con segnale, modificabili dall'admin (app_settings
// "signal_extra_credits"; il database usa gli stessi valori, vedi signal_extra).
export type SignalPrices = { website: number; job_ad: number };
export const DEFAULT_SIGNAL_PRICES: SignalPrices = { website: SIGNAL_RULES.extraCredits, job_ad: SIGNAL_RULES.extraCredits };

// Crediti in più per i segnali scelti: il lead paga il prezzo più alto tra i
// segnali verificati che ha davvero (con «basta uno» può averne solo alcuni).
export function signalExtraRange(prices: SignalPrices, codes: string[]) {
  const values = codes.filter((c) => VERIFIED_SIGNAL_CODES.includes(c)).map((c) => (c === "job_ad" ? prices.job_ad : prices.website));
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 0 };
}

const credits = (n: number) => `${n} ${n === 1 ? "credito" : "crediti"}`;

// «+1 credito» oppure «+1 credito con segnali dal sito, +2 crediti con annunci di lavoro».
export function extraCreditsLabel(prices: SignalPrices) {
  return prices.website === prices.job_ad
    ? `+${credits(prices.website)}`
    : `+${credits(prices.website)} con segnali dal sito, +${credits(prices.job_ad)} con annunci di lavoro`;
}

// Frase mostrata sul lead: il fatto osservato con la data, mai il bisogno dedotto.
export type LeadSignal = { code: string; evidence?: { detail?: string; title?: string; date?: string; url?: string; checked_at?: string } };

const itDate = (d?: string) => {
  const m = String(d ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

export function signalPhrase(s: LeadSignal) {
  const def = signalByCode(s.code);
  const e = s.evidence ?? {};
  if (s.code === "job_ad") {
    const title = e.title ? `«${e.title}»` : "una figura richiesta";
    return `Annuncio per ${title}${e.date ? ` pubblicato il ${itDate(e.date)}` : ""}`;
  }
  const checked = itDate(e.checked_at);
  return `${e.detail || def?.label || s.code}${checked ? ` (controllato il ${checked})` : ""}`;
}

// Anteprima della ricerca opportunità: cosa faremo davvero, con le parole dei fatti.
export function describeOpportunity(args: { codes: string[]; match: "any" | "all"; jobFamilies: string[]; industry: string; where: string }) {
  const phrase = (c: string) => {
    if (c === "job_ad") {
      const fams = args.jobFamilies.map((f) => jobFamilyByCode(f)?.label).filter(Boolean).map((l) => `«${l}»`);
      return `un annuncio di lavoro per ${fams.length ? fams.join(" o ") : "la figura scelta"} negli ultimi ${SIGNAL_RULES.jobAdMaxAgeDays} giorni`;
    }
    return (signalByCode(c)?.label ?? c).toLowerCase().replace(/^sito /, "il sito ");
  };
  const join = (xs: string[], last: string) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} ${last} ${xs[xs.length - 1]}` : xs[0]);
  const decisive = args.codes.filter((c) => VERIFIED_SIGNAL_CODES.includes(c)).map(phrase);
  const extra = args.codes.filter((c) => !VERIFIED_SIGNAL_CODES.includes(c)).map(phrase);
  if (!decisive.length) return "";
  const sector = args.industry.trim().replace(/^\p{Lu}(?=\p{Ll})/u, (c) => c.toLowerCase()); // «Aziende…» -> «aziende…», non «IT…»
  const who = `${sector || "aziende del settore scelto"}${args.where ? ` in ${args.where}` : ""}`;
  return [
    `Cercheremo ${who} con ${join(decisive, args.match === "all" ? "e" : "oppure")}.`,
    extra.length ? `Ti indichiamo anche, come informazione in più, ${join(extra, "e")}.` : "",
    "Ogni segnale ha una prova (link e data): le aziende senza prova vengono escluse.",
  ].filter(Boolean).join(" ");
}

// Punteggio dell'opportunità (0-100), con regole fisse e spiegabili al cliente.
// Per ogni segnale: affidabilità della prova × attinenza al servizio venduto × freschezza;
// conta il segnale migliore, più un piccolo bonus per ogni altro segnale. Il segnale è un fatto
// osservato (con la prova); l'opportunità è dedotta, per questo il livello parla di
// «opportunità forte / probabile / potenziale» e mai di bisogno certo.
export const OPPORTUNITY_RULES = {
  // Affidabilità: quanto il fatto indica davvero un bisogno.
  reliability: {
    job_ad: 90, no_https: 90, outdated_cms: 85, under_construction: 70, no_mobile: 65,
    single_language: 50, no_booking_engine: 45, stale_copyright: 40, no_privacy: 40,
  } as Record<string, number>,
  // Attinenza al servizio scelto («Cosa vendi?»): il primo segnale del servizio è il principale.
  relevance: { primary: 1, secondary: 0.85, other: 0.7 },
  // Freschezza della prova (giorni dalla data dell'annuncio o del controllo).
  freshness: [[14, 1], [30, 0.9], [60, 0.75], [Infinity, 0.6]] as [number, number][],
  extraSignalBonus: 8,
  levels: [[75, "forte"], [50, "probabile"], [0, "potenziale"]] as [number, string][],
};

export type OpportunityScore = {
  score: number;
  level: string;
  parts: { code: string; reliability: number; relevance: number; freshness: number; ageDays: number | null }[];
};

export function opportunityScore(signals: LeadSignal[] | undefined, offerCode?: string, now = new Date()): OpportunityScore | null {
  if (!signals?.length) return null;
  const R = OPPORTUNITY_RULES;
  const offer = offerCode ? offerByCode(offerCode) : undefined;
  const parts = signals.map((s) => {
    const when = s.code === "job_ad" ? s.evidence?.date : s.evidence?.checked_at;
    const t = when ? Date.parse(String(when).slice(0, 10)) : NaN;
    const ageDays = Number.isFinite(t) ? Math.max(0, Math.floor((now.getTime() - t) / 86_400_000)) : null;
    const freshness = ageDays === null ? R.freshness[R.freshness.length - 1][1] : R.freshness.find(([d]) => ageDays <= d)![1];
    const relevance = !offer ? 1 : offer.signals[0] === s.code ? R.relevance.primary : offer.signals.includes(s.code) ? R.relevance.secondary : R.relevance.other;
    return { code: s.code, reliability: R.reliability[s.code] ?? 40, relevance, freshness, ageDays };
  });
  const best = Math.max(...parts.map((p) => p.reliability * p.relevance * p.freshness));
  const score = Math.round(Math.min(100, best + R.extraSignalBonus * (parts.length - 1)));
  const level = R.levels.find(([min]) => score >= min)![1];
  return { score, level, parts };
}
