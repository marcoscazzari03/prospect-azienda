"use client";
import { useState } from "react";
import type { SignalPrices } from "@/lib/domain/signals";
import { SEARCH_TYPES, creditsPerLead, type SearchType } from "./search-types";

const RATE_PACK = 0.49;
const RATE_GROWTH = 149 / 600;

export function PriceCalculator({ signalPrices }: { signalPrices: SignalPrices }) {
  const [type, setType] = useState<SearchType>("opportunity");
  const [qty, setQty] = useState(100);
  const perLead = creditsPerLead(type, signalPrices);
  const min = perLead.min * qty;
  const max = perLead.max * qty;
  const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div className="grid gap-6 rounded-2xl border border-line bg-card p-6 md:grid-cols-[1.2fr_1fr] md:p-8">
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-3 text-sm font-medium">Che ricerca vuoi fare?</p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {SEARCH_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                role="radio"
                aria-checked={type === t.type}
                onClick={() => setType(t.type)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${type === t.type ? "border-ledger bg-ledger-soft text-ledger" : "border-line hover:border-ink-2"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{SEARCH_TYPES.find((t) => t.type === type)?.text}</p>
        </div>
        <div>
          <label htmlFor="qty" className="mb-3 flex justify-between text-sm font-medium">
            Quante aziende? <span className="font-mono">{qty}</span>
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
        <p className="mt-3 text-xs text-muted">Paghi solo le aziende consegnate: 1 credito ciascuna, +1 con la ricerca estesa, più il segnale nelle ricerche con opportunità.</p>
      </div>
    </div>
  );
}
