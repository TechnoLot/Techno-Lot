import { BadgeCheck, CircleDashed } from "lucide-react";

/**
 * Indique si un courriel/téléphone est vérifié. Par défaut rien n'est
 * vérifié (pas de service d'enrichissement branché) — le badge gris
 * rappelle que la donnée est une estimation.
 */
export default function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-admin-tint-green px-2 py-0.5 text-xs font-medium text-admin-green">
        <BadgeCheck className="h-3 w-3" aria-hidden />
        Vérifié
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-admin-tint-gray px-2 py-0.5 text-xs font-medium text-admin-muted"
      title="Donnée devinée (pattern courriel, recherche web) — à confirmer manuellement"
    >
      <CircleDashed className="h-3 w-3" aria-hidden />
      Non vérifié
    </span>
  );
}
