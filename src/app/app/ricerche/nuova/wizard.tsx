"use client";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Button, Card, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { COMPANY_SIZES, COUNTRIES, EMAIL_MODES, MODE_INFO, ROLE_PRESETS, type EmailMode } from "@/lib/domain/catalog";
import { estimateCredits, formatEur } from "@/lib/domain/pricing";
import { BLOCKED_SECTORS_MESSAGE, blockedSector } from "@/lib/domain/blocked-sectors";
import {
  JOB_AD_COUNTRIES,
  OFFER_AREAS,
  describeOffer,
  extraCreditsLabel,
  offerByCode,
  offerUsesJobAds,
  offersOfArea,
  signalExtraRange,
  type ActiveOffer,
  type OfferArea,
  type SignalPrices,
} from "@/lib/domain/signals";
import { createSearch, industrySuggestions, searchAvailability, type ActionState, type Availability, type IndustrySuggestion } from "../../actions";

export type WizardDefaults = {
  name?: string;
  industry?: string;
  industryKeywords?: string[];
  countries?: string[];
  regions?: string[];
  companySizes?: string[];
  revenueRange?: string;
  roles?: string[];
  keywords?: string[];
  excludeKeywords?: string[];
  notes?: string;
  emailMode?: EmailMode;
  quantity?: number;
  contactsPerCompany?: number;
  offer?: string;
};

export type SearchKind = "standard" | "opportunity";

const STEPS = {
  standard: [["target", "Chi cerchi"], ["roles", "Chi contattare"], ["email", "Che email"], ["quantity", "Quanti"]],
  opportunity: [["offer", "Cosa vendi"], ["target", "In quali aziende"], ["roles", "Chi contattare"], ["email", "Che email"], ["quantity", "Quanti"]],
} as const;

const KINDS: { kind: SearchKind; title: string; text: string; example: string; icon: keyof typeof ICONS }[] = [
  {
    kind: "standard",
    title: "Trova aziende in target",
    text: "Aziende in base a settore, zona e dimensione, con sito ed email aziendale.",
    example: "Es. studi dentistici in Lombardia",
    icon: "target",
  },
  {
    kind: "opportunity",
    title: "Trova aziende con opportunità",
    text: "Parti da quello che vendi: aziende con un segnale concreto legato al tuo servizio, con la prova.",
    example: "Es. aziende che assumono un sistemista, siti con software vecchio",
    icon: "bars",
  },
];

// Esempi rapidi sotto il settore: riempiono il campo con parole che il database riconosce.
const POPULAR_INDUSTRIES = ["Software house", "Agenzie di marketing", "Studi dentistici", "Studi legali", "Aziende manifatturiere"];

// Paesi sempre visibili (gli altri sotto «Altri paesi»).
const MAIN_COUNTRIES = ["IT", "ES", "FR", "DE", "CH"] as const;

const ICONS = {
  target: "M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM10 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM10 10.5a.5.5 0 1 0 0-1M10 10l5.5-5.5M13.5 4.5h2v2",
  bars: "M4 16.5V11M8 16.5V6M12 16.5V9M16 16.5V3.5",
  check: "M5.5 10.5l3 3 6-7",
  building: "M4 17.5V3.5h8v14M12 7.5h4v10M2.5 17.5h15M6.5 6.5h3M6.5 9.5h3M6.5 12.5h3M14 10.5h.5M14 13.5h.5",
  globe: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM2 10h16M10 2c2.2 2.2 3.2 5 3.2 8s-1 5.8-3.2 8c-2.2-2.2-3.2-5-3.2-8s1-5.8 3.2-8z",
  pin: "M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5zM10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  filter: "M3 4h14l-5.5 6.5v5l-3 1.5v-6.5z",
  chevron: "M5.5 8l4.5 4.5L14.5 8",
  search: "M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM13.5 13.5 17 17",
  arrow: "M4 10h12M11.5 5.5 16 10l-4.5 4.5",
  play: "M6.5 4.5v11l9-5.5z",
  shield: "M10 2.5 4 5v4.5c0 3.8 2.6 6.9 6 8 3.4-1.1 6-4.2 6-8V5zM7.5 10l2 2 3.5-4",
  doc: "M5 2.5h6.5l3.5 3.5v11.5H5zM11.5 2.5V6H15M7.5 10h5M7.5 13h5",
  coins: "M8 8.5c3 0 5.5-1 5.5-2.25S11 4 8 4 2.5 5 2.5 6.25 5 8.5 8 8.5zM2.5 6.25v3.5C2.5 11 5 12 8 12s5.5-1 5.5-2.25v-3.5M7 15.5c.3 0 .7.1 1 .1 3 0 5.5-1 5.5-2.3M11 11.8c.6-.1 1.1-.1 1.5-.1 3 0 5 1 5 2.2s-2.5 2.3-5 2.3c-1 0-2-.1-2.8-.4",
} as const;

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

