import type { Metadata } from "next";
import Link from "next/link";
import { safeNextPath } from "@/lib/domain/safe-next";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Accedi" };

export default async function SignInPage({ searchParams }: PageProps<"/accedi">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Bentornato</h1>
      <p className="mb-8 mt-2 text-ink-2">Accedi al tuo spazio. Non hai un account? <Link href="/registrati" className="text-ledger underline">Registrati gratis</Link>.</p>
      <SignInForm next={safeNextPath(next)} />
    </>
  );
}
