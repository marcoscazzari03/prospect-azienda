import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Ogni pagina e ogni azione dell'area admin deve verificare da sola che
// l'utente sia amministratore: il layout non basta (vedi audit V1).
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });

describe("area admin", () => {
  const admin = files("src/app/admin");

  it("ogni pagina chiama requireAdmin", () => {
    const pages = admin.filter((f) => f.endsWith("page.tsx"));
    expect(pages.length).toBeGreaterThan(0);
    for (const f of pages) expect(readFileSync(f, "utf8"), f).toMatch(/await requireAdmin\(\)/);
  });

  it("ogni azione chiama requireAdmin", () => {
    const src = readFileSync("src/app/admin/actions.ts", "utf8");
    const actions = src.split(/export async function /).slice(1);
    expect(actions.length).toBeGreaterThan(0);
    for (const a of actions) expect(a, a.slice(0, 40)).toMatch(/requireAdmin\(\)/);
  });

  it("nessuna route API sotto /admin", () => {
    expect(admin.filter((f) => f.endsWith("route.ts"))).toEqual([]);
  });
});
