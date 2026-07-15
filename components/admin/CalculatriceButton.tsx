"use client";

import { Calculator } from "lucide-react";
import { OPEN_CALCULATRICE_EVENT } from "@/components/admin/CalculatriceOverlay";

/** Bouton pilule qui ouvre l'overlay calculatrice sans naviguer. */
export default function CalculatriceButton() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new Event(OPEN_CALCULATRICE_EVENT))
      }
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-accent/40 hover:text-accent-bright"
    >
      <Calculator className="h-4 w-4" aria-hidden />
      Calculatrice
    </button>
  );
}
