// Statistiche della Panoramica (grafica Avvisto, 23/10): mese in corso contro gli stessi giorni del mese prima (dal 1° al
// giorno di oggi), più la serie degli ultimi 30 giorni per il grafico piccolo. Logica pura: i dati li legge dashboardData.

export type DeliveryRow = { delivered_at: string; credits: number; signal: boolean };
export type Delta = { kind: "pct"; value: number } | { kind: "pp"; value: number } | { kind: "new" } | null;

const dayKey = (d: Date, tz: string) => d.toLocaleDateString("sv-SE", { timeZone: tz }); // AAAA-MM-GG

// Variazione percentuale: null senza dati in nessuno dei due mesi, «nuovo» se il mese prima era a zero.
export function pctDelta(now: number, before: number): Delta {
  if (!before) return now ? { kind: "new" } : null;
  return { kind: "pct", value: Math.round(((now - before) / before) * 100) };
}

export function monthStats(rows: DeliveryRow[], now: Date, tz = "Europe/Rome") {
  const today = dayKey(now, tz);
  const [y, m, d] = today.split("-").map(Number);
  const month = today.slice(0, 7);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  // Stessi giorni del mese prima (fino all'ultimo giorno di quel mese, se più corto).
  const prevLast = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  const prevUntil = `${prev}-${String(Math.min(d, prevLast)).padStart(2, "0")}`;

  const cur = { leads: 0, credits: 0, signals: 0 };
  const old = { leads: 0, credits: 0, signals: 0 };
  const series = new Map<string, { leads: number; credits: number }>();
  // Giorni del calendario di Roma costruiti da anno, mese e giorno (non sottraendo 24 ore: la notte del cambio d'ora un
  // giorno comparirebbe due volte; Code Reviewer).
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(y, m - 1, d - 29 + i)).toISOString().slice(0, 10));
  const from = days[0];
  for (const r of rows) {
    const k = dayKey(new Date(r.delivered_at), tz);
    const bucket = k.startsWith(month) && k <= today ? cur : k.startsWith(prev) && k <= prevUntil ? old : null;
    if (bucket) {
      bucket.leads++;
      bucket.credits += r.credits;
      if (r.signal) bucket.signals++;
    }
    if (k >= from && k <= today) {
      const s = series.get(k) ?? { leads: 0, credits: 0 };
      s.leads++;
      s.credits += r.credits;
      series.set(k, s);
    }
  }
  const share = (b: typeof cur) => (b.leads ? (b.signals / b.leads) * 100 : null);
  const shareNow = share(cur);
  const shareBefore = share(old);
  return {
    credits: { month: cur.credits, delta: pctDelta(cur.credits, old.credits), series: days.map((k) => series.get(k)?.credits ?? 0) },
    leads: { month: cur.leads, delta: pctDelta(cur.leads, old.leads), series: days.map((k) => series.get(k)?.leads ?? 0) },
    // In punti percentuali: la quota di lead con opportunità del mese contro quella del mese prima.
    signals: { delta: (shareNow === null || shareBefore === null ? null : { kind: "pp", value: Math.round(shareNow - shareBefore) }) as Delta },
  };
}
