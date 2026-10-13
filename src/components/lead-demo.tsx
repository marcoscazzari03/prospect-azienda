"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ProvenanceStamp, cx } from "./ui";
import { SERVICES, SIGNALS, SIGNAL_RULES, SIGNAL_SHORT, VERIFIED_SIGNAL_CODES, describeOpportunity, extraCreditsLabel, type SignalPrices } from "@/lib/domain/signals";

// Demo interattiva della homepage: simula una ricerca interamente nel browser.
// Nessuna chiamata al server, al database o al motore: i "risultati" sono
// generati da un seme ricavato dai filtri e il loro testo è già illeggibile
// (lettere casuali), la sfocatura è solo l'effetto visivo.

const COUNTRIES = [
  { id: "IT", label: "Italia", tld: "it", regions: ["Lombardia", "Veneto", "Piemonte", "Emilia-Romagna", "Lazio", "Toscana"] },
  { id: "ES", label: "Spagna", tld: "es", regions: ["Madrid", "Catalogna", "Valencia", "Andalusia"] },
  { id: "FR", label: "Francia", tld: "fr", regions: ["Île-de-France", "Alvernia-Rodano-Alpi", "Occitania"] },
  { id: "DE", label: "Germania", tld: "de", regions: ["Baviera", "Berlino", "Renania Settentrionale-Vestfalia"] },
  { id: "PT", label: "Portogallo", tld: "pt", regions: ["Lisbona", "Porto", "Algarve"] },
] as const;

const SECTORS = [
  { id: "software", label: "Software e IT", who: "aziende di software e IT", query: "software house" },
  { id: "manifattura", label: "Manifattura", who: "aziende manifatturiere", query: "azienda manifatturiera" },
  { id: "dentisti", label: "Studi dentistici", who: "studi dentistici", query: "studio dentistico" },
  { id: "legali", label: "Studi legali", who: "studi legali", query: "studio legale" },
  { id: "hotel", label: "Hotel e ospitalità", who: "hotel e strutture ricettive", query: "hotel" },
  { id: "ecommerce", label: "E-commerce", who: "negozi online", query: "negozio online" },
] as const;

const SIZES = ["1-10 dip.", "11-50 dip.", "51-200 dip.", "201-500 dip."] as const;
const ROLES = ["Titolare / CEO", "CTO", "CFO", "Marketing", "Vendite", "HR"] as const;
const MODES = [
  ["generic_ok", "Generiche incluse"],
  ["mixed", "Misto (generiche + nominative)"],
  ["personal_only", "Solo nominative"],
] as const;
const QUANTITIES = [10, 25, 50] as const;

type Kind = "standard" | "opportunity";
type Config = {
  kind: Kind;
  service: string;
  codes: string[];
  match: "any" | "all";
  country: string;
  region: string;
  sector: string;
  size: string;
  role: string;
  mode: string;
  qty: number;
};

