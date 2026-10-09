import { ButtonLink, Badge, Card, ProvenanceStamp } from "@/components/ui";
import { PriceCalculator } from "@/components/price-calculator";
import { BRAND } from "@/lib/config";

const STEPS = [
  {
    n: "01",
    title: "Descrivi chi cerchi",
    text: "Settore, paesi, città, dimensione, ruoli da contattare. In italiano, come lo spiegheresti a un collega.",
  },
  {
    n: "02",
    title: "Cerchiamo e verifichiamo",
    text: "Aziende reali dal web, sito ufficiale controllato, referente con il ruolo giusto, email trovate sul sito o verificate.",
  },
  {
    n: "03",
    title: "Scarichi e contatti",
    text: "Tabella filtrabile, export CSV per il tuo CRM. Paghi solo i lead consegnati, i crediti non usati tornano a te.",
  },
];

const FAQ = [
  {
    q: "Da dove arrivano i dati?",
    a: "Da fonti pubbliche: siti ufficiali delle aziende, pagine team, note legali, registri e articoli. Ogni lead riporta la pagina in cui abbiamo trovato la persona e quella in cui abbiamo trovato l'email.",
  },
  {
    q: "Inventate le email quando non le trovate?",
    a: "No. Un'email che deduciamo dal nome (nome.cognome@azienda) è marcata come «Ipotizzata», non costa crediti e non viene mai consegnata come contatto. Vendiamo solo email trovate sul sito ufficiale o verificate tecnicamente.",
  },
  {
    q: "E se la ricerca trova meno lead di quelli richiesti?",
    a: "Paghi solo quelli consegnati. Facciamo fino a due giri extra con ricerche diverse; se il mercato è più piccolo del previsto, i crediti riservati e non usati tornano subito disponibili.",
  },
  {
    q: "Posso ricevere lo stesso contatto due volte?",
    a: "No. Un contatto già consegnato al tuo account non ti viene mai riproposto né addebitato.",
  },
  {
    q: "Come funziona la garanzia?",
    a: "Se un'email rimbalza entro 30 giorni, o un lead non corrisponde ai filtri entro 14 giorni, lo segnali dalla scheda del lead e ti restituiamo i crediti.",
  },
  {
    q: "Posso usare i lead per l'email marketing?",
    a: "Le regole sulle comunicazioni commerciali cambiano da paese a paese (in Italia, ad esempio, l'invio di email promozionali richiede in genere il consenso). Sei tu a decidere come contattare i lead e a rispettare la normativa: nel prodotto trovi indicazioni e un testo di informativa da usare al primo contatto.",
  },
];

