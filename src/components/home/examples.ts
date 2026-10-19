import type { LeadSignal } from "@/lib/domain/signals";

// Lead di esempio della homepage, uno per servizio. Sono illustrativi (aziende inventate,
// domini «-esempio.it») e vanno sempre mostrati con l'etichetta «Esempio»: servono a far
// capire che cosa riceve il cliente, non a far credere che siano risultati del motore.

export type ExampleLead = {
  company: string;
  sector: string;
  city: string;
  region: string;
  size: string;
  contact: { kind: "email" | "form"; value: string };
  signals: LeadSignal[];
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const ad = (title: string, days: number): LeadSignal => ({ code: "job_ad", evidence: { title, date: daysAgo(days) } });
const site = (code: string, detail: string, days = 3): LeadSignal => ({ code, evidence: { detail, checked_at: daysAgo(days) } });

export const EXAMPLE_LEADS: Record<string, ExampleLead> = {
  web_redesign: {
    company: "Carpenteria Esempio S.r.l.", sector: "Carpenteria metallica", city: "Treviso", region: "Veneto", size: "11-50 dip.",
    contact: { kind: "email", value: "info@carpenteria-esempio.it" },
    signals: [site("outdated_cms", "WordPress 4.9, versione del 2017"), site("no_mobile", "Homepage senza impostazione per dispositivi mobili")],
  },
  wp_maintenance: {
    company: "Studio Tecnico Esempio", sector: "Studio di ingegneria", city: "Bergamo", region: "Lombardia", size: "1-10 dip.",
    contact: { kind: "email", value: "segreteria@studiotecnico-esempio.it" },
    signals: [site("outdated_cms", "WordPress 5.4, versione del 2020")],
  },
  site_security: {
    company: "Autofficina Esempio", sector: "Officina meccanica", city: "Modena", region: "Emilia-Romagna", size: "1-10 dip.",
    contact: { kind: "form", value: "Modulo di contatto sul sito" },
    signals: [site("no_https", "Il sito non usa HTTPS: la connessione non è protetta")],
  },
  it_support: {
    company: "Logistica Esempio S.p.A.", sector: "Trasporti e logistica", city: "Piacenza", region: "Emilia-Romagna", size: "51-200 dip.",
    contact: { kind: "email", value: "info@logistica-esempio.it" },
    signals: [ad("Tecnico informatico / sistemista", 6)],
  },
  software_dev: {
    company: "Distribuzione Esempio S.r.l.", sector: "Commercio all'ingrosso", city: "Padova", region: "Veneto", size: "51-200 dip.",
    contact: { kind: "email", value: "info@distribuzione-esempio.it" },
    signals: [ad("Sviluppatore software full stack", 9)],
  },
  cybersecurity: {
    company: "Clinica Esempio", sector: "Servizi sanitari", city: "Brescia", region: "Lombardia", size: "51-200 dip.",
    contact: { kind: "email", value: "amministrazione@clinica-esempio.it" },
    signals: [ad("Sistemista di rete", 4), site("outdated_cms", "Joomla 3.4, versione del 2015")],
  },
  digital_marketing: {
    company: "Mobilificio Esempio", sector: "Produzione di mobili", city: "Pordenone", region: "Friuli-Venezia Giulia", size: "11-50 dip.",
    contact: { kind: "email", value: "commerciale@mobilificio-esempio.it" },
    signals: [ad("Social media manager", 5)],
  },
  graphic_design: {
    company: "Pastificio Esempio", sector: "Industria alimentare", city: "Lecce", region: "Puglia", size: "11-50 dip.",
    contact: { kind: "email", value: "info@pastificio-esempio.it" },
    signals: [ad("Grafico / web designer", 11)],
  },
  translation: {
    company: "Cantina Esempio", sector: "Vini e cantine", city: "Verona", region: "Veneto", size: "11-50 dip.",
    contact: { kind: "form", value: "Modulo di contatto sul sito" },
    signals: [site("single_language", "Nessuna versione del sito in altre lingue (lingua: it)")],
  },
  recruiting: {
    company: "Impianti Esempio S.r.l.", sector: "Impianti elettrici", city: "Torino", region: "Piemonte", size: "11-50 dip.",
    contact: { kind: "email", value: "info@impianti-esempio.it" },
    signals: [ad("Addetto commerciale", 3)],
  },
  hr_consulting: {
    company: "Hotel Esempio", sector: "Hotel", city: "Rimini", region: "Emilia-Romagna", size: "11-50 dip.",
    contact: { kind: "email", value: "direzione@hotel-esempio.it" },
    signals: [ad("Addetto paghe e contributi", 8)],
  },
  sales_consulting: {
    company: "Packaging Esempio S.r.l.", sector: "Imballaggi", city: "Varese", region: "Lombardia", size: "51-200 dip.",
    contact: { kind: "email", value: "sales@packaging-esempio.it" },
    signals: [ad("Agente di commercio", 7)],
  },
  accounting: {
    company: "Edilizia Esempio S.r.l.", sector: "Costruzioni", city: "Bari", region: "Puglia", size: "11-50 dip.",
    contact: { kind: "email", value: "amministrazione@edilizia-esempio.it" },
    signals: [ad("Impiegato amministrativo contabile", 10)],
  },
};

// Servizi mostrati per primi nella homepage (se attivi).
export const FEATURED_OFFERS = ["web_redesign", "it_support", "recruiting", "translation", "site_security", "digital_marketing"];
