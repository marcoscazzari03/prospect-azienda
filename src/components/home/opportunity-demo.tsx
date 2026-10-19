"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  OFFER_AREAS, SIGNAL_SHORT, VERIFIED_SIGNAL_CODES, offerByCode, offersOfArea, opportunityScore, signalByCode,
  type LeadSignal, type OfferDef, type SignalPrices,
} from "@/lib/domain/signals";
import { creditsPerLead } from "../search-types";
import { cx } from "../ui";

// Demo della homepage: simula una ricerca interamente nel browser. Nessuna chiamata al server,
// al database o al motore, nessun credito. I risultati sono generati da un seme ricavato dai
// filtri, con nomi illeggibili: sono dichiarati come simulati in ogni stato della demo.

const REGIONS = [
  "Lombardia", "Veneto", "Emilia-Romagna", "Piemonte", "Toscana", "Lazio", "Campania", "Puglia", "Sicilia", "Friuli-Venezia Giulia",
  "Trentino-Alto Adige", "Liguria", "Marche", "Umbria", "Abruzzo", "Sardegna", "Calabria", "Basilicata", "Molise", "Valle d'Aosta",
];
const SECTORS = ["Hotel e ospitalità", "Ristoranti", "Studi professionali", "Manifattura", "Edilizia e impianti", "Commercio", "Software e IT", "Studi dentistici"];
const QUANTITIES = [10, 25, 50] as const;

type Mode = "opportunity" | "target";
type Config = { mode: Mode; offer: string; region: string; sector: string; qty: number };

