import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { OptoutForm } from "./optout-form";
import { captchaSiteKey } from "@/lib/server/captcha";

export const metadata: Metadata = { title: "Rimuovi i tuoi dati" };
export const dynamic = "force-dynamic";

export default function OptoutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <PageHeader
        eyebrow="Diritto di opposizione"
        title="Non vuoi comparire nei nostri risultati?"
        description="Inserisci un'email della tua attività. Dopo la conferma cancelliamo subito i dati di contatto collegati dal nostro database, anche dai lead già consegnati ai clienti (che vedono la tua opposizione), e la aggiungiamo a una lista di esclusione permanente: non verrà più consegnata a nessun cliente. Se la tua azienda compare solo con il modulo di contatto, usa un'email del tuo dominio e spunta «Escludi anche tutte le altre email». Della lista conserviamo solo un'impronta cifrata, non l'indirizzo in chiaro."
      />
      <Card className="p-6">
        <OptoutForm captchaKey={captchaSiteKey()} />
      </Card>
    </div>
  );
}
