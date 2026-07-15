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
      className="fixed inset-0 z-[100] flex flex-col bg-night-950"
    >
      <div className="flex items-center justify-between border-b border-white/5 bg-night-950/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Calculator className="h-4 w-4 text-accent" aria-hidden />
          Calculatrice de lot
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer la calculatrice"
          className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:border-accent/40 hover:text-accent-bright"
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
