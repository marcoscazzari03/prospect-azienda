import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "../auth-forms";
import { captchaSiteKey } from "@/lib/server/captcha";

export const metadata: Metadata = { title: "Crea l'account" };
export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: PageProps<"/registrati">) {
  const { piano } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Inizia con 15 crediti gratuiti</h1>
      <p className="mb-8 mt-2 text-ink-2">Nessuna carta richiesta. Hai già un account? <Link href="/accedi" className="text-ledger underline">Accedi</Link>.</p>
      <SignUpForm plan={typeof piano === "string" ? piano : undefined} captchaKey={captchaSiteKey()} />
    </>
  );
}
