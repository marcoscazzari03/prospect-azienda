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
      <p>{BRAND.name} cerca su fonti pubbliche le aziende corrispondenti ai criteri indicati dal cliente e, a richiesta, quelle con un&apos;opportunità commerciale verificata, e le consegna con sito, settore, zona, l&apos;email aziendale generica trovata sul loro sito (o, se il cliente lo sceglie e l&apos;email non c&apos;è, la pagina del modulo di contatto del sito) e l&apos;indicazione della fonte. Non vengono consegnati nomi o email di persone. Il servizio è riservato a professionisti e imprese.</p>

      <h2>Crediti e pagamenti</h2>
      <p>All&apos;avvio di una ricerca viene riservato il numero massimo di crediti necessario; al termine vengono addebitati solo i lead consegnati e i crediti restanti tornano disponibili. I crediti di benvenuto e quelli dei pacchetti valgono 12 mesi; quelli degli abbonamenti scadono un mese dopo la fine del periodo in cui sono stati accreditati. Si usano sempre per primi i crediti più vicini alla scadenza; alla scadenza la parte non usata viene tolta dal saldo e il movimento compare in «Crediti e piano». Gli abbonamenti si rinnovano ogni mese e si possono annullare in qualsiasi momento con effetto a fine periodo.</p>

      <h2>Ricerche con segnali</h2>
      <p>Nelle ricerche «opportunità» il cliente sceglie il servizio che vende e consegniamo solo aziende che presentano almeno uno dei segnali collegati a quel servizio, ciascuno con la sua prova: un annuncio di lavoro pubblicato negli ultimi 60 giorni o una caratteristica tecnica del sito controllata alla data indicata. I segnali descrivono fatti pubblici osservati alla data indicata (annunci di lavoro, caratteristiche tecniche del sito). Non costituiscono una garanzia che l&apos;azienda abbia bisogno di un servizio o sia interessata a un&apos;offerta. Ogni lead consegnato con un segnale verificato costa {extraCreditsLabel(prices)} (il prezzo in vigore all&apos;avvio della ricerca); i segnali indicativi sono un&apos;informazione in più e non vengono addebitati.</p>

      <h2>Garanzia</h2>
      <p>I lead con email che rimbalza (entro 30 giorni), non conformi ai filtri della ricerca (entro 14 giorni) o con un segnale non corretto (entro 14 giorni) possono essere segnalati dalla piattaforma: i crediti vengono restituiti automaticamente entro il 10% dei lead della ricerca e, oltre, dopo una verifica. Un segnale è non corretto se la prova era falsa al momento della consegna: un sito rifatto o un annuncio chiuso dopo la consegna non danno diritto al rimborso.</p>

      <h2>Ruoli e uso lecito dei dati</h2>
      <p>Il cliente riceve i dati come titolare autonomo del trattamento: decide da solo se, come e perché contattare le aziende, ed è responsabile di farlo nel rispetto della normativa applicabile. In particolare, in Italia:</p>
      <ul className="mt-3 list-disc pl-6 text-ink-2">
        <li>email, SMS, messaggi e chiamate automatiche a scopo promozionale richiedono il consenso preventivo del destinatario, anche quando è un&apos;azienda (art. 130, commi 1 e 2, del Codice Privacy). L&apos;email aziendale e la pagina del modulo di contatto sono informazioni sull&apos;azienda, non un&apos;autorizzazione: la pubblicazione di un indirizzo sul sito non equivale al consenso;</li>
        <li>le telefonate con operatore sono ammesse verso chi non si è opposto: il cliente verifica i numeri nel Registro pubblico delle opposizioni (art. 130, comma 3-bis);</li>
        <li>se i dati riguardano una ditta individuale o un professionista, il cliente fornisce l&apos;informativa prevista dall&apos;art. 14 GDPR al primo contatto e rispetta l&apos;opposizione.</li>
      </ul>
      <p>È vietato rivendere o cedere i dati, usarli per invii di massa o per finalità diverse dal contatto commerciale tra imprese, e contattare aziende o persone che si sono opposte. Se una persona si oppone o chiede la cancellazione dopo che il cliente ha ricevuto i suoi dati, {BRAND.name} può avvisare il cliente, che cancella i dati e non la contatta più.</p>
      <p>Gli elenchi contengono anche dati di OpenStreetMap (© OpenStreetMap contributors, licenza ODbL): se il cliente li pubblica, deve indicarne la fonte.</p>

      <h2>Riservatezza delle ricerche</h2>
      <p>I criteri delle ricerche del cliente, l&apos;elenco delle aziende che ha ricevuto e le note, gli stati e le liste che aggiunge sono riservati: non li mostriamo ad altri clienti e {BRAND.owner} non li usa per la propria attività commerciale (ad esempio per contattare le stesse aziende). Li consultiamo solo per assistenza, sicurezza, verifica delle segnalazioni e controllo dei costi, e in forma aggregata e anonima per migliorare il servizio. Le informazioni pubbliche sulle aziende trovate durante una ricerca (sito, settore, zona, contatto aziendale, segnali) entrano invece nel database comune del servizio e possono essere consegnate anche ad altri clienti con criteri simili, al massimo 5 clienti diversi ogni 90 giorni per la stessa azienda; a nessun cliente viene indicato chi altro le ha ricevute.</p>

      <h2>Responsabilità</h2>
      <p>Le informazioni provengono da fonti pubbliche che possono cambiare nel tempo: non garantiamo la completezza dei risultati né l&apos;esito delle attività commerciali del cliente.</p>
    </article>
  );
}
