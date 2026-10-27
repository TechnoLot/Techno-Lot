"use client";

import { useEffect, useState } from "react";
import { Calculator, X } from "lucide-react";

/** Nom d'événement pour ouvrir l'overlay depuis n'importe où dans l'admin. */
export const OPEN_CALCULATRICE_EVENT = "open-calculatrice";

/**
 * Overlay plein écran de la calculatrice — monté globalement dans AdminShell.
 * Ouvert via `window.dispatchEvent(new Event(OPEN_CALCULATRICE_EVENT))`, ce
 * qui évite toute navigation. L'iframe cible la route protégée /embed.
 */
export default function CalculatriceOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CALCULATRICE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CALCULATRICE_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calculatrice de lot"
      className="fixed inset-0 z-[100] flex flex-col bg-admin-page"
    >
      <div className="flex items-center justify-between border-b border-admin-line bg-admin-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-admin-ink">
          <Calculator className="h-4 w-4 text-admin-green" aria-hidden />
          Calculatrice de lot
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer la calculatrice"
          className="rounded-full border border-admin-line-strong bg-admin-card p-2 text-admin-ink transition-colors hover:bg-admin-page"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <iframe
        src="/admin/calculatrice/embed"
        title="Calculatrice de lot TechnoLot"
        className="block h-full w-full flex-1 border-0"
      />
    </div>
  );
}
