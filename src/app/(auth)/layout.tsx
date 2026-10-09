import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.1fr]">
      <aside className="ruled relative hidden flex-col justify-between border-r border-line bg-card p-10 md:flex">
        <Logo />
        <blockquote className="max-w-md">
          <p className="font-display text-3xl font-semibold leading-tight">
            «Ogni contatto con la sua fonte. Nessuna email inventata.»
          </p>
          <p className="mt-4 text-ink-2">Paghi solo i lead consegnati. I crediti non usati tornano a te.</p>
        </blockquote>
        <p className="text-xs text-muted">
          <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/termini" className="underline">Termini</Link>
        </p>
      </aside>
      <main className="flex flex-col px-4 py-10 sm:px-10">
        <div className="md:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">{children}</div>
      </main>
    </div>
  );
}
