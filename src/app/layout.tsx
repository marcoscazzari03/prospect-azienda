import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { BRAND } from "@/lib/config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

// Per tutti i settori: la ricerca in target vale per chiunque venda alle aziende.
const DESCRIPTION =
  "Per agenzie, imprese e professionisti con partita IVA che vendono alle aziende, in ogni settore: aziende in target per settore e zona con il contatto aziendale, e opportunità commerciali verificate con la prova. Paghi solo quelle consegnate.";

export const metadata: Metadata = {
  title: { default: `${BRAND.name} · ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: DESCRIPTION,
  openGraph: { type: "website", locale: "it_IT", siteName: BRAND.name, description: DESCRIPTION },
  metadataBase: new URL(`https://${BRAND.domain}`),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
