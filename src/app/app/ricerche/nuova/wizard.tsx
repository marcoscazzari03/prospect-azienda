"use client";
import { useActionState, useState } from "react";
import { Alert, Button, Card, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { COMPANY_SIZES, COUNTRIES, MODE_INFO, ROLE_PRESETS, type EmailMode } from "@/lib/domain/catalog";
import { estimateCredits } from "@/lib/domain/pricing";
import {
  JOB_AD_COUNTRIES,
  JOB_FAMILIES,
  SERVICES,
  SIGNALS,
  SIGNAL_RULES,
  chargesSignal,
  describeOpportunity,
} from "@/lib/domain/signals";
import { createSearch, type ActionState } from "../../actions";

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
  signals?: { codes: string[]; match: "any" | "all"; jobFamilies: string[] };
};

export type SearchKind = "standard" | "opportunity";

const STEPS = {
  standard: [["target", "Chi cerchi"], ["roles", "Chi contattare"], ["email", "Che email"], ["quantity", "Quanti"]],
  opportunity: [["signals", "Opportunità"], ["target", "Chi cerchi"], ["roles", "Chi contattare"], ["email", "Che email"], ["quantity", "Quanti"]],
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
    text: "Aziende con un segnale concreto legato al tuo servizio, con la prova.",
    example: "Es. aziende che assumono un sistemista, siti non adatti ai cellulari",
  },
];

