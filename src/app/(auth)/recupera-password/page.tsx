import type { Metadata } from "next";
import { ResetForm } from "../auth-forms";

export const metadata: Metadata = { title: "Recupera la password" };

export default function ResetPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Recupera la password</h1>
      <p className="mb-8 mt-2 text-ink-2">Ti inviamo un link per sceglierne una nuova.</p>
      <ResetForm />
    </>
  );
}
