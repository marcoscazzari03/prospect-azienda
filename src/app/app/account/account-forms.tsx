"use client";
import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { changePassword, updateProfile, type AccountState } from "./actions";

export function ProfileForm({ fullName, company, email, canEditCompany }: { fullName: string; company: string; email: string; canEditCompany: boolean }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateProfile, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome e cognome" htmlFor="fullName">
          <Input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" required />
        </Field>
        <Field label="Email di accesso" htmlFor="email" hint="Per cambiarla scrivi all'assistenza.">
          <Input id="email" value={email} readOnly disabled />
        </Field>
      </div>
      <Field label="Azienda" htmlFor="company" hint={canEditCompany ? "Compare nella barra laterale e nelle comunicazioni." : "La modifica il titolare dell'account."}>
        <Input id="company" name="company" defaultValue={company} disabled={!canEditCompany} autoComplete="organization" />
      </Field>
      {state.error && <Alert tone="brick">{state.error}</Alert>}
      {state.info && <Alert tone="ledger">{state.info}</Alert>}
      <div><Button type="submit" variant="secondary" disabled={pending}>{pending ? "Salvataggio…" : "Salva"}</Button></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePassword, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Password attuale" htmlFor="current">
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nuova password" htmlFor="password" hint="Almeno 10 caratteri.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Ripeti la nuova password" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
      </div>
      {state.error && <Alert tone="brick">{state.error}</Alert>}
      {state.info && <Alert tone="ledger">{state.info}</Alert>}
      <div><Button type="submit" variant="secondary" disabled={pending}>{pending ? "Aggiornamento…" : "Cambia password"}</Button></div>
    </form>
  );
}
