import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const BUTTON = {
  primary: "bg-ledger text-white hover:bg-ledger-2 shadow-[0_1px_0_0_rgba(0,0,0,0.25)]",
  secondary: "bg-card text-ink border border-line hover:border-ink-2",
  ghost: "text-ink-2 hover:bg-paper-2",
  danger: "bg-brick text-white hover:opacity-90",
  stamp: "bg-stamp text-ink hover:brightness-95",
} as const;
type Variant = keyof typeof BUTTON;
const btn = (variant: Variant, size: "sm" | "md" | "lg") =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    size === "sm" && "h-8 px-3 text-sm",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-base",
    BUTTON[variant],
  );

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <button className={cx(btn(variant, size), className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <Link className={cx(btn(variant, size), className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl border border-line bg-card", className)} {...props} />;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-muted">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "ink" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "ink" | "ledger" | "stamp" }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={cx("mt-1 font-mono text-3xl font-semibold tabular-nums", tone === "ledger" && "text-ledger", tone === "stamp" && "text-stamp-ink")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

const BADGE = {
  neutral: "bg-paper-2 text-ink-2 border-line",
  ledger: "bg-ledger-soft text-ledger border-ledger/20",
  stamp: "bg-stamp-soft text-stamp-ink border-stamp/30",
  brick: "bg-brick-soft text-brick border-brick/20",
} as const;
export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: keyof typeof BADGE }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", BADGE[tone], className)} {...props} />;
}

// Bollino di provenienza: lo stato dell'email è sempre esplicito.
export function ProvenanceStamp({ status, type, href }: { status: string; type?: string; href?: string }) {
  const label =
    status === "validated" ? "Verificata" : status === "found_public" ? "Trovata sul sito" : status === "guessed" ? "Ipotizzata" : "Non verificata";
  const tone = status === "validated" ? "ledger" : status === "found_public" ? "stamp" : "brick";
  const inner = (
    <Badge tone={tone} title={href ? `Fonte: ${href}` : undefined}>
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={status === "guessed" ? "2 2" : undefined} />
        {status !== "guessed" && <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
      </svg>
      {label}
      {type && <span className="opacity-70">· {type === "personal" ? "nominativa" : "generica"}</span>}
    </Badge>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="hover:opacity-80">
      {inner}
    </a>
  ) : (
    inner
  );
}

const STATUS: Record<string, { label: string; tone: keyof typeof BADGE }> = {
  queued: { label: "In coda", tone: "neutral" },
  running: { label: "In corso", tone: "stamp" },
  completed: { label: "Completata", tone: "ledger" },
  partial: { label: "Parziale", tone: "stamp" },
  failed: { label: "Non riuscita", tone: "brick" },
  cancelled: { label: "Annullata", tone: "neutral" },
};
export function SearchStatus({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={s.tone}>
      {status === "running" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stamp" />}
      {s.label}
    </Badge>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-full bg-ledger transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="ruled flex flex-col items-center px-6 py-14 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <div className="mt-2 max-w-md text-ink-2">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-brick">{error}</p>}
    </div>
  );
}

const INPUT = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm placeholder:text-muted/70 focus:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/15";
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(INPUT, "h-10", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(INPUT, "min-h-24", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(INPUT, "h-10", className)} {...props} />;
}

export function Alert({ tone = "stamp", children }: { tone?: "stamp" | "brick" | "ledger"; children: ReactNode }) {
  return (
    <div className={cx("rounded-lg border px-4 py-3 text-sm", tone === "stamp" && "border-stamp/40 bg-stamp-soft text-stamp-ink", tone === "brick" && "border-brick/30 bg-brick-soft text-brick", tone === "ledger" && "border-ledger/25 bg-ledger-soft text-ledger")}>
      {children}
    </div>
  );
}
