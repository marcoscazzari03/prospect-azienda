import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: "Sicurezza e privacy",
  description: `Come ${BRAND.name} protegge il tuo account, le tue ricerche e i dati delle aziende.`,
};

// Solo fatti verificabili e niente dettagli utili a un attaccante (il dettaglio resta nell'audit interno).
const PUNTI = [
  ["Solo dati d'azienda", "Nei lead niente nomi, ruoli o email di persone: solo canali aziendali e la fonte."],
  ["Dati in Europa", "Applicazione e database girano a Francoforte, nell'Unione Europea."],
  ["Ricerche riservate", "Quello che cerchi e quello che ricevi non lo vede nessun altro cliente."],
  ["Verifica in due passaggi", "Puoi proteggere l'accesso con un codice dall'app di autenticazione."],
] as const;

export default function SecurityPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-ink-2 [&_li]:text-ink-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
      <PageHeader
        eyebrow="Sicurezza e privacy"
        title="Come proteggiamo te e i dati"
        description={`In breve cosa fa ${BRAND.name} per il tuo account, le tue ricerche e i dati delle aziende. I dettagli legali sono nell'informativa privacy e nei termini di servizio.`}
      />

      <ul className="!mt-0 !list-none !space-y-0 grid gap-3 !pl-0 sm:grid-cols-2">
        {PUNTI.map(([titolo, testo]) => (
          <li key={titolo} className="rounded-xl border border-line bg-card p-4">
            <p className="!mt-0 font-semibold !text-ink">{titolo}</p>
            <p className="!mt-1 text-sm">{testo}</p>
          </li>
        ))}
      </ul>

      <h2>Il tuo account</h2>
      <ul>
        <li>Connessione sempre cifrata (HTTPS) e password di almeno 10 caratteri, che il servizio di accesso conserva solo in forma non leggibile.</li>
        <li>Verifica in due passaggi facoltativa, con un&apos;app come Google Authenticator: dopo pochi codici sbagliati l&apos;accesso si blocca per qualche minuto.</li>
        <li>Ti avvisiamo via email quando cambia la password o quando la verifica in due passaggi viene attivata o tolta.</li>
        <li>Quando cambi la password, gli altri dispositivi vengono disconnessi; dalla pagina Sicurezza dell&apos;account puoi uscire da tutti.</li>
        <li>Ogni account vede solo i propri dati: la separazione è applicata dal database stesso, non solo dall&apos;applicazione.</li>
        <li>L&apos;area di amministrazione richiede sempre la verifica in due passaggi.</li>
      </ul>

      <h2>Le tue ricerche</h2>
      <p>I criteri che inserisci, le aziende che ricevi e le note, gli stati e le liste che aggiungi sono riservati: non li mostriamo ad altri clienti e {BRAND.owner} non li usa per la propria attività commerciale. Puoi archiviare o eliminare i lead e le ricerche: un lead eliminato non resta leggibile, e non ti viene riproposto né riaddebitato. Le regole complete sono nei <Link className="text-ledger underline" href="/termini">termini di servizio</Link>.</p>

      <h2>I dati delle aziende</h2>
      <ul>
        <li>Raccogliamo solo informazioni pubbliche sulle aziende (sito, settore, zona, email aziendale generica o modulo di contatto, segnali), sempre con la fonte e la data del controllo.</li>
        <li>Non raccogliamo né consegniamo nomi, ruoli o email di persone, né caselle di posta gratuite.</li>
        <li>Chi non vuole comparire nei risultati può chiederlo dalla pagina <Link className="text-ledger underline" href="/opposizione">Rimuovi i tuoi dati</Link>: l&apos;indirizzo entra in una lista di esclusione permanente, salvata in forma non leggibile.</li>
        <li>I dati vengono riverificati o cancellati entro 24 mesi dalla raccolta. Chi si oppone viene cancellato subito dal database.</li>
      </ul>

      <h2>Dove sono i dati e chi ci aiuta</h2>
      <p>Usiamo pochi fornitori, ciascuno solo per quello che serve:</p>
      <ul>
        <li><strong>Vercel</strong> (applicazione) e <strong>Supabase</strong> (database e accesso): server a Francoforte, Unione Europea.</li>
        <li><strong>n8n</strong>: il motore che cerca e controlla le aziende.</li>
        <li><strong>Hetzner</strong>: il server che controlla i siti delle aziende.</li>
        <li><strong>Anthropic</strong> (Claude): l&apos;intelligenza artificiale che trova le aziende e ne riconosce il settore. Riceve i criteri della ricerca e testi pubblici dei siti, non il tuo nome o la tua email. Per contratto non usa questi dati per addestrare i propri modelli.</li>
        <li><strong>Stripe</strong>: i pagamenti. I dati delle carte non passano mai dai nostri server.</li>
        <li><strong>Resend</strong>: l&apos;invio delle email del servizio.</li>
      </ul>

      <h2>Chiavi e accessi interni</h2>
      <p>Le chiavi dei servizi stanno solo negli ambienti protetti dei fornitori, mai nel codice. Gli account di gestione (hosting, database, pagamenti, motore) sono protetti dalla verifica in due passaggi. Il motore comunica con l&apos;applicazione solo con un segreto condiviso e solo verso indirizzi autorizzati.</p>

      <h2>I tuoi diritti e i contatti</h2>
      <p>Puoi chiedere in qualsiasi momento una copia dei tuoi dati, la correzione o la cancellazione, anche dell&apos;intero account, scrivendo a <a className="text-ledger underline" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>. I lead che ricevi sono tuoi come titolare autonomo del trattamento: le regole per usarli sono nei termini di servizio. Se noti un problema di sicurezza, segnalalo allo stesso indirizzo: rispondiamo e lo correggiamo il prima possibile. Tutti i dettagli sono nell&apos;<Link className="text-ledger underline" href="/privacy">informativa privacy</Link>.</p>
    </article>
  );
}
