"use client";
import { startTransition, useActionState, useState } from "react";
import { saveBusinessProfile, skipBusinessProfile, type ActionState } from "@/app/app/actions";
import { Alert, Badge, Button, ButtonLink, Card, Input, Textarea } from "@/components/ui";
import { BUSINESS_LIMITS, aboutLeads, wizardHref, type StoredSuggestions } from "@/lib/domain/suggestions";
import { formatNumber } from "@/lib/domain/pricing";
import { BRAND } from "@/lib/config";

// Ricerche consigliate (punti 84–85, proposta del designer in docs/15-ricerche-consigliate.md): riquadro in cima alla
// dashboard, saltabile. Testi rivisti dal sales-copywriter il 23/10.
const CLIENTI = ["Imprese edili", "Studi professionali", "Negozi", "Ristoranti e hotel", "Aziende industriali", "Altro"];

export function SuggestedSearches({ description, area, stored, skipped, example }: { description: string; area: string; stored: StoredSuggestions | null; skipped: boolean; example: string }) {
  const [editing, setEditing] = useState(!description && !skipped);
  const [length, setLength] = useState(description.length);
  // Proposte arrivate: si chiude il modulo e si mostrano le schede.
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const r = await saveBusinessProfile(prev, form);
    if (!r.error) startTransition(() => setEditing(false));
    return r;
  }, {});

  if (!description && skipped && !editing) {
    return (
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-ledger/25 px-4 py-3 text-sm">
        <span>Vuoi ricerche già pronte per la tua attività?</span>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Descrivi la tua attività</Button>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-ledger/25 p-5">
      {editing || !description ? (
        <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ledger-soft text-ledger-2"><Glyph name="target" className="h-6 w-6" /></span>
              <div>
                <h2 className="font-display text-xl font-semibold">Di cosa si occupa la tua attività?</h2>
                <p className="mt-1 text-sm text-muted">Ti suggeriamo ricerche di aziende già pronte. Puoi saltare: decidi tu se avviarle.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="business-description" className="text-sm font-medium">Cosa fai?</label>
                <div className="relative">
                  <Glyph name="building" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted" />
                  <Textarea id="business-description" name="description" required minLength={10} maxLength={BUSINESS_LIMITS.description} defaultValue={description}
                    onChange={(e) => setLength(e.target.value.length)} placeholder={`Es. ${example}`} className="min-h-24 pl-10" />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="flex items-center gap-1"><Glyph name="bulb" className="h-4 w-4 text-stamp" />Una o due frasi: cosa offri e a quali aziende.</span>
                  <span className="font-mono">{length}/{BUSINESS_LIMITS.description}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="business-area" className="text-sm font-medium">Dove lavori?</label>
                <div className="relative">
                  <Glyph name="pin" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                  <Input id="business-area" name="area" maxLength={BUSINESS_LIMITS.area} defaultValue={area} placeholder="Es. Modena" className="h-11 pl-10" />
                </div>
                <p className="text-xs text-muted">Provincia o regione.</p>
              </div>
            </div>
            {state.error && <Alert tone="stamp">{state.error}</Alert>}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
                <Glyph name="search" className="h-4 w-4" />{pending ? "Stiamo preparando le ricerche…" : "Mostra le ricerche"}
              </Button>
              {description ? (
                <Button type="button" variant="secondary" className="h-11" onClick={() => setEditing(false)}>Annulla</Button>
              ) : (
                <Button type="button" variant="secondary" className="h-11" disabled={pending}
                  onClick={() => startTransition(async () => { await skipBusinessProfile(); setEditing(false); })}>Salta per ora</Button>
              )}
            </div>
            {pending && <Skeletons />}
          </div>
          <aside className="hidden self-center rounded-xl bg-ledger-soft/60 p-4 lg:block">
            <p className="flex items-center gap-2 text-sm font-semibold"><Glyph name="sparkle" className="h-5 w-5 text-ledger-2" />Ti suggeriremo:</p>
            <ul className="mt-3 grid gap-2 text-sm">
              {["Ricerche già pronte per la tua attività", "Solo aziende presenti nel nostro database", "Filtri e impostazioni già compilati"].map((t) => (
                <li key={t} className="flex items-start gap-2"><Glyph name="check" className="mt-0.5 h-4 w-4 shrink-0 text-ledger" />{t}</li>
              ))}
            </ul>
          </aside>
        </form>
      ) : (
        <Results description={description} area={area} stored={stored} onEdit={() => setEditing(true)} action={action} pending={pending} error={state.error} />
      )}
    </Card>
  );
}

