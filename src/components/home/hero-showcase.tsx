"use client";
import { useState } from "react";
import type { OfferDef } from "@/lib/domain/signals";
import { cx } from "../ui";
import { ExampleLeadCard } from "./example-lead-card";
import { EXAMPLE_LEADS, FEATURED_OFFERS } from "./examples";

// Hero: «cosa vendi?» -> l'azienda giusta e il motivo per contattarla (esempi illustrativi).
export function HeroShowcase({ offers }: { offers: OfferDef[] }) {
  const choices = FEATURED_OFFERS.map((code) => offers.find((o) => o.code === code)).filter((o): o is OfferDef => Boolean(o && EXAMPLE_LEADS[o.code]));
  const [offer, setOffer] = useState(choices[0]?.code ?? "");
  const lead = EXAMPLE_LEADS[offer];
  if (!lead) return null;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <p id="hero-offer" className="mb-2 text-sm text-ink-2">Cosa vendi?</p>
        <div role="radiogroup" aria-labelledby="hero-offer" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {choices.map((o) => (
            <button
              key={o.code}
              type="button"
              role="radio"
              aria-checked={offer === o.code}
              onClick={() => setOffer(o.code)}
              className={cx(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                offer === o.code ? "border-ink bg-ink text-white" : "border-line bg-card text-ink-2 hover:border-ink-2",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <ExampleLeadCard key={offer} lead={lead} offer={offer} className="animate-row-in" />
      <p className="text-xs leading-relaxed text-muted">
        Esempio illustrativo con un&apos;azienda inventata. Nei risultati veri ogni segnale ha il link alla prova e la data del controllo.
      </p>
    </div>
  );
}
