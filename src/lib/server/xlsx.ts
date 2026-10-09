import "server-only";
import ExcelJS from "exceljs";

// File Excel pronto all'uso: intestazione bloccata, filtri, larghezze adatte,
// link cliccabili per siti ed email.
export async function toXlsx<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T & string; label: string }[],
  sheetName = "Lead",
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Webora Leads";
  const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: Math.min(48, Math.max(c.label.length + 2, ...rows.slice(0, 200).map((r) => String(r[c.key] ?? "").length + 2))),
  }));
  for (const r of rows) {
    const row = ws.addRow(r);
    row.eachCell((cell) => {
      if (typeof cell.value !== "string") return;
      const v = cell.value;
      // Niente formule dai dati: protegge da "CSV/formula injection".
      if (/^[=+\-@]/.test(v)) cell.value = `'${v}`;
      else if (/^https?:\/\//i.test(v)) cell.value = { text: v, hyperlink: v };
      else if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v)) cell.value = { text: v, hyperlink: `mailto:${v}` };
    });
  }
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F5C4D" } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
