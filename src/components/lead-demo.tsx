"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ProvenanceStamp, cx } from "./ui";

// Demo interattiva della homepage: simula una ricerca interamente nel browser.
// Nessuna chiamata al server, al database o al motore: i "risultati" sono
// generati da un seme ricavato dai filtri e il loro testo è già illeggibile
// (lettere casuali), la sfocatura è solo l'effetto visivo.

const COUNTRIES = [
  { id: "IT", label: "Italia", flag: "🇮🇹", tld: "it", cities: ["Milano", "Torino", "Bologna", "Verona", "Padova"] },
  { id: "ES", label: "Spagna", flag: "🇪🇸", tld: "es", cities: ["Madrid", "Barcellona", "Valencia", "Siviglia"] },
  { id: "FR", label: "Francia", flag: "🇫🇷", tld: "fr", cities: ["Parigi", "Lione", "Marsiglia", "Tolosa"] },
  { id: "DE", label: "Germania", flag: "🇩🇪", tld: "de", cities: ["Berlino", "Monaco", "Amburgo", "Colonia"] },
  { id: "PT", label: "Portogallo", flag: "🇵🇹", tld: "pt", cities: ["Lisbona", "Porto", "Braga"] },
] as const;

const SECTORS = [
  { id: "software", label: "Software e IT", query: "software house" },
  { id: "dentisti", label: "Studi dentistici", query: "studio dentistico" },
  { id: "legali", label: "Studi legali", query: "studio legale" },
  { id: "manifattura", label: "Manifattura", query: "azienda manifatturiera" },
  { id: "hotel", label: "Hotel e ospitalità", query: "hotel" },
  { id: "marketing", label: "Agenzie di marketing", query: "agenzia di marketing" },
  { id: "ecommerce", label: "E-commerce", query: "negozio online" },
] as const;

const SIZES = ["1-10 dipendenti", "11-50 dipendenti", "51-200 dipendenti", "201-500 dipendenti"] as const;
const ROLES = ["Titolare / CEO", "CFO", "CTO", "Marketing", "Vendite", "HR"] as const;
const QUANTITIES = [10, 25, 50] as const;

// Fasi della simulazione (durate in decimi di secondo).
const PHASES = [
  { label: "Pianificazione della ricerca", detail: "Suddividiamo il mercato in lotti per zona", ticks: 12 },
  { label: "Ricerca delle aziende", detail: "Cerchiamo sul web nella lingua del paese", ticks: 26 },
  { label: "Individuazione dei referenti", detail: "Controlliamo siti ufficiali e pagine team", ticks: 22 },
  { label: "Verifica delle email", detail: "Email dal sito e verifica delle caselle", ticks: 20 },
] as const;
const TOTAL_TICKS = PHASES.reduce((n, p) => n + p.ticks, 0);

type Config = { country: string; sector: string; size: string; roles: string[]; qty: number };

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

type Row = { name: string; company: string; role: string; city: string; email: string; status: "validated" | "found_public"; type: "personal" | "generic" };

