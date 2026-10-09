// URL del progetto Supabase ripulito da percorsi incollati per errore
// (es. ".../rest/v1/" copiato dalla dashboard) e da spazi o "/" finali.
export function supabaseUrl(raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") {
  const trimmed = raw.trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export const supabaseAnonKey = () => (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
