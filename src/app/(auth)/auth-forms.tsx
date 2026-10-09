"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { requestReset, signIn, signUp, updatePassword, type AuthState } from "./actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="brick">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? "/app"} />
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" required autoComplete="current-password" /></Field>
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Accesso…" : "Accedi"}</Button>
      <Link href="/recupera-password" className="text-sm text-ledger underline-offset-4 hover:underline">Password dimenticata?</Link>
    </form>
  );
}

export function SignUpForm({ plan }: { plan?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  if (state.info) return <Alert tone="ledger">{state.info}</Alert>;
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="brick">{state.error}</Alert>}
      <input type="hidden" name="plan" value={plan ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome e cognome" htmlFor="fullName"><Input id="fullName" name="fullName" required autoComplete="name" /></Field>
        <Field label="Azienda" htmlFor="company"><Input id="company" name="company" required autoComplete="organization" /></Field>
      </div>
      <Field label="Email di lavoro" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Password" htmlFor="password" hint="Almeno 10 caratteri."><Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
      <label className="flex items-start gap-2 text-sm text-ink-2">
        <input type="checkbox" name="terms" required className="mt-1 accent-[var(--color-ledger)]" />
        <span>Accetto i <Link href="/termini" className="text-ledger underline" target="_blank">termini di servizio</Link> e ho letto l&apos;<Link href="/privacy" className="text-ledger underline" target="_blank">informativa privacy</Link>.</span>
      </label>
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Creazione…" : "Crea l'account gratuito"}</Button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestReset, {});
  if (state.info) return <Alert tone="ledger">{state.info}</Alert>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
      <Button type="submit" size="lg" disabled={pending}>Invia il link</Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="brick">{state.error}</Alert>}
      <Field label="Nuova password" htmlFor="password" hint="Almeno 10 caratteri."><Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
      <Button type="submit" size="lg" disabled={pending}>Salva la password</Button>
    </form>
  );
}
