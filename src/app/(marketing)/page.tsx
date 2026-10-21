import type { ReactNode } from "react";
import { ButtonLink, cx } from "@/components/ui";
import { ExampleLeadCard } from "@/components/home/example-lead-card";
import { EXAMPLE_LEADS } from "@/components/home/examples";
import { HeroShowcase } from "@/components/home/hero-showcase";
import { OpportunityDemo } from "@/components/home/opportunity-demo";
import { SignalCatalog } from "@/components/home/signal-catalog";
import { creditsPerLead } from "@/components/search-types";
import { BETA, BRAND } from "@/lib/config";
import { formatEur } from "@/lib/domain/pricing";
import { type SignalPrices } from "@/lib/domain/signals";
import { getPublicPlans } from "@/lib/server/catalog";
import { getEnabledOffers } from "@/lib/server/offer-rules";
import { getSignalPrices } from "@/lib/server/signal-prices";

// Homepage. Percorso: cosa fa (hero) → il problema → cosa ricevi → cosa cerchiamo → demo →
// per chi è → la ricerca in target → le domande giuste → prezzi → FAQ → registrazione.
// La ricerca con opportunità è il prodotto in primo piano; quella in target resta accessibile.
// Esempi e demo sono sempre dichiarati come illustrativi o simulati.

// Prezzi dei segnali e listino letti dal database, aggiornati ogni 5 minuti.
export const revalidate = 300;

function Section({ id, label, tone = "paper", children, className }: { id?: string; label?: string; tone?: "paper" | "card" | "ink"; children: ReactNode; className?: string }) {
  return (
    <section
      id={id}
      className={cx("scroll-mt-32", tone === "card" && "bg-card", tone === "paper" && "bg-paper", tone === "ink" && "bg-ink text-white", className)}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        {label && <p className={cx("mb-5 font-mono text-xs uppercase tracking-[0.18em]", tone === "ink" ? "text-ledger-bright" : "text-ledger")}>{label}</p>}
        {children}
      </div>
    </section>
  );
}

function Title({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx("max-w-3xl font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.6rem]", className)}>{children}</h2>;
}

const Lead = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cx("mt-4 max-w-2xl text-lg leading-relaxed text-ink-2", className)}>{children}</p>
);

const PAINS = [
  ["Ore a cercare", "Mappe, elenchi, siti uno per uno. Il tempo che passi a cercare aziende è tempo tolto alla vendita e al lavoro per i clienti."],
  ["Liste che non c'entrano", "Elenchi comprati con aziende fuori zona, chiuse o di un altro settore, e nessuna fonte per verificare."],
  ["Nessun motivo per scrivere", "Anche con l'azienda giusta, il primo messaggio è generico: «Ci occupiamo di…». Ed è facile da ignorare."],
] as const;

const ANATOMY = [
  ["L'azienda", "Nome, sito ufficiale, settore e città. Il sito lo controlliamo: niente pagine di directory o di terzi."],
  ["Il motivo per contattarla", "Il segnale legato a quello che vendi, con il link alla prova e la data del controllo. Lo puoi citare nel primo messaggio."],
  ["Quanto è promettente", "Un punteggio da 0 a 100: quanto il segnale indica un bisogno, quanto è legato al tuo servizio, quanto è recente."],
  ["Come raggiungerla", "L'email aziendale trovata sul sito (info@, commerciale@) con la pagina da cui viene, oppure la pagina del modulo di contatto."],
  ["Perché è nel tuo target", "Zona, dimensione indicativa e settore, confermati dal sito. Poi lo esporti in Excel o CSV, o lo segui nell'app con note, fasi e liste."],
] as const;

