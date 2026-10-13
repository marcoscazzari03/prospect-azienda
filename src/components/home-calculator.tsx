"use client";
import { useState } from "react";
import Link from "next/link";
import { MODE_INFO, type EmailMode } from "@/lib/domain/catalog";
import { cx } from "./ui";

// Prezzo per credito del Pacchetto 100 (il più caro): stima prudente.
const RATE_PACK = 0.49;

const MODES: { mode: EmailMode; label: string }[] = [
  { mode: "generic_ok", label: "Email generiche" },
  { mode: "mixed", label: "Mista" },
  { mode: "personal_only", label: "Solo nominative" },
];

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function HomeCalculator() {
  const [mode, setMode] = useState<EmailMode>("generic_ok");
  const [qty, setQty] = useState(50);
  const min = MODE_INFO[mode].minCredits * qty;
  const max = MODE_INFO[mode].maxCredits * qty;

  return (
    <div className="grid overflow-hidden rounded-2xl border border-line bg-card md:grid-cols-[1.45fr_1fr]">
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div>
          <p className="mb-3 text-sm font-semibold">Che email vuoi?</p>
          <div className="grid grid-cols-3 rounded-lg border border-line p-1" role="radiogroup" aria-label="Tipo di email">
            {MODES.map((m) => (
              <button
                key={m.mode}
                type="button"
                role="radio"
                aria-checked={mode === m.mode}
                onClick={() => setMode(m.mode)}
                className={cx(
                  "rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm",
                  mode === m.mode ? "bg-ledger text-white" : "text-ink-2 hover:bg-paper",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{MODE_INFO[mode].short}</p>
        </div>
        <div>
          <label htmlFor="home-qty" className="mb-3 flex justify-between text-sm font-semibold">
            Quanti lead? <span className="font-mono">{qty}</span>
          </label>
          <input
            id="home-qty"
            type="range"
            min={10}
            max={500}
            step={10}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-full accent-[var(--color-ledger)]"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-muted">
            <span>10</span>
            <span>500</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-1 border-t border-line bg-paper/60 p-6 md:border-l md:border-t-0 md:p-8">
        <p className="text-sm text-muted">Crediti addebitati</p>
        <p className="font-mono text-4xl font-semibold tabular-nums">
          {min}–{max}
        </p>
        <p className="text-xs text-muted">Ne riserviamo {max} all&apos;avvio, il resto torna a te.</p>
        <p className="mt-4 text-sm text-muted">Costo stimato</p>
        <p className="font-mono text-3xl font-semibold tabular-nums">
          {eur(min * RATE_PACK)}–{eur(max * RATE_PACK)}
        </p>
        <p className="mt-3 text-xs text-muted">
          Dipende da quante email nominative e verificate troviamo. Addebitiamo solo i lead consegnati.
          <br />Prezzi del Pacchetto 100: con un abbonamento il credito costa meno.
        </p>
        <Link
          href="/registrati"
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ledger px-5 text-sm font-semibold text-white hover:bg-ledger-2"
        >
          Inizia con questa ricerca <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
