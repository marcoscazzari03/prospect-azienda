"use client";
import { useState } from "react";
import { MODE_INFO, type EmailMode } from "@/lib/domain/catalog";

const RATE_PACK = 0.49;
const RATE_GROWTH = 149 / 600;

export function PriceCalculator() {
  const [mode, setMode] = useState<EmailMode>("mixed");
  const [qty, setQty] = useState(100);
  const info = MODE_INFO[mode];
  const min = info.minCredits * qty;
  const max = info.maxCredits * qty;
  const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div className="grid gap-6 rounded-2xl border border-line bg-card p-6 md:grid-cols-[1.2fr_1fr] md:p-8">
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-3 text-sm font-medium">Che email vuoi?</p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {(Object.keys(MODE_INFO) as EmailMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${mode === m ? "border-ledger bg-ledger-soft text-ledger" : "border-line hover:border-ink-2"}`}
              >
                {MODE_INFO[m].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{info.short}</p>
        </div>
        <div>
          <label htmlFor="qty" className="mb-3 flex justify-between text-sm font-medium">
            Quanti lead? <span className="font-mono">{qty}</span>
          </label>
          <input id="qty" type="range" min={10} max={1000} step={10} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full accent-[var(--color-ledger)]" />
        </div>
      </div>
      <div className="ruled flex flex-col justify-center rounded-xl bg-paper p-5">
        <p className="text-sm text-muted">Crediti necessari</p>
        <p className="font-mono text-3xl font-semibold">{min === max ? min : `${min}–${max}`}</p>
        <p className="mt-4 text-sm text-muted">Costo indicativo</p>
        <p className="font-mono text-xl">
          {eur(min * RATE_GROWTH)}–{eur(max * RATE_PACK)}
        </p>
        <p className="mt-3 text-xs text-muted">Paghi in base all&apos;email effettivamente consegnata: generica 1 credito, nominativa 2, nominativa verificata 3.</p>
      </div>
    </div>
  );
}
