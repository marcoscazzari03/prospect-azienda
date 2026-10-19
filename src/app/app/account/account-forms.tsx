"use client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Alert, Badge, Button, Field, Input } from "@/components/ui";
import { changePassword, confirmMfa, disableMfa, startMfa, updateProfile, type AccountState, type MfaSetup } from "./actions";

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

export type MfaStatus = { enabled: boolean; since: string | null };

// Attivazione e disattivazione della verifica in due passaggi.
export function MfaSettings({ status }: { status: MfaStatus }) {
  const router = useRouter();
  const [setup, setSetup] = useState<MfaSetup>({});
  const [starting, start] = useTransition();
  const [confirmState, confirmAction, confirming] = useActionState<AccountState, FormData>(confirmMfa, {});
  const [disableState, disableAction, disabling] = useActionState<AccountState, FormData>(disableMfa, {});
  // Attivata o disattivata: si ricarica lo stato dal server.
  useEffect(() => {
    if (confirmState.info || disableState.info) router.refresh();
  }, [confirmState.info, disableState.info, router]);

  if (status.enabled) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm">
          <Badge tone="ledger">Attiva</Badge>
          {status.since && <span className="text-ink-2">dal {new Date(status.since).toLocaleDateString("it-IT")}</span>}
        </p>
        {disableState.info && <Alert tone="ledger">{disableState.info}</Alert>}
        <form action={disableAction} className="flex flex-col gap-3 border-t border-line pt-4">
          <p className="text-sm text-ink-2">Per disattivarla inserisci un codice dall&apos;app di autenticazione.</p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Codice" htmlFor="mfa-off">
              <Input id="mfa-off" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="w-40 font-mono tracking-widest" />
            </Field>
            <Button type="submit" variant="secondary" disabled={disabling}>{disabling ? "Disattivazione…" : "Disattiva"}</Button>
          </div>
          {disableState.error && <Alert tone="brick">{disableState.error}</Alert>}
        </form>
      </div>
    );
  }

  if (setup.factorId && !confirmState.info) {
    return (
      <div className="flex flex-col gap-5">
        <ol className="flex flex-col gap-1 text-sm text-ink-2">
          <li>1. Apri l&apos;app di autenticazione sul telefono e aggiungi un account.</li>
          <li>2. Inquadra il codice QR (oppure inserisci a mano la chiave qui sotto).</li>
          <li>3. Scrivi il codice di 6 cifre che compare nell&apos;app.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR in SVG generato da Supabase (data URI) */}
          <img src={setup.qr} alt="Codice QR per l'app di autenticazione" width={176} height={176} className="rounded-lg border border-line bg-white p-2" />
          <div className="min-w-0 text-sm">
            <p className="text-muted">Chiave da inserire a mano</p>
            <p className="mt-1 break-all font-mono">{setup.secret}</p>
          </div>
        </div>
        <form action={confirmAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="factorId" value={setup.factorId} />
          <Field label="Codice dall'app" htmlFor="mfa-on">
            <Input id="mfa-on" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="w-40 font-mono tracking-widest" />
          </Field>
          <Button type="submit" disabled={confirming}>{confirming ? "Verifica…" : "Conferma e attiva"}</Button>
          <Button type="button" variant="ghost" onClick={() => setSetup({})}>Annulla</Button>
        </form>
        {confirmState.error && <Alert tone="brick">{confirmState.error}</Alert>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {confirmState.info && <Alert tone="ledger">{confirmState.info}</Alert>}
      <p className="text-sm text-ink-2">Protegge l&apos;account anche se qualcuno scopre la tua password. Se perdi il telefono, scrivici dall&apos;email dell&apos;account e la disattiviamo noi dopo una verifica.</p>
      <div>
        <Button type="button" variant="secondary" disabled={starting} onClick={() => start(async () => setSetup(await startMfa()))}>
          {starting ? "Preparazione…" : "Attiva la verifica in due passaggi"}
        </Button>
      </div>
      {setup.error && <Alert tone="brick">{setup.error}</Alert>}
    </div>
  );
}