// Bandiere disegnate (le emoji delle bandiere su Windows diventano lettere).
function Flag({ code }: { code: string }) {
  const stripes: Record<string, { dir: "v" | "h"; colors: string[]; weights?: number[] }> = {
    IT: { dir: "v", colors: ["#009246", "#ffffff", "#ce2b37"] },
    FR: { dir: "v", colors: ["#0055a4", "#ffffff", "#ef4135"] },
    DE: { dir: "h", colors: ["#000000", "#dd0000", "#ffce00"] },
    ES: { dir: "h", colors: ["#aa151b", "#f1bf00", "#aa151b"], weights: [1, 2, 1] },
  };
  const f = stripes[code];
  if (code === "CH") {
    return (
      <svg viewBox="0 0 3 2" className="h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-black/10" aria-hidden>
        <rect width="3" height="2" fill="#da291c" />
        <rect x="1.3" y="0.4" width="0.4" height="1.2" fill="#ffffff" />
        <rect x="0.9" y="0.8" width="1.2" height="0.4" fill="#ffffff" />
      </svg>
    );
  }
  if (!f) return null;
  const weights = f.weights ?? f.colors.map(() => 1);
  const total = weights.reduce((a, b) => a + b, 0);
  const span = f.dir === "v" ? 3 : 2;
  const starts = weights.map((_, i) => (weights.slice(0, i).reduce((a, b) => a + b, 0) / total) * span);
  return (
    <svg viewBox="0 0 3 2" className="h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-black/10" aria-hidden>
      {f.colors.map((c, i) => {
        const size = (weights[i] / total) * span;
        return f.dir === "v"
          ? <rect key={i} x={starts[i]} y="0" width={size} height="2" fill={c} />
          : <rect key={i} x="0" y={starts[i]} width="3" height={size} fill={c} />;
      })}
    </svg>
  );
}

const AREA_PATHS: Record<OfferArea["icon"], string> = {
  globe: ICONS.globe,
  cpu: "M6 6h8v8H6zM8 2.5V6M12 2.5V6M8 14v3.5M12 14v3.5M2.5 8H6M2.5 12H6M14 8h3.5M14 12h3.5",
  megaphone: "M3 8.5v3h3l6 4v-11l-6 4zM14.5 7.5a3.5 3.5 0 0 1 0 5M6 11.5l1 4.5",
  users: "M7 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM13.5 8.5a2 2 0 1 0 0-4M2.5 16c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5M13.5 11.5c2.2 0 4 1.7 4 4.5",
  handshake: "M2.5 9 6 5.5l3 1.5 3-1.5L17.5 9M6 5.5 2.5 12l4 3.5 2-1.5M17.5 9 13 14.5l-2 1-2.5-2M9 7l-2.5 3 2 1 3-2",
  calculator: "M5 2.5h10v15H5zM7.5 5.5h5v2.5h-5zM7.5 11h.5M10 11h.5M12.5 11h.5M7.5 14h.5M10 14h.5M12.5 14h.5",
};

function AreaIcon({ name }: { name: OfferArea["icon"] }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={AREA_PATHS[name]} />
    </svg>
  );
}

// Intestazione di una sezione del modulo: icona, titolo, spiegazione.
function SectionTitle({ icon, title, text, htmlFor }: { icon: keyof typeof ICONS; title: string; text?: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ledger-soft text-ledger">
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <div>
        {htmlFor ? <label htmlFor={htmlFor} className="block font-semibold">{title}</label> : <p className="font-semibold">{title}</p>}
        {text && <p className="mt-0.5 text-xs text-muted">{text}</p>}
      </div>
    </div>
  );
}

