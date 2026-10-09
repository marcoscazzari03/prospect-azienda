// Coerenza tra il ruolo di un contatto e i ruoli chiesti nella ricerca.
// Stesse regole del motore (n8n/engine/nodes/04-deduplica-candidati.js):
// se cambi qui, cambia anche lì.

export type RoleMatch = "exact" | "plausible" | "mismatch" | "unknown";

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const VERTICE = ["ceo", "founder", "co founder", "cofounder", "owner", "titolare", "fondatore", "presidente",
  "president", "managing director", "amministratore", "general manager", "direttore generale", "partner",
  "managing partner", "socio", "geschaftsfuhrer", "gerente", "director general", "directeur general", "proprietario",
  "principal", "head", "chief"];

const SINONIMI: Record<string, string[]> = {
  ceo: ["ceo", "chief executive", "amministratore delegato", "ad"],
  titolare: ["titolare", "owner", "proprietario", "imprenditore"],
  fondatore: ["fondatore", "founder", "co founder", "cofounder", "co fondatore", "cofondatore"],
  founder: ["founder", "co founder", "cofounder", "fondatore", "co fondatore"],
  "managing director": ["managing director", "direttore generale", "general manager", "amministratore unico"],
  partner: ["partner", "socio", "managing partner", "senior partner"],
  cto: ["cto", "chief technology", "responsabile it", "it manager", "head of it"],
  cfo: ["cfo", "chief financial", "direttore finanziario", "responsabile amministrativo"],
  cmo: ["cmo", "chief marketing", "direttore marketing", "marketing director", "head of marketing", "responsabile marketing"],
};

const GENERICHE_RUOLO = new Set(["responsabile", "direttore", "director", "manager", "head", "chief", "senior", "junior", "ufficio"]);
const parola = (testo: string, termine: string) => ` ${testo} `.includes(` ${termine} `);

export function roleMatcher(roles: string[]) {
  const scelti = roles
    .flatMap((r) => String(r).split(/\s*(?:\/|,|\||&|\so\s|\sor\s)\s*/i))
    .map(norm)
    .filter(Boolean);
  const richiesti = [...new Set(scelti.flatMap((a) => [a, ...(SINONIMI[a] ?? [])]))];
  const tok = scelti.flatMap((r) => r.split(" ")).filter((w) => w.length >= 4 && !GENERICHE_RUOLO.has(w));
  return (titolo: string): RoleMatch => {
    const t = norm(titolo);
    if (!t) return "unknown";
    if (richiesti.some((r) => parola(t, r))) return "exact";
    if (tok.some((w) => parola(t, w))) return "plausible";
    if (!richiesti.length && VERTICE.some((v) => parola(t, v))) return "exact";
    if (VERTICE.some((v) => parola(t, v))) return "plausible";
    return "mismatch";
  };
}
