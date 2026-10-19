import Link from "next/link";
import { CONTACT_NOTICE } from "@/lib/domain/leads";

// Avviso sull'uso dei contatti, sopra i lead: la prima frase sempre visibile, il resto a richiesta.
export function ContactNotice() {
  const [first, ...rest] = CONTACT_NOTICE;
  return (
    <details className="mb-4 rounded-lg border border-stamp/40 bg-stamp-soft px-4 py-3 text-sm text-stamp-ink">
      <summary className="cursor-pointer font-medium">{first} Come usare questi contatti</summary>
      <ul className="mt-2 list-disc pl-5">
        {rest.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <p className="mt-2">Dettagli nei <Link href="/termini" className="underline">termini di servizio</Link>.</p>
    </details>
  );
}
