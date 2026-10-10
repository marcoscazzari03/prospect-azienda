"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const ICONS: Record<string, string> = {
  home: "M3 10.5L10 4l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z",
  plus: "M10 4v12M4 10h12",
  list: "M4 5h12M4 10h12M4 15h8",
  users: "M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 8c0-3 2.2-5 5-5s5 2 5 5M13 9a3 3 0 1 0 0-6M15 12c2 .5 3 2.4 3 5",
  coin: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 6v8M7.5 8.5h3.5a1.5 1.5 0 0 1 0 3H8.5",
  shield: "M10 3l6 2.5V10c0 3.5-2.6 6-6 7-3.4-1-6-3.5-6-7V5.5z",
  back: "M8 5l-5 5 5 5M3 10h14",
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

export function AppNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((it) => {
        const active = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors",
              active ? "bg-ledger-soft font-medium text-ledger-2" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
            )}
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={ICONS[it.icon]} />
            </svg>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