// Per chi è: chi vende, a chi, con quale ricerca. `offer`: il servizio con opportunità, mostrato
// solo se attivo; senza, la ricerca in target (vale per qualunque settore).
const AUDIENCES = [
  { who: "Imprese edili e impiantisti", clients: "Hotel, capannoni, uffici e negozi", example: "Hotel · Veneto" },
  { who: "Pulizie e facility management", clients: "Uffici, studi professionali, palestre, hotel", example: "Studi professionali · Milano" },
  { who: "Trasporti e logistica", clients: "Produttori, grossisti, negozi online", example: "Grossisti alimentari · Emilia-Romagna" },
  { who: "Fornitori industriali", clients: "Aziende manifatturiere del tuo settore e della tua zona", example: "Carpenterie metalliche · Brescia" },
  { who: "Agenzie per il lavoro e selezione", clients: "Aziende che stanno assumendo", offer: "recruiting" },
  { who: "Commercialisti e consulenti", clients: "Aziende che cercano un contabile o un amministrativo", offer: "accounting" },
  { who: "Web agency, web designer e grafici, IT e marketing", clients: "Aziende con un sito datato, senza HTTPS o con software vecchio", offer: "web_redesign" },
] as const;

const OBJECTIONS = (prices: SignalPrices, freeCredits: number) => [
  ["I dati sono affidabili?", "Ogni azienda ha il suo sito ufficiale controllato e ogni contatto la pagina da cui l'abbiamo preso. Le email sono solo caselle del dominio aziendale trovate sul sito: mai indirizzi inventati o ipotizzati."],
  ["Da dove arrivano le aziende?", "Da fonti pubbliche: i siti delle aziende, OpenStreetMap e gli annunci di lavoro pubblicati online. Per i filtri più specifici le cerchiamo anche sul web, una per una."],
  ["Le opportunità sono verificate?", "Il segnale sì: è un fatto osservato (un annuncio, la versione del software, l'assenza di HTTPS) con link e data. Il bisogno no, e non lo promettiamo: per questo c'è il punteggio, che è una stima."],
  ["E se trovate meno aziende di quelle che chiedo?", "Paghi solo quelle consegnate: i crediti riservati e non usati tornano subito disponibili. Un'azienda che hai già ricevuto non ti viene mai riproposta."],
  ["E se un risultato è sbagliato?", "Lo segnali dalla piattaforma: email che rimbalza entro 30 giorni, azienda fuori dai filtri o segnale non corretto entro 14. I crediti tornano in automatico entro il 10% dei lead della ricerca, oltre dopo una verifica."],
  ["Devo abbonarmi?", `No. Inizi con ${freeCredits} crediti gratuiti senza carta, poi scegli: pacchetti da usare in 12 mesi o un abbonamento mensile che annulli quando vuoi. Un'azienda con opportunità costa ${1 + Math.max(prices.website, prices.job_ad)} crediti.`],
] as const;

const FAQ = [
  ["Lavoro da solo con partita IVA: fa per me?", "Sì. Ti basta un account: inizi con i crediti gratuiti senza carta, poi compri un pacchetto quando ti serve, senza abbonamento, con crediti validi 12 mesi. Paghi solo le aziende consegnate."],
  ["Posso usare i contatti per l'email marketing?", "Le regole cambiano da paese a paese: in Italia l'invio di email promozionali richiede in genere il consenso, anche verso caselle aziendali, e un indirizzo pubblicato sul sito non equivale a un consenso. Sei tu a decidere come contattare le aziende e a rispettare la normativa. Webora Leads è pensato per contatti mirati, uno per azienda, con un motivo concreto."],
  ["Perché non ci sono i nomi dei referenti?", `È una scelta di prodotto: ${BRAND.name} ti dice quali aziende sono in target, perché sono un'opportunità e come raggiungerle tramite i loro canali aziendali. Non raccogliamo né vendiamo dati di persone.`],
  ["In quali paesi funziona?", "Il nostro database e gli annunci di lavoro coprono l'Italia. Per gli altri paesi europei usiamo la ricerca estesa sul web, che costa 1 credito in più per azienda."],
  ["Che servizi posso scegliere per le opportunità?", "Siti web, IT e sistemistica, marketing e comunicazione, HR e selezione, commerciale e amministrazione, con i servizi elencati sopra. Ne aggiungiamo uno solo quando ha un segnale verificabile che lo distingue."],
  ["Come funziona il punteggio dell'opportunità?", "Moltiplica tre cose: quanto quel fatto indica un bisogno (un sito senza HTTPS conta più di un copyright vecchio), quanto è legato al servizio che vendi e quanto è recente la prova. Da 75 è un'opportunità forte, da 50 probabile, sotto potenziale. Serve a decidere chi contattare prima."],
] as const;

