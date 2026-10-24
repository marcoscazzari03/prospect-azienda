import type { Metadata } from "next";
import Link from "next/link";
import { Alert, PageHeader } from "@/components/ui";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = { title: "Informativa privacy" };

// Informativa (artt. 13 e 14 GDPR). Riscritta il 24/10 dopo l'analisi privacy (checklist, punto 98): i dati delle società
// non sono dati personali (considerando 14); lo sono quelli di ditte individuali e professionisti.
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-semibold [&_p]:mt-3 [&_p]:text-ink-2 [&_li]:text-ink-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      <PageHeader eyebrow="Privacy" title="Informativa sul trattamento dei dati" />
      <Alert>Bozza da completare con i dati del titolare e da far validare da un consulente prima dell&apos;apertura al pubblico.</Alert>

      <h2>Chi tratta i dati</h2>
      <p>Titolare del trattamento: {BRAND.owner} — [dati identificativi e indirizzo da completare]. Per ogni richiesta sulla privacy: {BRAND.supportEmail}.</p>

      <h2>1. Clienti e utenti della piattaforma</h2>
      <ul>
        <li><strong>Dati:</strong> nome, email, azienda, dati di fatturazione, ricerche e lead dell&apos;account, dati tecnici di accesso (indirizzo IP, verifica anti-bot, tentativi di accesso).</li>
        <li><strong>Finalità e basi giuridiche:</strong> fornire il servizio (contratto, art. 6.1.b GDPR), adempiere agli obblighi fiscali e contabili (obbligo di legge, art. 6.1.c), proteggere gli account e il servizio (legittimo interesse, art. 6.1.f).</li>
        <li><strong>Conservazione:</strong> per la durata dell&apos;account. Puoi chiederne la chiusura a {BRAND.supportEmail}: cancelliamo i dati entro 30 giorni, salvo quelli di fatturazione, conservati per 10 anni come previsto dalla legge.</li>
        <li><strong>Pagamenti:</strong> gestiti da Stripe; non conserviamo i dati delle carte.</li>
        <li><strong>Cookie:</strong> il sito usa solo cookie tecnici necessari all&apos;accesso e alla protezione anti-bot (Cloudflare Turnstile); nessun cookie di profilazione o di statistica.</li>
      </ul>

      <h2>2. Aziende e professionisti presenti nei risultati</h2>
      <p>Il servizio aiuta imprese e professionisti a trovare altre imprese a cui proporre i propri servizi. Per questo raccogliamo da fonti pubbliche informazioni sulle aziende italiane e le consegniamo ai nostri clienti.</p>

      <h3>Società: non sono dati personali</h3>
      <p>Nome, sito, settore, città, partita IVA ed email generica (come info@) di una società non sono dati personali: il GDPR non si applica ai dati delle persone giuridiche, compresi il nome e i dati di contatto (considerando 14). Ti offriamo comunque l&apos;opposizione descritta più sotto.</p>

      <h3>Ditte individuali e professionisti: informativa ai sensi dell&apos;art. 14 GDPR</h3>
      <p>Quando un&apos;impresa individuale, uno studio o un professionista è identificato dal nome di una persona, o la sua email aziendale arriva di fatto a una persona, quei dati sono personali e li trattiamo come tali.</p>
      <ul>
        <li><strong>Dati:</strong> nome dell&apos;attività, sito, settore, città, partita IVA, email aziendale pubblicata sul sito o pagina del modulo di contatto, segnali osservati (caratteristiche tecniche del sito, annunci di lavoro), fonte e data del controllo. Non raccogliamo nomi di dipendenti, ruoli, email nominative, numeri di cellulare né caselle di posta gratuite (Gmail e simili).</li>
        <li><strong>Fonti:</strong> il sito ufficiale dell&apos;attività; OpenStreetMap; l&apos;elenco pubblico dei domini .it di Common Crawl; annunci di lavoro da Adzuna e dalle pagine «Lavora con noi» dei siti.</li>
        <li><strong>Finalità e base giuridica:</strong> permettere ai nostri clienti, imprese e professionisti, di individuare attività a cui proporre i propri servizi. La base è il legittimo interesse (art. 6.1.f GDPR) nostro e dei clienti allo sviluppo di rapporti commerciali tra imprese, bilanciato con i tuoi diritti: usiamo solo dati che l&apos;attività pubblica per farsi contattare, senza dati di persone diverse dal titolare.</li>
        <li><strong>Destinatari:</strong> i clienti della piattaforma che li ricevono, come titolari autonomi del trattamento; gli stessi dati possono essere forniti a più clienti interessati allo stesso settore e zona. I fornitori tecnici elencati sotto.</li>
        <li><strong>Conservazione:</strong> riverifichiamo i dati periodicamente; quelli non riverificati vengono cancellati entro 24 mesi. Per una consegna valgono solo i contatti controllati negli ultimi 180 giorni.</li>
        <li><strong>Opposizione:</strong> puoi opporti in qualsiasi momento, senza motivazione, dalla pagina <Link className="text-ledger underline" href="/opposizione">Rimuovi i tuoi dati</Link>: cancelliamo subito i tuoi dati di contatto dal nostro database, anche dai lead già consegnati (a quei clienti segnaliamo l&apos;opposizione), e non li consegniamo più a nessuno.</li>
      </ul>

      <h3>Annunci di lavoro e controlli dei siti</h3>
      <p>Degli annunci di lavoro conserviamo titolo, azienda, città, data, tipo di contratto e link all&apos;annuncio: nessun dato di candidati o di persone indicate nell&apos;annuncio. Dei siti conserviamo il dettaglio tecnico osservato (per esempio la presenza di HTTPS) e la data del controllo.</p>

      <h3>Fonti e licenze</h3>
      <p>Parte degli elenchi di aziende (nome, settore, città, sito) proviene da OpenStreetMap: © <a className="text-ledger underline" href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer" target="_blank">OpenStreetMap contributors</a>, dati disponibili con licenza Open Database License (ODbL). Ogni lead riporta la fonte da cui è stato ricavato.</p>

      <h2>3. Fornitori e trasferimenti fuori dall&apos;Unione Europea</h2>
      <ul>
        <li>Supabase (database e accesso) e Vercel (applicazione), con server nell&apos;Unione Europea.</li>
        <li>n8n (automazioni) e Hetzner (server per i controlli dei siti).</li>
        <li>Anthropic (intelligenza artificiale, Stati Uniti): legge testi pubblici dei siti per riconoscere il settore e riceve i criteri delle ricerche e la descrizione dei servizi inseriti dai clienti (non nome né email dell&apos;account).</li>
        <li>Stripe (pagamenti), Resend (email del servizio), Cloudflare (protezione anti-bot).</li>
      </ul>
      <p>Per i fornitori con sede fuori dall&apos;Unione Europea il trasferimento avviene sulla base del Data Privacy Framework UE–USA o delle clausole contrattuali tipo approvate dalla Commissione europea.</p>

      <h2>4. I tuoi diritti</h2>
      <p>Puoi chiedere accesso, rettifica, cancellazione e limitazione dei tuoi dati, e opporti al trattamento, scrivendo a {BRAND.supportEmail} o, per non comparire più nei risultati, dalla pagina <Link className="text-ledger underline" href="/opposizione">Rimuovi i tuoi dati</Link>. Hai anche il diritto di proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>
    </article>
  );
}
