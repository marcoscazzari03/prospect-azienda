import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Nuova password" };

export default async function NewPasswordPage() {
  // Con la verifica in due passaggi attiva, prima il codice: senza, Supabase rifiuta il cambio di password (24/10).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect("/accedi/verifica?next=/nuova-password");
  }
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Scegli una nuova password</h1>
      <div className="mt-8"><NewPasswordForm /></div>
    </>
  );
}
