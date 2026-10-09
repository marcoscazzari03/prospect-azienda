import type { Metadata } from "next";
import { NewPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Nuova password" };

export default function NewPasswordPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Scegli una nuova password</h1>
      <div className="mt-8"><NewPasswordForm /></div>
    </>
  );
}
