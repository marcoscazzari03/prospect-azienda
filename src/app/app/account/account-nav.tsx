"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const SECTIONS = [
  ["/app/account", "Profilo"],
  ["/app/account/sicurezza", "Sicurezza"],
  ["/app/account/fatturazione", "Piano e fatturazione"],
  ["/app/account/assistenza", "Assistenza e dati"],
] as const;

// Menu delle sezioni dell'account: una pagina per sezione.
export function AccountNav() {
  const path = usePathname();
  return (
    <ul className="flex gap-2 overflow-x-auto text-sm lg:flex-col lg:gap-1">
      {SECTIONS.map(([href, label]) => {
        const active = path === href;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx("block whitespace-nowrap rounded-lg px-3 py-2", active ? "bg-ledger-soft font-medium text-ledger-2" : "text-ink-2 hover:bg-paper-2 hover:text-ink")}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
