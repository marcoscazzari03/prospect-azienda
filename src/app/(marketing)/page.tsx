import type { ReactNode } from "react";
import { ButtonLink, cx } from "@/components/ui";
import { HomeCalculator } from "@/components/home-calculator";
import { LeadDemo } from "@/components/lead-demo";
import { BRAND } from "@/lib/config";

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
} as const;

function Ico({ name, className = "h-5 w-5" }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

// Bollini di provenienza (stessi colori dell'app).
type Tone = "site" | "verified" | "guessed" | "neutral";
const TONE: Record<Tone, string> = {
  site: "border-stamp/40 bg-stamp-soft text-stamp-ink",
  verified: "border-ledger/25 bg-ledger-soft text-ledger",
  guessed: "border-brick/30 bg-brick-soft text-brick",
  neutral: "border-line bg-paper text-ink-2",
};
function Pill({ tone, children, small }: { tone: Tone; children: ReactNode; small?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium", small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs", TONE[tone])}>
      <svg viewBox="0 0 16 16" className={small ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden>
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={tone === "guessed" ? "2 2" : undefined} />
        {tone !== "guessed" && <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
      </svg>
      {children}
    </span>
  );
}

const STATES = [
  { icon: "globe", tone: "site", title: "Trovata sul sito", text: "Email presente su una pagina pubblica del sito ufficiale dell'azienda. Ti diamo il link." },
  { icon: "check", tone: "verified", title: "Verificata", text: "Confermata tecnicamente da un servizio di verifica della casella email." },
  { icon: "person", tone: "guessed", title: "Ipotizzata", text: "Dedotta da un pattern di nome (es. nome.cognome@). Te la mostriamo come suggerimento: non la vendiamo e non costa crediti." },
] as const;

const STATE_ICON_BG: Record<string, string> = {
  site: "bg-stamp-soft text-stamp-ink",
  verified: "bg-ledger-soft text-ledger",
  guessed: "bg-brick-soft text-brick",
};

const FAQ = [
  {
    q: "Da dove arrivano i dati?",
    a: "Da fonti pubbliche: siti ufficiali delle aziende, pagine team, note legali, registri e articoli. Ogni lead riporta la pagina in cui abbiamo trovato la persona e quella in cui abbiamo trovato l'email.",
  },
  {
    q: "Inventate le email quando non le trovate?",
    a: "No. Un'email che deduciamo dal nome (nome.cognome@azienda) è marcata come «Ipotizzata», non costa crediti e non viene mai consegnata come contatto. Vendiamo solo email trovate sul sito ufficiale o verificate tecnicamente.",
  },
  {
    q: "E se la ricerca trova meno lead di quelli richiesti?",
    a: "Paghi solo quelli consegnati. Facciamo altri giri con ricerche diverse; se il mercato è più piccolo del previsto, i crediti riservati e non usati tornano subito disponibili.",
  },
  {
    q: "Posso ricevere lo stesso contatto due volte?",
    a: "No. Un contatto già consegnato al tuo account non ti viene mai riproposto né addebitato.",
  },
  {
    q: "Come funziona la garanzia?",
    a: "Se un'email rimbalza entro 30 giorni, o un lead non corrisponde ai filtri entro 14 giorni, lo segnali dalla scheda del lead e ti restituiamo i crediti.",
  },
  {
    q: "Posso usare i lead per l'email marketing?",
    a: "Le regole sulle comunicazioni commerciali cambiano da paese a paese (in Italia, ad esempio, l'invio di email promozionali richiede in genere il consenso). Sei tu a decidere come contattare i lead e a rispettare la normativa: nel prodotto trovi indicazioni e un testo di informativa da usare al primo contatto.",
  },
];

const AUDIENCES = [
  {
    icon: "team",
    title: "Agenzie e consulenti",
    text: "Trova nuovi clienti per i tuoi servizi di marketing, sviluppo, IT e consulenza.",
    points: ["Lead in nicchie specifiche", "Ideale per prospecting continuo"],
  },
  {
    icon: "chart",
    title: "Team sales B2B",
    text: "Arricchisci la tua pipeline con contatti verificati e tempestivi.",
    points: ["Nuovi mercati e territori", "Export pronto per il tuo CRM"],
  },
  {
    icon: "briefcase",
    title: "Servizi professionali",
    text: "Trova aziende e referenti per servizi legali, finanziari, HR e altri servizi B2B.",
    points: ["Contatti qualificati", "Ricerca nella lingua del paese"],
  },
] as const;

const COMPARISON = [
  ["Metodo", "Liste preconfezionate", "Database statici", "Ricerca su misura, al momento dell'ordine"],
  ["Aggiornamento", "Spesso datate", "Aggiornamenti periodici", "Dati verificati di recente"],
  ["Fonte del contatto", "Sconosciuta", "Non sempre indicata", "Fonte sempre visibile"],
  ["Flessibilità", "Limitata", "Filtri rigidi", "Ricerca personalizzata"],
  ["Pagamento", "Tutto in anticipo", "Abbonamento fisso", "Solo lead consegnati"],
  ["Duplicati", "Frequenti", "Possibili", "Mai due volte lo stesso contatto"],
];

const SAMPLE_LEADS = [
  ["Lucia García Pérez", "ByteWave S.r.l.", "CFO", "bytewave.it", ["site", "Sito ufficiale"], "lucia.garcia@bytewave.it", ["verified", "Verificata"]],
  ["Marco Bianchi", "Alpine Tech", "CTO", "alpinetech.it", ["neutral", "LinkedIn"], "marco.bianchi@alpinetech.it", ["verified", "Verificata"]],
  ["Sophie Dubois", "GreenLife SAS", "CEO", "greenlife.fr", ["site", "Sito ufficiale"], "s.dubois@greenlife.fr", ["site", "Trovata sul sito"]],
  ["Jan Kowalski", "Nordic Retail AB", "Head of Sales", "nordicretail.se", ["neutral", "Pagina team"], "jan.kowalski@nordicretail.se", ["verified", "Verificata"]],
  ["Elena Rossi", "Solaris Group", "Marketing Dir.", "solaris.it", ["site", "Sito ufficiale"], "e.rossi@solaris.it", ["verified", "Verificata"]],
] as const;

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

function HeroCard() {
  return (
    <div className="relative mx-auto w-full max-w-md md:mx-0 md:max-w-none">
      <svg aria-hidden viewBox="0 0 40 30" className="absolute -left-2 -top-6 hidden h-8 w-10 text-ledger-bright md:block">
        <path d="M6 22 14 18M10 8l8 6M24 2v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div className="relative rounded-2xl border border-line bg-card p-6 shadow-[0_30px_60px_-30px_rgba(17,24,39,0.30)] md:mr-24">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paper text-ink-2"><Ico name="building" /></span>
          <div>
            <p className="font-semibold">ByteWave S.r.l.</p>
            <p className="text-xs text-muted">Software · 51-200 dipendenti</p>
          </div>
        </div>
        <p className="mt-6 font-semibold">Lucia García Pérez</p>
        <p className="text-xs text-muted">CFO</p>
        <ul className="mt-4 flex flex-col gap-2.5 text-sm text-ink-2">
          <li className="flex items-center gap-2.5"><Ico name="mail" className="h-4 w-4 text-muted" /><span className="truncate">lucia.garcia@bytewave.it</span></li>
          <li className="flex items-center gap-2.5"><Ico name="linkedin" className="h-4 w-4 text-muted" /><span className="truncate">linkedin.com/in/luciagp</span></li>
          <li className="flex items-center gap-2.5"><Ico name="pin" className="h-4 w-4 text-muted" />Milano, Italia</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Pill tone="site">Trovata sul sito</Pill>
          <Pill tone="verified">Casella verificata</Pill>
        </div>
      </div>
      <div className="relative mt-4 rounded-xl border border-line bg-card p-4 shadow-[0_20px_40px_-24px_rgba(17,24,39,0.35)] md:absolute md:-top-4 md:right-0 md:mt-0 md:w-60">
        <span className="absolute -top-3 left-4 hidden md:inline-flex"><Pill tone="verified" small>Sito ufficiale</Pill></span>
        <ul className="flex flex-col gap-3.5">
          {STATES.map((s) => (
            <li key={s.title} className="flex items-start gap-3">
              <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full", STATE_ICON_BG[s.tone])}><Ico name={s.icon} className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-semibold">{s.title}</p>
                <p className="text-[11px] leading-snug text-muted">
                  {s.tone === "site" ? "Presente su una pagina pubblica del sito ufficiale." : s.tone === "verified" ? "Confermata da un servizio di verifica email." : "Dedotta dal nome: mai venduta."}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StepCard({ n, icon, title, text, children }: { n: string; icon: keyof typeof PATHS; title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 min-w-7 place-items-center rounded-full bg-ledger-soft px-2 font-mono text-xs font-semibold text-ledger">{n}</span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ledger-soft text-ledger"><Ico name={icon} className="h-3.5 w-3.5" /></span>
      </div>
      <p className="mt-4 font-display text-xl font-semibold">{title}</p>
      <p className="mt-2 text-sm text-ink-2">{text}</p>
      <div className="mt-5 flex-1">{children}</div>
    </div>
  );
}

function FakeSelect({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <span className="flex items-center justify-between rounded-md border border-line bg-card px-2.5 py-1.5">
        <span className="truncate">{value}</span>
        <Ico name="chevron" className="h-3.5 w-3.5 text-muted" />
      </span>
    </div>
  );
}

function AppPreview() {
  const nav = [
    ["home", "Panoramica"],
    ["plus", "Nuova ricerca"],
    ["list", "Ricerche"],
    ["team", "Lead"],
    ["coin", "Crediti e piano"],
  ] as const;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_70px_-40px_rgba(17,24,39,0.40)]">
      <div className="grid md:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="hidden border-r border-line p-4 md:block">
          <p className="flex items-center gap-2 font-display text-sm font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-ledger text-xs font-bold text-white">W</span>
            {BRAND.name}
          </p>
          <ul className="mt-6 flex flex-col gap-1 text-xs">
            {nav.map(([icon, label]) => (
              <li key={label} className={cx("flex items-center gap-2 rounded-md px-2 py-1.5", label === "Lead" ? "bg-ledger-soft font-medium text-ledger" : "text-ink-2")}>
                <Ico name={icon} className="h-3.5 w-3.5" />
                {label}
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">Lead trovati (127)</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5"><Ico name="filter" className="h-3.5 w-3.5" />Filtri</span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5"><Ico name="download" className="h-3.5 w-3.5" />Esporta CSV</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-ledger px-2.5 py-1.5 font-medium text-white"><Ico name="download" className="h-3.5 w-3.5" />Esporta Excel</span>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="w-6 py-2"><span className="block h-3 w-3 rounded-sm border border-line" /></th>
                  {["Nome", "Azienda", "Ruolo", "Sito web", "Fonte", "Email", "Stato", ""].map((h) => (
                    <th key={h} className="py-2 pr-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_LEADS.map(([name, company, role, site, source, email, state]) => (
                  <tr key={name} className="border-b border-line last:border-0">
                    <td className="py-2.5"><span className="block h-3 w-3 rounded-sm border border-line" /></td>
                    <td className="py-2.5 pr-3 font-medium">{name}</td>
                    <td className="py-2.5 pr-3 text-ink-2">{company}</td>
                    <td className="py-2.5 pr-3 text-ink-2">{role}</td>
                    <td className="py-2.5 pr-3 text-ledger underline">{site}</td>
                    <td className="py-2.5 pr-3"><Pill tone={source[0]} small>{source[1]}</Pill></td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-ink-2">{email}</td>
                    <td className="py-2.5 pr-3"><Pill tone={state[0]} small>{state[1]}</Pill></td>
                    <td className="py-2.5 text-muted">···</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="ruled">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.05fr_1fr] md:items-center md:pb-20 md:pt-20">
          <div className="animate-row-in">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ledger">Lead generation B2B · Europa</p>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              I tuoi prossimi clienti, con nome, ruolo e <em className="text-ledger">fonte</em>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2">
              Descrivi chi cerchi. Troviamo le aziende reali e i referenti giusti, verifichiamo le email e paghi solo i lead che ricevi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/registrati" size="lg">Prova gratis: 15 crediti</ButtonLink>
              <ButtonLink href="/prezzi" size="lg" variant="secondary">Vedi i prezzi</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Nessuna carta richiesta · Nessuna email inventata</p>
          </div>
          <HeroCard />
        </div>
      </section>

      <Section id="come-funziona">
        <Heading
          title="Una ricerca su misura, non un database vecchio."
          text="Ogni ordine parte da una ricerca nuova sul web, nella lingua del paese. Per questo troviamo anche su nicchie locali e piccole imprese che i grandi database non coprono."
        />
        <div className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <StepCard n="01" icon="doc" title="Descrivi chi cerchi" text="Seleziona paese, settore, dimensione e ruolo dei contatti che vuoi trovare.">
            <div className="flex flex-col gap-2">
              <FakeSelect label="Paese" value={<>🇮🇹 Italia</>} />
              <FakeSelect label="Settore" value="Software" />
              <FakeSelect label="Dimensione" value="11-50 dipendenti" />
              <FakeSelect label="Ruolo" value="CFO" />
            </div>
          </StepCard>
          <span aria-hidden className="hidden self-center text-muted md:block"><Ico name="arrow" /></span>
          <StepCard n="02" icon="search" title="Cerchiamo e verifichiamo" text="Analizziamo i siti web delle aziende, cerchiamo i referenti e verifichiamo le email in tempo reale.">
            <ul className="flex flex-col gap-2">
              {([["ByteWave S.r.l.", "site", "Trovata sul sito"], ["GreenTech Solutions", "verified", "Verificata"], ["Nordic Retail AB", "guessed", "Ipotizzata · scartata"]] as const).map(([c, t, l]) => (
                <li key={c} className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2"><Ico name="building" className="h-3.5 w-3.5 shrink-0 text-muted" /><span className="truncate">{c}</span></span>
                  <Pill tone={t} small>{l}</Pill>
                </li>
              ))}
            </ul>
          </StepCard>
          <span aria-hidden className="hidden self-center text-muted md:block"><Ico name="arrow" /></span>
          <StepCard n="03" icon="download" title="Scarichi e contatti" text="Scarichi i lead in Excel o CSV, pronti per il tuo CRM. Paghi solo i lead consegnati, i crediti non usati tornano a te.">
            <div className="flex gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5"><Ico name="download" className="h-3.5 w-3.5" />Esporta Excel</span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5"><Ico name="download" className="h-3.5 w-3.5" />Esporta CSV</span>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {["Lucia García Pérez", "Marco Bianchi", "Sophie Dubois"].map((p) => (
                <li key={p} className="flex items-center justify-between rounded-md border border-line px-2.5 py-2 text-xs">
                  <span className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-paper text-muted"><Ico name="person" className="h-3 w-3" /></span>{p}</span>
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-ledger text-white"><Ico name="tick" className="h-3 w-3" /></span>
                </li>
              ))}
            </ul>
          </StepCard>
        </div>
      </Section>

      <Section id="demo">
        <Heading
          title="Prova una ricerca, senza registrarti."
          text="Imposta il tuo target e guarda come lavora il motore: ricerca delle aziende, referenti, verifica delle email. È una simulazione con dati dimostrativi: nessuna ricerca reale viene eseguita."
        />
        <div className="mt-10"><LeadDemo /></div>
      </Section>

      <Section tone="paper">
        <Heading
          title="Vedi esattamente cosa ricevi."
          text="Ogni lead include azienda, ruolo, fonte, stato dell'email e link utili. Puoi esportare in Excel o CSV e importarli nel tuo CRM."
        />
        <div className="mt-10"><AppPreview /></div>
      </Section>

      <Section>
        <div className="grid gap-10 md:grid-cols-[1fr_1.15fr] md:items-start">
          <Heading
            title="Ogni email dice da dove viene."
            text="Siamo trasparenti sulla provenienza di ogni contatto. Così puoi valutare meglio l'affidabilità e scegliere come usarlo."
          />
          <div className="flex flex-col gap-3">
            {STATES.map((s) => (
              <div key={s.title} className="flex items-start gap-4 rounded-xl border border-line bg-card p-4">
                <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full", STATE_ICON_BG[s.tone])}><Ico name={s.icon} /></span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-ink-2">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="paper">
        <Heading
          title="Quanto costa? Lo vedi prima di iniziare."
          text="Un credito per lead, con costi diversi in base al tipo di email. Seleziona il tipo di contatti e il numero di lead: il costo stimato è immediato e trasparente."
        />
        <div className="mt-10"><HomeCalculator /></div>
        <div className="mt-4 grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-3">
          {([["mail", "1 credito = email generica", "Contatti generici (es. info@, contatti@)."], ["person", "2 crediti = nominativa", "Email della persona trovata sul sito."], ["shield", "3 crediti = nominativa verificata", "Email della persona verificata tecnicamente."]] as const).map(([icon, t, d]) => (
            <div key={t} className="flex items-start gap-3 p-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ledger-soft text-ledger"><Ico name={icon} className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-semibold">{t}</p>
                <p className="text-xs text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <Heading title="Per chi è utile" text={`${BRAND.name} è pensato per chi vuole trovare nuovi clienti B2B in modo rapido e mirato.`} />
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
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-3 pr-4 font-semibold">Caratteristica</th>
                <th className="py-3 pr-4 font-semibold">Liste comprate</th>
                <th className="py-3 pr-4 font-semibold">Grandi database</th>
                <th className="rounded-t-xl bg-ledger-soft px-4 py-3 font-semibold text-ledger">{BRAND.name}</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([k, a, b, c], i) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4 text-ink-2">{k}</td>
                  <td className="py-3 pr-4 text-ink-2">{a}</td>
                  <td className="py-3 pr-4 text-ink-2">{b}</td>
                  <td className={cx("bg-ledger-soft px-4 py-3 font-semibold", i === COMPARISON.length - 1 && "rounded-b-xl")}>{c}</td>
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
              Altro? Scrivici a <a className="text-ledger underline" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
            </p>
          </div>
          <div className="divide-y divide-line rounded-xl border border-line bg-card px-5">
            {FAQ.map((f) => (
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
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Prova con i tuoi clienti ideali.</h2>
            <p className="mt-2 text-white/80">15 crediti gratuiti, nessuna carta. La prima ricerca richiede due minuti.</p>
          </div>
          <ButtonLink href="/registrati" size="lg" variant="stamp">Crea l&apos;account gratuito <span aria-hidden>→</span></ButtonLink>
        </div>
      </section>
    </>
  );
}
