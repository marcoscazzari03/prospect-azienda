"use client";
import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { Captcha } from "@/components/captcha";
import { requestOptout, type OptoutState } from "./actions";

export function OptoutForm() {
  const [state, action, pending] = useActionState<OptoutState, FormData>(requestOptout, {});
  if (state.ok) return <Alert tone="ledger">Richiesta registrata. Se l&apos;indirizzo è valido riceverai un&apos;email: apri il link per confermare. Il link vale finché non lo usi.</Alert>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="La tua email professionale" htmlFor="email" error={state.error}>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <label className="flex items-start gap-2 text-sm text-ink-2">
        <input type="checkbox" name="domain" className="mt-1 accent-[var(--color-ledger)]" />
        Escludi anche tutte le altre email della mia azienda (stesso dominio)
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Captcha />
      <Button type="submit" disabled={pending} className="self-start">{pending ? "Invio…" : "Rimuovi i miei dati"}</Button>
    </form>
  );
}
