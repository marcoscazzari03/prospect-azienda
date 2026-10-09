import type { ReactNode } from "react";
import type { Plan } from "@/lib/server/dal";
import { formatEur, formatNumber } from "@/lib/domain/pricing";
import { Badge, Card, cx } from "./ui";

function PlanCard({ plan, action, current }: { plan: Plan; action: ReactNode; current?: boolean }) {
  const perCredit = plan.credits ? plan.price_cents / plan.credits / 100 : 0;
  return (
    <Card className={cx("relative flex flex-col p-6", plan.highlighted && "border-ledger shadow-[0_0_0_1px_var(--color-ledger)]")}>
      {plan.highlighted && <Badge tone="ledger" className="absolute -top-2.5 left-6">Il più scelto</Badge>}
      {current && <Badge tone="stamp" className="absolute -top-2.5 right-6">Il tuo piano</Badge>}
      <p className="font-display text-xl font-semibold">{plan.name}</p>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="font-mono text-3xl font-semibold">{formatEur(plan.price_cents)}</span>
        {plan.kind === "subscription" && <span className="text-sm text-muted">/mese</span>}
      </p>
      <p className="mt-1 text-sm text-ink-2">
        <span className="font-mono">{formatNumber(plan.credits)}</span> crediti
        {perCredit > 0 && <span className="text-muted"> · {perCredit.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} l&apos;uno</span>}
      </p>
      <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ledger" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-6">{action}</div>
    </Card>
  );
}

export function PricingTable({ plans, action, currentPlanId }: { plans: Plan[]; action: (plan: Plan) => ReactNode; currentPlanId?: string }) {
  const subs = plans.filter((p) => p.kind === "subscription");
  const packs = plans.filter((p) => p.kind === "pack");
  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="mb-1 font-display text-2xl font-semibold">Abbonamenti mensili</h2>
        <p className="mb-6 text-ink-2">Per chi cerca clienti ogni mese. Crediti a prezzo migliore, annulli quando vuoi.</p>
        <div className="grid gap-5 md:grid-cols-3">
          {subs.map((p) => <PlanCard key={p.id} plan={p} action={action(p)} current={p.id === currentPlanId} />)}
        </div>
      </section>
      <section>
        <h2 className="mb-1 font-display text-2xl font-semibold">Pacchetti di crediti</h2>
        <p className="mb-6 text-ink-2">Paghi una volta, usi i crediti entro 12 mesi.</p>
        <div className="grid gap-5 md:grid-cols-3">
          {packs.map((p) => <PlanCard key={p.id} plan={p} action={action(p)} />)}
        </div>
      </section>
    </div>
  );
}
