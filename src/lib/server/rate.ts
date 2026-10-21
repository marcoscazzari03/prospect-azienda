import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Limite di frequenza nel database (migrazione 046): true se c'è ancora posto, e registra l'evento.
// Con record = false controlla soltanto. Se il database non risponde lascia passare: un limite
// non deve bloccare il servizio.
export async function rateHit(key: string, kind: string, windowSeconds: number, max: number, record = true) {
  const { data, error } = await createAdminClient().rpc("rate_hit", {
    p_key: key, p_kind: kind, p_window: `${windowSeconds} seconds`, p_max: max, p_record: record,
  });
  if (error) {
    console.error("rate_hit", kind, error.message);
    return true;
  }
  return data !== false;
}

// Codice della verifica in due passaggi: al massimo 10 tentativi in 15 minuti per utente. Si contano i tentativi, non
// solo gli errori, e si registrano prima della verifica: inviati in parallelo non superano il tetto (ripasso del 21/10).
export const MFA_ATTEMPTS = { windowSeconds: 15 * 60, max: 10 } as const;

// Password attuale nel cambio password: 5 tentativi in 15 minuti per utente (ripasso del 21/10).
export const PASSWORD_CHECKS = { windowSeconds: 15 * 60, max: 5 } as const;

// Accesso e recupero password (punto 42). Le chiamate a Supabase partono dal nostro server, quindi
// il suo limite per IP non distingue i visitatori: i limiti veri sono questi, per account e per
// connessione. Chiavi solo come impronte (niente email in chiaro nella tabella).
export const LOGIN_FAILURES = { perAccount: 10, perIp: 30, windowSeconds: 15 * 60 } as const;
export const RESET_REQUESTS = { perAccount: 3, perIp: 10, windowSeconds: 60 * 60 } as const;
