import type { ReactNode } from "react";
import { ButtonLink, cx } from "@/components/ui";
import { HomeCalculator } from "@/components/home-calculator";
import { LeadDemo } from "@/components/lead-demo";
import { BRAND } from "@/lib/config";
import { LogoMark } from "@/components/logo";
import { extraCreditsLabel, type SignalPrices } from "@/lib/domain/signals";
import { getSignalPrices } from "@/lib/server/signal-prices";
import { getEnabledOffers } from "@/lib/server/offer-rules";

// Icone della homepage (tratto 1.6, 20x20).
const PATHS = {
  building: "M3 18V4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5V18M13 8h2.5A1.5 1.5 0 0 1 17 9.5V18M2 18h16M6 6.5h1M9 6.5h1M6 9.5h1M9 9.5h1M6 12.5h1M9 12.5h1",
  mail: "M3 5.5h14v9H3zM3.5 6l6.5 5 6.5-5",
  linkedin: "M4 4h12v12H4zM7 9v4.5M7 6.8v.2M10 13.5V9M10 11c0-1.2.9-2 2-2s1.8.8 1.8 2v2.5",
  pin: "M10 18s5-4.6 5-9a5 5 0 0 0-10 0c0 4.4 5 9 5 9zM10 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  globe: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM2 10h16M10 2c2.2 2.2 3.2 5 3.2 8s-1 5.8-3.2 8c-2.2-2.2-3.2-5-3.2-8s1-5.8 3.2-8z",
  check: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM6.5 10.2l2.4 2.4 4.6-5",
  person: "M10 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5",
  doc: "M5 2.5h7l3 3v12H5zM12 2.5v3h3M7.5 9.5h5M7.5 12.5h5",
  search: "M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM13.5 13.5 17 17",
  download: "M10 3v10M6 9.5l4 4 4-4M4 16.5h12",
  filter: "M3 4.5h14l-5.5 6.5v5l-3 1.5V11z",
  team: "M7 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM13.5 8.5a2 2 0 1 0 0-4M2.5 16c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5M13.5 11.5c2.2 0 4 1.7 4 4.5",
  chart: "M4 16.5V11M8.5 16.5V7.5M13 16.5V9.5M17 16.5V4M2.5 16.5h15",
  briefcase: "M3 7h14v9.5H3zM7.5 7V5h5v2M3 11h14",
  home: "M3 9.5 10 4l7 5.5V17H3zM8 17v-4.5h4V17",
  plus: "M10 4v12M4 10h12",
  list: "M7 5.5h10M7 10h10M7 14.5h10M3.5 5.5h.5M3.5 10h.5M3.5 14.5h.5",
  coin: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12.5 7.5c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.2 5 3.7 0 1.1-1.1 1.9-2.5 1.9-1.1 0-2-.4-2.5-1.2M10 5v1.3M10 13.7V15",
  shield: "M10 2.5 16 5v4.5c0 3.8-2.6 6.6-6 8-3.4-1.4-6-4.2-6-8V5zM7.2 10l2 2 3.6-4",
  tick: "M4.5 10.5l3.5 3.5 7.5-8",
  chevron: "M6 8l4 4 4-4",
  arrow: "M4 10h12M11.5 5.5 16 10l-4.5 4.5",
  bolt: "M11 2.5 4.5 11H10l-1 6.5 6.5-8.5H10z",
  link: "M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-1 1M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l1-1",
  phone: "M6.5 2.5h7v15h-7zM9 15h2",
  alert: "M10 3 2.5 16.5h15zM10 8v4M10 14.2v.3",
  bars: "M4 16V12M8 16V9M12 16V6.5M16 16V4",
  signal: "M5 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7.6 8.6l4.8-2.2M7.6 11.4l4.8 2.2",
} as const;

