"use client";
import { useActionState, useState } from "react";
import { Alert, Button, Card, Field, Input, Textarea, cx } from "@/components/ui";
import { COMPANY_SIZES, COUNTRIES, MODE_INFO, ROLE_PRESETS, type EmailMode } from "@/lib/domain/catalog";
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
};

const STEPS = ["Chi cerchi", "Chi contattare", "Che email", "Quanti"] as const;

export function SearchWizard({ credits, maxQuantity, defaults = {} }: { credits: number; maxQuantity: number; defaults?: WizardDefaults }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSearch, {});
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<EmailMode>(defaults.emailMode ?? "mixed");
  const [quantity, setQuantity] = useState(Math.min(defaults.quantity ?? 10, maxQuantity));
  const [countries, setCountries] = useState<string[]>(defaults.countries ?? ["IT"]);
  const [roles, setRoles] = useState<string[]>((defaults.roles ?? ["Titolare / CEO"]).filter((r) => (ROLE_PRESETS as readonly string[]).includes(r)));
  const customRoles = (defaults.roles ?? []).filter((r) => !(ROLE_PRESETS as readonly string[]).includes(r));

  const info = MODE_INFO[mode];
  const reserve = info.maxCredits * quantity;
  const enough = credits >= reserve;
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <ol className="flex flex-wrap gap-2" aria-label="Passi">
          {STEPS.map((s, i) => (
            <li key={s}>
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

        {/* Passo 1: target. Tutti i passi restano nel DOM, così il form invia tutto. */}
        <Card className={cx("flex flex-col gap-5 p-6", step !== 0 && "hidden")}>
          <Field label="Settore o tipo di azienda" htmlFor="industry" hint="Scrivilo come lo spiegheresti a un collega: «agenzie di marketing digitale», «studi dentistici», «produttori di macchine per il packaging».">
            <Input id="industry" name="industry" defaultValue={defaults.industry} placeholder="es. Software house che sviluppano gestionali" />
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
              <Textarea id="regions" name="regions" defaultValue={defaults.regions?.join("\n")} placeholder={"Milano\nTorino"} className="min-h-20" />
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

        {/* Passo 2: ruoli */}
        <Card className={cx("flex flex-col gap-5 p-6", step !== 1 && "hidden")}>
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

        {/* Passo 3: modalità email */}
        <div className={cx("grid gap-4 md:grid-cols-3", step !== 2 && "hidden")} role="radiogroup">
          {(Object.keys(MODE_INFO) as EmailMode[]).map((m) => (
            <label key={m} className={cx("flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-5 transition-colors", mode === m ? "border-ledger shadow-[0_0_0_1px_var(--color-ledger)]" : "border-line hover:border-ink-2")}>
              <input type="radio" name="emailMode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              <span className="font-display text-lg font-semibold">{MODE_INFO[m].label}</span>
              <span className="text-sm text-ink-2">{MODE_INFO[m].short}</span>
              <span className="font-mono text-xs text-muted">{MODE_INFO[m].example}</span>
              <span className="mt-auto font-mono text-sm text-ledger">
                {MODE_INFO[m].minCredits === MODE_INFO[m].maxCredits ? MODE_INFO[m].minCredits : `${MODE_INFO[m].minCredits}–${MODE_INFO[m].maxCredits}`} crediti per lead
              </span>
            </label>
          ))}
        </div>

        {/* Passo 4: quantità e nome */}
        <Card className={cx("flex flex-col gap-6 p-6", step !== 3 && "hidden")}>
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
          <Field label="Nome della ricerca (facoltativo)" htmlFor="name">
            <Input id="name" name="name" defaultValue={defaults.name} placeholder="Generato automaticamente se vuoto" />
          </Field>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Indietro</Button>
          {step < 3 && <Button type="button" variant="secondary" onClick={() => setStep(step + 1)}>Avanti</Button>}
        </div>
      </div>

      <aside className="lg:sticky lg:top-10 lg:self-start">
        <Card className="ruled flex flex-col gap-4 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Riepilogo</p>
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
            <p className="font-mono text-2xl font-semibold">{info.minCredits * quantity}–{reserve}</p>
            <p className="mt-1 text-xs text-muted">Riserviamo {reserve} crediti e addebitiamo solo i lead consegnati. Disponibili: {credits}.</p>
          </div>
          {!enough && <Alert>Crediti insufficienti per questa quantità. Riduci i lead o acquista crediti.</Alert>}
          <Button type="submit" size="lg" disabled={pending || !enough || countries.length === 0}>
            {pending ? "Avvio in corso…" : "Avvia la ricerca"}
          </Button>
          <p className="text-xs text-muted">Puoi chiudere la pagina: ti avvisiamo via email quando i lead sono pronti.</p>
        </Card>
      </aside>
    </form>
  );
}
