"use client";
import type { ComponentProps } from "react";
import { Button } from "./ui";

// Pulsante di invio che chiede conferma (azioni non annullabili).
export function ConfirmSubmit({ message, ...props }: ComponentProps<typeof Button> & { message: string }) {
  return <Button type="submit" {...props} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }} />;
}