// Generatore pseudo-casuale deterministico (mulberry32) dal testo dei filtri.
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
function scramble(rand: () => number, min: number, max: number) {
  const n = min + Math.floor(rand() * (max - min + 1));
  return Array.from({ length: n }, () => LETTERS[Math.floor(rand() * LETTERS.length)]).join("");
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Row = { name: string; company: string; role: string; email: string; status: "validated" | "found_public"; type: "personal" | "generic"; signals: string[] };

function buildResults(cfg: Config) {
  const country = COUNTRIES.find((c) => c.id === cfg.country) ?? COUNTRIES[0];
  const rand = rng(JSON.stringify(cfg));
  const opportunity = cfg.kind === "opportunity";
  const decisive = cfg.codes.filter((c) => VERIFIED_SIGNAL_CODES.includes(c));
  const extra = cfg.codes.filter((c) => !VERIFIED_SIGNAL_CODES.includes(c));
  // Con i segnali il mercato si restringe: a volte si trovano meno lead di quelli chiesti.
  const shortfall = rand() < (opportunity ? 0.6 : 0.35) ? Math.ceil(cfg.qty * (opportunity ? 0.18 : 0.08) * rand()) : 0;
  const found = Math.max(1, cfg.qty - shortfall);
  const rows: Row[] = Array.from({ length: found }, () => {
    const personal = cfg.mode === "personal_only" || (cfg.mode === "mixed" ? rand() < 0.62 : rand() < 0.35);
    const first = scramble(rand, 4, 7);
    const last = scramble(rand, 5, 9);
    const dom = scramble(rand, 6, 11);
    const signals = !opportunity
      ? []
      : cfg.match === "all"
        ? [...decisive]
        : decisive.filter(() => rand() < 0.5);
    if (opportunity && !signals.length && decisive.length) signals.push(decisive[Math.floor(rand() * decisive.length)]);
    if (opportunity) for (const c of extra) if (rand() < 0.4) signals.push(c);
    return {
      name: `${cap(first)} ${cap(last)}`,
      company: `${cap(scramble(rand, 5, 10))} ${cap(scramble(rand, 3, 6))}`,
      role: scramble(rand, 3, 10),
      email: personal ? `${first}.${last}@${dom}.${country.tld}` : `${scramble(rand, 4, 5)}@${dom}.${country.tld}`,
      status: rand() < 0.55 ? "validated" : "found_public",
      type: personal ? "personal" : "generic",
      signals,
    };
  });
  return {
    rows,
    found,
    personal: rows.filter((r) => r.type === "personal").length,
    companies: Math.round(found * (opportunity ? 4.2 : 2.6) + rand() * found),
    discarded: opportunity ? Math.round(found * (1.2 + rand())) : 0,
  };
}

function phasesFor(kind: Kind) {
  return [
    { label: "Pianificazione della ricerca", detail: "Suddividiamo il mercato in lotti per zona", ticks: 12 },
    { label: "Ricerca delle aziende", detail: "Cerchiamo sul web nella lingua del paese", ticks: 24 },
    ...(kind === "opportunity" ? [{ label: "Controllo dei segnali", detail: "Verifichiamo le prove sui siti e negli annunci", ticks: 20 }] : []),
    { label: "Individuazione dei referenti", detail: "Controlliamo siti ufficiali e pagine team", ticks: 20 },
    { label: "Verifica delle email", detail: "Email dal sito e verifica delle caselle", ticks: 18 },
  ];
}

const selectCls = "h-9 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-ledger disabled:opacity-60";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3">
      <span className="text-sm text-ink-2">{label}</span>
      {children}
    </div>
  );
}