function Ico({ name, className = "h-5 w-5" }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

// Bollini (stessi colori dell'app).
type Tone = "site" | "verified" | "guessed" | "neutral" | "signal" | "amber";
const TONE: Record<Tone, string> = {
  site: "border-stamp/40 bg-stamp-soft text-stamp-ink",
  verified: "border-ledger/25 bg-ledger-soft text-ledger",
  guessed: "border-brick/30 bg-brick-soft text-brick",
  neutral: "border-line bg-paper text-ink-2",
  signal: "border-brick/25 bg-brick-soft text-brick",
  amber: "border-stamp/40 bg-stamp-soft text-stamp-ink",
};
function Pill({ tone, children, small }: { tone: Tone; children: ReactNode; small?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium", small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs", TONE[tone])}>
      <svg viewBox="0 0 16 16" className={small ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden>
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={tone === "guessed" ? "2 2" : undefined} />
        {(tone === "site" || tone === "verified" || tone === "neutral") && <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
      </svg>
      {children}
    </span>
  );
}

const faq = (prices: SignalPrices) => [
  {
    q: "Da dove arrivano i dati?",
    a: "Da fonti pubbliche: siti ufficiali delle aziende, registri, OpenStreetMap e annunci di lavoro. Ogni lead riporta la pagina in cui abbiamo trovato l'azienda e quella in cui abbiamo trovato l'email aziendale. Non raccogliamo dati di persone: niente nomi, niente email personali, niente email ipotizzate.",
  },
  {
    q: "Posso usare i lead per email marketing?",
    a: "Le regole sulle comunicazioni commerciali cambiano da paese a paese (in Italia, ad esempio, l'invio di email promozionali richiede in genere il consenso, anche verso caselle aziendali). Sei tu a decidere come contattare le aziende e a rispettare la normativa: l'email aziendale è un'informazione in più, non un'autorizzazione a inviare promozioni.",
  },
  {
    q: "Cosa succede se non trovate abbastanza lead?",
    a: "Paghi solo quelli consegnati. Facciamo altri giri con ricerche diverse; se il mercato è più piccolo del previsto, i crediti riservati e non usati tornano subito disponibili. Un'azienda già consegnata non ti viene mai riproposta.",
  },
  {
    q: "Come funzionano le opportunità?",
    a: `Scegli il servizio che vendi (es. rifacimento del sito, assistenza IT, selezione del personale): cerchiamo noi i segnali collegati, come annunci di lavoro recenti per una figura o caratteristiche del sito (software non aggiornato, senza HTTPS, in una sola lingua). Controlliamo ogni segnale prima di consegnare l'azienda e lo consegniamo con la prova: link e data. Le aziende senza prova vengono escluse. Ogni lead con segnale costa ${extraCreditsLabel(prices)} e, se il segnale non è corretto, puoi segnalarlo entro 14 giorni.`,
  },
  {
    q: "Che servizi posso scegliere?",
    a: "Siti web (rifacimento, manutenzione WordPress, sicurezza del sito), IT e sistemistica, marketing e comunicazione, HR e selezione, commerciale, amministrazione. Aggiungiamo un servizio solo quando abbiamo un segnale verificabile che lo distingue: per questo l'elenco cresce nel tempo.",
  },
  {
    q: "Perché non ci sono i nomi dei referenti?",
    a: `È una scelta di prodotto: ${BRAND.name} è intelligence commerciale sulle aziende, non un database di contatti personali. Ti diciamo quali aziende sono in target, perché sono un'opportunità e come raggiungerle tramite i loro canali aziendali; non raccogliamo né vendiamo dati di persone.`,
  },
];

const AUDIENCES = [
  {
    icon: "team",
    title: "Agenzie e consulenti",
    text: "Trova nuovi clienti per i tuoi servizi di marketing, siti web, IT e consulenza.",
    points: ["Ricerca opportunità per dare priorità", "Ideale per prospecting continuo"],
  },
  {
    icon: "chart",
    title: "Team sales B2B",
    text: "Riempi la pipeline di aziende in target, con un motivo concreto per contattarle.",
    points: ["Più tempo sui lead caldi", "Export pronto per il tuo CRM"],
  },
  {
    icon: "briefcase",
    title: "Servizi professionali",
    text: "Trova aziende in target per servizi legali, finanziari, IT, HR e altri servizi B2B.",
    points: ["Segnali di bisogno verificabili", "Riduci i tempi di ricerca"],
  },
] as const;

const COMPARISON = [
  ["Metodo", "Liste preconfezionate", "Database statici", "Ricerca su misura, al momento dell'ordine"],
  ["Aggiornamento", "Spesso datate", "Aggiornamenti periodici", "Dati verificati di recente"],
  ["Fonte dei dati", "Sconosciuta", "Non sempre indicata", "Fonte sempre visibile"],
  ["Dati di persone", "Nomi ed email personali", "Profili di persone", "Nessuno: solo dati delle aziende"],
  ["Flessibilità", "Limitata", "Filtri rigidi", "Ricerca personalizzata"],
  ["Pagamento", "Tutto in anticipo", "Abbonamento fisso", "Solo lead consegnati"],
  ["Opportunità verificabili", "Non disponibili", "Non disponibili", "Sì, con prova e data"],
];

const SAMPLE_LEADS = [
  ["TechSolutions S.r.l.", "Software", "Milano", "techsolutions.it", "info@techsolutions.it", ["amber", "Annuncio attivo"]],
  ["LogiTrack", "Logistica", "Bergamo", "logitrack.it", "commerciale@logitrack.it", ["signal", "Senza HTTPS"]],
  ["FastMove", "Trasporti", "Brescia", "fastmove.it", "info@fastmove.it", ["signal", "Non adatto ai cellulari"]],
  ["DataCloud", "Servizi IT", "Monza", "datacloud.it", "info@datacloud.it", ["signal", "Software non aggiornato"]],
  ["GreenTech", "Energia", "Como", "greentech.it", "contatti@greentech.it", ["signal", "Una sola lingua"]],
] as const;

const PROOFS = [
  { icon: "phone", tone: "text-brick", text: "Homepage senza versione per cellulari · 13/10" },
  { icon: "alert", tone: "text-brick", text: "WordPress 5.2, versione del 2019" },
  { icon: "doc", tone: "text-stamp-ink", text: "Annuncio «Sviluppatore backend» (8 gg fa)" },
] as const;

const FIT = ["Settore: Software", "Dimensione: 51-200 dip.", "Area: Lombardia", "Sito controllato: 13/10"];

function Section({ id, tone = "card", children }: { id?: string; tone?: "card" | "paper"; children: ReactNode }) {
  return (
    <section id={id} className={cx("scroll-mt-16 border-t border-line", tone === "card" ? "bg-card" : "bg-paper")}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16">{children}</div>
    </section>
  );
}

function Heading({ title, text }: { title: ReactNode; text?: ReactNode }) {
  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 max-w-2xl text-ink-2">{text}</p>}
    </div>
  );
}

