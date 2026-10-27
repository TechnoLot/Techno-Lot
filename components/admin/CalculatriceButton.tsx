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
      className="inline-flex items-center gap-2 rounded-full border border-admin-line-strong bg-admin-card px-4 py-2.5 text-[13px] font-semibold text-admin-ink transition-colors hover:bg-admin-page"
    >
      <Calculator className="h-4 w-4" aria-hidden />
      Calculatrice
    </button>
  );
}