function LeadAnatomy() {
  return (
    <Card className="relative overflow-hidden p-0 shadow-[0_30px_60px_-30px_rgba(20,26,31,0.35)]">
      <div className="flex items-center justify-between border-b border-line bg-paper-2/70 px-5 py-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Scheda lead · esempio</p>
        <Badge tone="ledger">Qualità 92</Badge>
      </div>
      <div className="ruled px-5 pb-6 pt-5">
        <p className="font-display text-2xl font-semibold">Lucía García Pérez</p>
        <p className="text-ink-2">CEO · Agencia Norte Digital</p>
        <dl className="mt-5 grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span className="font-mono">lucia.garcia@nortedigital.es</span>
            <ProvenanceStamp status="found_public" type="personal" />
          </dd>
          <dt className="text-muted">Fonte email</dt>
          <dd className="font-mono text-xs text-ledger">nortedigital.es/equipo</dd>
          <dt className="text-muted">Ruolo</dt>
          <dd>Corrispondente a «Titolare / CEO»</dd>
          <dt className="text-muted">Azienda</dt>
          <dd>Madrid · 11-50 dipendenti · sito verificato</dd>
          <dt className="text-muted">Alternativa</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span className="font-mono">hola@nortedigital.es</span>
            <ProvenanceStamp status="found_public" type="generic" />
          </dd>
        </dl>
      </div>
      <div className="absolute -right-6 bottom-6 rotate-[-8deg] rounded-md border-2 border-stamp px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-stamp-ink opacity-80">
        Con fonte
      </div>
    </Card>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-24">
        <div className="animate-row-in">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ledger">Lead generation B2B · Europa</p>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            I tuoi prossimi clienti, con nome, ruolo e <em className="text-ledger">fonte</em>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-2">
            Descrivi chi cerchi. Troviamo sul web aziende reali e i referenti giusti, verifichiamo le email e paghi solo i
            lead che ricevi.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/registrati" size="lg">Prova gratis: 15 crediti</ButtonLink>
            <ButtonLink href="/prezzi" size="lg" variant="secondary">Vedi i prezzi</ButtonLink>
          </div>
          <p className="mt-4 text-sm text-muted">Nessuna carta richiesta · Nessuna email inventata</p>
        </div>
        <LeadAnatomy />
      </section>

      <section id="come-funziona" className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">Una ricerca su misura, non un database vecchio.</h2>
          <p className="mt-3 max-w-2xl text-ink-2">
            Ogni ordine parte da una ricerca nuova sul web, nella lingua del paese. Per questo funziona anche su nicchie locali e piccole
            imprese che i grandi database non coprono.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t-2 border-ink pt-5">
                <p className="font-mono text-sm text-ledger">{s.n}</p>
                <p className="mt-2 font-display text-xl font-semibold">{s.title}</p>
                <p className="mt-2 text-ink-2">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Ogni email dice da dove viene.</h2>
            <p className="mt-3 text-ink-2">
              Non scriviamo «verificata» su tutto. Ogni indirizzo ha uno stato esplicito, così sai quanto fidarti prima di premere invio.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              ["found_public", "Trovata sul sito", "Presente su una pagina pubblica del sito ufficiale. Ti diamo il link."],
              ["validated", "Verificata", "Confermata tecnicamente da un servizio di verifica della casella."],
              ["guessed", "Ipotizzata", "Dedotta dal nome. Te la mostriamo come suggerimento: non la vendiamo e non costa crediti."],
            ].map(([s, t, d]) => (
              <Card key={s} className="flex items-start gap-4 p-4">
                <ProvenanceStamp status={s} />
                <div>
                  <p className="font-medium">{t}</p>
                  <p className="text-sm text-ink-2">{d}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper-2/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Quanto costa? Lo vedi prima di iniziare.</h2>
          <p className="mb-8 mt-3 max-w-2xl text-ink-2">
            Un credito per lead con email generica, due per una nominativa, tre per una nominativa verificata. Riserviamo il massimo,
            addebitiamo il consumato.
          </p>
          <PriceCalculator />
          <div className="mt-6">
            <ButtonLink href="/prezzi" variant="secondary">Tutti i piani e i pacchetti</ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Rispetto alle alternative</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="py-3 pr-4 font-medium"></th>
                <th className="py-3 pr-4 font-medium text-muted">Liste comprate</th>
                <th className="py-3 pr-4 font-medium text-muted">Grandi database</th>
                <th className="py-3 font-display text-base font-semibold text-ledger">{BRAND.name}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Freschezza", "Ferme al giorno della vendita", "Aggiornate a cicli", "Cercate al momento dell'ordine"],
                ["Fonte del contatto", "Sconosciuta", "Raramente indicata", "Link per ogni lead"],
                ["Piccole imprese locali", "Variabile", "Copertura debole", "Ricerca nella lingua del paese"],
                ["Pagamento", "Tutto in anticipo", "Abbonamento annuale", "Solo lead consegnati"],
                ["Duplicati", "Frequenti", "Gestiti", "Mai due volte lo stesso contatto"],
              ].map(([k, a, b, c]) => (
                <tr key={k} className="border-b border-line">
                  <td className="py-3 pr-4 font-medium">{k}</td>
                  <td className="py-3 pr-4 text-ink-2">{a}</td>
                  <td className="py-3 pr-4 text-ink-2">{b}</td>
                  <td className="py-3 font-medium">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Domande frequenti</h2>
            <p className="mt-3 text-ink-2">
              Altro? Scrivici a <a className="text-ledger underline" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span aria-hidden className="font-mono text-ledger transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ledger text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Prova con i tuoi clienti ideali.</h2>
            <p className="mt-2 text-paper/80">15 crediti gratuiti, nessuna carta. La prima ricerca richiede due minuti.</p>
          </div>
          <ButtonLink href="/registrati" size="lg" variant="stamp">Crea l&apos;account gratuito</ButtonLink>
        </div>
      </section>
    </>
  );
}
