import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "../auth-forms";
import { captchaSiteKey } from "@/lib/server/captcha";
import { BETA } from "@/lib/config";

export const metadata: Metadata = { title: "Crea l'account" };
export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: PageProps<"/registrati">) {
  const { piano, beta } = await searchParams;
  const invited = BETA.open && beta === "1";
  return (
    <SignUpForm
      plan={typeof piano === "string" ? piano : undefined}
      captchaKey={captchaSiteKey()}
      intro={
        <>
          <h1 className="font-display text-3xl font-semibold">{invited ? "Entra nella beta di Webora Leads" : "Inizia con 15 crediti gratuiti"}</h1>
          <p className="mb-8 mt-2 text-ink-2">
            {invited
              ? "Usa l'email a cui ti abbiamo scritto: entro qualche ora aggiungiamo i crediti della beta e togliamo il limite di 10 aziende per ricerca. Nessuna carta, nessun rinnovo automatico. "
              : "Nessuna carta richiesta. "}
            Hai già un account? <Link href="/accedi" className="text-ledger underline">Accedi</Link>.
          </p>
        </>
      }
    />
  );
}
