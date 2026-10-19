"use client";
import { useState } from "react";
import type { OfferDef } from "@/lib/domain/signals";
import { cx } from "../ui";
import { ExampleLeadCard } from "./example-lead-card";
import { EXAMPLE_LEADS, FEATURED_OFFERS, OTHER_SECTOR, TARGET_EXAMPLE } from "./examples";

// Hero: «cosa vendi?» -> l'azienda giusta e il motivo per contattarla (esempi illustrativi).
// «Altro settore»: chi vende fuori dai servizi con segnali vede la ricerca in target.
export function HeroShowcase({ offers }: { offers: OfferDef[] }) {
  const choices = FEATURED_OFFERS.map((code) => offers.find((o) => o.code === code)).filter((o): o is OfferDef => Boolean(o && EXAMPLE_LEADS[o.code]));
  const [offer, setOffer] = useState(choices[0]?.code ?? "");
  const other = offer === OTHER_SECTOR;
  const lead = other ? TARGET_EXAMPLE : EXAMPLE_LEADS[offer];
  if (!lead) return null;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <p id="hero-offer" className="mb-2 text-sm text-ink-2">Cosa vendi?</p>
        <div role="radiogroup" aria-labelledby="hero-offer">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
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
        {/* Su una riga sua: sul telefono la striscia scorre e la scelta finirebbe nascosta. */}
        <div className="mt-2">
          <button
            type="button"
            role="radio"
            aria-checked={other}
            onClick={() => setOffer(OTHER_SECTOR)}
            className={cx(
              "shrink-0 rounded-full border border-dashed px-3.5 py-1.5 text-sm transition-colors",
              other ? "border-ink bg-ink text-white" : "border-ink-2/40 bg-card text-ink-2 hover:border-ink-2",
            )}
          >
            Altro settore <span className={other ? "text-white/70" : "text-muted"}>(edilizia, pulizie, logistica…)</span>
          </button>
        </div>
        </div>
      </div>
      <ExampleLeadCard key={offer} lead={lead} offer={other ? undefined : offer} className="animate-row-in" />
      <p className="text-xs leading-relaxed text-muted">
        {other
          ? "Esempio illustrativo con un'azienda inventata: un'impresa di pulizie che cerca hotel in Veneto. Per i settori senza segnali la ricerca è in target, per qualunque settore."
          : "Esempio illustrativo con un'azienda inventata. Nei risultati veri ogni segnale ha il link alla prova e la data del controllo."}
      </p>
    </div>
  );
}