export function SearchWizard({
  credits,
  maxQuantity,
  defaults = {},
  initialKind = "standard",
}: {
  credits: number;
  maxQuantity: number;
  defaults?: WizardDefaults;
  initialKind?: SearchKind;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSearch, {});
  const [kind, setKind] = useState<SearchKind>(initialKind);
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState(defaults.industry ?? "");
  const [regions, setRegions] = useState(defaults.regions?.join("\n") ?? "");
  const [service, setService] = useState("");
  const [codes, setCodes] = useState<string[]>(defaults.signals?.codes ?? []);
  const [match, setMatch] = useState<"any" | "all">(defaults.signals?.match ?? "any");
  const [families, setFamilies] = useState<string[]>(defaults.signals?.jobFamilies ?? []);
  const [mode, setMode] = useState<EmailMode>(defaults.emailMode ?? "mixed");
  const [quantity, setQuantity] = useState(Math.min(defaults.quantity ?? 10, maxQuantity));
  const [countries, setCountries] = useState<string[]>(defaults.countries ?? ["IT"]);
  const [roles, setRoles] = useState<string[]>((defaults.roles ?? ["Titolare / CEO"]).filter((r) => (ROLE_PRESETS as readonly string[]).includes(r)));
  const customRoles = (defaults.roles ?? []).filter((r) => !(ROLE_PRESETS as readonly string[]).includes(r));

  const info = MODE_INFO[mode];
  const opportunity = kind === "opportunity";
  const withSignal = opportunity && chargesSignal(codes);
  const estimate = estimateCredits(mode, quantity, withSignal);
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

  // Opportunità: servizio -> segnali consigliati (modificabili), con le regole del catalogo.
  const chosenService = SERVICES.find((x) => x.code === service);
  const recommended = chosenService?.signals ?? [];
  const pickService = (code: string) => {
    setService(code);
    const svc = SERVICES.find((x) => x.code === code);
    if (!svc) return;
    setCodes(svc.signals.slice(0, SIGNAL_RULES.maxSignalsPerSearch));
    setFamilies(svc.jobFamilies.slice(0, 3));
  };
  const orderedSignals = [...SIGNALS].sort((a, b) => Number(recommended.includes(b.code)) - Number(recommended.includes(a.code)));
  const verifiedCount = codes.filter((c) => SIGNALS.find((x) => x.code === c)?.level === "verified").length;
  const jobAd = codes.includes("job_ad");
  const jobAdCountriesOk = countries.every((c) => (JOB_AD_COUNTRIES as readonly string[]).includes(c));
  const where = [
    regions.split(/[\n,]/).map((r) => r.trim()).filter(Boolean).join(", "),
    countries.map((c) => COUNTRIES.find(([k]) => k === c)?.[1]).join(", "),
  ].filter(Boolean)[0] ?? "";
  const signalProblem = !opportunity
    ? ""
    : !codes.length
      ? "Scegli almeno un segnale."
      : !withSignal
        ? "I segnali indicativi non si possono usare da soli: aggiungi un segnale verificato."
        : jobAd && !families.length
          ? "Scegli la figura cercata negli annunci."
          : jobAd && !jobAdCountriesOk
            ? "Gli annunci di lavoro sono disponibili solo in alcuni paesi: togli i paesi non coperti o il segnale «annuncio»."
            : "";
  const preview = opportunity ? describeOpportunity({ codes, match, jobFamilies: families, industry, where }) : "";

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_320px]">
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

        {/* Opportunità: che servizio vendi e quali segnali cercare. Tutti i passi restano nel DOM, così il form invia tutto. */}
        {opportunity && (
          <Card className={cx("flex flex-col gap-5 p-6", current !== "signals" && "hidden")}>
            <Field label="Che servizio vendi?" htmlFor="service" hint="Ti proponiamo i segnali che possiamo verificare per quel servizio. Puoi cambiarli.">
              <Select id="service" value={service} onChange={(e) => pickService(e.target.value)}>
                <option value="">Scelgo io i segnali</option>
                {SERVICES.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
              </Select>
            </Field>
            <div>
              <p className="mb-1 text-sm font-medium">Quali segnali vuoi trovare?</p>
              <p className="mb-3 text-xs text-muted">Fino a {SIGNAL_RULES.maxSignalsPerSearch}. Descriviamo sempre il fatto osservato, con la prova: non deduciamo bisogni.</p>
              <div className="grid gap-2">
                {orderedSignals.map((sg) => {
                  const checked = codes.includes(sg.code);
                  const full = !checked && codes.length >= SIGNAL_RULES.maxSignalsPerSearch;
                  return (
                    <label key={sg.code} className={cx("flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm", checked ? "border-ledger bg-ledger-soft" : "border-line hover:border-ink-2", full && "cursor-not-allowed opacity-50")}>
                      <input type="checkbox" name="signalCodes" value={sg.code} checked={checked} disabled={full} onChange={() => setCodes(toggle(codes, sg.code))} className="mt-0.5 accent-[var(--color-ledger)]" />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-medium">
                          {sg.label}
                          {recommended.includes(sg.code) && <span className="font-mono text-[10px] uppercase tracking-wider text-ledger">Consigliato</span>}
                          <span className={cx("font-mono text-[10px] uppercase tracking-wider", sg.level === "verified" ? "text-ink-2" : "text-muted")}>
                            {sg.level === "verified" ? "Verificato" : "Indicativo"}
                          </span>
                        </span>
                        <span className="block text-xs text-ink-2">{sg.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted">
                I segnali <span className="font-medium">indicativi</span> si mostrano come informazione in più: da soli non filtrano le aziende e non costano crediti in più.
              </p>
            </div>
            {jobAd && (
              <div>
                <p className="mb-2 text-sm font-medium">Quale figura cercano negli annunci?</p>
                <div className="flex flex-wrap gap-2">
                  {JOB_FAMILIES.map((f) => {
                    const checked = families.includes(f.code);
                    return (
                      <label key={f.code} className={cx("cursor-pointer rounded-full border px-3 py-1 text-sm", checked ? "border-ledger bg-ledger-soft text-ledger" : "border-line hover:border-ink-2", !checked && families.length >= 3 && "pointer-events-none opacity-50")}>
                        <input type="checkbox" name="jobFamilies" value={f.code} checked={checked} onChange={() => setFamilies(toggle(families, f.code))} className="sr-only" />
                        {f.label}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">
                  Annunci pubblicati negli ultimi {SIGNAL_RULES.jobAdMaxAgeDays} giorni sul sito dell&apos;azienda o su pagine pubbliche, esclusi quelli delle agenzie per il lavoro.
                  Chi assume cerca un dipendente: per te è il momento giusto per proporti, non una richiesta di fornitori.
                </p>
              </div>
            )}
            {verifiedCount > 1 && (
              <div>
                <p className="mb-2 text-sm font-medium">Come combinarli?</p>
                <div className="flex flex-wrap gap-2">
                  {([["any", "Basta un segnale"], ["all", "Servono tutti"]] as const).map(([v, l]) => (
                    <label key={v} className={cx("cursor-pointer rounded-full border px-3 py-1 text-sm", match === v ? "border-ledger bg-ledger-soft text-ledger" : "border-line hover:border-ink-2")}>
                      <input type="radio" name="signalMatch" value={v} checked={match === v} onChange={() => setMatch(v)} className="sr-only" />
                      {l}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">«Servono tutti» trova meno aziende, ma più mirate.</p>
              </div>
            )}
            {signalProblem && codes.length > 0 && <Alert>{signalProblem}</Alert>}
          </Card>
        )}

        {/* Passo: target */}
        <Card className={cx("flex flex-col gap-5 p-6", current !== "target" && "hidden")}>
          <Field label="Settore o tipo di azienda" htmlFor="industry" hint="Scrivilo come lo spiegheresti a un collega: «agenzie di marketing digitale», «studi dentistici», «produttori di macchine per il packaging».">
            <Input id="industry" name="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="es. Software house che sviluppano gestionali" />
          </Field>
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
            <Field label="Parole chiave del settore (facoltativo)" htmlFor="industryKeywords" hint="Termini usati dalle aziende, anche in lingua locale.">
              <Textarea id="industryKeywords" name="industryKeywords" defaultValue={defaults.industryKeywords?.join("\n")} placeholder={"software gestionale\nERP"} className="min-h-20" />
            </Field>
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
                  const e = estimateCredits(m, 1, withSignal);
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
              <p className="text-ink-2">{preview || "Scegli il servizio o i segnali da cercare."}</p>
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
              {withSignal && <>Ogni lead con segnale costa {SIGNAL_RULES.extraCredits} credito in più. </>}
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
          <Button type="submit" size="lg" disabled={pending || !enough || countries.length === 0 || Boolean(signalProblem)}>
            {pending ? "Avvio in corso…" : "Avvia la ricerca"}
          </Button>
          <p className="text-xs text-muted">Puoi chiudere la pagina: ti avvisiamo via email quando i lead sono pronti.</p>
        </Card>
      </aside>
    </form>
  );
}
