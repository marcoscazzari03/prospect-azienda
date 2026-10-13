"use client";
import { useState } from "react";
import Link from "next/link";
import { MODE_INFO, type EmailMode } from "@/lib/domain/catalog";
import { estimateCredits } from "@/lib/domain/pricing";
import { SIGNAL_RULES } from "@/lib/domain/signals";
import { cx } from "./ui";

// Prezzo per credito del Pacchetto 100 (il più caro): stima prudente.
const RATE_PACK = 0.49;

const MODES: { mode: EmailMode; label: string }[] = [
  { mode: "generic_ok", label: "Email generiche" },
  { mode: "mixed", label: "Misto" },
  { mode: "personal_only", label: "Solo nominative" },
];

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const range = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);

export function HomeCalculator() {
  const [mode, setMode] = useState<EmailMode>("generic_ok");
  const [qty, setQty] = useState(50);
  const target = estimateCredits(mode, qty, false);
  const withSignal = estimateCredits(mode, qty, true);
  const perLead = estimateCredits(mode, 1, false);

  return (
    <div className="grid gap-4 md:grid-cols-[1.45fr_1fr]">
      <div className="flex flex-col gap-8 rounded-2xl border border-line bg-card p-6 md:p-8">
        <div>
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
      <div className="flex flex-col gap-1 rounded-2xl border border-line bg-card p-6 md:p-8">
        <p className="text-sm text-muted">Stima costi</p>
        <p className="font-mono text-3xl font-semibold tabular-nums">{range(target.min, target.max)} crediti</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-xs">
          <li className="flex items-center gap-2 text-ink-2">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-ledger" aria-hidden />
            Ricerca in target: {range(perLead.min, perLead.max)} {perLead.max === 1 ? "credito" : "crediti"} per lead
          </li>
          <li className="flex items-center gap-2 text-stamp-ink">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-stamp" aria-hidden />
            Ricerca con opportunità: +{SIGNAL_RULES.extraCredits} credito per lead consegnato ({range(withSignal.min, withSignal.max)} crediti)
          </li>
        </ul>
        <p className="mt-4 font-mono text-3xl font-semibold tabular-nums">
          {eur(target.min * RATE_PACK)} – {eur(withSignal.max * RATE_PACK)}
        </p>
        <p className="text-xs text-muted">
          Prezzo indicativo, dalla ricerca in target a quella con opportunità (Pacchetto 100; con un abbonamento il credito costa meno).
          Vedrai il costo esatto prima di confermare e paghi solo i lead consegnati.
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
