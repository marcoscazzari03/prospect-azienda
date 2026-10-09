"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Aggiorna la pagina mentre la ricerca è in corso.
export function AutoRefresh({ active, seconds = 8 }: { active: boolean; seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [active, seconds, router]);
  return null;
}
