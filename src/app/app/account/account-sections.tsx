import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Button, ButtonLink, Card } from "@/components/ui";
import { formatEur, formatNumber } from "@/lib/domain/pricing";
import { safeHttpUrl } from "@/lib/domain/safe-url";
import { BRAND } from "@/lib/config";
import { clearBusinessProfile, openPortal } from "../actions";
import { signOutEverywhere } from "./actions";
import { MfaSettings, PasswordForm, ProfileForm, type MfaStatus } from "./account-forms";

// Sezioni di «Il mio account» (una pagina ciascuna): solo presentazione, i dati arrivano dalle pagine.

const SUB_STATUS: Record<string, string> = {
  active: "attivo", trialing: "in prova", past_due: "pagamento in ritardo", canceled: "annullato", unpaid: "non pagato", incomplete: "incompleto",
};
const PAY_STATUS: Record<string, string> = { paid: "pagato", succeeded: "pagato", pending: "in attesa", failed: "non riuscito", refunded: "rimborsato" };

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" }) : "—");

function Section({ id, title, text, children }: { id: string; title: string; text?: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-8 p-6">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {text && <p className="mt-1 text-sm text-ink-2">{text}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export type AccountData = {
  email: string;
  fullName: string;
  orgName: string;
  owner: boolean;
  planName: string;
  credits: number;
  totalCredits: number;
  hasCustomer: boolean;
  lastSignIn: string | null;
  createdAt: string | null;
};
type Payment = { id: string; kind: string; amount_cents: number; status: string; invoice_url: string | null; created_at: string };
type Sub = { status: string; current_period_end: string | null; cancel_at_period_end: boolean } | null;

export function ProfileSection({ account: a }: { account: AccountData }) {
  return (
    <Section id="profilo" title="Profilo" text="I tuoi dati e quelli della tua azienda.">
      <ProfileForm fullName={a.fullName} company={a.orgName} email={a.email} canEditCompany={a.owner} />
    </Section>
  );
}

// «La tua attività» (ricerche consigliate, punti 84–85): si modifica dalla Panoramica, dove ci sono le proposte.
export function BusinessSection({ description, area }: { description: string; area: string }) {
  return (
    <Section id="attivita" title="La tua attività" text="Da qui partono le ricerche consigliate nella Panoramica.">
      {description ? (
        <div className="grid gap-3 text-sm">
          <p><span className="text-muted">Cosa fai:</span> {description}</p>
          <p><span className="text-muted">Dove cerchi clienti:</span> {area || "Tutta Italia"}</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/app?attivita=modifica#attivita" variant="secondary">Modifica e aggiorna le proposte</ButtonLink>
            <form action={clearBusinessProfile}><Button type="submit" variant="ghost">Rimuovi</Button></form>
          </div>
        </div>
      ) : (
        <ButtonLink href="/app?attivita=modifica#attivita" variant="secondary">Descrivi la tua attività</ButtonLink>
      )}
    </Section>
  );
}

export function SecuritySection({ account: a, mfa }: { account: AccountData; mfa: MfaStatus }) {
  return (
    <>
      <Section id="sicurezza" title="Sicurezza">
        <dl className="mb-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-muted">Ultimo accesso</dt>
          <dd>{a.lastSignIn ? new Date(a.lastSignIn).toLocaleString("it-IT", { timeZone: "Europe/Rome" }) : "—"}</dd>
          <dt className="text-muted">Account creato il</dt>
          <dd>{day(a.createdAt)}</dd>
        </dl>
        <h3 className="mb-3 text-sm font-semibold">Cambia password</h3>
        <PasswordForm />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-sm text-ink-2">Hai usato l&apos;account su un computer non tuo? Esci ovunque: servirà di nuovo la password.</p>
          <form action={signOutEverywhere}>
            <Button type="submit" variant="secondary" size="sm">Esci da tutti i dispositivi</Button>
          </form>
        </div>
      </Section>
      <Section id="2fa" title="Verifica in due passaggi" text="Facoltativa. Oltre alla password, a ogni accesso ti chiediamo un codice di 6 cifre dall'app di autenticazione sul tuo telefono (Google Authenticator, Microsoft Authenticator, 1Password…).">
        <MfaSettings status={mfa} />
      </Section>
    </>
  );
}

export function BillingSection({ account: a, billing, payments, sub }: { account: AccountData; billing: boolean; payments: Payment[]; sub: Sub }) {
  return (
    <Section id="fatturazione" title="Piano e fatturazione">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm text-muted">Piano attuale</p>
          <p className="mt-1 font-display text-xl font-semibold">{a.planName}</p>
          {sub && (
            <p className="mt-1 text-xs text-ink-2">
              Abbonamento {SUB_STATUS[sub.status] ?? sub.status}
              {sub.current_period_end && <> · {sub.cancel_at_period_end ? "termina" : "rinnovo"} il {day(sub.current_period_end)}</>}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm text-muted">Crediti disponibili</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ledger">{formatNumber(a.credits)}</p>
          {a.totalCredits > 0 && <p className="mt-1 text-xs text-ink-2">su {formatNumber(Math.max(a.totalCredits, a.credits))} validi</p>}
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-line p-4">
          <p className="text-sm text-muted">Acquista crediti o cambia piano</p>
          <ButtonLink href="/app/crediti" size="sm">Crediti e piani</ButtonLink>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper/70 p-4">
        <p className="max-w-xl text-sm text-ink-2">
          Fatture, metodo di pagamento, dati di fatturazione e disdetta dell&apos;abbonamento si gestiscono sul portale sicuro di Stripe.
        </p>
        <form action={openPortal}>
          <Button type="submit" variant="secondary" size="sm" disabled={!billing || !a.hasCustomer}>Apri il portale di fatturazione</Button>
        </form>
      </div>
      {billing && !a.hasCustomer && <p className="mt-2 text-xs text-muted">Il portale si attiva dopo il primo acquisto.</p>}
      {!billing && <p className="mt-2 text-xs text-muted">I pagamenti online non sono ancora attivi.</p>}

      <h3 className="mb-3 mt-6 text-sm font-semibold">Ultimi pagamenti</h3>
      <div className="divide-y divide-line rounded-xl border border-line">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div>
              <p>{p.kind === "pack" ? "Pacchetto crediti" : "Abbonamento"}</p>
              <p className="text-xs text-muted">{day(p.created_at)} · {PAY_STATUS[p.status] ?? p.status}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-mono">{formatEur(p.amount_cents)}</p>
              {safeHttpUrl(p.invoice_url) && <a href={safeHttpUrl(p.invoice_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-ledger underline">Ricevuta</a>}
            </div>
          </div>
        ))}
        {!payments.length && <p className="px-4 py-6 text-sm text-muted">Nessun pagamento finora.</p>}
      </div>
      <p className="mt-3 text-xs text-muted">I movimenti dei crediti (riserve, addebiti, rimborsi, scadenze) sono in <Link href="/app/crediti" className="text-ledger underline">Crediti e piano</Link>.</p>
    </Section>
  );
}

export function SupportSection({ account: a }: { account: AccountData }) {
  return (
    <Section id="assistenza" title="Assistenza e dati">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm font-semibold">Hai bisogno di aiuto?</p>
          <p className="mt-1 text-sm text-ink-2">Scrivici: rispondiamo entro un giorno lavorativo.</p>
          <a href={`mailto:${BRAND.supportEmail}`} className="mt-3 inline-block text-sm text-ledger underline">{BRAND.supportEmail}</a>
          <p className="mt-3 text-xs text-muted">Per un lead sbagliato usa «Segnala» nella scheda del lead: il rimborso è più veloce.</p>
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm font-semibold">Documenti</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            <li><Link href="/termini" className="text-ledger underline">Termini di servizio</Link></li>
            <li><Link href="/privacy" className="text-ledger underline">Informativa privacy</Link></li>
            <li><Link href="/#faq" className="text-ledger underline">Domande frequenti</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-sm font-semibold">Chiudere l&apos;account <Badge tone="brick">Definitivo</Badge></p>
          <p className="mt-1 text-sm text-ink-2">
            Cancelliamo i tuoi dati personali e i lead acquistati. I crediti non usati vanno persi e le fatture restano conservate per obbligo di legge.
          </p>
        </div>
        <a
          href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent("Richiesta di chiusura account")}&body=${encodeURIComponent(`Chiedo la chiusura dell'account ${a.email} (${a.orgName}).`)}`}
          className="rounded-lg border border-brick/40 px-3 py-2 text-sm font-medium text-brick hover:bg-brick-soft"
        >
          Richiedi la chiusura
        </a>
      </div>
    </Section>
  );
}
