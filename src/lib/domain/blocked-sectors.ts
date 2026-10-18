// Settori per cui non cerchiamo contatti: rischio legale o di reputazione per il cliente e per
// noi (un'email a queste attività parte a nome del cliente, ma con i nostri dati). Controllati
// su settore, parole chiave e note della ricerca, nel wizard e sul server.
const BLOCKED: { label: string; pattern: RegExp }[] = [
  {
    label: "attività per adulti",
    pattern: /\b(escort\w*|accompagnatric[ei]|prostitu\w*|squillo|sex ?work\w*|porno\w*|hard ?core|erotic[aoi]|massaggi erotici|sexy ?shop|cam ?girl\w*|onlyfans|lap ?dance)\b/i,
  },
  {
    label: "gioco d'azzardo e scommesse",
    pattern: /\b(azzardo|scommess[ae]|bookmaker\w*|betting|casin[oò] online|casinò|slot ?machine\w*|poker online)\b/i,
  },
  { label: "armi e munizioni", pattern: /\b(armi|armeri[ae]|munizion[ei]|armi da fuoco)\b/i },
  { label: "droghe e cannabis", pattern: /\b(drog[ah]e?|stupefacent[ei]|cannabis|marijuana|cbd|grow ?shop)\b/i },
];

export const BLOCKED_SECTORS_MESSAGE =
  "Non cerchiamo aziende di attività per adulti, gioco d'azzardo, armi o droghe: cambia il settore o le parole chiave.";

// Il primo settore bloccato trovato nei testi della ricerca, o null.
export function blockedSector(texts: (string | undefined | null)[]): string | null {
  const all = texts.filter(Boolean).join(" \n ");
  return BLOCKED.find((b) => b.pattern.test(all))?.label ?? null;
}
