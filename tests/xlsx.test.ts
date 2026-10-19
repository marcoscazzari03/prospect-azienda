import { describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";

vi.mock("server-only", () => ({}));

describe("export Excel", () => {
  it("intestazione, link e niente formule dai dati", async () => {
    const { toXlsx } = await import("@/lib/server/xlsx");
    const buf = await toXlsx(
      [{ azienda: "=HYPERLINK(\"x\")", sito: "https://acme.it", email: "a@acme.it", qualita: 90 }],
      [
        { key: "azienda", label: "Azienda" },
        { key: "sito", label: "Sito" },
        { key: "email", label: "Email" },
        { key: "qualita", label: "Qualità" },
      ],
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Lead")!;
    expect(ws.getRow(1).getCell(1).value).toBe("Azienda");
    expect(ws.getRow(2).getCell(1).value).toBe("'=HYPERLINK(\"x\")");
    expect((ws.getRow(2).getCell(2).value as { hyperlink: string }).hyperlink).toBe("https://acme.it");
    expect((ws.getRow(2).getCell(3).value as { hyperlink: string }).hyperlink).toBe("mailto:a@acme.it");
    expect(ws.getRow(2).getCell(4).value).toBe(90);
    expect(wb.getWorksheet("Come usarli")).toBeUndefined();
  });

  it("avvertenze sull'uso dei contatti in un foglio a parte", async () => {
    const { toXlsx } = await import("@/lib/server/xlsx");
    const { CONTACT_NOTICE } = await import("@/lib/domain/leads");
    const buf = await toXlsx([{ azienda: "A" }], [{ key: "azienda", label: "Azienda" }], "Lead", CONTACT_NOTICE);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    expect(wb.getWorksheet("Lead")!.getRow(2).getCell(1).value).toBe("A");
    expect(String(wb.getWorksheet("Come usarli")!.getRow(1).getCell(1).value)).toContain("non è un consenso");
  });
});
