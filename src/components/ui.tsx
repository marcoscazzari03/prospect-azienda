import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { safeHttpUrl } from "@/lib/domain/safe-url";
import { HeaderAccount } from "./header-account";

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
// size="none": misure solo da className (bottoni con le misure della bozza; cx non risolve i conflitti tra classi).
type Size = "sm" | "md" | "lg" | "none";
const btn = (variant: Variant, size: Size) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    size === "sm" && "h-8 px-3 text-sm",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-base",
    BUTTON[variant],
  );

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={cx(btn(variant, size), className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cx(btn(variant, size), className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl border border-line bg-card", className)} {...props} />;
}

// Intestazione delle pagine (bozza del 23/10): occhiello spaziato, titolo con grazie da 46 px, bottoni e avatar allineati al
// centro del titolo.
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="mb-1.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.2em] text-muted">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-semibold leading-[1.15] tracking-tight sm:text-[46px]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-[17px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-[15px] lg:shrink-0 lg:flex-nowrap">{actions}</div>}
      <HeaderAccount />
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
  ledger: "bg-ledger-soft text-ledger-2 border-ledger/20",
  ok: "bg-ok-soft text-ok-2 border-ok/20", // successo: verde anche in Avvisto
  stamp: "bg-stamp-soft text-stamp-ink border-stamp/30",
  brick: "bg-brick-soft text-brick border-brick/20",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
} as const;
export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: keyof typeof BADGE }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", BADGE[tone], className)} {...props} />;
}

// Bollino di provenienza: lo stato dell'email è sempre esplicito.
export function ProvenanceStamp({ status, type, href }: { status: string; type?: string; href?: string }) {
  const label =
    status === "validated" ? "Verificata" : status === "found_public" ? "Trovata sul sito" : status === "guessed" ? "Ipotizzata" : "Non verificata";
  const tone = status === "validated" ? "ok" : status === "found_public" ? "stamp" : "brick";
  const inner = (
    <Badge tone={tone} title={href ? `Fonte: ${href}` : undefined}>
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={status === "guessed" ? "2 2" : undefined} />
        {status !== "guessed" && <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
      </svg>
      {label}
      {type && <span className="opacity-70">· {type === "personal" ? "nominativa" : "aziendale"}</span>}
    </Badge>
  );
  const link = safeHttpUrl(href);
  return link ? (
    <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="hover:opacity-80">
      {inner}
    </a>
  ) : (
    inner
  );
}

const STATUS: Record<string, { label: string; tone: keyof typeof BADGE; icon: string }> = {
  queued: { label: "In coda", tone: "neutral", icon: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 4.5V8l2.5 1.5" },
  running: { label: "In corso", tone: "sky", icon: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" },
  completed: { label: "Completata", tone: "ok", icon: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM5.25 8.25l1.75 1.75 3.75-4" },
  partial: { label: "Parziale", tone: "stamp", icon: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 4.75v3.75M8 10.75v.25" },
  failed: { label: "Non riuscita", tone: "brick", icon: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5" },
  cancelled: { label: "Annullata", tone: "neutral", icon: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM3.5 12.5l9-9" },
};
export const SEARCH_STATUS_LABEL: Record<string, string> = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.label]));
export function SearchStatus({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as const, icon: "" };
  return (
    <Badge tone={s.tone}>
      {s.icon && (
        <svg viewBox="0 0 16 16" className={cx("h-3.5 w-3.5", status === "running" && "animate-pulse")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={s.icon} />
        </svg>
      )}
      {s.label}
    </Badge>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-full bg-ledger-bright transition-all duration-700" style={{ width: `${pct}%` }} />
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
    <div className={cx("rounded-lg border px-4 py-3 text-sm", tone === "stamp" && "border-stamp/40 bg-stamp-soft text-stamp-ink", tone === "brick" && "border-brick/30 bg-brick-soft text-brick", tone === "ledger" && "border-ok/25 bg-ok-soft text-ok-2")}>
      {children}
    </div>
  );
}
