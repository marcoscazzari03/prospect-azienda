import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/domain/safe-next";
import { BRAND } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { cancelMfaLogin } from "../../actions";
import { MfaLoginForm } from "../../auth-forms";

export const metadata: Metadata = { title: "Verifica in due passaggi" };

export default async function MfaLoginPage({ searchParams }: PageProps<"/accedi/verifica">) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/accedi");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2" || aal?.nextLevel !== "aal2") redirect(safeNextPath(next));
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Verifica in due passaggi</h1>
      <p className="mb-8 mt-2 text-ink-2">Apri l&apos;app di autenticazione sul telefono e scrivi il codice di {BRAND.name}.</p>
      <MfaLoginForm next={safeNextPath(next)} />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <form action={cancelMfaLogin}>
          <button type="submit" className="text-ledger underline-offset-4 hover:underline">Esci e usa un altro account</button>
        </form>
        <a href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent("Ho perso l'accesso all'app di autenticazione")}`} className="text-ink-2 underline-offset-4 hover:underline">
          Hai perso il telefono?
        </a>
      </div>
    </>
  );
}