const TICK = (
  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-ledger" aria-hidden>
    <circle cx="10" cy="10" r="9" fill="currentColor" />
    <path d="M6.2 10.3l2.5 2.5 5-5.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function LeadDemo({ signalPrices }: { signalPrices: SignalPrices }) {
  const [cfg, setCfg] = useState<Config>({
    kind: "opportunity",
    service: "websites",
    codes: ["no_mobile", "outdated_cms"],
    match: "any",
    country: "IT",
    region: "Lombardia",
    sector: "software",
    size: SIZES[1],
    role: "CTO",
    mode: "mixed",
    qty: 25,
  });
  const [tick, setTick] = useState<number | null>(null); // null = non avviata
  const panel = useRef<HTMLDivElement>(null);
  const phases = phasesFor(cfg.kind);
  const total = phases.reduce((n, p) => n + p.ticks, 0);
  const running = tick !== null && tick < total;
  const done = tick !== null && tick >= total;
  const opportunity = cfg.kind === "opportunity";

  useEffect(() => {
    if (!running) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setInterval(() => setTick((t) => (t === null ? t : Math.min(total, t + (reduced ? 6 : 1)))), 100);
    return () => window.clearInterval(id);
  }, [running, total]);

  const country = COUNTRIES.find((c) => c.id === cfg.country) ?? COUNTRIES[0];
  const sector = SECTORS.find((s) => s.id === cfg.sector) ?? SECTORS[0];
  const results = useMemo(() => buildResults(cfg), [cfg]);
  const decisive = cfg.codes.filter((c) => VERIFIED_SIGNAL_CODES.includes(c));
  const valid = !opportunity || decisive.length > 0;

  const t = tick ?? 0;
  const start = (i: number) => phases.slice(0, i).reduce((n, p) => n + p.ticks, 0);
  const phaseIdx = phases.findIndex((_, i) => start(i + 1) > t);
  const current = phaseIdx === -1 ? phases.length : phaseIdx;
  const pct = Math.round((t / total) * 100);
  const frac = (i: number) => Math.min(1, Math.max(0, (t - start(i)) / phases[i].ticks));
  const counters = opportunity
    ? [["Aziende analizzate", Math.round(results.companies * frac(1))], ["Con il segnale", Math.round(results.found * 1.2 * frac(2))], ["Lead pronti", Math.round(results.found * frac(4))]]
    : [["Aziende analizzate", Math.round(results.companies * frac(1))], ["Referenti trovati", Math.round(results.found * 1.3 * frac(2))], ["Email pronte", Math.round(results.found * frac(3))]];

  const log = useMemo(() => {
    const rand = rng(`log${JSON.stringify(cfg)}`);
    const masked = () => `${cap(scramble(rand, 1, 1))}${"•".repeat(5 + Math.floor(rand() * 5))}.${country.tld}`;
    const sig = (c: string) => SIGNAL_SHORT[c] ?? c;
    return [
      { at: 2, text: `Target: ${sector.label.toLowerCase()}, ${cfg.region}, ${cfg.size}` },
      { at: 8, text: `Piano: ${Math.max(2, Math.ceil(cfg.qty / 12))} lotti in ${cfg.region}` },
      { at: 14, text: `Ricerca web: «${sector.query} ${cfg.region}»` },
      { at: 20, text: `Sito ufficiale verificato: ${masked()}` },
      ...(opportunity
        ? [
            { at: 38, text: `Segnale trovato: ${sig(decisive[0] ?? "no_mobile")} su ${masked()}` },
            { at: 44, text: `Scartata: nessuna prova del segnale` },
            { at: 50, text: `Segnale trovato: ${sig(decisive[decisive.length - 1] ?? "no_mobile")} su ${masked()}` },
          ]
        : [{ at: 33, text: `Scartato: sito non ufficiale (directory)` }]),
      { at: opportunity ? 60 : 44, text: `Referente trovato: ${cfg.role} su ${masked()}` },
      { at: opportunity ? 70 : 58, text: `Email trovata sul sito: ••••@${masked()}` },
      { at: opportunity ? 80 : 66, text: `Scartata: email ipotizzata (non la vendiamo)` },
      { at: opportunity ? 90 : 74, text: `Duplicati rimossi, risultati pronti` },
    ];
  }, [cfg, country, sector, opportunity, decisive]);
  const visibleLog = log.filter((l) => l.at <= t).slice(-5);

  const update = (patch: Partial<Config>) => {
    setCfg((c) => ({ ...c, ...patch }));
    setTick(null);
  };
  const pickService = (code: string) => {
    const svc = SERVICES.find((x) => x.code === code);
    update({ service: code, codes: (svc?.signals ?? []).filter((c) => c !== "job_ad").slice(0, SIGNAL_RULES.maxSignalsPerSearch) });
  };
  const available = SIGNALS.filter((s) => s.code !== "job_ad" && !cfg.codes.includes(s.code));

  const preview = opportunity
    ? describeOpportunity({ codes: cfg.codes, match: cfg.match, jobFamilies: [], industry: sector.who, where: cfg.region }) ||
      "Aggiungi almeno un segnale verificato: gli indicativi da soli non filtrano."
    : `Cercheremo ${sector.who} in ${cfg.region} (${cfg.size}) e il referente giusto: ${cfg.role}. Ogni lead con la fonte e lo stato dell'email.`;

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_70px_-40px_rgba(17,24,39,0.40)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Configurazione */}
      <form
        className="flex min-w-0 flex-col border-b border-line lg:border-b-0 lg:border-r"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          setTick(0);
          // Su mobile l'avanzamento è sotto il form: lo portiamo in vista.
          const box = panel.current?.getBoundingClientRect();
          if (box && box.top > window.innerHeight * 0.6) panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <div className="grid grid-cols-2 border-b border-line px-3 pt-3" role="tablist" aria-label="Tipo di ricerca">
          {([["standard", "Trova aziende in target"], ["opportunity", "Trova aziende con opportunità"]] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={cfg.kind === k}
              disabled={running}
              onClick={() => update({ kind: k })}
              className={cx(
                "-mb-px flex items-center justify-center gap-2 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors sm:text-sm",
                cfg.kind === k ? "border-ledger text-ink" : "border-transparent text-muted hover:text-ink-2",
              )}
            >
              {k === "opportunity" ? (
                <span className={cx("h-3.5 w-3.5 rounded-full", cfg.kind === k ? "bg-ledger" : "border border-line")} aria-hidden />
              ) : (
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM13.5 13.5 17 17" /></svg>
              )}
              {l}
            </button>
          ))}
        </div>

        <fieldset className="flex min-w-0 flex-col gap-3 p-5" disabled={running}>
          {opportunity && (
            <>
              <Row label="Che servizio vendi?">
                <select className={selectCls} value={cfg.service} onChange={(e) => pickService(e.target.value)}>
                  {SERVICES.filter((s) => s.signals.some((c) => c !== "job_ad")).map((s) => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </select>
              </Row>
              <Row label={`Segnali (max ${SIGNAL_RULES.maxSignalsPerSearch})`}>
                <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-line px-2 py-1.5">
                  {cfg.codes.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-md bg-ledger-soft px-2 py-0.5 text-xs text-ledger">
                      {SIGNAL_SHORT[c]}
                      <button type="button" onClick={() => update({ codes: cfg.codes.filter((x) => x !== c) })} aria-label={`Togli ${SIGNAL_SHORT[c]}`} className="opacity-70 hover:opacity-100">×</button>
                    </span>
                  ))}
                  {cfg.codes.length < SIGNAL_RULES.maxSignalsPerSearch && (
                    <select
                      className="h-7 min-w-0 flex-1 bg-transparent text-xs text-muted outline-none"
                      value=""
                      onChange={(e) => e.target.value && update({ codes: [...cfg.codes, e.target.value] })}
                      aria-label="Aggiungi un segnale"
                    >
                      <option value="">+ Aggiungi</option>
                      {available.map((s) => <option key={s.code} value={s.code}>{s.label}{s.level === "indicative" ? " (indicativo)" : ""}</option>)}
                    </select>
                  )}
                </div>
              </Row>
              <Row label="Condizione">
                <div className="flex gap-5 text-sm">
                  {([["any", "Basta uno"], ["all", "Servono tutti"]] as const).map(([v, l]) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2">
                      <input type="radio" name="demo-match" checked={cfg.match === v} onChange={() => update({ match: v })} className="accent-[var(--color-ledger)]" />
                      {l}
                    </label>
                  ))}
                </div>
              </Row>
              <hr className="my-1 border-line" />
            </>
          )}
          <Row label="Paese">
            <select className={selectCls} value={cfg.country} onChange={(e) => update({ country: e.target.value, region: COUNTRIES.find((c) => c.id === e.target.value)?.regions[0] ?? "" })}>
              {COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Row>
          <Row label="Regione">
            <select className={selectCls} value={cfg.region} onChange={(e) => update({ region: e.target.value })}>
              {country.regions.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Row>
          <Row label="Settore">
            <select className={selectCls} value={cfg.sector} onChange={(e) => update({ sector: e.target.value })}>
              {SECTORS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Row>
          <Row label="Dimensione aziendale">
            <select className={selectCls} value={cfg.size} onChange={(e) => update({ size: e.target.value })}>
              {SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Row>
          <Row label="Ruolo del contatto">
            <select className={selectCls} value={cfg.role} onChange={(e) => update({ role: e.target.value })}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Row>
          <Row label="Modalità email">
            <select className={selectCls} value={cfg.mode} onChange={(e) => update({ mode: e.target.value })}>
              {MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Row>
          <Row label="Numero di lead">
            <select className={cx(selectCls, "sm:w-28")} value={cfg.qty} onChange={(e) => update({ qty: Number(e.target.value) })}>
              {QUANTITIES.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </Row>
        </fieldset>

        <div className="mt-auto grid gap-4 border-t border-line p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-end">
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={running || !valid}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ledger px-5 text-sm font-semibold text-white transition-colors hover:bg-ledger-2 disabled:opacity-60"
            >
              {running ? "Ricerca demo in corso…" : done ? "Ripeti la ricerca demo" : "Avvia ricerca demo"} <span aria-hidden>→</span>
            </button>
            <p className="text-xs text-muted">Simulazione con dati dimostrativi: nessuna ricerca reale, nessun servizio esterno.</p>
          </div>
          <div className="rounded-xl border border-line bg-paper/60 p-4">
            <p className="text-sm font-semibold">La tua ricerca</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">{preview}</p>
            <p className={cx("mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium", opportunity ? "bg-stamp-soft text-stamp-ink" : "bg-ledger-soft text-ledger")}>
              {opportunity ? `◆ ${extraCreditsLabel(signalPrices)} per lead con opportunità` : "Paghi solo i lead consegnati"}
            </p>
          </div>
        </div>
      </form>

      {/* Avanzamento e risultati */}
      <div ref={panel} className="min-w-0 scroll-mt-20 bg-paper/40 p-5" aria-live="polite">
        {tick === null && (
          <div className="grid h-full min-h-[380px] place-items-center p-4 text-center">
            <div className="max-w-sm">
              <svg viewBox="0 0 120 110" className="mx-auto h-24 w-24" aria-hidden>
                <rect x="22" y="8" width="62" height="80" rx="6" fill="var(--color-card)" stroke="var(--color-line)" strokeWidth="2" />
                <rect x="22" y="8" width="62" height="10" rx="5" fill="var(--color-paper-2)" />
                {[30, 40, 50, 60].map((y, i) => <rect key={y} x="32" y={y} width={i % 2 ? 30 : 40} height="4" rx="2" fill="var(--color-line)" />)}
                <circle cx="78" cy="70" r="15" fill="var(--color-card)" stroke="var(--color-ledger)" strokeWidth="5" />
                <path d="M89 81l13 13" stroke="var(--color-ledger)" strokeWidth="7" strokeLinecap="round" />
              </svg>
              <p className="mt-4 font-display text-2xl font-semibold">Scopri i tuoi prossimi clienti</p>
              <p className="mt-2 text-sm text-ink-2">
                Avvia la ricerca per vedere un&apos;anteprima dei risultati{opportunity ? " con le prove di opportunità" : ""}.
              </p>
              <ul className="mx-auto mt-6 flex max-w-xs flex-col gap-3 text-left text-sm text-ink-2">
                <li className="flex items-center gap-3">{TICK}Aziende reali, non un database vecchio</li>
                <li className="flex items-center gap-3">{TICK}Email trovate sul sito o verificate</li>
                <li className="flex items-center gap-3">{TICK}Con la prova del segnale (se richiesto)</li>
                <li className="flex items-center gap-3">{TICK}Pronto per l&apos;esportazione in Excel</li>
              </ul>
            </div>
          </div>
        )}

        {running && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold">{phases[Math.min(current, phases.length - 1)].label}…</p>
                <p className="font-mono text-muted">{pct}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
                <div className="h-full rounded-full bg-ledger transition-[width] duration-100 ease-linear" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {counters.map(([l, v]) => (
                <div key={l} className="rounded-xl border border-line bg-card p-3">
                  <p className="text-[11px] text-muted sm:text-xs">{l}</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
            <ol className="flex flex-col gap-2.5">
              {phases.map((p, i) => {
                const state = i < current ? "done" : i === current ? "active" : "todo";
                return (
                  <li key={p.label} className="flex items-start gap-3 text-sm">
                    <span
                      className={cx(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]",
                        state === "done" && "border-ledger bg-ledger text-white",
                        state === "active" && "border-ledger text-ledger",
                        state === "todo" && "border-line text-muted",
                      )}
                    >
                      {state === "done" ? "✓" : state === "active" ? <span className="h-2 w-2 animate-pulse rounded-full bg-ledger" /> : i + 1}
                    </span>
                    <span>
                      <span className={cx("font-medium", state === "todo" && "text-muted")}>{p.label}</span>
                      <span className="block text-xs text-muted">{p.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-white/80 sm:text-xs">
              {visibleLog.map((l) => (
                <p key={l.at} className="animate-row-in truncate">
                  <span className="text-ledger-bright">›</span> {l.text}
                </p>
              ))}
              <p className="animate-pulse text-white/50">_</p>
            </div>
          </div>
        )}

        {done && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Risultato della simulazione</p>
                <p className="font-display text-2xl font-semibold">
                  {results.found} lead trovati
                  {results.found < cfg.qty && <span className="text-base font-normal text-muted"> su {cfg.qty} richiesti</span>}
                </p>
                <p className="text-sm text-ink-2">
                  {results.personal} nominative · {results.found - results.personal} generiche
                  {opportunity ? ` · ${results.discarded} aziende scartate senza prova` : ` · ${results.companies} aziende analizzate`}
                </p>
              </div>
              <span className="rounded-full border border-stamp/40 bg-stamp-soft px-2.5 py-1 text-xs font-medium text-stamp-ink">Dati dimostrativi</span>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-line bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="bg-paper/70 text-muted">
                    <tr>
                      {["Contatto", "Azienda", opportunity ? "Opportunità" : "Stato"].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody aria-hidden className="select-none">
                    {results.rows.slice(0, 7).map((r, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-3 py-2.5">
                          <span className="block font-medium blur-[5px]">{r.name}</span>
                          <span className="block font-mono text-muted blur-[4px]">{r.email}</span>
                        </td>
                        <td className="px-3 py-2.5 blur-[5px]">{r.company}</td>
                        <td className="px-3 py-2.5">
                          {opportunity ? (
                            <span className="flex flex-wrap gap-1">
                              {r.signals.map((c) => (
                                <span key={c} className="whitespace-nowrap rounded-full border border-brick/25 bg-brick-soft px-2 py-0.5 text-[10px] font-medium text-brick">{SIGNAL_SHORT[c]}</span>
                              ))}
                            </span>
                          ) : (
                            <ProvenanceStamp status={r.status} type={r.type} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-card/10 via-card/60 to-card p-5">
                <div className="w-full max-w-md rounded-xl border border-line bg-card p-5 text-center shadow-lg">
                  <p className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ledger-soft text-ledger" aria-hidden>
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <path d="M5.5 9V6.5a4.5 4.5 0 0 1 9 0V9M4 9h12v8.5H4zM10 12.5v2" />
                    </svg>
                  </p>
                  <p className="mt-3 font-display text-lg font-semibold">Questi sono dati dimostrativi</p>
                  <p className="mt-1 text-sm text-ink-2">
                    Con un account avvii una ricerca vera sul tuo target e ricevi lead reali, ognuno con la sua fonte{opportunity ? " e la prova del segnale" : ""}.
                  </p>
                  <Link
                    href="/registrati"
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ledger px-5 text-sm font-semibold text-white hover:bg-ledger-2"
                  >
                    Sblocca i tuoi lead — Prova gratis con 15 crediti
                  </Link>
                  <p className="mt-2 text-xs text-muted">Nessuna carta richiesta. I dati della demo non vengono sbloccati: dopo la registrazione parte una ricerca reale.</p>
                </div>
              </div>
            </div>
            {results.found > 7 && <p className="text-center text-xs text-muted">… e altri {results.found - 7} lead nella simulazione</p>}
          </div>
        )}
      </div>
    </div>
  );
}
