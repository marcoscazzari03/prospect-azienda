import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";
import { BRAND } from "@/lib/config";
import { extraCreditsLabel } from "@/lib/domain/signals";
import { getSignalPrices } from "@/lib/server/signal-prices";

export const metadata: Metadata = { title: "Termini di servizio" };

export const revalidate = 300;

export default async function TermsPage() {
  const prices = await getSignalPrices();
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-ink-2">
      <PageHeader eyebrow="Termini" title="Termini di servizio" />
      <Alert>Bozza da far validare da un consulente prima dell&apos;apertura al pubblico.</Alert>

      <h2>Il servizio</h2>
      <p>{BRAND.name} cerca su fonti pubbliche aziende e referenti corrispondenti ai criteri indicati dal cliente e li consegna con l&apos;indicazione della fonte e dello stato dell&apos;email. Il servizio è riservato a professionisti e imprese.</p>

      <h2>Crediti e pagamenti</h2>
      <p>All&apos;avvio di una ricerca viene riservato il numero massimo di crediti necessario; al termine vengono addebitati solo i lead consegnati e i crediti restanti tornano disponibili. I crediti di benvenuto e quelli dei pacchetti valgono 12 mesi; quelli degli abbonamenti scadono un mese dopo la fine del periodo in cui sono stati accreditati. Si usano sempre per primi i crediti più vicini alla scadenza; alla scadenza la parte non usata viene tolta dal saldo e il movimento compare in «Crediti e piano». Gli abbonamenti si rinnovano ogni mese e si possono annullare in qualsiasi momento con effetto a fine periodo.</p>

      <h2>Ricerche con segnali</h2>
      <p>Nelle ricerche «opportunità» il cliente sceglie il servizio che vende e consegniamo solo aziende che presentano almeno uno dei segnali collegati a quel servizio, ciascuno con la sua prova: un annuncio di lavoro pubblicato negli ultimi 60 giorni o una caratteristica tecnica del sito controllata alla data indicata. I segnali descrivono fatti pubblici osservati alla data indicata (annunci di lavoro, caratteristiche tecniche del sito). Non costituiscono una garanzia che l&apos;azienda abbia bisogno di un servizio o sia interessata a un&apos;offerta. Ogni lead consegnato con un segnale verificato costa {extraCreditsLabel(prices)} (il prezzo in vigore all&apos;avvio della ricerca); i segnali indicativi sono un&apos;informazione in più e non vengono addebitati.</p>

      <h2>Garanzia</h2>
      <p>I lead con email che rimbalza (entro 30 giorni), non conformi ai filtri della ricerca (entro 14 giorni) o con un segnale non corretto (entro 14 giorni) possono essere segnalati dalla piattaforma: i crediti vengono restituiti automaticamente entro il 10% dei lead della ricerca e, oltre, dopo una verifica. Un segnale è non corretto se la prova era falsa al momento della consegna: un sito rifatto o un annuncio chiuso dopo la consegna non danno diritto al rimborso.</p>

      <h2>Uso lecito dei dati</h2>
      <p>Il cliente diventa titolare autonomo dei dati acquistati ed è responsabile del loro uso nel rispetto della normativa applicabile, incluse le regole sulle comunicazioni commerciali (ad esempio, in Italia, l&apos;art. 130 del Codice Privacy) e l&apos;obbligo di informare gli interessati al primo contatto. È vietato rivendere i dati, usarli per spam o per finalità diverse dal contatto commerciale tra imprese, e contattare persone che si sono opposte.</p>

      <h2>Responsabilità</h2>
      <p>Le informazioni provengono da fonti pubbliche che possono cambiare nel tempo: non garantiamo la completezza dei risultati né l&apos;esito delle attività commerciali del cliente.</p>
    </article>
  );
}
