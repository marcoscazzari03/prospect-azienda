// CSV compatibile con Excel italiano (separatore ";" e BOM UTF-8).
export function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[], sep = ";") {
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    // Evita l'esecuzione di formule quando il file viene aperto in Excel.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /["\n\r;,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(sep);
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(sep));
  return "﻿" + [head, ...body].join("\r\n") + "\r\n";
}
