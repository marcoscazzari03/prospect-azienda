"use client";
import { useState } from "react";
import Link from "next/link";
import type { SignalPrices } from "@/lib/domain/signals";
import { SEARCH_TYPES, creditsPerLead, type SearchType } from "./search-types";
import { cx } from "./ui";

// Prezzo per credito del Pacchetto 100 (il più caro): stima prudente.
const RATE_PACK = 0.49;

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const range = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);

export function HomeCalculator({ signalPrices }: { signalPrices: SignalPrices }) {
  const [type, setType] = useState<SearchType>("opportunity");
  const [qty, setQty] = useState(50);
  const perLead = creditsPerLead(type, signalPrices);
  const total = { min: perLead.min * qty, max: perLead.max * qty };

  return (
    <div className="grid gap-4 md:grid-cols-[1.45fr_1fr]">
      <div className="flex flex-col gap-8 rounded-2xl border border-line bg-card p-6 md:p-8">
        <div>
          <div className="grid grid-cols-3 rounded-lg border border-line p-1" role="radiogroup" aria-label="Tipo di ricerca">
            {SEARCH_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                role="radio"
                aria-checked={type === t.type}
                onClick={() => setType(t.type)}
                className={cx(
                  "rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm",
                  type === t.type ? "bg-ledger text-white" : "text-ink-2 hover:bg-paper",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{SEARCH_TYPES.find((t) => t.type === type)?.text}</p>
        </div>
        <div>
          <label htmlFor="home-qty" className="mb-3 flex justify-between text-sm font-semibold">
            Quante aziende? <span className="font-mono">{qty}</span>
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
      <div className="flex flex-col gap-1 rounded-2xl border border-line bg-card p-6 md:p-8">
        <p className="text-sm text-muted">Stima costi</p>
        <p className="font-mono text-3xl font-semibold tabular-nums">{range(total.min, total.max)} crediti</p>
        <p className="text-xs text-ink-2">{range(perLead.min, perLead.max)} {perLead.max === 1 ? "credito" : "crediti"} per azienda consegnata</p>
        <p className="mt-4 font-mono text-3xl font-semibold tabular-nums">
          {total.min === total.max ? eur(total.min * RATE_PACK) : `${eur(total.min * RATE_PACK)} – ${eur(total.max * RATE_PACK)}`}
        </p>
        <p className="text-xs text-muted">
          Prezzo indicativo con il Pacchetto 100; con un abbonamento il credito costa meno.
          Vedrai il costo esatto prima di confermare e paghi solo le aziende consegnate.
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
