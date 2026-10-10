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
        description="Inserisci la tua email: dopo la conferma la aggiungiamo a una lista di esclusione permanente e non verrà più consegnata a nessun cliente. Conserviamo solo un'impronta cifrata dell'indirizzo, non l'indirizzo in chiaro."
      />
      <Card className="p-6">
        <OptoutForm captchaKey={captchaSiteKey()} />
      </Card>
    </div>
  );
}