function Results({ description, area, stored, onEdit, action, pending, error }: {
  description: string; area: string; stored: StoredSuggestions | null; onEdit: () => void;
  action: (f: FormData) => void; pending: boolean; error?: string;
}) {
  const [clients, setClients] = useState<string[]>([]);
  const header = (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold">Ricerche consigliate per te</h2>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{description}{area ? ` · ${area}` : ""}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>Modifica</Button>
    </div>
  );
  const retry = (
    <form action={action} className="contents">
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="area" value={area} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Stiamo preparando le ricerche…" : "Riprova"}</Button>
    </form>
  );
  const tryAnyway = <ButtonLink href="/app/ricerche/nuova" variant="ghost">Prova una ricerca</ButtonLink>;

  if (pending) return <>{header}<Skeletons /></>;
  if (!stored) {
    return (
      <>
        {header}
        <Alert tone="stamp">{error ?? "Non siamo riusciti a preparare le ricerche. Riprova, oppure crea una ricerca a mano."}</Alert>
        <div className="mt-3 flex flex-wrap gap-2">{retry}<ButtonLink href="/app/ricerche/nuova" variant="ghost">Crea una ricerca a mano</ButtonLink></div>
      </>
    );
  }
  if (stored.sellsTo === "consumers") {
    return (
      <>
        {header}
        <p className="text-sm">{BRAND.name} trova aziende, non privati. Se vendi soprattutto a privati, qui non troverai molto. Se vendi anche alle aziende, puoi provare una ricerca.</p>
        <div className="mt-3">{tryAnyway}</div>
      </>
    );
  }
  if (stored.sellsTo === "unclear") {
    return (
      <>
        {header}
        <form action={action} className="grid gap-3">
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="area" value={area} />
          <p className="text-sm font-medium">A chi vendi di solito? Scegli una o più risposte.</p>
          <div className="flex flex-wrap gap-2">
            {CLIENTI.map((c) => (
              <label key={c} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm focus-within:ring-2 focus-within:ring-ledger/30 ${clients.includes(c) ? "border-ledger bg-ledger-soft text-ledger-2" : "border-line"}`}>
                <input type="checkbox" name="clients" value={c} className="sr-only" checked={clients.includes(c)}
                  onChange={(e) => setClients(e.target.checked ? [...clients, c] : clients.filter((x) => x !== c))} />
                {c}
              </label>
            ))}
          </div>
          <div><Button type="submit" disabled={!clients.length}>Mostra le ricerche</Button></div>
        </form>
      </>
    );
  }
  if (!stored.items.length) {
    return (
      <>
        {header}
        <p className="text-sm">In questa zona non abbiamo trovato ricerche con abbastanza aziende. Prova ad allargare la zona.</p>
        <div className="mt-3 flex flex-wrap gap-2"><Button onClick={onEdit}>Modifica la zona</Button>{tryAnyway}</div>
      </>
    );
  }
  return (
    <>
      {header}
      <div className="grid gap-3 lg:grid-cols-3">
        {stored.items.map((s, i) => (
          <a key={`${i}-${s.title}`} href={wizardHref(s, area)} className="group flex flex-col gap-2 rounded-lg border border-line bg-white p-4 transition-colors hover:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/30">
            <span className="font-display text-lg font-semibold leading-snug">{s.title}</span>
            <Badge tone="ledger" className="self-start font-mono">circa {formatNumber(aboutLeads(s.leads))} lead</Badge>
            <span className="text-sm text-muted line-clamp-2">{s.why}</span>
            <span className="mt-auto text-sm font-medium text-ledger-2 group-hover:underline">Apri la ricerca →</span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Si apre la ricerca già compilata. La controlli e la avvii tu: paghi solo i lead consegnati.</p>
    </>
  );
}

function Skeletons() {
  return (
    <div className="grid gap-3 lg:grid-cols-3" role="status" aria-busy="true">
      <span className="sr-only">Stiamo preparando le ricerche…</span>
      {[0, 1, 2].map((k) => <div key={k} className="h-36 animate-pulse rounded-lg bg-paper-2" />)}
    </div>
  );
}

// Icone del riquadro (stesso disegno di quelle della dashboard: tratto da 1,6 su 20×20).
const GLYPH: Record<string, string> = {
  target: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM10 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM10 10.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zM14 6l3-3",
  building: "M4 18V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v14M13 8h2a1 1 0 0 1 1 1v9M2 18h16M7 6h2M7 9h2M7 12h2M9 18v-3",
  pin: "M10 18s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10zM10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  bulb: "M7.5 14h5M8 17h4M10 2a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9z",
  search: "M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM17 17l-3.5-3.5",
  sparkle: "M10 2l1.6 4.4L16 8l-4.4 1.6L10 14l-1.6-4.4L4 8l4.4-1.6zM16 13l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  check: "M4 10.5l4 4 8-9",
};
function Glyph({ name, className }: { name: keyof typeof GLYPH; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={GLYPH[name]} />
    </svg>
  );
}
