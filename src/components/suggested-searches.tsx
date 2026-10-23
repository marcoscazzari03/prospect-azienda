"use client";
import { useActionState, useState } from "react";
import { saveBusinessProfile, skipBusinessProfile, type ActionState } from "@/app/app/actions";
import { Alert, Badge, Button, ButtonLink, Card, Field, Input, Textarea } from "@/components/ui";
import { BUSINESS_LIMITS, aboutLeads, wizardHref, type StoredSuggestions } from "@/lib/domain/suggestions";
import { formatNumber } from "@/lib/domain/pricing";
import { BRAND } from "@/lib/config";

// Ricerche consigliate (punti 84–85, proposta del designer in docs/15-ricerche-consigliate.md): riquadro in cima alla
// dashboard, saltabile. Testi provvisori, da rifinire con il copywriter.
const CLIENTI = ["Imprese edili", "Studi professionali", "Negozi", "Ristoranti e hotel", "Aziende industriali", "Altro"];

export function SuggestedSearches({ description, area, stored, skipped }: { description: string; area: string; stored: StoredSuggestions | null; skipped: boolean }) {
  const [editing, setEditing] = useState(!description && !skipped);
  // Proposte arrivate: si chiude il modulo e si mostrano le schede.
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const r = await saveBusinessProfile(prev, form);
    if (!r.error) setEditing(false);
    return r;
  }, {});

  if (!description && skipped && !editing) {
    return (
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-ledger/25 px-4 py-3 text-sm">
        <span>Vuoi delle ricerche consigliate?</span>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Descrivi la tua attività</Button>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-ledger/25 p-5">
      {editing || !description ? (
        <form action={action} className="grid gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Di cosa si occupa la tua attività?</h2>
            <p className="mt-1 text-sm text-muted">Ti proponiamo ricerche pronte da avviare. Non è obbligatorio.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Field label="Cosa fai" htmlFor="business-description" hint="Una o due frasi: cosa vendi e a chi.">
              <Textarea id="business-description" name="description" required minLength={10} maxLength={BUSINESS_LIMITS.description} defaultValue={description}
                placeholder="Es. Falegnameria: mobili su misura per negozi, uffici e hotel" className="min-h-20" />
            </Field>
            <Field label="Dove lavori" htmlFor="business-area" hint="Provincia o regione.">
              <Input id="business-area" name="area" maxLength={BUSINESS_LIMITS.area} defaultValue={area} placeholder="Es. Modena" className="h-11" />
            </Field>
          </div>
          {state.error && <Alert tone="stamp">{state.error}</Alert>}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">{pending ? "Stiamo preparando le ricerche…" : "Mostra le ricerche"}</Button>
            {description ? (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Annulla</Button>
            ) : (
              <Button type="button" variant="ghost" formAction={skipBusinessProfile} formNoValidate>Salta per ora</Button>
            )}
          </div>
          {pending && <Skeletons />}
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
  const tryAnyway = <ButtonLink href="/app/ricerche/nuova" variant="ghost">Prova comunque una ricerca</ButtonLink>;

  if (pending) return <>{header}<Skeletons /></>;
  if (!stored) {
    return (
      <>
        {header}
        <Alert tone="stamp">{error ?? "Non siamo riusciti a preparare le ricerche. Riprova o avvia una ricerca a mano."}</Alert>
        <div className="mt-3 flex flex-wrap gap-2">{retry}<ButtonLink href="/app/ricerche/nuova" variant="ghost">Nuova ricerca</ButtonLink></div>
      </>
    );
  }
  if (stored.sellsTo === "consumers") {
    return (
      <>
        {header}
        <p className="text-sm">{BRAND.name} trova aziende a cui vendere i tuoi servizi. Se lavori soprattutto con privati, potrebbe non fare al caso tuo.</p>
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
          <p className="text-sm font-medium">A chi vendi di solito?</p>
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
        <p className="text-sm">Non abbiamo trovato ricerche con lead disponibili in questa zona.</p>
        <div className="mt-3 flex flex-wrap gap-2"><Button onClick={onEdit}>Modifica la zona</Button>{tryAnyway}</div>
      </>
    );
  }
  return (
    <>
      {header}
      <div className="grid gap-3 lg:grid-cols-3">
        {stored.items.map((s) => (
          <a key={s.title} href={wizardHref(s, area)} className="group flex flex-col gap-2 rounded-lg border border-line bg-white p-4 transition-colors hover:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/30">
            <span className="font-display text-lg font-semibold leading-snug">{s.title}</span>
            <Badge tone="ledger" className="self-start font-mono">circa {formatNumber(aboutLeads(s.leads))} lead</Badge>
            <span className="text-sm text-muted line-clamp-2">{s.why}</span>
            <span className="mt-auto text-sm font-medium text-ledger-2 group-hover:underline">Apri la ricerca →</span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Si apre la ricerca già compilata: la controlli e la avvii tu.</p>
    </>
  );
}

function Skeletons() {
  return (
    <div className="grid gap-3 lg:grid-cols-3" aria-live="polite" aria-busy="true">
      <span className="sr-only">Stiamo preparando le ricerche…</span>
      {[0, 1, 2].map((k) => <div key={k} className="h-36 animate-pulse rounded-lg bg-paper-2" />)}
    </div>
  );
}
