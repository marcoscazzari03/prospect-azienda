"use client";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { Captcha } from "@/components/captcha";
import { requestReset, signIn, signUp, updatePassword, verifyMfaLogin, type AuthState } from "./actions";

export function SignInForm({ next, captchaKey = "" }: { next?: string; captchaKey?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="brick">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? "/app"} />
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" required autoComplete="current-password" /></Field>
      <Captcha siteKey={captchaKey} resetSignal={state} />
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Accesso…" : "Accedi"}</Button>
      <Link href="/recupera-password" className="text-sm text-ledger underline-offset-4 hover:underline">Password dimenticata?</Link>
    </form>
  );
}

// Dopo l'invio dell'email il modulo e il suo titolo lasciano il posto a «Controlla la tua email»:
// con il solo riquadro verde sotto il titolo della pagina sembrava che non fosse successo nulla.
function EmailSent({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="status">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-ledger-soft text-ledger" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <div className="mt-3 space-y-3 text-ink-2">{children}</div>
    </div>
  );
}

export function SignUpForm({ plan, captchaKey = "", intro }: { plan?: string; captchaKey?: string; intro?: ReactNode }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  if (state.info) {
    return (
      <EmailSent title="Controlla la tua email">
        <p>{state.info}</p>
        <p className="text-sm">L&apos;email arriva da leads@weborastudio.it. Se non la vedi entro qualche minuto, guarda nella posta indesiderata o nelle promozioni.</p>
        <p className="text-sm">Hai già confermato? <Link href="/accedi" className="text-ledger underline">Accedi</Link>.</p>
      </EmailSent>
    );
  }
  return (
    <>
    {intro}
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="brick">{state.error}</Alert>}
      <input type="hidden" name="plan" value={plan ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome e cognome" htmlFor="fullName"><Input id="fullName" name="fullName" required autoComplete="name" /></Field>
        <Field label="Azienda o attività" htmlFor="company" hint="Se lavori da solo, il tuo nome o quello della tua attività."><Input id="company" name="company" required autoComplete="organization" /></Field>
      </div>
      <Field label="Email di lavoro" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Password" htmlFor="password" hint="Almeno 10 caratteri."><Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
      <label className="flex items-start gap-3 py-1 text-sm text-ink-2">
        <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-ledger)]" />
        <span>Accetto i <Link href="/termini" className="text-ledger underline" target="_blank">termini di servizio</Link> e ho letto l&apos;<Link href="/privacy" className="text-ledger underline" target="_blank">informativa privacy</Link>.</span>
      </label>
      <Captcha siteKey={captchaKey} resetSignal={state} />
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Creazione…" : "Crea l'account gratuito"}</Button>
    </form>
    </>
  );
}

export function ResetForm({ intro, captchaKey = "" }: { intro?: ReactNode; captchaKey?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestReset, {});
  if (state.info) {
    return (
      <EmailSent title="Controlla la tua email">
        <p>{state.info}</p>
        <p className="text-sm">Se non la vedi entro qualche minuto, guarda nella posta indesiderata o nelle promozioni.</p>
        <p className="text-sm"><Link href="/accedi" className="text-ledger underline">Torna all&apos;accesso</Link></p>
      </EmailSent>
    );
  }
  return (
    <>
    {intro}
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="brick">{state.error}</Alert>}
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
      <Captcha siteKey={captchaKey} resetSignal={state} />
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Invio…" : "Invia il link"}</Button>
    </form>
    </>
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

export function MfaLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyMfaLogin, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="brick">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? "/app"} />
      <Field label="Codice di 6 cifre" htmlFor="code">
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus className="font-mono text-lg tracking-[0.4em]" />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Verifica…" : "Accedi"}</Button>
    </form>
  );
}
