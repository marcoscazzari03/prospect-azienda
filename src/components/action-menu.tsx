"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

// Menu a tendina per le azioni secondarie (export, archivia, elimina): si chiude cliccando fuori
// o scegliendo una voce. Le voci sono link o form passati dal componente server.
export function ActionMenu({ label, children, align = "right" }: { label: ReactNode; children: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-card px-4 text-sm font-medium transition-colors hover:border-ink-2"
      >
        {label}
        <svg aria-hidden viewBox="0 0 16 16" className={cx("h-3.5 w-3.5 transition-transform", open && "rotate-180")}>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}
          className={cx("absolute z-20 mt-2 w-60 rounded-xl border border-line bg-card p-1.5 shadow-lg", align === "right" ? "right-0" : "left-0")}
        >
          {children}
        </div>
      )}
    </div>
  );
}

