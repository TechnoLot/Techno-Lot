import type { Prix } from "@/lib/acheteurs/types";

/* Affichage des prix de l'agent « Acheteurs » (logique pure, serveur et navigateur). */

const nombreFmt = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 });

function devise(code: string | null): string {
  if (code === "USD") return "$ US";
  if (code === "CAD") return "$ CA";
  return code ?? "$";
}

/** « 175 à 472 $ US », « 160 $ US », « Prix inconnu ». */
export function formaterPrix(p: Prix): string {
  if (p.bas == null && p.haut == null) return "Prix inconnu";
  const d = devise(p.devise);
  if (p.bas == null || p.haut == null || p.bas === p.haut) {
    return `${nombreFmt.format((p.bas ?? p.haut) as number)} ${d}`;
  }
  return `${nombreFmt.format(p.bas)} à ${nombreFmt.format(p.haut)} ${d}`;
}
