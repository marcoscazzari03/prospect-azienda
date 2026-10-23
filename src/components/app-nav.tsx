"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

// Icone del menu (bozza del 23/10): tratto da 1,6 su 20×20; la casa della voce attiva è piena.
const ICONS: Record<string, string> = {
  home: "M3 9.5 10 3.5l7 6V17a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z",
  search: "M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM17 17l-3.5-3.5",
  file: "M5 3h6.5L15 6.5V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 3v4h4",
  users: "M7.5 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 17c0-3 2.4-5 5.5-5S13 14 13 17M13 3.2a3 3 0 0 1 0 5.6M15 12.2c1.8.6 3 2.4 3 4.8",
  coins: "M10 7c3.3 0 6-1.1 6-2.5S13.3 2 10 2 4 3.1 4 4.5 6.7 7 10 7zM4 4.5v4C4 9.9 6.7 11 10 11s6-1.1 6-2.5v-4M4 8.5v4C4 13.9 6.7 15 10 15s6-1.1 6-2.5v-4M4 12.5v3C4 16.9 6.7 18 10 18s6-1.1 6-2.5v-3",
  gear: "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16.2 12.2l1.3 1-1.6 2.8-1.6-.6a6 6 0 0 1-1.7 1l-.3 1.6H8.7l-.3-1.6a6 6 0 0 1-1.7-1l-1.6.6-1.6-2.8 1.3-1a6 6 0 0 1 0-2l-1.3-1 1.6-2.8 1.6.6a6 6 0 0 1 1.7-1L8.7 1.6h3.2l.3 1.6a6 6 0 0 1 1.7 1l1.6-.6 1.6 2.8-1.3 1a6 6 0 0 1 0 2z",
  help: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM7.8 7.6a2.3 2.3 0 0 1 4.4.9c0 1.5-2.2 2-2.2 3.3M10 14.4h.01",
  shield: "M10 3l6 2.5V10c0 3.5-2.6 6-6 7-3.4-1-6-3.5-6-7V5.5z",
  back: "M8 5l-5 5 5 5M3 10h14",
  // Solo amministrazione.
  list: "M4 5h12M4 10h12M4 15h8",
  coin: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 6v8M7.5 8.5h3.5a1.5 1.5 0 0 1 0 3H8.5",
  target: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  chart: "M4 16V9M10 16V4M16 16v-5M3 17h14",
};

// exact: attiva solo sull'indirizzo preciso; not: indirizzi sotto href che appartengono a un'altra voce.
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; not?: string };

export function AppNav({ items, secondary = [] }: { items: NavItem[]; secondary?: NavItem[] }) {
  const path = usePathname();
  const link = (it: NavItem, small: boolean) => {
    const active =
      (it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/")) &&
      !(it.not && (path === it.not || path.startsWith(it.not + "/")));
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex shrink-0 items-center gap-6 rounded-[10px] px-[18px] transition-colors",
          small ? "min-h-11 text-sm" : "min-h-[45px] text-[15px]",
          active ? "bg-ledger-soft font-medium text-ledger-2" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
        )}
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill={active && it.icon === "home" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={ICONS[it.icon]} />
        </svg>
        {it.label}
      </Link>
    );
  };
  return (
    <nav className="flex gap-1.5 overflow-x-auto md:flex-col" aria-label="Menu dell'app">
      {items.map((it) => link(it, false))}
      {secondary.length > 0 && (
        <>
          <hr className="my-4 hidden border-line md:block" />
          {secondary.map((it) => link(it, true))}
        </>
      )}
    </nav>
  );
}