export function SearchWizard({
  credits,
  maxQuantity,
  defaults = {},
  initialKind = "standard",
  signalPrices,
  offers,
  centsPerCredit = 0,
  modes = EMAIL_MODES,
}: {
  credits: number;
  centsPerCredit?: number; // prezzo indicativo di un credito, per la stima in euro
  maxQuantity: number;
  defaults?: WizardDefaults;
  initialKind?: SearchKind;
  signalPrices: SignalPrices;
  offers: ActiveOffer[]; // servizi attivi, con le regole dell'admin
  modes?: readonly EmailMode[]; // modalità attive: solo «Solo azienda» finché i referenti sono spenti
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSearch, {});
  const [kind, setKind] = useState<SearchKind>(initialKind);
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState(defaults.industry ?? "");
  // Ricerca opportunità: di default tutti i settori (più resa per il cliente, magazzino più ampio).
  const [allSectors, setAllSectors] = useState(!defaults.industry);
  const [regions, setRegions] = useState(defaults.regions?.join(", ") ?? "");
  const [offer, setOffer] = useState(defaults.offer ?? "");
  const [area, setArea] = useState(offerByCode(defaults.offer ?? "", offers)?.area ?? "");
  // Referenti spenti: niente passi «Chi contattare» e «Che email», si consegna solo l'azienda.
  const peopleOn = modes.some((m) => m !== "company_only");
  const [mode, setMode] = useState<EmailMode>(defaults.emailMode && modes.includes(defaults.emailMode) ? defaults.emailMode : modes[0]);
  const [quantity, setQuantity] = useState(Math.min(defaults.quantity ?? 10, maxQuantity));
  const [countries, setCountries] = useState<string[]>(defaults.countries ?? ["IT"]);
  // Nessuna dimensione preselezionata: con la dimensione la ricerca in target non può usare il database.
  const [sizes, setSizes] = useState<string[]>(defaults.companySizes ?? []);
  const [roles, setRoles] = useState<string[]>((defaults.roles ?? ["Titolare / CEO"]).filter((r) => (ROLE_PRESETS as readonly string[]).includes(r)));
  const customRoles = (defaults.roles ?? []).filter((r) => !(ROLE_PRESETS as readonly string[]).includes(r));
  const [moreCountries, setMoreCountries] = useState(countries.some((c) => !(MAIN_COUNTRIES as readonly string[]).includes(c)));
  const [advanced, setAdvanced] = useState(
    Boolean(defaults.revenueRange || defaults.keywords?.length || defaults.excludeKeywords?.length || defaults.notes || defaults.industryKeywords?.length),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [formTick, setFormTick] = useState(0);
  const [availability, setAvailability] = useState<{ key: string; value: Availability } | null>(null);
  const [suggestions, setSuggestions] = useState<IndustrySuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const info = MODE_INFO[mode];
  const opportunity = kind === "opportunity";
  const chosen = opportunity ? offerByCode(offer, offers) : undefined;
  const withSignal = Boolean(chosen);
  // La disponibilità dal server dice anche se la ricerca userà la ricerca AI sul web (+1 credito a lead).
  const [aiExtra, setAiExtra] = useState(0);
  const extra = chosen ? signalExtraRange(signalPrices, chosen.signals) : aiExtra;
  // Quantità limitata anche dai crediti: al massimo i lead che il saldo copre nel caso peggiore.
  const perLead = estimateCredits(mode, 1, extra).max;
  const affordable = perLead > 0 ? Math.floor(credits / perLead) : maxQuantity;
  const quantityMax = Math.max(1, Math.min(maxQuantity, affordable));
  const leads = Math.min(quantity, quantityMax);
  const estimate = estimateCredits(mode, leads, extra);
  const reserve = estimate.reserve;
  const enough = credits >= reserve;
  const euro = (n: number) => formatEur(Math.round((n * centsPerCredit) / 10) * 10);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const countryName = (c: string) => COUNTRIES.find(([k]) => k === c)?.[1] ?? c;

  const steps = STEPS[kind].filter(([key]) => peopleOn || (key !== "roles" && key !== "email"));
  const current = steps[Math.min(step, steps.length - 1)][0];
  const last = steps.length - 1;
  const chooseKind = (k: SearchKind) => {
    setKind(k);
    setStep(0);
  };
  const chooseIndustry = (v: string) => {
    setIndustry(v);
    setSuggestOpen(false);
    setFormTick((n) => n + 1);
  };

  // Settori del database che contengono il testo scritto (dopo una breve pausa).
  useEffect(() => {
    const q = industry.trim();
    if (!suggestOpen || q.length < 2) return;
    let alive = true;
    const t = setTimeout(async () => {
      const found = await industrySuggestions(q).catch(() => []);
      if (alive) setSuggestions(found);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [industry, suggestOpen]);
  const shownSuggestions = suggestOpen && industry.trim().length >= 2
    ? suggestions.filter((s) => s.industry.toLowerCase() !== industry.trim().toLowerCase())
    : [];

  // Opportunità: il cliente sceglie il servizio, i segnali li sceglie la regola del servizio.
  const jobAdCountriesOk = countries.every((c) => (JOB_AD_COUNTRIES as readonly string[]).includes(c));
  const regionList = regions.split(/[\n,]/).map((r) => r.trim()).filter(Boolean);
  const where = [regionList.join(", "), countries.map(countryName).join(", ")].filter(Boolean)[0] ?? "";
  const signalProblem = !opportunity
    ? ""
    : !chosen
      ? "Scegli il servizio che vendi."
      : offerUsesJobAds(chosen) && !jobAdCountriesOk
        ? "Per questo servizio usiamo gli annunci di lavoro, per ora disponibili solo per l'Italia: togli gli altri paesi."
        : "";
  const preview = chosen ? describeOffer({ offer: chosen.code, industry: allSectors ? "" : industry, where, offers }) : "";

  // Disponibilità dal database (stesso calcolo della riserva del motore), ricalcolata
  // quando cambiano servizio, zona, settore o esclusioni. Per le ricerche in target vale
  // solo per quelle semplici (settore e zona): per le altre il server risponde null.
  const chosenCode = chosen?.code ?? "";
  const wantsAvailability = opportunity ? Boolean(chosenCode) : Boolean(industry.trim());
  const availabilityKey = `${kind}|${chosenCode}|${formTick}`;
  useEffect(() => {
    if (!wantsAvailability) return;
    const t = setTimeout(async () => {
      if (!formRef.current) return;
      const value = await searchAvailability(new FormData(formRef.current)).catch(() => null);
      setAvailability({ key: availabilityKey, value });
      if (value) setAiExtra(value.aiExtra);
    }, 600);
    return () => clearTimeout(t);
  }, [wantsAvailability, availabilityKey]);
  const available = wantsAvailability && availability?.key === availabilityKey ? availability.value : null;
  const checking = Boolean(wantsAvailability && availability?.key !== availabilityKey);
  const noneAvailable = Boolean(opportunity && available?.kind === "opportunity" && available.databaseOnly && available.count === 0);
  const targetReady = !opportunity && available?.kind === "target" && available.count > 0 ? available.count : 0;
  const howMany = (n: number) => (n > 500 ? "oltre 500" : String(n));
  const showIndustry = !(opportunity && allSectors);
  const blocked = showIndustry && blockedSector([industry]) ? BLOCKED_SECTORS_MESSAGE : "";

  const summary: [string, ReactNode][] = [
    ["Tipologia", opportunity ? "Aziende con opportunità" : "Aziende in target"],
    ...(opportunity ? [["Servizio", chosen?.label ?? <em key="s" className="text-muted">Da scegliere</em>] as [string, ReactNode]] : []),
    ["Settore", showIndustry ? industry.trim() || <em key="i" className="text-muted">Non specificato</em> : "Tutti i settori"],
    ["Paesi", countries.length ? countries.map(countryName).join(", ") : <em key="c" className="text-muted">Nessuno</em>],
    ["Regioni", regionList.length ? regionList.join(", ") : <em key="r" className="text-muted">Tutto il paese</em>],
    ["Dimensione", sizes.length ? `${sizes.join(", ")} dipendenti` : <em key="d" className="text-muted">Qualsiasi</em>],
    ...(peopleOn && mode !== "company_only"
      ? [["Ruoli", roles.length || customRoles.length ? [...roles, ...customRoles].join(", ") : <em key="o" className="text-muted">Non specificato</em>] as [string, ReactNode]]
      : []),
    ["Cosa ricevi", mode === "company_only" ? "Azienda ed email aziendale" : info.label],
    ["Numero lead", <span key="q" className="font-mono">{leads}</span>],
  ];

  return (
    <form ref={formRef} action={action} onChange={() => setFormTick((n) => n + 1)} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo di ricerca">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              role="radio"
              aria-checked={kind === k.kind}
              onClick={() => chooseKind(k.kind)}
              className={cx(
                "relative flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-colors",
                kind === k.kind ? "border-ledger shadow-[0_0_0_1px_var(--color-ledger)]" : "border-line hover:border-ink-2",
              )}
            >
              <span className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-full", kind === k.kind ? "bg-ledger-soft text-ledger" : "bg-paper-2 text-ink-2")}>
                <Icon name={k.icon} className="h-6 w-6" />
              </span>
              <span className="flex flex-col gap-1 pr-6">
                <span className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold">
                  {k.title}
                  {k.kind === "opportunity" && <span className="rounded-full bg-stamp-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-stamp-ink">Nuovo</span>}
                </span>
                <span className="text-sm text-ink-2">{k.text}</span>
                <span className="text-xs text-muted">{k.example}</span>
              </span>
              <span
                className={cx(
                  "absolute right-4 top-4 grid h-5 w-5 place-items-center rounded-full border",
                  kind === k.kind ? "border-ledger bg-ledger text-white" : "border-line bg-card",
                )}
                aria-hidden
              >
                {kind === k.kind && <Icon name="check" className="h-3.5 w-3.5" />}
              </span>
            </button>
          ))}
        </div>

        <ol className="flex items-center gap-2" aria-label="Passi">
          {steps.map(([key, s], i) => (
            <li key={key} className={cx("flex min-w-0 items-center gap-2", i > 0 && "flex-1")}>
              {i > 0 && <span className="h-px min-w-3 flex-1 bg-line" aria-hidden />}
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={step === i ? "step" : undefined}
                title={s}
                className="group flex shrink-0 items-center gap-2 text-sm"
              >
                <span
                  className={cx(
                    "grid h-9 w-9 place-items-center rounded-full border font-mono text-xs transition-colors",
                    step === i ? "border-ledger bg-ledger text-white" : i < step ? "border-ledger/30 bg-ledger-soft text-ledger" : "border-line bg-card text-ink-2 group-hover:border-ink-2",
                  )}
                >
                  {i < step ? <Icon name="check" className="h-4 w-4" /> : String(i + 1).padStart(2, "0")}
                </span>
                <span className={cx("whitespace-nowrap", step === i ? "font-semibold text-ink" : cx("hidden text-ink-2", steps.length > 4 ? "2xl:inline" : "xl:inline"))}>{s}</span>
              </button>
            </li>
          ))}
        </ol>

        {state.error && <Alert tone="brick">{state.error}</Alert>}

        {/* Opportunità: che servizio vendi. Tutti i passi restano nel DOM, così il form invia tutto. */}
        {opportunity && (
          <Card className={cx("flex flex-col gap-6 p-6", current !== "offer" && "hidden")}>
            <input type="hidden" name="offer" value={chosen?.code ?? ""} />
            <div>
              <SectionTitle icon="bars" title="Che servizio vendi?" text="Scegli l'area, poi il servizio: cerchiamo le aziende con un segnale concreto collegato, e su ogni lead trovi la prova." />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Area del servizio">
                {OFFER_AREAS.filter((a) => offersOfArea(a.code, offers).length).map((a) => (
                  <button
                    key={a.code}
                    type="button"
                    role="radio"
                    aria-checked={area === a.code}
                    onClick={() => {
                      setArea(a.code);
                      if (offerByCode(offer, offers)?.area !== a.code) setOffer(offersOfArea(a.code, offers).length === 1 ? offersOfArea(a.code, offers)[0].code : "");
                    }}
                    className={cx(
                      "flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors",
                      area === a.code ? "border-ledger shadow-[0_0_0_1px_var(--color-ledger)]" : "border-line hover:border-ink-2",
                    )}
                  >
                    <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full", area === a.code ? "bg-ledger text-white" : "bg-ledger-soft text-ledger")}>
                      <AreaIcon name={a.icon} />
                    </span>
                    <span>
                      <span className="block font-semibold">{a.label}</span>
                      <span className="mt-0.5 block text-xs text-ink-2">{a.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {area && (
              <div className="animate-row-in">
                <p className="text-sm font-medium">Più nello specifico</p>
                <div className="mt-3 grid gap-2" role="radiogroup" aria-label="Servizio">
                  {offersOfArea(area, offers).map((o) => (
                    <label
                      key={o.code}
                      className={cx(
                        "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                        offer === o.code ? "border-ledger bg-ledger-soft" : "border-line hover:border-ink-2",
                      )}
                    >
                      <input type="radio" name="offerChoice" value={o.code} checked={offer === o.code} onChange={() => setOffer(o.code)} className="mt-1 accent-[var(--color-ledger)]" />
                      <span className="flex-1">
                        <span className="block font-medium">{o.label}</span>
                        <span className="block text-xs text-ink-2">{o.description}</span>
                        <span className="mt-1 block text-xs text-muted">Cerchiamo aziende con {o.lookFor}.</span>
                        {offerUsesJobAds(o) && (
                          <span className="mt-1 block text-xs text-stamp-ink">Basato sugli annunci di lavoro: la disponibilità cresce man mano che ampliamo le fonti.</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {signalProblem && chosen && <Alert>{signalProblem}</Alert>}
            <p className="text-xs text-muted">
              I segnali descrivono fatti pubblici osservati (annunci di lavoro, caratteristiche del sito): non garantiscono che l&apos;azienda abbia bisogno del tuo servizio, ma ti dicono quando proporlo.
            </p>
          </Card>
        )}

        {/* Passo: target */}
        <Card className={cx("flex flex-col gap-7 p-6", current !== "target" && "hidden")}>
          {opportunity && (
            <div>
              <SectionTitle icon="building" title="In quali aziende?" />
              <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Settore">
                {([[true, "Tutti i settori", "Consigliato: più aziende con il segnale, risultati più rapidi."], [false, "Solo un settore", "Se il tuo servizio è pensato per un settore preciso."]] as const).map(([v, l, d]) => (
                  <label key={l} className={cx("flex cursor-pointer gap-3 rounded-lg border px-4 py-3 text-sm", allSectors === v ? "border-ledger bg-ledger-soft" : "border-line hover:border-ink-2")}>
                    <input type="radio" name="sectorScope" checked={allSectors === v} onChange={() => setAllSectors(v)} className="mt-0.5 accent-[var(--color-ledger)]" />
                    <span><span className="block font-medium">{l}</span><span className="block text-xs text-ink-2">{d}</span></span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {showIndustry ? (
            <div>
              <SectionTitle
                icon="building"
                htmlFor="industry"
                title={opportunity ? "Quale settore?" : "Che tipo di aziende cerchi?"}
                text="Descrivi il settore come lo spiegheresti a un collega: «studi dentistici», «produttori di macchine per il packaging»."
              />
              <div className="relative mt-3">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <Icon name="search" className="h-4 w-4" />
                </span>
                <Input
                  id="industry"
                  name="industry"
                  value={industry}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={shownSuggestions.length > 0}
                  aria-controls="industry-suggestions"
                  onChange={(e) => {
                    setIndustry(e.target.value);
                    setSuggestOpen(true);
                  }}
                  onFocus={() => setSuggestOpen(true)}
                  onBlur={() => setSuggestOpen(false)}
                  onKeyDown={(e) => e.key === "Escape" && setSuggestOpen(false)}
                  placeholder="Es. software house, studi dentistici, produttori di packaging"
                  className="h-11 pl-9"
                />
                {shownSuggestions.length > 0 && (
                  <ul id="industry-suggestions" role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-card py-1 shadow-lg">
                    <li className="px-3 pb-1 pt-1.5 text-[11px] uppercase tracking-wider text-muted">Settori nel nostro database</li>
                    {shownSuggestions.map((s) => (
                      <li key={s.industry} role="option" aria-selected={false}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            chooseIndustry(s.industry);
                          }}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-ledger-soft"
                        >
                          <span>{s.industry}</span>
                          <span className="shrink-0 font-mono text-xs text-ledger">{s.companies > 500 ? "500+" : s.companies} aziende</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {blocked && <p className="mt-2 text-xs text-brick">{blocked}</p>}
              <p className="mt-3 text-xs text-muted">Esempi popolari</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {POPULAR_INDUSTRIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => chooseIndustry(p)}
                    className={cx(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      industry.trim().toLowerCase() === p.toLowerCase() ? "border-ledger bg-ledger-soft text-ledger" : "border-line bg-card hover:border-ink-2",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <input type="hidden" name="industry" value="" />
          )}

          <div>
            <SectionTitle icon="globe" title="Paesi" text="Seleziona i paesi in cui cercare le aziende." />
            <div className="mt-3 flex flex-wrap gap-2">
              {COUNTRIES.map(([code, name]) => {
                const main = (MAIN_COUNTRIES as readonly string[]).includes(code);
                return (
                  <label
                    key={code}
                    className={cx(
                      "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      countries.includes(code) ? "border-ledger bg-ledger-soft text-ledger" : "border-line bg-card hover:border-ink-2",
                      !main && !moreCountries && "hidden",
                    )}
                  >
                    <input type="checkbox" name="countries" value={code} checked={countries.includes(code)} onChange={() => setCountries(toggle(countries, code))} className="sr-only" />
                    {main && <Flag code={code} />}
                    {name}
                  </label>
                );
              })}
              <button
                type="button"
                onClick={() => setMoreCountries(!moreCountries)}
                aria-expanded={moreCountries}
                className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-ink-2 hover:border-ink-2"
              >
                {moreCountries ? "Meno paesi" : `+ Altri paesi${countries.filter((c) => !(MAIN_COUNTRIES as readonly string[]).includes(c)).length ? ` (${countries.filter((c) => !(MAIN_COUNTRIES as readonly string[]).includes(c)).length})` : ""}`}
              </button>
            </div>
            {countries.some((c) => c !== "IT") && (
              <p className="mt-2 text-xs text-stamp-ink">Fuori dall&apos;Italia cerchiamo le aziende direttamente sul web: la ricerca può richiedere più tempo e trovare meno lead.</p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <SectionTitle icon="pin" htmlFor="regions" title="Regione o città" text="Facoltativo. Più zone separate da virgola." />
              <Input id="regions" name="regions" value={regions} onChange={(e) => setRegions(e.target.value)} placeholder="Es. Milano, Torino, Lombardia" className="mt-3" />
            </div>
            <div>
                <SectionTitle icon="building" title="Dimensione aziendale" text="Facoltativa: senza scelta, qualsiasi dimensione." />
                <div className="mt-3 flex flex-wrap gap-2">
                  {COMPANY_SIZES.map((s) => (
                    <label
                      key={s}
                      className={cx(
                        "cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        sizes.includes(s) ? "border-ledger bg-ledger-soft text-ledger" : "border-line bg-card hover:border-ink-2",
                      )}
                    >
                      <input type="checkbox" name="companySizes" value={s} checked={sizes.includes(s)} onChange={() => setSizes(toggle(sizes, s))} className="sr-only" />
                      {s}
                    </label>
                  ))}
                </div>
                {sizes.length > 0 && !opportunity && (
                  <p className="mt-2 text-xs text-stamp-ink">La dimensione la verifichiamo sul web: la ricerca può richiedere qualche minuto in più.</p>
                )}
              </div>
          </div>

          <div className="border-t border-line pt-5">
            <button type="button" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced} className="flex w-full items-center justify-between gap-3 text-left">
              <SectionTitle icon="filter" title="Filtri avanzati (facoltativi)" text="Fatturato, parole chiave, esclusioni e note per affinare la ricerca." />
              <Icon name="chevron" className={cx("h-5 w-5 shrink-0 text-muted transition-transform", advanced && "rotate-180")} />
            </button>
            <div className={cx("mt-4 grid gap-4 rounded-xl bg-paper-2/60 p-4 sm:grid-cols-2", !advanced && "hidden")}>
              {showIndustry && (
                <Field label="Parole chiave del settore" htmlFor="industryKeywords" hint="Termini usati dalle aziende, anche in lingua locale. Allargano la ricerca.">
                  <Input id="industryKeywords" name="industryKeywords" defaultValue={defaults.industryKeywords?.join(", ")} placeholder="Es. software gestionale, ERP" />
                </Field>
              )}
              <Field label="Da escludere" htmlFor="excludeKeywords" hint="Aziende con queste parole non entrano nella ricerca.">
                <Input id="excludeKeywords" name="excludeKeywords" defaultValue={defaults.excludeKeywords?.join(", ")} placeholder="Es. franchising, multinazionali" />
              </Field>
              <Field label="Fatturato indicativo" htmlFor="revenueRange" hint="Usato quando il dato è pubblico.">
                <Input id="revenueRange" name="revenueRange" defaultValue={defaults.revenueRange} placeholder="Es. 1-10 milioni €" />
              </Field>
              <Field label="Parole chiave aggiuntive" htmlFor="keywords">
                <Input id="keywords" name="keywords" defaultValue={defaults.keywords?.join(", ")} placeholder="Es. e-commerce, export" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Note per la ricerca" htmlFor="notes" hint="Qualsiasi dettaglio utile: tipo di clienti che servono, tecnologie che usano, ecc.">
                  <Textarea id="notes" name="notes" maxLength={600} defaultValue={defaults.notes} className="min-h-20" />
                </Field>
              </div>
              {!opportunity && (
                <p className="text-xs text-muted sm:col-span-2">Fatturato, parole chiave aggiuntive e note li verifichiamo sul web: la ricerca può richiedere qualche minuto in più.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Passo: ruoli (solo con i referenti attivi) */}
        {peopleOn && <Card className={cx("flex flex-col gap-5 p-6", current !== "roles" && "hidden")}>
          <div>
            <SectionTitle icon="target" title="Ruoli da contattare" text="Le persone a cui vuoi scrivere." />
            <div className="mt-3 flex flex-wrap gap-2">
              {ROLE_PRESETS.map((r) => (
                <label key={r} className={cx("cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors", roles.includes(r) ? "border-ledger bg-ledger-soft text-ledger" : "border-line bg-card hover:border-ink-2")}>
                  <input type="checkbox" name="roles" value={r} checked={roles.includes(r)} onChange={() => setRoles(toggle(roles, r))} className="sr-only" />
                  {r}
                </label>
              ))}
            </div>
          </div>
          <Field label="Altri ruoli (facoltativo)" htmlFor="customRoles" hint="Uno per riga, es. «Responsabile logistica».">
            <Textarea id="customRoles" name="customRoles" defaultValue={customRoles.join("\n")} className="min-h-20" />
          </Field>
          <Field label="Contatti per azienda" htmlFor="contactsPerCompany" hint="Con 1 contatto non ti consegniamo mai due persone della stessa azienda, nemmeno in ricerche diverse.">
            <select id="contactsPerCompany" name="contactsPerCompany" defaultValue={String(defaults.contactsPerCompany ?? 1)} className="h-10 w-40 rounded-lg border border-line bg-white px-3 text-sm">
              <option value="1">1 per azienda</option>
              <option value="2">Fino a 2</option>
              <option value="3">Fino a 3</option>
            </select>
          </Field>
        </Card>}

        {/* Passo: modalità email (solo con i referenti attivi) */}
        {!peopleOn && <input type="hidden" name="emailMode" value="company_only" />}
        {peopleOn && <div className={cx("grid gap-4 md:grid-cols-2 xl:grid-cols-4", current !== "email" && "hidden")} role="radiogroup">
          {modes.map((m) => (
            <label key={m} className={cx("flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-5 transition-colors", mode === m ? "border-ledger shadow-[0_0_0_1px_var(--color-ledger)]" : "border-line hover:border-ink-2")}>
              <input type="radio" name="emailMode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              <span className="font-display text-lg font-semibold">{MODE_INFO[m].label}</span>
              <span className="text-sm text-ink-2">{MODE_INFO[m].short}</span>
              <span className="font-mono text-xs text-muted">{MODE_INFO[m].example}</span>
              <span className="mt-auto font-mono text-sm text-ledger">
                {(() => {
                  const e = estimateCredits(m, 1, extra);
                  return e.min === e.max ? e.min : `${e.min}–${e.max}`;
                })()} crediti per lead{withSignal ? " (segnale compreso)" : aiExtra ? " (ricerca estesa compresa)" : ""}
              </span>
            </label>
          ))}
        </div>}

        {/* Passo: quantità e nome */}
        <Card className={cx("flex flex-col gap-6 p-6", current !== "quantity" && "hidden")}>
          <div>
            <label htmlFor="quantity" className="mb-3 flex justify-between text-sm font-medium">
              Quanti lead? <span className="font-mono">{leads}</span>
            </label>
            <input id="quantity" name="quantity" type="range" min={1} max={quantityMax} value={leads} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full accent-[var(--color-ledger)]" />
            <p className="mt-1 text-xs text-muted">
              Il tuo piano permette fino a {maxQuantity} lead per ricerca
              {affordable < maxQuantity && <>; con i crediti disponibili ({credits}) puoi chiederne fino a {Math.max(0, affordable)}</>}.
            </p>
            {leads > 300 && (
              <div className="mt-3">
                <Alert>
                  Le ricerche molto grandi procedono a tappe e possono richiedere un paio d&apos;ore: i lead compaiono man mano.
                  Se il mercato scelto è piccolo, la ricerca si chiude prima. Paghi solo i lead consegnati, il resto dei crediti torna disponibile.
                </Alert>
              </div>
            )}
          </div>
          <Field label="Ripeti questa ricerca" htmlFor="repeat">
            <Select id="repeat" name="repeat" defaultValue="none">
              <option value="none">No, una volta sola</option>
              <option value="weekly">Ogni settimana, con nuovi lead</option>
              <option value="monthly">Ogni mese, con nuovi lead</option>
            </Select>
            <p className="mt-1 text-xs text-muted">Ogni ripetizione cerca solo aziende che non hai già e usa i crediti disponibili in quel momento. Puoi fermarla quando vuoi dalla pagina della ricerca.</p>
          </Field>
          <Field label="Nome della ricerca (facoltativo)" htmlFor="name">
            <Input id="name" name="name" defaultValue={defaults.name} placeholder="Generato automaticamente se vuoto" />
          </Field>
        </Card>

        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Indietro</Button>
          {step < last && (
            <Button type="button" onClick={() => setStep(step + 1)} className="gap-2">
              Avanti <Icon name="arrow" className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-10 lg:self-start">
        <Card className="flex flex-col gap-4 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Icon name="doc" className="h-5 w-5 text-ink-2" /> Riepilogo ricerca
          </p>
          {opportunity && (
            <div className="rounded-lg border border-ledger/30 bg-ledger-soft/60 p-3 text-sm">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ledger">Anteprima della ricerca</p>
              <p className="text-ink-2">{preview || "Scegli il servizio che vendi."}</p>
              {chosen && (
                <p className={cx("mt-2 border-t border-ledger/20 pt-2 text-xs", noneAvailable ? "text-brick" : "text-ink-2")} aria-live="polite">
                  {checking || !available
                    ? checking ? "Controllo le aziende disponibili…" : ""
                    : available.databaseOnly
                      ? available.count === 0
                        ? "Per ora nessuna azienda con un annuncio recente per questa ricerca: prova ad allargare la zona o a scegliere tutti i settori."
                        : <>Disponibili ora: <strong className="font-mono">{howMany(available.count)}</strong> {available.count === 1 ? "azienda" : "aziende"} con un annuncio recente.{available.count < leads && " Ne chiedi di più: la ricerca si fermerà prima e i crediti non usati tornano disponibili."}</>
                      : available.count > 0
                        ? <>Stima preliminare: <strong className="font-mono">{howMany(available.count)}</strong> {available.count === 1 ? "azienda compatibile" : "aziende compatibili"} con la prova. Avvia la ricerca per scoprire altri risultati.</>
                        : "Cerchiamo le aziende sul web: può richiedere qualche minuto in più."}
                </p>
              )}
            </div>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-t border-line pt-4 text-sm">
            {summary.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
          {targetReady > 0 && (
            <p className="rounded-lg border border-ledger/30 bg-ledger-soft/60 p-3 text-xs text-ink-2" aria-live="polite">
              Stima preliminare: <strong className="font-mono">{howMany(targetReady)}</strong> {targetReady === 1 ? "azienda compatibile" : "aziende compatibili"}. Avvia la ricerca per scoprire altri risultati.
            </p>
          )}
          <div className="rounded-xl bg-ledger-soft p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-ledger">
              <Icon name="coins" className="h-4 w-4" /> Crediti stimati
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold">{estimate.min === reserve ? reserve : `${estimate.min}–${reserve}`}</p>
            {centsPerCredit > 0 && (
              <p className="text-xs text-ink-2">circa {estimate.min === reserve ? euro(reserve) : `${euro(estimate.min)}–${euro(reserve)}`} al prezzo del tuo piano</p>
            )}
            <p className="mt-1 text-xs text-ink-2">
              {withSignal && <>Ogni lead con opportunità: {extraCreditsLabel(signalPrices)}. </>}
              {!withSignal && aiExtra > 0 && <>Ricerca estesa: con questi filtri non ci fermiamo al nostro database, cerchiamo aziende nuove sul web e le controlliamo una per una ({aiExtra} credito in più a lead). </>}
              Riserviamo {reserve} crediti e addebitiamo solo i lead consegnati; un lead sbagliato si segnala e il credito torna. Disponibili: <strong>{credits}</strong>.
            </p>
          </div>
          {withSignal && (
            <p className="text-xs text-muted">
              Le ricerche con segnali scartano le aziende senza prova: possono richiedere più tempo e trovare meno lead del previsto. I crediti non usati tornano disponibili.
            </p>
          )}
          {!enough && <Alert>Crediti insufficienti per questa quantità. Riduci i lead o acquista crediti.</Alert>}
          {signalProblem && <p className="text-xs text-brick">{signalProblem}</p>}
          {blocked && <p className="text-xs text-brick">{blocked}</p>}
          <Button type="submit" size="lg" className="gap-2" disabled={pending || !enough || countries.length === 0 || Boolean(signalProblem) || noneAvailable || Boolean(blocked)}>
            {!pending && <Icon name="play" className="h-4 w-4" />}
            {pending ? "Avvio in corso…" : "Avvia la ricerca"}
          </Button>
          <p className="flex items-start gap-2 text-xs text-ink-2">
            <Icon name="shield" className="mt-px h-4 w-4 shrink-0 text-ledger" />
            Paghi solo i lead consegnati: i crediti non usati tornano disponibili.
          </p>
          <p className="text-xs text-muted">Puoi chiudere la pagina: ti avvisiamo via email quando i lead sono pronti.</p>
        </Card>
      </aside>
    </form>
  );
}