function Check({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cx("shrink-0 text-ledger", className)} aria-hidden>
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path d="M6.2 10.3l2.5 2.5 5-5.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4 shadow-[0_20px_40px_-24px_rgba(17,24,39,0.35)]">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function FitList({ small }: { small?: boolean }) {
  return (
    <ul className={cx("flex flex-col", small ? "gap-1.5 text-[11px]" : "gap-2 text-xs", "text-ink-2")}>
      {FIT.map((f) => (
        <li key={f} className="flex items-center gap-2"><Ico name="tick" className="h-3.5 w-3.5 text-ledger" />{f}</li>
      ))}
    </ul>
  );
}

function ProofList() {
  return (
    <ul className="flex flex-col gap-2 text-[11px] text-ink-2">
      {PROOFS.map((p) => (
        <li key={p.text} className="flex items-center gap-2 rounded-md bg-paper px-2 py-1.5">
          <Ico name={p.icon} className={cx("h-3.5 w-3.5 shrink-0", p.tone)} />
          {p.text}
        </li>
      ))}
    </ul>
  );
}

function HeroCard() {
  return (
    <div className="relative mx-auto w-full max-w-md md:mx-0 md:max-w-none">
      <svg aria-hidden viewBox="0 0 60 40" className="absolute -left-14 top-[58%] hidden h-10 w-14 text-ledger lg:block">
        <path d="M4 6c4 18 18 28 44 26M40 26l8 6-9 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px] lg:gap-3">
        <div className="relative">
          <div className="mx-auto mb-3 flex w-fit gap-1 rounded-full border border-line bg-card p-1 text-xs shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-ink-2"><span className="h-3 w-3 rounded-full border border-line" />In target</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ledger px-3 py-1 font-medium text-white"><Ico name="bolt" className="h-3 w-3" />Opportunità</span>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_30px_60px_-30px_rgba(17,24,39,0.30)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paper-2 text-ink-2"><Ico name="building" /></span>
                <div>
                  <p className="whitespace-nowrap font-semibold">TechSolutions S.r.l.</p>
                  <p className="text-xs text-muted">Milano, Italia · 51-200 dipendenti</p>
                </div>
              </div>
              <Pill tone="verified" small>Opportunità</Pill>
            </div>
            <p className="mt-4 text-xs text-muted">Azienda di software per la logistica</p>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-ink-2">
              <li className="flex items-center gap-2.5"><Ico name="check" className="h-4 w-4 text-muted" />Sito controllato il 13/10</li>
              <li className="flex items-center gap-2.5"><Ico name="mail" className="h-4 w-4 text-muted" /><span className="truncate">info@techsolutions.it</span> <span className="text-xs text-muted">email aziendale</span></li>
              <li className="flex items-center gap-2.5"><Ico name="globe" className="h-4 w-4 text-muted" />www.techsolutions.it</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Pill tone="signal" small>Non adatto ai cellulari</Pill>
              <Pill tone="amber" small>Annuncio attivo</Pill>
              <Pill tone="verified" small>Verificata</Pill>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:pt-12">
          <SidePanel title="Perché è in target"><FitList small /></SidePanel>
          <SidePanel title="Prove opportunità"><ProofList /></SidePanel>
        </div>
      </div>
    </div>
  );
}

function FakeSelect({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-between rounded-md border border-line bg-card px-2.5 py-1.5 text-[11px] text-ink-2">
      {label}
      <Ico name="chevron" className="h-3 w-3 text-muted" />
    </span>
  );
}

function StepCard({ n, title, text, children }: { n: number | "bolt"; title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ledger font-mono text-sm font-semibold text-white">
          {n === "bolt" ? <Ico name="bolt" className="h-4 w-4" /> : n}
        </span>
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-3 text-sm text-ink-2">{text}</p>
      <div className="mt-5 flex-1">{children}</div>
    </div>
  );
}

function AppPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_70px_-40px_rgba(17,24,39,0.40)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-4">
          <p className="flex items-center gap-2 font-display text-sm font-semibold"><LogoMark className="h-6 w-6" />{BRAND.name}</p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-md bg-ledger px-2.5 py-1 font-medium text-white">Tutti (247)</span>
            <span className="rounded-md bg-paper px-2.5 py-1 text-ink-2">Con opportunità (119)</span>
            <span className="rounded-md bg-paper px-2.5 py-1 text-ink-2">Solo in target (128)</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-ledger px-2.5 py-1.5 text-xs font-medium text-white"><Ico name="download" className="h-3.5 w-3.5" />Esporta in Excel</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="w-10 py-2 pl-4"><span className="block h-3 w-3 rounded-sm border border-line" /></th>
              {["Azienda", "Settore", "Città", "Sito web", "Email aziendale", "Opportunità", "Stato"].map((h) => (
                <th key={h} className="py-2 pr-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAMPLE_LEADS.map(([company, industry, city, site, email, sig]) => (
              <tr key={company} className="border-b border-line">
                <td className="py-2.5 pl-4"><span className="block h-3 w-3 rounded-sm border border-line" /></td>
                <td className="py-2.5 pr-3 font-medium">{company}</td>
                <td className="py-2.5 pr-3 text-ink-2">{industry}</td>
                <td className="py-2.5 pr-3 text-ink-2">{city}</td>
                <td className="py-2.5 pr-3 text-ledger underline">{site}</td>
                <td className="py-2.5 pr-3 font-mono text-[11px] text-ink-2">{email}</td>
                <td className="py-2.5 pr-3"><Pill tone={sig[0]} small>{sig[1]}</Pill></td>
                <td className="py-2.5 pr-3"><Pill tone="verified" small>Verificata</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 border-l-2 border-ledger bg-paper/60 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-2 text-ink-2"><Ico name="building" className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-semibold">TechSolutions S.r.l. <span className="font-normal text-muted">· Software</span></p>
            <p className="text-xs text-ink-2">Milano · 51-200 dip. · info@techsolutions.it</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone="verified" small>Opportunità</Pill>
              <Pill tone="signal" small>Non adatto ai cellulari</Pill>
              <Pill tone="verified" small>Verificata</Pill>
            </div>
          </div>
        </div>
        <SidePanel title="Perché è in target"><FitList /></SidePanel>
        <SidePanel title="Prove opportunità"><ProofList /></SidePanel>
      </div>
    </div>
  );
}

// Prezzi dei segnali letti dal database, aggiornati ogni 5 minuti.
export const revalidate = 300;

export default async function HomePage() {
  const [prices, offers] = await Promise.all([getSignalPrices(), getEnabledOffers()]);
  return (
    <>
      <section className="ruled">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1fr_1.1fr] md:items-center md:pb-20 md:pt-16">
          <div className="animate-row-in">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ledger">Intelligence commerciale B2B</p>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[2.95rem]">
              Trova aziende in target.<br className="hidden sm:block" /> E scopri le loro<br className="hidden sm:block" /> <span className="text-ledger">opportunità verificate.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2">
              {BRAND.name} trova le aziende che corrispondono al tuo cliente ideale e scopre quelle con un&apos;opportunità commerciale concreta per i tuoi servizi: annunci di lavoro, siti da rifare, software non aggiornato. Ogni opportunità arriva con la prova.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/registrati" size="lg">Prova gratis: 15 crediti</ButtonLink>
              <ButtonLink href="/prezzi" size="lg" variant="secondary">Vedi prezzi</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Nessuna carta richiesta · Una prova per ogni opportunità</p>
          </div>
          <HeroCard />
        </div>
      </section>

      <Section id="come-funziona">
        <Heading title="Due modi di cercare, un solo motore" text="Parti dal profilo del tuo cliente ideale, oppure da quello che vendi: ti mostriamo le aziende che ne hanno bisogno, con la prova." />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="grid gap-5 rounded-2xl border border-line bg-card p-6 sm:grid-cols-[minmax(0,1fr)_150px]">
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-ledger-soft text-ledger"><Ico name="search" /></span>
              <p className="mt-4 font-display text-2xl font-semibold">Trova aziende in target</p>
              <p className="mt-2 text-sm text-ink-2">Cerca aziende che corrispondono al profilo del tuo cliente ideale.</p>
              <ul className="mt-5 flex flex-col gap-2.5 text-sm">
                {["Settore, zona e dimensione", "Sito e email aziendale", "Dati controllati di recente"].map((p) => (
                  <li key={p} className="flex items-center gap-2.5"><Check />{p}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 self-end rounded-xl border border-line bg-paper/60 p-3">
              {["Paese", "Settore", "Dimensione", "Zona"].map((l) => <FakeSelect key={l} label={l} />)}
            </div>
          </div>
          <div className="relative grid gap-5 rounded-2xl border border-ledger/60 bg-ledger-soft/40 p-6 shadow-[0_0_0_1px_var(--color-ledger)/10] sm:grid-cols-[minmax(0,1fr)_170px]">
            <span className="absolute right-5 top-5 rounded-full bg-ledger px-3 py-1 text-xs font-medium text-white">Più potente</span>
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-ledger-soft text-ledger"><Ico name="bolt" /></span>
              <p className="mt-4 font-display text-2xl font-semibold">Trova aziende con <span className="text-ledger">opportunità</span></p>
              <p className="mt-2 text-sm text-ink-2">Cerca aziende che, oltre ai filtri, mostrano segnali verificabili legati ai tuoi servizi.</p>
              <ul className="mt-5 flex flex-col gap-2.5 text-sm">
                {["Servizio selezionato", "Segnali verificabili", "Prova su ogni lead"].map((p) => (
                  <li key={p} className="flex items-center gap-2.5"><Check />{p}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-3 self-end rounded-xl border border-line bg-card p-3 shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brick-soft text-brick"><Ico name="phone" /></span>
              <div>
                <p className="text-[11px] font-semibold leading-tight">Sito non adatto ai cellulari</p>
                <p className="text-[10px] text-muted">Controllato il 13/10</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="paper">
        <Heading title="Come funziona la ricerca opportunità" text="Solo aziende con una prova verificabile del segnale. Nessuna supposizione: link e data su ogni lead." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard n={1} title="Scegli cosa vendi" text="Indica l'area del tuo servizio.">
            <div className="flex flex-wrap gap-2 rounded-xl bg-paper/70 p-3 text-xs">
              <span className="rounded-full border border-ledger bg-ledger-soft px-3 py-1 font-medium text-ledger">Siti web</span>
              <span className="rounded-full border border-line bg-card px-3 py-1 text-ink-2">IT e sistemistica</span>
              <span className="rounded-full border border-line bg-card px-3 py-1 text-ink-2">Marketing</span>
              <span className="rounded-full border border-line bg-card px-3 py-1 text-ink-2">HR e selezione</span>
            </div>
          </StepCard>
          <StepCard n={2} title="Più nello specifico" text="Scegli il servizio esatto che vuoi proporre.">
            <ul className="flex flex-col gap-2 rounded-xl bg-paper/70 p-3 text-xs">
              {([["Rifacimento del sito", true], ["Manutenzione WordPress", false], ["Sicurezza del sito", false]] as const).map(([l, on]) => (
                <li key={l} className="flex items-center gap-2">
                  <span className={cx("grid h-4 w-4 place-items-center rounded-full", on ? "border-2 border-ledger" : "border border-line bg-card")}>{on && <span className="h-1.5 w-1.5 rounded-full bg-ledger" />}</span>
                  <span className={on ? "font-medium" : "text-ink-2"}>{l}</span>
                </li>
              ))}
            </ul>
          </StepCard>
          <StepCard n="bolt" title="Cerchiamo i segnali" text="Scegliamo noi i segnali più adatti al servizio e li verifichiamo sito per sito.">
            <ul className="flex flex-col gap-2 rounded-xl bg-paper/70 p-3 text-xs">
              {["Software non aggiornato", "Non adatto ai cellulari", "Sito fermo da tempo"].map((l) => (
                <li key={l} className="flex items-center gap-2">
                  <span className="grid h-4 w-4 place-items-center rounded bg-ledger text-white"><Ico name="tick" className="h-3 w-3" /></span>
                  {l}
                </li>
              ))}
            </ul>
          </StepCard>
          <StepCard n="bolt" title="Ricevi lead con prova" text="Ottieni solo aziende con la prova verificabile del segnale.">
            <div className="rounded-xl bg-paper/70 p-3"><ProofList /></div>
          </StepCard>
        </div>
      </Section>

      <Section id="demo">
        <Heading
          title="Prova una ricerca, standard o con opportunità."
          text="Imposta i tuoi filtri e prova subito. Vedrai un'anteprima dei risultati con le stesse informazioni che riceverai, inclusa la prova per ogni opportunità. È una simulazione con dati dimostrativi."
        />
        <div className="mt-10"><LeadDemo signalPrices={prices} offers={offers} /></div>
      </Section>

      <Section tone="paper">
        <Heading
          title="Vedi esattamente cosa ricevi."
          text="Ogni lead include azienda, settore, zona, sito, email aziendale con la sua fonte e, se presente, la prova dell'opportunità. Puoi esportare tutto in Excel o CSV."
        />
        <div className="mt-10"><AppPreview /></div>
      </Section>

      <Section>
        <Heading title="Ogni opportunità mostra una prova." text="Sia i dati delle aziende sia le opportunità sono trasparenti: vedi sempre da dove viene l'informazione e perché è stata inclusa." />
        <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-line">
          {([
            ["Le email aziendali", [
              ["link", "bg-ledger-soft text-ledger", "Trovata sul sito", "Email presente su una pagina pubblica dell'azienda, con il link."],
              ["building", "bg-ledger-soft text-ledger", "Del dominio aziendale", "Solo caselle dell'azienda, come info@ o commerciale@: mai email personali o caselle gratuite."],
              ["shield", "bg-paper-2 text-ink-2", "Mai inventata", "Niente email ipotizzate: se non è sul sito, non la consegniamo."],
            ]],
            ["Le prove delle opportunità", [
              ["bars", "bg-paper-2 text-ink-2", "Prova tecnica", "Dal sito: versione per cellulari, HTTPS, software, lingue."],
              ["briefcase", "bg-ledger-soft text-ledger", "Fonte ufficiale", "Annunci di lavoro sul sito dell'azienda o su pagine pubbliche."],
              ["signal", "bg-stamp-soft text-stamp-ink", "Segnale rilevato", "Ogni segnale con la data del controllo e il link alla prova."],
            ]],
          ] as const).map(([group, items], gi) => (
            <div key={group} className={cx(gi === 1 && "lg:pl-6", gi === 0 && "lg:pr-6")}>
              <p className="mb-3 inline-block rounded-md bg-ledger-soft px-2 py-0.5 text-sm font-medium text-ledger">{group}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {items.map(([icon, cls, title, text]) => (
                  <div key={title} className="rounded-xl border border-line bg-card p-4">
                    <span className={cx("grid h-9 w-9 place-items-center rounded-full", cls)}><Ico name={icon} className="h-4 w-4" /></span>
                    <p className="mt-3 text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-xs text-muted">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <Heading
          title="Quanto costa? Lo scegli prima di iniziare."
          text={`1 credito per ogni azienda consegnata, con costi chiari e senza sorprese. Se cerchi aziende con opportunità, ogni lead consegnato costa ${extraCreditsLabel(prices)}.`}
        />
        <div className="mt-10"><HomeCalculator signalPrices={prices} /></div>
      </Section>

      <Section>
        <Heading title="Per chi è utile" text={`${BRAND.name} è pensato per chi vende servizi alle aziende e vuole sapere a chi proporli, e perché proprio ora.`} />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="rounded-2xl border border-line bg-card p-6">
              <span className="text-ledger"><Ico name={a.icon} className="h-7 w-7" /></span>
              <p className="mt-4 font-display text-xl font-semibold">{a.title}</p>
              <p className="mt-2 text-sm text-ink-2">{a.text}</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {a.points.map((p) => (
                  <li key={p} className="flex items-center gap-2"><Ico name="tick" className="h-4 w-4 text-ledger" />{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <Heading title="Rispetto alle alternative" text="Un confronto chiaro per capire perché una ricerca su misura è più efficace dei database tradizionali." />
        <div className="mt-10 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-semibold">Caratteristica</th>
                <th className="px-5 py-3 font-semibold">Liste comprate</th>
                <th className="px-5 py-3 font-semibold">Grandi database</th>
                <th className="bg-ledger-soft px-5 py-3 font-semibold text-ledger">{BRAND.name}</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([k, a, b, c]) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-ink-2">{k}</td>
                  <td className="px-5 py-3 text-ink-2">{a}</td>
                  <td className="px-5 py-3 text-ink-2">{b}</td>
                  <td className="bg-ledger-soft px-5 py-3 font-semibold text-ledger">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="faq">
        <div className="grid gap-10 md:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Domande frequenti</h2>
            <p className="mt-3 text-ink-2">
              Hai altre domande? Scrivici a <a className="text-ledger underline" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
            </p>
          </div>
          <div className="divide-y divide-line rounded-xl border border-line bg-card px-5">
            {faq(prices).map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                  {f.q}
                  <span aria-hidden className="font-mono text-lg leading-none text-ledger transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      <section className="bg-ledger text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Trova aziende in target. E scopri quando è il momento giusto.</h2>
            <p className="mt-2 text-white/80">15 crediti gratuiti, nessuna carta. La prima ricerca richiede due minuti.</p>
          </div>
          <ButtonLink href="/registrati" size="lg" variant="stamp">Crea l&apos;account gratuito <span aria-hidden>→</span></ButtonLink>
        </div>
      </section>
    </>
  );
}
