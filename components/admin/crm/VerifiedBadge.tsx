import { BadgeCheck, CircleDashed } from "lucide-react";

/**
 * Indique si un courriel/téléphone est vérifié. Par défaut rien n'est
 * vérifié (pas de service d'enrichissement branché) — le badge gris
 * rappelle que la donnée est une estimation.
 */
export default function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-bright">
        <BadgeCheck className="h-3 w-3" aria-hidden />
        Vérifié
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
      title="Donnée devinée (pattern courriel, recherche web) — à confirmer manuellement"
    >
      <CircleDashed className="h-3 w-3" aria-hidden />
      Non vérifié
    </span>
  );
}
