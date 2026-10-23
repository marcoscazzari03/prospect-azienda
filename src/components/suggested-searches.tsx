"use client";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { clearBusinessProfile, saveBusinessProfile, skipBusinessProfile, type ActionState } from "@/app/app/actions";
import { Alert, Badge, Button, ButtonLink, Card } from "@/components/ui";
import { BUSINESS_EXAMPLES, BUSINESS_LIMITS, leadsLabel, wizardHref, type StoredSuggestions } from "@/lib/domain/suggestions";

// Ricerche consigliate (punti 84–85, proposta del designer in docs/15-ricerche-consigliate.md): riquadro in cima alla
// dashboard, saltabile. Testi rivisti dal sales-copywriter il 23/10.
const CLIENTI = ["Imprese edili", "Studi professionali", "Negozi", "Ristoranti e hotel", "Aziende industriali", "Altro"];

export function SuggestedSearches({ description, area, stored, skipped, example, startEditing = false, services = [] }: {
  description: string; area: string; stored: StoredSuggestions | null; skipped: boolean; example: string; startEditing?: boolean;
  services?: { code: string; label: string }[]; // scelte rapide: servizi attivi del catalogo
}) {
  // startEditing: arrivati dal profilo con «Modifica» (/app?attivita=modifica).
  const [editing, setEditing] = useState(startEditing || (!description && !skipped));
  const [text, setText] = useState(description);
  // «Lasciati ispirare» (grafica Avvisto, 23/10): scrive nel campo un esempio diverso dal testo attuale, senza inviare niente.
  const inspire = () => {
    // Un testo scritto dal cliente si sostituisce solo dopo conferma (Code Reviewer).
    const typed = text.trim() && !(BUSINESS_EXAMPLES as readonly string[]).includes(text);
    if (typed && !window.confirm("Sostituire quello che hai scritto con un esempio?")) return;
    const others = BUSINESS_EXAMPLES.filter((e) => e !== text);
    setText(others[(others.indexOf(example as (typeof others)[number]) + 1 + text.length) % others.length]);
  };
  // Proposte arrivate: si chiude il modulo e si mostrano le schede.
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const r = await saveBusinessProfile(prev, form);
    if (!r.error) startTransition(() => setEditing(false));
    return r;
  }, {});

  if (!description && skipped && !editing) {
    return (
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
        <span>Vuoi ricerche già pronte per la tua attività?</span>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Descrivi la tua attività</Button>
      </Card>
    );
  }

  return (
    <Card id="attivita" className="mb-5 scroll-mt-8 rounded-2xl border-line/70 p-5 sm:p-6 lg:pb-5 lg:pr-5">
      {editing || !description ? (
        // Struttura e misure della bozza del 23/10 (docs/design/avvisto/bozza-panoramica.webp).
        <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)] xl:gap-[30px] min-[1700px]:grid-cols-[minmax(0,1fr)_minmax(0,370px)]">
          <div className="min-w-0">
            <div className="flex items-start gap-4 sm:gap-[27px]">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-[#ebe8fd] text-ledger sm:h-16 sm:w-16"><Glyph name="sparkle" className="h-7 w-7 sm:h-8 sm:w-8" /></span>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-2xl font-semibold leading-tight sm:text-[26px]">Di cosa si occupa la tua attività?</h2>
                <p className="mt-0.5 text-base text-muted sm:text-[17px]">Dicci cosa fai e ti suggeriamo ricerche di aziende già pronte, oppure avviale direttamente.</p>
              </div>
            </div>
            <div className="mt-[18px] grid gap-5 md:grid-cols-[minmax(0,700fr)_minmax(0,420fr)] md:gap-[25px] xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[1700px]:grid-cols-[minmax(0,700fr)_minmax(0,420fr)]">
              <div className="min-w-0">
                <label htmlFor="business-description" className="mb-2 block text-base font-semibold">Cosa fai?</label>
                <div className="flex h-[52px] overflow-hidden rounded-[10px] border border-line bg-white focus-within:border-ledger focus-within:ring-2 focus-within:ring-ledger/15">
                  <span className="grid w-14 shrink-0 place-items-center border-r border-line text-ink-2"><Glyph name="briefcase" className="h-[22px] w-[22px]" /></span>
                  <input id="business-description" name="description" required minLength={10} maxLength={BUSINESS_LIMITS.description} value={text}
                    onChange={(e) => setText(e.target.value)} placeholder={`Es. ${example}`}
                    className="min-w-0 flex-1 bg-transparent px-3 text-base placeholder:text-muted/80 focus:outline-none" />
                </div>
                <p className="mt-3 text-sm text-muted">Una o due frasi: cosa offri e a quali aziende.</p>
              </div>
              <div className="min-w-0">
                <label htmlFor="business-area" className="mb-2 block text-base font-semibold">Dove cerchi clienti?</label>
                <div className="relative">
                  <Glyph name="pin" className="pointer-events-none absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 text-ink-2" />
                  <input id="business-area" name="area" maxLength={BUSINESS_LIMITS.area} defaultValue={area} placeholder="Es. Modena"
                    className="h-[52px] w-full rounded-[10px] border border-line bg-white pl-[54px] pr-3 text-base placeholder:text-muted/80 focus:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/15" />
                </div>
                <p className="mt-3 text-sm text-muted">Provincia o regione. Se lasci vuoto, tutta Italia.</p>
              </div>
            </div>
            {state.error && <div className="mt-4"><Alert tone="stamp">{state.error}</Alert></div>}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button type="submit" size="none" disabled={pending} className="h-[54px] w-full rounded-[10px] px-9 text-[17px] sm:w-auto sm:min-w-[274px]">
                <Glyph name="search" className="h-5 w-5" />{pending ? "Stiamo preparando le ricerche…" : "Mostra le ricerche"}
              </Button>
              <Button type="button" variant="secondary" size="none" className="h-[54px] w-full rounded-[10px] px-9 text-[17px] sm:w-auto" disabled={pending} onClick={inspire}>
                <Glyph name="sparkle" className="h-5 w-5 text-ledger" />Lasciati ispirare
              </Button>
              {description ? (
                <Button type="button" variant="ghost" className="h-11" onClick={() => setEditing(false)}>Annulla</Button>
              ) : (
                <Button type="button" variant="ghost" className="h-11 text-muted" disabled={pending}
                  onClick={() => startTransition(async () => { await skipBusinessProfile(); setEditing(false); })}>Salta per ora</Button>
              )}
            </div>
            {pending && <div className="mt-4"><Skeletons /></div>}
            {/* Scelte rapide: i servizi del catalogo, aprono la ricerca di opportunità già impostata sul servizio. */}
            {services.length > 0 && !pending && (
              <div className="mt-3.5 flex flex-wrap gap-3">
                {services.map((s) => (
                  <a key={s.code} href={`/app/ricerche/nuova?tipo=opportunita&servizio=${encodeURIComponent(s.code)}`}
                    className="inline-flex min-h-9 items-center gap-3 rounded-full border border-[#e4e1f5] bg-[#f9f8ff] pl-5 pr-[22px] text-sm text-ink-2 transition-colors hover:border-ledger/50 hover:text-ink">
                    <Glyph name="trend" className="h-4 w-4 text-ledger" />{s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          {/* «Non sai da dove iniziare?» (bozza dell'utente): porta alla ricerca di opportunità; su telefono senza illustrazione. */}
          <aside className="flex flex-col rounded-2xl bg-[#f7f5ff] px-6 py-6 sm:px-8 xl:justify-end xl:pb-[17px] xl:pt-5">
            <Illustration />
            <p className="text-[19px] font-bold xl:mt-4">Non sai da dove iniziare?</p>
            <p className="mt-2 max-w-[262px] text-base leading-[23px] text-muted">Ti suggeriamo ricerche già pronte per il tuo settore, con filtri e impostazioni ottimizzate.</p>
            <Link href="/app/ricerche/nuova?tipo=opportunita" className="mt-3.5 inline-flex h-11 items-center gap-3 self-start rounded-[10px] border border-[#cdc6f2] px-[22px] text-[15px] font-semibold text-ledger transition-colors hover:border-ledger hover:bg-white">
              Vedi i suggerimenti<Glyph name="arrow" className="h-4 w-4" />
            </Link>
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
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">Ricerche consigliate per te</h2>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{description} · {area || "Tutta Italia"}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>Modifica</Button>
          <form action={clearBusinessProfile}><Button type="submit" variant="ghost" size="sm">Cancella la descrizione</Button></form>
        </div>
      </div>
      {/* Calcolo nuovo fallito con proposte vecchie salvate: l'errore si mostra sopra (23/10: sembravano proposte nuove). */}
      {error && stored && <div className="mb-4"><Alert tone="stamp">{error} Qui sotto le proposte di prima.</Alert></div>}
    </>
  );
  const retry = (
    <form action={action} className="contents">
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="area" value={area} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Stiamo preparando le ricerche…" : "Riprova"}</Button>
    </form>
  );
  const tryAnyway = <ButtonLink href="/app/ricerche/nuova" variant="ghost">Crea una ricerca</ButtonLink>;

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
        <p className="text-sm">Qui trovi solo aziende, non privati. Se vendi anche ad aziende, descrivi quella parte e riprova, oppure crea una ricerca.</p>
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
        <p className="text-sm">{area
          ? "In questa zona non abbiamo trovato ricerche con abbastanza aziende. Prova ad allargare la zona."
          : "Non abbiamo trovato ricerche con abbastanza aziende. Prova a descrivere meglio cosa offri e a chi."}</p>
        <div className="mt-3 flex flex-wrap gap-2"><Button onClick={onEdit}>{area ? "Modifica la zona" : "Modifica la descrizione"}</Button>{tryAnyway}</div>
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
            <Badge tone="ledger" className="self-start font-mono">{leadsLabel(s.leads)}</Badge>
            <span className="text-sm text-muted line-clamp-2">{s.why}</span>
            <span className="mt-auto text-sm font-medium text-ledger-2 group-hover:underline">Apri la ricerca →</span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Si apre la ricerca già compilata. La controlli e la avvii tu. Paghi solo i lead consegnati, con i crediti. I numeri si aggiornano ogni notte.</p>
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
  trend: "M3 14l5-5 3 3 6-6M12 6h5v5",
  briefcase: "M3 7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6M3 11h14",
  arrow: "M4 10h12M11 5l5 5-5 5",
};
function Glyph({ name, className }: { name: keyof typeof GLYPH; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={GLYPH[name]} />
    </svg>
  );
}

// Illustrazione del riquadro «Non sai da dove iniziare?» (bozza): schede sovrapposte con l'edificio, cerchio viola con la
// freccia e cerchi decorativi; solo da xl (sotto, il riquadro sta sotto il modulo, senza illustrazione).
function Illustration() {
  return (
    <svg viewBox="20 0 272 140" className="mx-auto hidden h-[116px] w-[226px] xl:block" aria-hidden>
      <defs>
        <filter id="ill-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#362793" floodOpacity="0.12" />
        </filter>
      </defs>
      <circle cx="40" cy="86" r="16" fill="none" stroke="#e4e0f6" />
      <circle cx="266" cy="72" r="13" fill="none" stroke="#e4e0f6" />
      <circle cx="236" cy="24" r="22" fill="none" stroke="#ebe8fa" />
      <g transform="rotate(-8 112 82)">
        <rect x="58" y="44" width="120" height="84" rx="12" fill="#efedfb" />
        <path d="M72 96h10v-8h4v8h10" fill="none" stroke="#d8d3f3" strokeWidth="1.6" />
      </g>
      <g transform="rotate(5 160 74)" filter="url(#ill-shadow)">
        <rect x="96" y="18" width="136" height="104" rx="14" fill="#ffffff" />
        <path d="M118 62V38h14v24M132 46h8v16M114 62h30M122 43h2M127 43h2M122 49h2M127 49h2M122 55h2M127 55h2" fill="none" stroke="var(--color-ledger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="116" y="80" width="96" height="6" rx="3" fill="#e9e7f3" />
        <rect x="116" y="94" width="66" height="6" rx="3" fill="#e9e7f3" />
      </g>
      <circle cx="236" cy="24" r="21" fill="var(--color-ledger-bright)" />
      <path d="M236 33V15M228 22l8-8 8 8" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