export default async function HomePage() {
  const [prices, offers, plans] = await Promise.all([getSignalPrices(), getEnabledOffers(), getPublicPlans()]);
  const free = plans.find((p) => p.kind === "free");
  const freeCredits = free?.credits ?? 15;
  const paid = plans.filter((p) => (p.kind === "pack" || p.kind === "subscription") && p.credits > 0);
  const perCredit = paid.map((p) => p.price_cents / p.credits);
  const [cheapCredit, dearCredit] = [Math.min(...perCredit), Math.max(...perCredit)];
  const packs = paid.filter((p) => p.kind === "pack");
  const subs = paid.filter((p) => p.kind === "subscription");
  const target = creditsPerLead("target", prices).max;
  const opportunity = creditsPerLead("opportunity", prices).max;
  const extended = creditsPerLead("extended", prices).max;
  const eur = (cents: number) => formatEur(Math.round(cents));
  const anatomyLead = EXAMPLE_LEADS.web_redesign;

  return (
    <>
      {/* 1. Hero: cosa fa, per chi, e subito un esempio da toccare */}
      <section className="ruled border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24">
          <div className="animate-row-in">
            <p className="mb-5 text-balance font-mono text-xs uppercase tracking-[0.18em] text-ledger">Per chi vende alle aziende, anche&nbsp;da&nbsp;solo</p>
            <h1 className="font-display text-[2.6rem] font-semibold leading-[1.04] tracking-tight sm:text-6xl">
              Trova le aziende che hanno un motivo per <span className="text-ledger">sceglierti</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Dicci cosa vendi. Ti consegniamo le aziende con un motivo concreto per sceglierti (un sito datato, un certificato
              HTTPS scaduto, un annuncio di lavoro), con il contatto aziendale e la prova da citare.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/registrati" size="lg">Prova gratis con {freeCredits} crediti</ButtonLink>
              <ButtonLink href="#demo" size="lg" variant="secondary">Prova la demo</ButtonLink>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {BETA.open && <li className="font-medium text-ledger-2">Beta gratuita su invito</li>}
              <li>Nessuna carta di credito</li>
              <li>Paghi solo le aziende consegnate</li>
              <li>Ogni segnale con link e data</li>
            </ul>
          </div>
          <HeroShowcase offers={offers} />
        </div>
      </section>

      {/* 2. Il problema */}
      <Section id="come-funziona" label="Il problema" tone="card">
        <Title>Un elenco di aziende non ti dice a chi scrivere. Né cosa dire.</Title>
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {PAINS.map(([title, text], i) => (
            <div key={title} className="border-t border-ink pt-5">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <p className="mt-2 font-display text-xl font-semibold">{title}</p>
              <p className="mt-2 text-ink-2">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-14 max-w-3xl font-display text-2xl leading-snug sm:text-3xl">
          {BRAND.name} parte da quello che vendi e cerca le aziende che mostrano di averne bisogno.{" "}
          <span className="text-ledger">Così il primo contatto ha già un motivo.</span>
        </p>
      </Section>

      {/* 3. Cosa ricevi: anatomia di un lead */}
      <Section label="Cosa ricevi" tone="paper">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <Title>Ogni azienda arriva con il suo perché.</Title>
            <Lead>Non una riga di un elenco: una scheda che ti dice chi è, perché contattarla adesso e come raggiungerla.</Lead>
            <ol className="mt-10 flex flex-col gap-6">
              {ANATOMY.map(([title, text], i) => (
                <li key={title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-ink font-mono text-[11px] font-semibold text-white">{i + 1}</span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ExampleLeadCard lead={anatomyLead} offer="web_redesign" marks />
            <p className="mt-3 text-xs text-muted">Esempio illustrativo per «Rifacimento del sito», con un&apos;azienda inventata.</p>
          </div>
        </div>
      </Section>

      {/* 4. Cosa cerchiamo per te */}
      <Section id="opportunita" label="Le opportunità" tone="card">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end">
          <Title>Scegli il servizio. I segnali li cerchiamo noi.</Title>
          <p className="text-ink-2">
            Per ogni servizio sappiamo quali fatti indicano un possibile bisogno e li controlliamo azienda per azienda.
            Chi non ha la prova non entra nei risultati.
          </p>
        </div>
        <div className="mt-12"><SignalCatalog offers={offers} /></div>
        <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ledger" aria-hidden />Segnale verificato: basta da solo</span>
          <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-stamp" aria-hidden />Indizio: conta solo insieme a un segnale verificato</span>
          <span>Un segnale è un fatto pubblico, non un&apos;intenzione d&apos;acquisto.</span>
        </p>
      </Section>

      {/* 5. Demo */}
      <Section id="demo" label="Prova senza registrarti" tone="paper">
        <div className="mb-10 grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end">
          <Title>Simula la tua prima ricerca.</Title>
          <p className="text-ink-2">
            Scegli cosa vendi e dove. Vedi come lavora il motore e cosa riceveresti, con dati simulati: nessuna ricerca reale, nessun credito.
          </p>
        </div>
        <OpportunityDemo offers={offers} signalPrices={prices} freeCredits={freeCredits} freeMax={free?.max_quantity_per_search ?? 10} />
      </Section>

      {/* 6. Per chi è: ogni settore con la ricerca in target, le opportunità dove ci sono */}
      <Section id="per-chi-e" label="Per chi è" tone="card">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end">
          <Title>Vendi alle aziende? Ti aiutiamo a trovarle.</Title>
          <p className="text-ink-2">
            Che tu sia un&apos;agenzia, un&apos;impresa o un professionista con partita IVA. La ricerca in target funziona per qualunque settore: descrivi le aziende che vuoi come clienti e la zona. Le opportunità le
            aggiungiamo un servizio alla volta, solo quando c&apos;è un segnale che possiamo verificare.
          </p>
        </div>
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {AUDIENCES.map((a) => {
            const offer = "offer" in a ? offers.find((o) => o.code === a.offer) : undefined;
            return (
              <li key={a.who} className="grid gap-x-8 gap-y-2 py-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,1.1fr)] md:items-baseline">
                <p className="font-medium">{a.who}</p>
                <p className="text-ink-2">
                  <span className="text-muted">Cerchi: </span>
                  {a.clients}
                </p>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {offer ? (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-ledger-soft px-2.5 py-1 text-xs font-medium text-ledger">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ledger" />
                      Con opportunità · {offer.label}
                    </span>
                  ) : (
                    <>
                      {"example" in a && <span className="text-xs text-muted">Es. {a.example}</span>}
                      <span className="whitespace-nowrap rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-2">In target</span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Esempi di ricerca, non clienti. Le aziende arrivano dal nostro database e, dove non basta, dal web; le opportunità con gli
          annunci di lavoro sono disponibili per l&apos;Italia.
        </p>
      </Section>

      {/* 7. La ricerca in target (secondaria) */}
      <Section label="Anche senza segnali" tone="paper">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
          <div>
            <Title>Ti basta un elenco mirato? C&apos;è la ricerca in target.</Title>
            <Lead>
              Descrivi le aziende che cerchi, di qualunque settore, con zona e dimensione: ti consegniamo quelle che corrispondono, con sito controllato e contatto aziendale.
              Utile per coprire un mercato o preparare una campagna, quando il momento giusto lo scegli tu.
            </Lead>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Differenze tra ricerca in target e ricerca con opportunità</caption>
              <thead className="bg-paper-2 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Caratteristica</span></th>
                  <th scope="col" className="px-4 py-3 font-medium">In target</th>
                  <th scope="col" className="px-4 py-3 font-medium text-ledger">Con opportunità</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  ["Parti da", "Il profilo del cliente ideale", "Quello che vendi"],
                  ["Ricevi", "Azienda, sito, contatto", "In più: segnale, prova e punteggio"],
                  ["Ti dice", "Chi contattare", "Chi contattare e perché adesso"],
                  ["Costo per azienda", `${target} credito`, `${opportunity} crediti`],
                ].map(([k, a, b]) => (
                  <tr key={k}>
                    <th scope="row" className="px-4 py-3 font-normal text-muted">{k}</th>
                    <td className="px-4 py-3">{a}</td>
                    <td className="px-4 py-3 font-medium">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* 8. Le domande giuste (obiezioni) */}
      <Section label="Prima di provarlo" tone="ink">
        <Title className="text-white">Le domande che è giusto farsi.</Title>
        <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {OBJECTIONS(prices, freeCredits).map(([q, a]) => (
            <div key={q} className="border-t border-white/20 pt-5">
              <dt className="font-display text-lg font-semibold">{q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-white/70">{a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-12 text-sm text-white/60">Niente dati di persone: niente nomi, email personali o caselle gratuite. Solo i canali aziendali.</p>
      </Section>

      {/* 9. Prezzi */}
      <Section id="prezzi" label="Prezzi" tone="paper">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end">
          <Title>Paghi le aziende che ricevi. Non l&apos;accesso.</Title>
          <p className="text-ink-2">
            Una sola moneta, il credito. Prima di avviare una ricerca vedi quanto costa al massimo; alla fine paghi solo le aziende consegnate.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
            <p className="font-medium">Quanto costa un&apos;azienda</p>
            <ul className="mt-5 divide-y divide-line">
              {[
                ["Con opportunità", "Segnale verificato, prova e punteggio", opportunity, true],
                ["In target", "Dal nostro database, Italia", target, false],
                ["In target, ricerca estesa", "Filtri oltre il database o paesi esteri: +1 credito", extended, false],
              ].map(([name, note, credits, main]) => (
                <li key={String(name)} className="flex items-baseline justify-between gap-4 py-4">
                  <span>
                    <span className={cx("block", main ? "font-medium text-ink" : "text-ink-2")}>{name}</span>
                    <span className="text-xs text-muted">{note}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-lg">{credits} {credits === 1 ? "credito" : "crediti"}</span>
                    <span className="text-xs text-muted">{eur(Number(credits) * cheapCredit)}–{eur(Number(credits) * dearCredit)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Un credito costa da {eur(cheapCredit)} a {eur(dearCredit)}, in base al pacchetto o all&apos;abbonamento. Prezzi IVA esclusa.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-ink p-6 text-white sm:p-8">
              <p className="font-display text-2xl font-semibold">Inizia gratis</p>
              <p className="mt-2 text-sm text-white/75">
                {freeCredits} crediti senza carta: fino a {Math.floor(freeCredits / opportunity)} aziende con opportunità o {Math.min(free?.max_quantity_per_search ?? 10, Math.floor(freeCredits / target))} in target, su un mercato vero.
              </p>
              <ButtonLink href="/registrati" variant="secondary" className="mt-5 w-full sm:w-auto">Crea l&apos;account gratuito</ButtonLink>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-card p-5">
                <p className="font-medium">Pacchetti</p>
                <p className="mt-1 text-sm text-ink-2">Da {eur(Math.min(...packs.map((p) => p.price_cents)))}, una volta sola. Crediti validi 12 mesi.</p>
              </div>
              <div className="rounded-2xl border border-line bg-card p-5">
                <p className="font-medium">Abbonamenti</p>
                <p className="mt-1 text-sm text-ink-2">Da {eur(Math.min(...subs.map((p) => p.price_cents)))} al mese, credito più conveniente. Annulli quando vuoi.</p>
              </div>
            </div>
            <ButtonLink href="/prezzi" variant="secondary" className="self-start">Vedi tutti i piani</ButtonLink>
          </div>
        </div>
      </Section>

      {/* 10. FAQ */}
      <Section id="faq" label="Domande frequenti" tone="card">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div>
            <Title>Il resto, in breve.</Title>
            <p className="mt-4 text-ink-2">
              Altre domande? Scrivici a <a className="text-ledger underline" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span aria-hidden className="font-mono text-xl leading-none text-ledger transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* 11. Chiusura */}
      <section className="bg-ledger text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between md:py-20">
          <div>
            <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">La tua prossima email, con un motivo per essere letta.</h2>
            <p className="mt-4 text-white">{freeCredits} crediti gratuiti, nessuna carta. La prima ricerca richiede due minuti.</p>
          </div>
          <ButtonLink href="/registrati" size="lg" variant="secondary" className="shrink-0">Prova gratis <span aria-hidden>→</span></ButtonLink>
        </div>
      </section>
    </>
  );
}
