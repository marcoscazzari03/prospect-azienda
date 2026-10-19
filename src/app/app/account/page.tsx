import type { Metadata } from "next";
import { loadAccount } from "./account-data";
import { ProfileSection } from "./account-sections";

export const metadata: Metadata = { title: "Il mio account" };

export default async function AccountPage() {
  return <ProfileSection account={await loadAccount()} />;
}
