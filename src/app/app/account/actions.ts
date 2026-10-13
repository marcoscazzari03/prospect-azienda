"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; info?: string };

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Scrivi nome e cognome").max(120),
  company: z.string().trim().max(120).optional(),
});

// Nome della persona; nome dell'azienda solo per il titolare dell'account.
export async function updateProfile(_: AccountState, form: FormData): Promise<AccountState> {
  const viewer = await requireViewer();
  const parsed = profileSchema.safeParse({ fullName: form.get("fullName"), company: form.get("company") ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const db = createAdminClient();
  const { error } = await db.from("profiles").update({ full_name: parsed.data.fullName }).eq("user_id", viewer.user.id);
  if (error) return { error: "Non è stato possibile salvare. Riprova." };
  if (parsed.data.company && viewer.role === "owner") {
    await db.from("organizations").update({ name: parsed.data.company }).eq("id", viewer.org.id);
  }
  revalidatePath("/app", "layout");
  return { info: "Dati salvati." };
}

// Cambio password con verifica di quella attuale; le altre sessioni vengono chiuse.
export async function changePassword(_: AccountState, form: FormData): Promise<AccountState> {
  const viewer = await requireViewer();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 10 || next.length > 200) return { error: "La nuova password deve avere almeno 10 caratteri." };
  if (next !== confirm) return { error: "Le due password non coincidono." };
  if (next === current) return { error: "La nuova password deve essere diversa da quella attuale." };
  const supabase = await createClient();
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: viewer.email, password: current });
  if (wrong) return { error: "La password attuale non è corretta." };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: "Non è stato possibile cambiare la password. Riprova." };
  await supabase.auth.signOut({ scope: "others" });
  return { info: "Password cambiata. Gli altri dispositivi sono stati disconnessi." };
}

// Esce da tutti i dispositivi, compreso questo.
export async function signOutEverywhere() {
  await requireViewer();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/accedi");
}
