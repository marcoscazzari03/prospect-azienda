import type { Metadata } from "next";
import Link from "next/link";
import { safeNextPath } from "@/lib/domain/safe-next";
import { SignInForm } from "../auth-forms";
import { captchaSiteKey } from "@/lib/server/captcha";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Accedi" };
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: PageProps<"/accedi">) {
  const { next, errore } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Bentornato</h1>
      <p className="mb-8 mt-2 text-ink-2">Accedi al tuo spazio. Non hai un account? <Link href="/registrati" className="text-ledger underline">Registrati gratis</Link>.</p>
      {/* Link di conferma o di reset scaduto o già usato (/auth/conferma rimanda qui con ?errore=link; QA, 24/10). */}
      {errore === "link" && (
        <div className="mb-6"><Alert tone="stamp">Il link è scaduto o è già stato usato. Accedi, oppure <Link href="/recupera-password" className="underline">richiedi un nuovo link</Link> per la password.</Alert></div>
      )}
      <SignInForm next={safeNextPath(next)} captchaKey={captchaSiteKey()} />
    </>
  );
}
