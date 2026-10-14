"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { stopRepeat } from "@/app/app/actions";

// Menu «⋯» di una riga delle ricerche: solo azioni che esistono davvero.
export function SearchRowMenu({ id, repeating, hasLeads }: { id: string; repeating: boolean; hasLeads: boolean }) {
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
  const item = "block w-full px-3 py-2 text-left text-sm hover:bg-paper-2";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Altre azioni"
        className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-card text-ink-2 hover:border-ink-2"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
          <circle cx="3.5" cy="8" r="1.25" />
          <circle cx="8" cy="8" r="1.25" />
          <circle cx="12.5" cy="8" r="1.25" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-lg">
          <Link role="menuitem" href={`/app/ricerche/nuova?da=${id}`} className={item}>Ripeti la ricerca</Link>
          {hasLeads && (
            <a role="menuitem" href={`/api/export?search=${id}`} className={item}>Esporta i lead (CSV)</a>
          )}
          {repeating && (
            <form action={stopRepeat} onSubmit={() => setOpen(false)}>
              <input type="hidden" name="searchId" value={id} />
              <button role="menuitem" type="submit" className={item}>Ferma la ripetizione</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
