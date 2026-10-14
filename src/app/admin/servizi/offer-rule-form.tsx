"use client";
import { useActionState, useState } from "react";
import { Alert, Badge, Button, cx } from "@/components/ui";
import { JOB_FAMILIES, OFFERS, SIGNALS, SIGNAL_RULES, type ActiveOffer } from "@/lib/domain/signals";
import { resetOfferRule, updateOfferRule, type OfferRuleState } from "../actions";

export function OfferRuleForm({ offer }: { offer: ActiveOffer }) {
  const [state, action, pending] = useActionState<OfferRuleState, FormData>(updateOfferRule, {});
  const [codes, setCodes] = useState<string[]>(offer.signals);
  const base = OFFERS.find((o) => o.code === offer.code);
  const toggle = (c: string) => setCodes((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));
  return (
    <div className={cx("rounded-xl border bg-card p-5", offer.enabled ? "border-line" : "border-dashed border-line opacity-80")}>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="code" value={offer.code} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{offer.label}</p>
            <p className="text-xs text-muted">{offer.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {offer.customized && <Badge tone="stamp">Modificato</Badge>}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={offer.enabled} className="accent-[var(--color-ledger)]" />
              Visibile ai clienti
            </label>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Segnali (massimo {SIGNAL_RULES.maxSignalsPerSearch})</p>
          <div className="flex flex-wrap gap-2">
            {SIGNALS.map((s) => {
              const on = codes.includes(s.code);
              return (
                <label key={s.code} className={cx("flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs", on ? "border-ledger bg-ledger-soft text-ledger" : "border-line text-ink-2")}>
                  <input type="checkbox" name="signals" value={s.code} checked={on} onChange={() => toggle(s.code)} className="sr-only" />
                  {s.label}
                  <span className="text-[10px] text-muted">{s.level === "verified" ? "verificato" : "indicativo"}</span>
                </label>
              );
            })}
          </div>
        </div>

        {codes.includes("job_ad") && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Figure cercate negli annunci (massimo 3)</p>
            <div className="flex flex-wrap gap-2">
              {JOB_FAMILIES.map((f) => (
                <label key={f.code} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs has-[:checked]:border-ledger has-[:checked]:bg-ledger-soft has-[:checked]:text-ledger">
                  <input type="checkbox" name="jobFamilies" value={f.code} defaultChecked={offer.jobFamilies.includes(f.code)} className="sr-only" />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">Combinazione</span>
          <label className="flex items-center gap-1.5"><input type="radio" name="match" value="any" defaultChecked={offer.match === "any"} className="accent-[var(--color-ledger)]" />Basta un segnale</label>
          <label className="flex items-center gap-1.5"><input type="radio" name="match" value="all" defaultChecked={offer.match === "all"} className="accent-[var(--color-ledger)]" />Servono tutti</label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">Cosa cerchiamo (frase mostrata al cliente)</span>
          <span className="text-xs text-muted">Continua «Cerchiamo aziende con …»</span>
          <textarea name="lookFor" defaultValue={offer.lookFor} maxLength={300} rows={2} className="rounded-lg border border-line bg-white px-3 py-2 text-sm" />
        </label>

        {state.error && <Alert tone="brick">{state.error}</Alert>}
        {state.info && <Alert tone="ledger">{state.info}</Alert>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>{pending ? "Salvataggio…" : "Salva"}</Button>
          {base && <span className="text-xs text-muted">Predefinito: {base.signals.map((c) => SIGNALS.find((s) => s.code === c)?.label ?? c).join(", ")}</span>}
        </div>
      </form>
      {offer.customized && (
        <form action={resetOfferRule} className="mt-3">
          <input type="hidden" name="code" value={offer.code} />
          <button type="submit" className="text-xs text-ink-2 underline">Torna alla regola predefinita</button>
        </form>
      )}
    </div>
  );
}