function buildResults(cfg: Config) {
  const country = COUNTRIES.find((c) => c.id === cfg.country) ?? COUNTRIES[0];
  const rand = rng(JSON.stringify(cfg));
  // Mercato di nicchia o grande: a volte si trovano un po' meno lead di quelli chiesti.
  const found = Math.max(1, cfg.qty - (rand() < 0.35 ? Math.ceil(cfg.qty * 0.08 * rand()) : 0));
  const rows: Row[] = Array.from({ length: found }, () => {
    const personal = rand() < 0.68;
    const first = scramble(rand, 4, 7);
    const last = scramble(rand, 5, 9);
    const dom = scramble(rand, 6, 11);
    return {
      name: `${cap(first)} ${cap(last)}`,
      company: `${cap(scramble(rand, 5, 10))} ${cap(scramble(rand, 3, 6))}`,
      role: scramble(rand, 3, 10),
      city: country.cities[Math.floor(rand() * country.cities.length)],
      email: personal ? `${first}.${last}@${dom}.${country.tld}` : `${scramble(rand, 4, 5)}@${dom}.${country.tld}`,
      status: rand() < 0.55 ? "validated" : "found_public",
      type: personal ? "personal" : "generic",
    };
  });
  return { rows, found, personal: rows.filter((r) => r.type === "personal").length, companies: Math.round(found * (2.6 + rand())) };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

const selectCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-ledger disabled:opacity-60";

export function LeadDemo() {
  const [cfg, setCfg] = useState<Config>({ country: "IT", sector: "software", size: SIZES[1], roles: ["Titolare / CEO"], qty: 25 });
  const [tick, setTick] = useState<number | null>(null); // null = non avviata
  const panel = useRef<HTMLDivElement>(null);
  const running = tick !== null && tick < TOTAL_TICKS;
  const done = tick !== null && tick >= TOTAL_TICKS;

  useEffect(() => {
    if (!running) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setInterval(() => setTick((t) => (t === null ? t : Math.min(TOTAL_TICKS, t + (reduced ? 6 : 1)))), 100);
    return () => window.clearInterval(id);
  }, [running]);

  const country = COUNTRIES.find((c) => c.id === cfg.country) ?? COUNTRIES[0];
  const sector = SECTORS.find((s) => s.id === cfg.sector) ?? SECTORS[0];
  const results = useMemo(() => buildResults(cfg), [cfg]);

  // Avanzamento derivato dal tempo trascorso.
  const t = tick ?? 0;
  const start = (i: number) => PHASES.slice(0, i).reduce((n, p) => n + p.ticks, 0);
  const phaseIdx = PHASES.findIndex((_, i) => start(i + 1) > t);
  const current = phaseIdx === -1 ? PHASES.length : phaseIdx;
  const pct = Math.round((t / TOTAL_TICKS) * 100);
  const frac = (i: number) => Math.min(1, Math.max(0, (t - start(i)) / PHASES[i].ticks));
  const counters = {
    companies: Math.round(results.companies * frac(1)),
    people: Math.round(results.found * 1.3 * frac(2)),
    emails: Math.round(results.found * frac(3)),
  };

  const log = useMemo(() => {
    const rand = rng(`log${JSON.stringify(cfg)}`);
    const masked = () => `${cap(scramble(rand, 1, 1))}${"•".repeat(5 + Math.floor(rand() * 5))}.${country.tld}`;
    return [
      { at: 2, text: `Target: ${sector.label.toLowerCase()}, ${country.label}, ${cfg.size}` },
      { at: 8, text: `Piano: ${Math.max(2, Math.ceil(cfg.qty / 12))} lotti per ${country.cities.slice(0, 3).join(", ")}` },
      { at: 14, text: `Ricerca web: «${sector.query} ${country.cities[0]}»` },
      { at: 20, text: `Sito ufficiale verificato: ${masked()}` },
      { at: 27, text: `Ricerca web: «${sector.query} ${country.cities[1]}»` },
      { at: 33, text: `Scartato: sito non ufficiale (directory)` },
      { at: 40, text: `Referente trovato: ${cfg.roles[0] ?? "Titolare / CEO"} su ${masked()}` },
      { at: 47, text: `Pagina team analizzata: ${masked()}/team` },
      { at: 54, text: `Referente trovato: ${cfg.roles[cfg.roles.length - 1] ?? "Titolare / CEO"} su ${masked()}` },
      { at: 61, text: `Email trovata sul sito: ••••@${masked()}` },
      { at: 67, text: `Casella verificata: esiste` },
      { at: 73, text: `Scartata: email ipotizzata (non la vendiamo)` },
      { at: 77, text: `Duplicati rimossi, risultati pronti` },
    ];
  }, [cfg, country, sector]);
  const visibleLog = log.filter((l) => l.at <= t).slice(-5);

  const update = (patch: Partial<Config>) => {
    setCfg((c) => ({ ...c, ...patch }));
    setTick(null);
  };
  const toggleRole = (r: string) =>
    update({ roles: cfg.roles.includes(r) ? (cfg.roles.length > 1 ? cfg.roles.filter((x) => x !== r) : cfg.roles) : [...cfg.roles, r] });

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_70px_-40px_rgba(17,24,39,0.40)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/70 px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-ledger-bright" />
          Simulatore di ricerca
        </p>
        <span className="rounded-full border border-stamp/40 bg-stamp-soft px-2.5 py-1 text-xs font-medium text-stamp-ink">
          Simulazione · dati dimostrativi, nessuna ricerca reale
        </span>
      </div>

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Configurazione */}
        <form
          className="flex flex-col gap-4 border-b border-line p-5 lg:border-b-0 lg:border-r"
          onSubmit={(e) => {
            e.preventDefault();
            setTick(0);
            // Su mobile l'avanzamento è sotto il form: lo portiamo in vista.
            const box = panel.current?.getBoundingClientRect();
            if (box && box.top > window.innerHeight * 0.6) panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          <Field label="Paese">
            <select className={selectCls} value={cfg.country} disabled={running} onChange={(e) => update({ country: e.target.value })}>
              {COUNTRIES.map((c) => (
                <option key={c.id} value={c.id}>{c.flag} {c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Settore">
            <select className={selectCls} value={cfg.sector} disabled={running} onChange={(e) => update({ sector: e.target.value })}>
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Dimensione aziendale">
            <select className={selectCls} value={cfg.size} disabled={running} onChange={(e) => update({ size: e.target.value })}>
              {SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <fieldset className="flex flex-col gap-1.5 text-sm" disabled={running}>
            <legend className="mb-1.5 font-medium">Ruoli da contattare</legend>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => {
                const on = cfg.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleRole(r)}
                    className={cx("rounded-full border px-3 py-1 text-xs transition-colors", on ? "border-ledger bg-ledger-soft font-medium text-ledger" : "border-line text-ink-2 hover:border-ink-2")}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1.5 text-sm" disabled={running}>
            <legend className="mb-1.5 font-medium">Numero di lead</legend>
            <div className="grid grid-cols-3 rounded-lg border border-line p-1">
              {QUANTITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  aria-pressed={cfg.qty === q}
                  onClick={() => update({ qty: q })}
                  className={cx("rounded-md py-1.5 font-mono text-sm transition-colors", cfg.qty === q ? "bg-ledger text-white" : "text-ink-2 hover:bg-paper")}
                >
                  {q}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={running}
            className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ledger px-5 text-sm font-semibold text-white transition-colors hover:bg-ledger-2 disabled:opacity-60"
          >
            {running ? "Ricerca demo in corso…" : done ? "Ripeti la ricerca demo" : "Avvia ricerca demo"}
          </button>
          <p className="text-xs text-muted">Nessuna registrazione. La demo gira nel tuo browser e non contatta aziende né servizi esterni.</p>
        </form>

        {/* Avanzamento e risultati */}
        <div ref={panel} className="min-w-0 scroll-mt-20 p-5" aria-live="polite">
          {tick === null && (
            <div className="grid h-full min-h-[340px] place-items-center rounded-xl border border-dashed border-line bg-paper/50 p-6 text-center">
              <div className="max-w-sm">
                <p className="font-display text-xl font-semibold">Prova a cercare i tuoi clienti ideali</p>
                <p className="mt-2 text-sm text-ink-2">
                  Scegli paese, settore, dimensione e ruoli, poi avvia la ricerca demo: vedrai come lavora il motore passo dopo passo.
                </p>
                <p className="mt-4 text-xs text-muted">
                  {country.flag} {country.label} · {sector.label} · {cfg.size} · {cfg.roles.join(", ")} · {cfg.qty} lead
                </p>
              </div>
            </div>
          )}

          {running && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold">{PHASES[Math.min(current, PHASES.length - 1)].label}…</p>
                  <p className="font-mono text-muted">{pct}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
                  <div className="h-full rounded-full bg-ledger transition-[width] duration-100 ease-linear" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([["Aziende analizzate", counters.companies], ["Referenti trovati", counters.people], ["Email pronte", counters.emails]] as const).map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-line p-3">
                    <p className="text-[11px] text-muted sm:text-xs">{l}</p>
                    <p className="font-mono text-2xl font-semibold tabular-nums">{v}</p>
                  </div>
                ))}
              </div>
              <ol className="flex flex-col gap-2.5">
                {PHASES.map((p, i) => {
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
                    {results.personal} nominative · {results.found - results.personal} generiche · {results.companies} aziende analizzate
                  </p>
                </div>
                <span className="rounded-full border border-stamp/40 bg-stamp-soft px-2.5 py-1 text-xs font-medium text-stamp-ink">Dati dimostrativi</span>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-line">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-paper/70 text-muted">
                      <tr>
                        {["Contatto", "Azienda", "Città", "Email", "Stato"].map((h) => (
                          <th key={h} className="px-3 py-2 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody aria-hidden className="select-none">
                      {results.rows.slice(0, 7).map((r, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="px-3 py-2.5">
                            <span className="block font-medium blur-[5px]">{r.name}</span>
                            <span className="block text-muted blur-[4px]">{r.role}</span>
                          </td>
                          <td className="px-3 py-2.5 blur-[5px]">{r.company}</td>
                          <td className="px-3 py-2.5 blur-[5px]">{r.city}</td>
                          <td className="px-3 py-2.5 font-mono blur-[5px]">{r.email}</td>
                          <td className="px-3 py-2.5"><ProvenanceStamp status={r.status} type={r.type} /></td>
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
                      Con un account avvii una ricerca vera sul tuo target e ricevi lead reali, ognuno con la sua fonte.
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
    </div>
  );
}
