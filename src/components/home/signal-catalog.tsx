"use client";
import { useState } from "react";
import { OFFER_AREAS, offersOfArea, signalByCode, type OfferDef } from "@/lib/domain/signals";
import { cx } from "../ui";

// «Cosa cerchiamo per te»: per ogni servizio, i segnali che controlliamo e da dove vengono.
export function SignalCatalog({ offers }: { offers: OfferDef[] }) {
  const areas = OFFER_AREAS.filter((a) => offersOfArea(a.code, offers).length);
  const [area, setArea] = useState(areas[0]?.code ?? "");
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <div role="tablist" aria-label="Aree di servizio" className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
        {areas.map((a) => (
          <button
            key={a.code}
            type="button"
            role="tab"
            id={`tab-${a.code}`}
            aria-selected={area === a.code}
            aria-controls="signal-panel"
            onClick={() => setArea(a.code)}
            className={cx(
              "shrink-0 rounded-lg px-3 py-2 text-left text-sm transition-colors lg:py-2.5",
              area === a.code ? "bg-ink text-white" : "text-ink-2 hover:bg-paper-2",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div id="signal-panel" role="tabpanel" aria-labelledby={`tab-${area}`} className="divide-y divide-line border-y border-line">
        {offersOfArea(area, offers).map((o) => (
          <div key={o.code} className="grid gap-3 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
            <div>
              <p className="font-medium">{o.label}</p>
              <p className="mt-0.5 text-sm text-muted">{o.description}</p>
            </div>
            <div>
              <p className="text-sm text-ink-2">Cerchiamo aziende con {o.lookFor}.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {o.signals.map((c) => {
                  const s = signalByCode(c);
                  if (!s) return null;
                  return (
                    <li key={c} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs">
                      <span className={cx("h-1.5 w-1.5 rounded-full", s.level === "verified" ? "bg-ledger" : "bg-stamp")} aria-hidden />
                      {s.label}
                      <span className="text-muted">· {s.source === "job_ad" ? "annunci di lavoro" : "dal sito"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
