"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { COMPANY_SIZES, COUNTRIES, MODE_INFO, ROLE_PRESETS, type EmailMode } from "@/lib/domain/catalog";
import { estimateCredits } from "@/lib/domain/pricing";
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
import { createSearch, searchAvailability, type ActionState, type Availability } from "../../actions";

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

const KINDS: { kind: SearchKind; title: string; text: string; example: string }[] = [
  {
    kind: "standard",
    title: "Trova aziende in target",
    text: "Aziende e decisori in base a settore, zona e ruolo.",
    example: "Es. titolari di studi dentistici in Lombardia",
  },
  {
    kind: "opportunity",
    title: "Trova aziende con opportunità",
    text: "Parti da quello che vendi: aziende con un segnale concreto legato al tuo servizio, con la prova.",
    example: "Es. aziende che assumono un sistemista, siti con software vecchio",
  },
];

const AREA_PATHS: Record<OfferArea["icon"], string> = {
  globe: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM2 10h16M10 2c2.2 2.2 3.2 5 3.2 8s-1 5.8-3.2 8c-2.2-2.2-3.2-5-3.2-8s1-5.8 3.2-8z",
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

export function SearchWizard({
  credits,
  maxQuantity,
  defaults = {},
  initialKind = "standard",
  signalPrices,
  offers,
}: {
  credits: number;
  maxQuantity: number;
  defaults?: WizardDefaults;
  initialKind?: SearchKind;
  signalPrices: SignalPrices;
  offers: ActiveOffer[]; // servizi attivi, con le regole dell'admin
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSearch, {});
  const [kind, setKind] = useState<SearchKind>(initialKind);
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState(defaults.industry ?? "");
  // Ricerca opportunità: di default tutti i settori (più resa per il cliente, magazzino più ampio).
  const [allSectors, setAllSectors] = useState(!defaults.industry);
  const [regions, setRegions] = useState(defaults.regions?.join("\n") ?? "");
  const [offer, setOffer] = useState(defaults.offer ?? "");
  const [area, setArea] = useState(offerByCode(defaults.offer ?? "", offers)?.area ?? "");
  const [mode, setMode] = useState<EmailMode>(defaults.emailMode ?? "mixed");
  const [quantity, setQuantity] = useState(Math.min(defaults.quantity ?? 10, maxQuantity));
  const [countries, setCountries] = useState<string[]>(defaults.countries ?? ["IT"]);
  const [roles, setRoles] = useState<string[]>((defaults.roles ?? ["Titolare / CEO"]).filter((r) => (ROLE_PRESETS as readonly string[]).includes(r)));
  const customRoles = (defaults.roles ?? []).filter((r) => !(ROLE_PRESETS as readonly string[]).includes(r));
  const formRef = useRef<HTMLFormElement>(null);
  const [formTick, setFormTick] = useState(0);
  const [availability, setAvailability] = useState<{ key: string; value: Availability } | null>(null);

  const info = MODE_INFO[mode];
  const opportunity = kind === "opportunity";
  const chosen = opportunity ? offerByCode(offer, offers) : undefined;
  const withSignal = Boolean(chosen);
  const extra = chosen ? signalExtraRange(signalPrices, chosen.signals) : 0;
  const estimate = estimateCredits(mode, quantity, extra);
  const reserve = estimate.reserve;
  const enough = credits >= reserve;
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const steps = STEPS[kind];
  const current = steps[Math.min(step, steps.length - 1)][0];
  const last = steps.length - 1;
  const chooseKind = (k: SearchKind) => {
    setKind(k);
    setStep(0);
  };

  // Opportunità: il cliente sceglie il servizio, i segnali li sceglie la regola del servizio.
  const jobAdCountriesOk = countries.every((c) => (JOB_AD_COUNTRIES as readonly string[]).includes(c));
  const where = [
    regions.split(/[\n,]/).map((r) => r.trim()).filter(Boolean).join(", "),
    countries.map((c) => COUNTRIES.find(([k]) => k === c)?.[1]).join(", "),
  ].filter(Boolean)[0] ?? "";
  const signalProblem = !opportunity
    ? ""
    : !chosen
      ? "Scegli il servizio che vendi."
      : offerUsesJobAds(chosen) && !jobAdCountriesOk
        ? "Per questo servizio usiamo gli annunci di lavoro, disponibili solo in alcuni paesi: togli i paesi non coperti."
        : "";
  const preview = chosen ? describeOffer({ offer: chosen.code, industry: allSectors ? "" : industry, where, offers }) : "";

  // Disponibilità dal database (stesso calcolo della riserva del motore), ricalcolata
  // quando cambiano servizio, zona, settore o esclusioni.
  const chosenCode = chosen?.code ?? "";
  const availabilityKey = `${chosenCode}|${formTick}`;
  useEffect(() => {
    if (!opportunity || !chosenCode) return;
    const t = setTimeout(async () => {
      if (!formRef.current) return;
      const value = await searchAvailability(new FormData(formRef.current)).catch(() => null);
      setAvailability({ key: availabilityKey, value });
    }, 600);
    return () => clearTimeout(t);
  }, [opportunity, chosenCode, availabilityKey]);
  const available = opportunity && chosen && availability?.key === availabilityKey ? availability.value : null;
  const checking = Boolean(opportunity && chosen && availability?.key !== availabilityKey);
  const noneAvailable = Boolean(available?.databaseOnly && available.count === 0);
  const howMany = (n: number) => (n > 500 ? "oltre 500" : String(n));

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
                "flex flex-col gap-1 rounded-xl border bg-card p-4 text-left transition-colors",
                kind === k.kind ? "border-ledger shadow-[0_0_0_1px_var(--color-ledger)]" : "border-line hover:border-ink-2",
              )}
            >
              <span className="flex items-center gap-2 font-display text-lg font-semibold">
                {k.title}
                {k.kind === "opportunity" && <span className="rounded-full bg-stamp-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-stamp-ink">Nuovo</span>}
              </span>
              <span className="text-sm text-ink-2">{k.text}</span>
              <span className="font-mono text-xs text-muted">{k.example}</span>
            </button>
          ))}
        </div>

        <ol className="flex flex-wrap gap-2" aria-label="Passi">
          {steps.map(([key, s], i) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={step === i ? "step" : undefined}
                className={cx(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  step === i ? "border-ink bg-ink text-paper" : i < step ? "border-ledger/30 bg-ledger-soft text-ledger" : "border-line text-ink-2",
                )}
              >
                <span className="font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                {s}
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
              <p className="text-sm font-medium">Che servizio vendi?</p>
              <p className="mt-1 text-xs text-muted">Scegli l&apos;area, poi il servizio: cerchiamo le aziende con un segnale concreto collegato, e su ogni lead trovi la prova.</p>
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
        <Card className={cx("flex flex-col gap-5 p-6", current !== "target" && "hidden")}>
          {opportunity && (
            <div>
              <p className="mb-2 text-sm font-medium">In quali aziende?</p>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Settore">
                {([[true, "Tutti i settori", "Consigliato: più aziende con il segnale, risultati più rapidi."], [false, "Solo un settore", "Se il tuo servizio è pensato per un settore preciso."]] as const).map(([v, l, d]) => (
                  <label key={l} className={cx("flex cursor-pointer gap-3 rounded-lg border px-4 py-3 text-sm", allSectors === v ? "border-ledger bg-ledger-soft" : "border-line hover:border-ink-2")}>
                    <input type="radio" name="sectorScope" checked={allSectors === v} onChange={() => setAllSectors(v)} className="mt-0.5 accent-[var(--color-ledger)]" />
                    <span><span className="block font-medium">{l}</span><span className="block text-xs text-ink-2">{d}</span></span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {opportunity && allSectors ? (
            <input type="hidden" name="industry" value="" />
          ) : (
            <Field label="Settore o tipo di azienda" htmlFor="industry" hint="Scrivilo come lo spiegheresti a un collega: «agenzie di marketing digitale», «studi dentistici», «produttori di macchine per il packaging».">
              <Input id="industry" name="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="es. Software house che sviluppano gestionali" />
            </Field>
          )}
          <div>
            <p className="mb-2 text-sm font-medium">Paesi</p>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {COUNTRIES.map(([code, name]) => (
                <label key={code} className={cx("cursor-pointer rounded-full border px-3 py-1 text-sm", countries.includes(code) ? "border-ledger bg-ledger-soft text-ledger" : "border-line hover:border-ink-2")}>
                  <input type="checkbox" name="countries" value={code} checked={countries.includes(code)} onChange={() => setCountries(toggle(countries, code))} className="sr-only" />
                  {name}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Regioni o città (facoltativo)" htmlFor="regions" hint="Una per riga o separate da virgola.">
              <Textarea id="regions" name="regions" value={regions} onChange={(e) => setRegions(e.target.value)} placeholder={"Milano\nTorino"} className="min-h-20" />
            </Field>
            {!(opportunity && allSectors) && (
              <Field label="Parole chiave del settore (facoltativo)" htmlFor="industryKeywords" hint="Termini usati dalle aziende, anche in lingua locale.">
                <Textarea id="industryKeywords" name="industryKeywords" defaultValue={defaults.industryKeywords?.join("\n")} placeholder={"software gestionale\nERP"} className="min-h-20" />
              </Field>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Dimensione (dipendenti)</p>
            <div className="flex flex-wrap gap-2">
              {COMPANY_SIZES.map((s) => (
                <label key={s} className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm has-[:checked]:border-ledger has-[:checked]:bg-ledger-soft">
                  <input type="checkbox" name="companySizes" value={s} defaultChecked={defaults.companySizes?.includes(s)} className="accent-[var(--color-ledger)]" />
                  {s}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">Nessuna selezione = qualsiasi dimensione.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Fatturato indicativo (facoltativo)" htmlFor="revenueRange" hint="Usato quando il dato è pubblico.">
              <Input id="revenueRange" name="revenueRange" defaultValue={defaults.revenueRange} placeholder="es. 1-10 milioni €" />
            </Field>
            <Field label="Da escludere (facoltativo)" htmlFor="excludeKeywords" hint="Es. franchising, multinazionali.">
              <Input id="excludeKeywords" name="excludeKeywords" defaultValue={defaults.excludeKeywords?.join(", ")} />
            </Field>
          </div>
          <Field label="Parole chiave aggiuntive (facoltativo)" htmlFor="keywords">
            <Input id="keywords" name="keywords" defaultValue={defaults.keywords?.join(", ")} placeholder="es. e-commerce, export" />
          </Field>
          <Field label="Note per la ricerca (facoltativo)" htmlFor="notes" hint="Qualsiasi dettaglio utile: tipo di clienti che servono, tecnologie che usano, ecc.">
            <Textarea id="notes" name="notes" maxLength={600} defaultValue={defaults.notes} />
          </Field>
        </Card>

        {/* Passo: ruoli */}
        <Card className={cx("flex flex-col gap-5 p-6", current !== "roles" && "hidden")}>
          <div>
            <p className="mb-2 text-sm font-medium">Ruoli da contattare</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((r) => (
                <label key={r} className={cx("cursor-pointer rounded-full border px-3 py-1 text-sm", roles.includes(r) ? "border-ledger bg-ledger-soft text-ledger" : "border-line hover:border-ink-2")}>
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
        </Card>

        {/* Passo: modalità email */}
        <div className={cx("grid gap-4 md:grid-cols-3", current !== "email" && "hidden")} role="radiogroup">
          {(Object.keys(MODE_INFO) as EmailMode[]).map((m) => (
            <label key={m} className={cx("flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-5 transition-colors", mode === m ? "border-ledger shadow-[0_0_0_1px_var(--color-ledger)]" : "border-line hover:border-ink-2")}>
              <input type="radio" name="emailMode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              <span className="font-display text-lg font-semibold">{MODE_INFO[m].label}</span>
              <span className="text-sm text-ink-2">{MODE_INFO[m].short}</span>
              <span className="font-mono text-xs text-muted">{MODE_INFO[m].example}</span>
              <span className="mt-auto font-mono text-sm text-ledger">
                {(() => {
                  const e = estimateCredits(m, 1, extra);
                  return e.min === e.max ? e.min : `${e.min}–${e.max}`;
                })()} crediti per lead{withSignal ? " (segnale compreso)" : ""}
              </span>
            </label>
          ))}
        </div>

        {/* Passo: quantità e nome */}
        <Card className={cx("flex flex-col gap-6 p-6", current !== "quantity" && "hidden")}>
          <div>
            <label htmlFor="quantity" className="mb-3 flex justify-between text-sm font-medium">
              Quanti lead? <span className="font-mono">{quantity}</span>
            </label>
            <input id="quantity" name="quantity" type="range" min={1} max={maxQuantity} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full accent-[var(--color-ledger)]" />
            <p className="mt-1 text-xs text-muted">Il tuo piano permette fino a {maxQuantity} lead per ricerca.</p>
            {quantity > 300 && (
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
            <p className="mt-1 text-xs text-muted">Ogni ripetizione cerca solo contatti che non hai già e usa i crediti disponibili in quel momento. Puoi fermarla quando vuoi dalla pagina della ricerca.</p>
          </Field>
          <Field label="Nome della ricerca (facoltativo)" htmlFor="name">
            <Input id="name" name="name" defaultValue={defaults.name} placeholder="Generato automaticamente se vuoto" />
          </Field>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Indietro</Button>
          {step < last && <Button type="button" variant="secondary" onClick={() => setStep(step + 1)}>Avanti</Button>}
        </div>
      </div>

      <aside className="lg:sticky lg:top-10 lg:self-start">
        <Card className="ruled flex flex-col gap-4 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Riepilogo</p>
          {opportunity && (
            <div className="rounded-lg border border-ledger/30 bg-ledger-soft/60 p-3 text-sm">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ledger">Anteprima della ricerca</p>
              {chosen && <p className="mb-1 text-sm font-medium">{chosen.label}</p>}
              <p className="text-ink-2">{preview || "Scegli il servizio che vendi."}</p>
              {chosen && (
                <p className={cx("mt-2 border-t border-ledger/20 pt-2 text-xs", noneAvailable ? "text-brick" : "text-ink-2")} aria-live="polite">
                  {checking || !available
                    ? checking ? "Controllo le aziende disponibili…" : ""
                    : available.databaseOnly
                      ? available.count === 0
                        ? "Per ora nessuna azienda con un annuncio recente per questa ricerca: prova ad allargare la zona o a scegliere tutti i settori."
                        : <>Disponibili ora: <strong className="font-mono">{howMany(available.count)}</strong> aziende con un annuncio recente.{available.count < quantity && " Ne chiedi di più: la ricerca si fermerà prima e i crediti non usati tornano disponibili."}</>
                      : available.count > 0
                        ? <><strong className="font-mono">{howMany(available.count)}</strong> aziende già pronte con la prova; le altre le cerchiamo sul web.</>
                        : "Cerchiamo le aziende sul web: può richiedere qualche minuto in più."}
                </p>
              )}
            </div>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted">Paesi</dt>
            <dd>{countries.length ? countries.map((c) => COUNTRIES.find(([k]) => k === c)?.[1]).join(", ") : "—"}</dd>
            <dt className="text-muted">Ruoli</dt>
            <dd>{roles.length || customRoles.length ? [...roles, ...customRoles].join(", ") : "—"}</dd>
            <dt className="text-muted">Email</dt>
            <dd>{info.label}</dd>
            <dt className="text-muted">Lead</dt>
            <dd className="font-mono">{quantity}</dd>
          </dl>
          <div className="border-t border-line pt-4">
            <p className="text-sm text-muted">Crediti stimati</p>
            <p className="font-mono text-2xl font-semibold">{estimate.min}–{reserve}</p>
            <p className="mt-1 text-xs text-muted">
              {withSignal && <>Ogni lead con opportunità: {extraCreditsLabel(signalPrices)}. </>}
              Riserviamo {reserve} crediti e addebitiamo solo i lead consegnati. Disponibili: {credits}.
            </p>
            {withSignal && (
              <p className="mt-2 text-xs text-muted">
                Le ricerche con segnali scartano le aziende senza prova: possono richiedere più tempo e trovare meno lead del previsto. I crediti non usati tornano disponibili.
              </p>
            )}
          </div>
          {!enough && <Alert>Crediti insufficienti per questa quantità. Riduci i lead o acquista crediti.</Alert>}
          {signalProblem && <p className="text-xs text-brick">{signalProblem}</p>}
          <Button type="submit" size="lg" disabled={pending || !enough || countries.length === 0 || Boolean(signalProblem) || noneAvailable}>
            {pending ? "Avvio in corso…" : "Avvia la ricerca"}
          </Button>
          <p className="text-xs text-muted">Puoi chiudere la pagina: ti avvisiamo via email quando i lead sono pronti.</p>
        </Card>
      </aside>
    </form>
  );
}
