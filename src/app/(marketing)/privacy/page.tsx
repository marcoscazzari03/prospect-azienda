import type { Metadata } from "next";
import Link from "next/link";
import { Alert, PageHeader } from "@/components/ui";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = { title: "Informativa privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-ink-2 [&_li]:text-ink-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      <PageHeader eyebrow="Privacy" title="Informativa sul trattamento dei dati" />
      <Alert>Bozza da completare con i dati del titolare e da far validare da un consulente prima dell&apos;apertura al pubblico.</Alert>

      <h2>Chi tratta i dati</h2>
      <p>Titolare del trattamento: {BRAND.owner} — [dati identificativi e indirizzo da completare]. Contatto: {BRAND.supportEmail}.</p>

      <h2>Utenti della piattaforma</h2>
      <p>Trattiamo i dati di registrazione (nome, email, azienda), i dati di fatturazione e i dati di utilizzo per fornire il servizio (art. 6.1.b GDPR), adempiere agli obblighi fiscali (art. 6.1.c) e garantire la sicurezza (art. 6.1.f). I pagamenti sono gestiti da Stripe; non conserviamo dati delle carte.</p>

      <h2>Persone presenti nei lead (art. 14 GDPR)</h2>
      <p>Raccogliamo da fonti pubblicamente accessibili (siti ufficiali delle aziende, pagine team, note legali, registri, articoli) dati professionali di referenti aziendali: nome, ruolo, azienda, sito, email professionale, fonte. La base giuridica è il legittimo interesse (art. 6.1.f) a favorire contatti commerciali tra imprese, bilanciato con i diritti degli interessati. Non trattiamo dati particolari né contatti privati.</p>
      <ul>
        <li>Destinatari: clienti della piattaforma che acquistano i lead, che ne diventano titolari autonomi.</li>
        <li>Conservazione: i dati vengono riverificati o cancellati entro 24 mesi dalla raccolta.</li>
        <li>Fornitori: infrastruttura e servizi tecnici (Supabase, Vercel, n8n, OpenAI, servizi di verifica email), con dati ospitati nell&apos;Unione Europea dove possibile.</li>
      </ul>

      <h2>I tuoi diritti</h2>
      <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione e opporti al trattamento in qualsiasi momento. Per non comparire più nei nostri risultati usa la pagina <Link className="text-ledger underline" href="/opposizione">Rimuovi i tuoi dati</Link>: inseriamo il tuo indirizzo in una lista di esclusione permanente. Puoi anche proporre reclamo al Garante per la protezione dei dati personali.</p>
    </article>
  );
}
