"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { supprimerSoumission } from "@/lib/admin/soumissions-actions";

const COULEURS_REPOS =
  "border-admin-line bg-admin-card text-admin-muted hover:border-admin-tint-red-line hover:text-admin-danger";
const COULEURS_CONFIRMER = "border-admin-tint-red-line bg-admin-tint-red-strong text-admin-danger";

/**
 * Supprime une demande en deux clics : le premier arme la confirmation (qui se
 * ré-arme après 4 s), le second supprime. `compact` : bouton rond à icône
 * seule, élargi avec « Confirmer » pendant la confirmation.
 */
export default function SupprimerSoumission({
  id,
  nom,
  compact = false,
}: {
  id: string;
  nom: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Après le succès, le bouton garde « Suppression… » jusqu'au rafraîchissement de la liste.
  const [supprimee, setSupprimee] = useState(false);
  const occupe = pending || supprimee;

  useEffect(() => {
    if (!confirming || occupe) return;
    const timeout = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timeout);
  }, [confirming, occupe]);

  function handleClick() {
    if (!confirming) {
      setError(null);
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await supprimerSoumission(id).catch(() => ({
        ok: false as const,
        error: "Suppression impossible (connexion ?). Réessaie.",
      }));
      if (res.ok) {
        setSupprimee(true);
        router.refresh();
      } else {
        setConfirming(false);
        setError(res.error);
      }
    });
  }

  const qui = nom?.trim() || "sans nom";
  const libelle = `Supprimer la demande de ${qui}`;
  const couleurs = confirming || occupe ? COULEURS_CONFIRMER : COULEURS_REPOS;
  const rond = compact && !confirming && !occupe;
  const forme = rond
    ? "h-8 w-8 justify-center"
    : compact
      ? "h-8 gap-1.5 px-3 text-[13px] font-medium"
      : "gap-1.5 px-3 py-1.5 text-[13px] font-medium";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={occupe}
        aria-label={
          occupe ? undefined : confirming ? `Confirmer la suppression de la demande de ${qui}` : libelle
        }
        title={rond ? libelle : undefined}
        className={`admin-focus inline-flex items-center rounded-full border transition-colors disabled:opacity-70 ${forme} ${couleurs}`}
      >
        {occupe ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Suppression…
          </>
        ) : (
          <>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {confirming ? (compact ? "Confirmer" : "Confirmer la suppression") : compact ? null : "Supprimer"}
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="text-xs text-admin-danger">
          {error}
        </p>
      )}
    </div>
  );
}