function rng(seedText: string) {
  let a = 0;
  for (let i = 0; i < seedText.length; i++) a = (Math.imul(31, a) + seedText.charCodeAt(i)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const LETTERS = "abcdefghilmnoprstuvz";
const word = (rand: () => number, min: number, max: number) =>
  Array.from({ length: min + Math.floor(rand() * (max - min + 1)) }, () => LETTERS[Math.floor(rand() * LETTERS.length)]).join("");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Prova d'esempio per ogni segnale (testo generico, nessun dato reale).
const PROOF: Record<string, string> = {
  job_ad: "Annuncio di lavoro pubblicato 5 giorni fa",
  no_https: "Il sito non usa HTTPS · controllato oggi",
  no_mobile: "Homepage senza impostazione per cellulari · controllata oggi",
  outdated_cms: "WordPress 5.2, versione del 2019 · controllato oggi",
  single_language: "Nessuna versione in altre lingue · controllato oggi",
  stale_copyright: "Copyright fermo al 2019 · controllato oggi",
  under_construction: "Homepage provvisoria · controllata oggi",
  no_booking_engine: "Nessun sistema di prenotazione riconosciuto · controllato oggi",
};

type Row = { name: string; city: string; signals: string[]; form: boolean };

function simulate(cfg: Config, offers: OfferDef[]) {
  const rand = rng(JSON.stringify(cfg));
  const opp = cfg.mode === "opportunity";
  const codes = offerByCode(cfg.offer, offers)?.signals ?? [];
  const verified = codes.filter((c) => VERIFIED_SIGNAL_CODES.includes(c));
  const hints = codes.filter((c) => !VERIFIED_SIGNAL_CODES.includes(c));
  // Con i segnali il mercato si restringe: a volte si trovano meno aziende di quelle chieste.
  const shortfall = rand() < (opp ? 0.5 : 0.25) ? Math.ceil(cfg.qty * (opp ? 0.16 : 0.06) * rand()) : 0;
  const found = Math.max(1, cfg.qty - shortfall);
  const rows: Row[] = Array.from({ length: Math.min(found, 6) }, () => {
    const signals = opp ? verified.filter(() => rand() < 0.55) : [];
    if (opp && !signals.length && verified.length) signals.push(verified[Math.floor(rand() * verified.length)]);
    if (opp) for (const h of hints) if (rand() < 0.35) signals.push(h);
    return { name: `${cap(word(rand, 5, 9))} ${cap(word(rand, 3, 6))}`, city: cap(word(rand, 5, 9)), signals, form: rand() < 0.3 };
  });
  return { rows, found, analyzed: Math.round(found * (opp ? 3.8 : 1.9) + rand() * found), discarded: opp ? Math.round(found * (1.4 + rand())) : 0 };
}

const PHASES: Record<Mode, { label: string; ticks: number }[]> = {
  opportunity: [
    { label: "Aziende della zona nel nostro database", ticks: 10 },
    { label: "Controllo dei segnali sui siti e negli annunci", ticks: 22 },
    { label: "Sito ufficiale e settore", ticks: 12 },
    { label: "Contatto aziendale: email o modulo", ticks: 12 },
  ],
  target: [
    { label: "Aziende della zona nel nostro database", ticks: 12 },
    { label: "Sito ufficiale e settore", ticks: 16 },
    { label: "Contatto aziendale: email o modulo", ticks: 14 },
  ],
};

const field = "h-11 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-ledger disabled:opacity-60";

// `freeCredits` e `freeMax`: crediti del piano gratuito e aziende massime per ricerca.
export function OpportunityDemo({ offers, signalPrices, freeCredits, freeMax }: { offers: OfferDef[]; signalPrices: SignalPrices; freeCredits: number; freeMax: number }) {
  const first = offerByCode("web_redesign", offers) ?? offers[0];
  const [cfg, setCfg] = useState<Config>({ mode: "opportunity", offer: first?.code ?? "", region: "Veneto", sector: "", qty: 25 });
  const [tick, setTick] = useState<number | null>(null);
  const out = useRef<HTMLDivElement>(null);
  const opp = cfg.mode === "opportunity";
  const phases = PHASES[cfg.mode];
  const total = phases.reduce((n, p) => n + p.ticks, 0);
  const running = tick !== null && tick < total;
  const done = tick !== null && tick >= total;

  useEffect(() => {
    if (!running) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setInterval(() => setTick((t) => (t === null ? t : Math.min(total, t + (reduced ? 8 : 1)))), 90);
    return () => window.clearInterval(id);
  }, [running, total]);

  const result = useMemo(() => simulate(cfg, offers), [cfg, offers]);
  const offer = offerByCode(cfg.offer, offers);
  const perLead = creditsPerLead(opp ? "opportunity" : "target", signalPrices);
  const credits = result.found * perLead.max;
  const freeLeads = Math.min(freeMax, Math.floor(freeCredits / perLead.max));

  const t = tick ?? 0;
  const startOf = (i: number) => phases.slice(0, i).reduce((n, p) => n + p.ticks, 0);
  const current = Math.max(0, phases.findIndex((_, i) => startOf(i + 1) > t));
  const pct = Math.round((t / total) * 100);
  const progress = (i: number) => Math.min(1, Math.max(0, (t - startOf(i)) / phases[i].ticks));

  const update = (patch: Partial<Config>) => {
    setCfg((c) => ({ ...c, ...patch }));
    setTick(null);
  };
  const run = () => {
    setTick(0);
    const box = out.current?.getBoundingClientRect();
    if (box && box.top > window.innerHeight * 0.7) out.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  const preview = result.rows[0];
  const previewSignals: LeadSignal[] = (preview?.signals ?? []).map((code) => ({ code }));
  const score = opp ? opportunityScore(previewSignals.map((s) => ({ ...s, evidence: { checked_at: new Date().toISOString().slice(0, 10) } })), cfg.offer) : null;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card">
      <div className="grid lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Impostazioni */}
        <form className="flex flex-col gap-5 border-b border-line p-5 sm:p-6 lg:border-b-0 lg:border-r" onSubmit={(e) => { e.preventDefault(); run(); }}>
          <div role="radiogroup" aria-label="Tipo di ricerca" className="grid grid-cols-2 rounded-xl bg-paper p-1 text-sm">
            {([["opportunity", "Con opportunità"], ["target", "Solo in target"]] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={cfg.mode === m}
                disabled={running}
                onClick={() => update({ mode: m, sector: m === "target" && !cfg.sector ? SECTORS[0] : cfg.sector })}
                className={cx("rounded-lg px-3 py-2 font-medium transition-colors", cfg.mode === m ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink-2")}
              >
                {label}
              </button>
            ))}
          </div>

          <fieldset disabled={running} className="flex flex-col gap-4">
            {opp && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">1. Cosa vendi?</span>
                <select className={field} value={cfg.offer} onChange={(e) => update({ offer: e.target.value })}>
                  {OFFER_AREAS.filter((a) => offersOfArea(a.code, offers).length).map((a) => (
                    <optgroup key={a.code} label={a.label}>
                      {offersOfArea(a.code, offers).map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                {offer && <span className="text-xs text-muted">Cerchiamo aziende con {offer.lookFor}.</span>}
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{opp ? "2. Dove?" : "1. Dove?"}</span>
              <select className={field} value={cfg.region} onChange={(e) => update({ region: e.target.value })}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{opp ? "3. In quale settore?" : "2. In quale settore?"}</span>
              <select className={field} value={cfg.sector} onChange={(e) => update({ sector: e.target.value })}>
                {opp && <option value="">Tutti i settori</option>}
                {SECTORS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Quante aziende?</span>
              <div role="radiogroup" aria-label="Quante aziende" className="grid grid-cols-3 gap-2">
                {QUANTITIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    role="radio"
                    aria-checked={cfg.qty === q}
                    onClick={() => update({ qty: q })}
                    className={cx("h-10 rounded-lg border font-mono text-sm transition-colors", cfg.qty === q ? "border-ink bg-ink text-white" : "border-line hover:border-ink-2")}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <button type="submit" disabled={running} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ledger px-5 text-sm font-semibold text-white transition-colors hover:bg-ledger-2 disabled:opacity-60">
              {running ? "Simulazione in corso…" : done ? "Rifai la simulazione" : "Avvia la simulazione"} <span aria-hidden>→</span>
            </button>
            <p className="text-center text-xs text-muted">Nel browser, con dati simulati: nessuna ricerca reale, nessun credito.</p>
          </div>
        </form>

        {/* Risultato */}
        <div ref={out} className="min-w-0 scroll-mt-24 bg-paper/50 p-5 sm:p-6" aria-live="polite">
          {tick === null && (
            <div className="flex h-full min-h-[360px] flex-col justify-center gap-6">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">La tua ricerca</p>
              <p className="max-w-lg font-display text-2xl font-semibold leading-snug sm:text-3xl">
                {opp && offer
                  ? <>Aziende {cfg.sector ? <>del settore <span className="text-ledger">{cfg.sector.toLowerCase()}</span></> : "di ogni settore"} in {cfg.region} con {offer.lookFor}.</>
                  : <>Aziende del settore <span className="text-ledger">{(cfg.sector || SECTORS[0]).toLowerCase()}</span> in {cfg.region}, con sito e contatto aziendale.</>}
              </p>
              <dl className="grid max-w-lg grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
                <div><dt className="text-muted">Costo per azienda</dt><dd className="mt-1 font-mono text-lg">{perLead.max} {perLead.max === 1 ? "credito" : "crediti"}</dd></div>
                <div><dt className="text-muted">Se ne troviamo meno</dt><dd className="mt-1">paghi solo quelle consegnate</dd></div>
              </dl>
            </div>
          )}

          {running && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium">{phases[current]?.label}…</p>
                  <p className="font-mono text-muted">{pct}%</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
                  <div className="h-full rounded-full bg-ledger transition-[width] duration-100 ease-linear" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <ol className="flex flex-col gap-3">
                {phases.map((p, i) => (
                  <li key={p.label} className="flex items-center gap-3 text-sm">
                    <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]", progress(i) >= 1 ? "border-ledger bg-ledger text-white" : i === current ? "border-ledger" : "border-line text-muted")}>
                      {progress(i) >= 1 ? "✓" : i === current ? <span className="h-2 w-2 animate-pulse rounded-full bg-ledger" /> : i + 1}
                    </span>
                    <span className={cx(progress(i) === 0 && i !== current && "text-muted")}>{p.label}</span>
                  </li>
                ))}
              </ol>
              <dl className="grid grid-cols-3 gap-3 border-t border-line pt-5">
                {[
                  ["Aziende analizzate", Math.round(result.analyzed * progress(0))],
                  [opp ? "Con il segnale" : "Siti verificati", Math.round(result.found * (opp ? 1.1 : 1.2) * progress(1))],
                  ["Pronte", Math.round(result.found * progress(phases.length - 1))],
                ].map(([l, v]) => (
                  <div key={l}>
                    <dt className="text-xs text-muted">{l}</dt>
                    <dd className="font-mono text-2xl tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {done && preview && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-2xl font-semibold">
                  {result.found} aziende{result.found < cfg.qty && <span className="text-base font-normal text-muted"> su {cfg.qty} richieste</span>}
                </p>
                <span className="rounded-full border border-stamp/40 bg-stamp-soft px-2.5 py-0.5 text-xs font-medium text-stamp-ink">Simulazione</span>
              </div>
              {opp && <p className="-mt-3 text-sm text-ink-2">{result.discarded} aziende scartate perché senza prova del segnale.</p>}

              {/* Un risultato aperto: la struttura vera, con dati simulati */}
              <div className="rounded-2xl border border-line bg-card">
                <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold"><span className="blur-[4px]" aria-hidden>{preview.name}</span><span className="sr-only">Azienda simulata</span></p>
                    <p className="text-xs text-muted">{cfg.sector || "Settore dal sito"} · {cfg.region}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted">Dati simulati</span>
                </div>
                {opp ? (
                  <div className="flex flex-col gap-2 px-4 py-3">
                    {preview.signals.map((c) => (
                      <div key={c} className="rounded-lg bg-paper px-3 py-2">
                        <p className="text-sm font-medium">{signalByCode(c)?.label}</p>
                        <p className="text-xs text-ink-2">{PROOF[c]} · <span className="text-ledger">prova ↗</span></p>
                      </div>
                    ))}
                    {score && <p className="text-xs text-ink-2">Opportunità <span className="font-medium text-ink">{score.level}</span> · <span className="font-mono">{score.score}</span>/100</p>}
                  </div>
                ) : (
                  <p className="px-4 py-3 text-sm text-ink-2">Sito ufficiale controllato · settore confermato dal sito</p>
                )}
                <p className="border-t border-line px-4 py-3 text-sm">
                  {preview.form ? <span className="text-ledger">Modulo di contatto →</span> : <span className="font-mono text-[13px]"><span className="blur-[4px]" aria-hidden>info@{preview.name.split(" ")[0].toLowerCase()}.it</span><span className="sr-only">Email aziendale simulata</span></span>}
                  <span className="ml-2 text-xs text-muted">{preview.form ? "nessuna email sul sito" : "trovata sul sito"}</span>
                </p>
              </div>

              <ul aria-hidden className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card text-sm">
                {result.rows.slice(1, 5).map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="truncate blur-[4px]">{r.name} · {r.city}</span>
                    {opp && r.signals[0] && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-2">{SIGNAL_SHORT[r.signals[0]]}</span>}
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl bg-ink p-5 text-white">
                <p className="font-display text-xl font-semibold">Fai questa ricerca sul serio.</p>
                <p className="mt-1 text-sm text-white/75">
                  {result.found} aziende × {perLead.max} {perLead.max === 1 ? "credito" : "crediti"} = <span className="font-mono text-white">{credits} crediti</span>.
                  {" "}Con i {freeCredits} crediti gratuiti ricevi le prime {Math.min(freeLeads, result.found)} aziende reali, con contatto{opp ? " e prova" : ""}.
                </p>
                <Link href="/registrati" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-ledger-soft sm:w-auto">
                  Crea l&apos;account gratuito <span aria-hidden>→</span>
                </Link>
                <p className="mt-2 text-xs text-white/60">Nessuna carta. I dati della simulazione non diventano risultati: dopo la registrazione la ricerca la fai tu, su aziende reali.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
