import type { Metadata } from "next";
import { loadAccount } from "../account-data";
import { SupportSection } from "../account-sections";

export const metadata: Metadata = { title: "Assistenza e dati" };

export default async function SupportPage() {
  return <SupportSection account={await loadAccount()} />;
}
