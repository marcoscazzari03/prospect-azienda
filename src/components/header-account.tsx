"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// Avatar con menu in alto a destra (bozza del 23/10). L'app lo fornisce con AccountProvider; PageHeader lo mostra accanto
// ai bottoni della pagina (da computer). Fuori dall'app (sito, amministrazione) non c'è.
type Account = { initials: string; name: string; email: string };
const AccountContext = createContext<Account | null>(null);

export function AccountProvider({ value, children }: { value: Account; children: ReactNode }) {
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function HeaderAccount() {
  const a = useContext(AccountContext);
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
  if (!a) return null;
  const item = "flex min-h-11 items-center rounded-lg px-3 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink";
  return (
    <div ref={ref} className="relative hidden md:ml-6 md:block min-[1800px]:ml-[146px]">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Il mio account" className="flex items-center gap-2 rounded-full">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e3dff7] text-lg font-semibold text-ledger-2">{a.initials}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 text-ink-2 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-line bg-card p-2 shadow-[0_12px_32px_rgba(18,19,28,0.12)]">
          <div className="border-b border-line px-3 pb-2 pt-1">
            <p className="truncate text-sm font-semibold">{a.name}</p>
            <p className="truncate text-xs text-muted">{a.email}</p>
          </div>
          <div className="pt-1">
            <Link role="menuitem" href="/app/account" className={item} onClick={() => setOpen(false)}>Il mio account</Link>
            <Link role="menuitem" href="/app/crediti" className={item} onClick={() => setOpen(false)}>Crediti e piano</Link>
            <form action="/auth/esci" method="post">
              <button role="menuitem" className={`${item} w-full`}>Esci</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
