"use client";
import { useActionState } from "react";
import { createList, type LeadActionState } from "./actions";
import { Button } from "@/components/ui";

export function NewListForm() {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(createList, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input name="name" required maxLength={80} placeholder="Nuova lista (es. Da richiamare)" aria-label="Nome della nuova lista" className="h-8 w-56 rounded-lg border border-line bg-white px-3 text-xs" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>Crea lista</Button>
      {state.error && <span className="text-xs text-brick">{state.error}</span>}
      {state.info && <span className="text-xs text-ledger">{state.info}</span>}
    </form>
  );
}
