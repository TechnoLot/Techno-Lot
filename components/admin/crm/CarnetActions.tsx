"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BadgeCheck, Check, Loader2, Trash2 } from "lucide-react";
import { marquerVerifie, supprimerAcheteur } from "@/lib/acheteurs/actions";

const ROND =
  "admin-focus flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed";

/**
 * Actions d'une fiche du carnet des acheteurs, en deux boutons ronds :
 * « Vérifié » (coordonnées confirmées) et retrait en deux clics.
 */
export default function CarnetActions({ id, nom, verifie }: { id: string; nom: string; verifie: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmer || pending) return;
    const t = setTimeout(() => setConfirmer(false), 4000);
    return () => clearTimeout(t);
  }, [confirmer, pending]);

  function lancer(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setErreur(null);
    startTransition(async () => {
      const res = await action().catch(() => ({ ok: false as const, error: "Action impossible (connexion ?). Réessayez." }));
      if (res.ok) router.refresh();
      else setErreur(res.error);
    });
  }

  const libelleVerifie = verifie ? `${nom} : vérifié (cliquer pour retirer)` : `Marquer ${nom} comme vérifié`;
  const libelleRetrait = confirmer ? `Confirmer le retrait de ${nom}` : `Retirer ${nom} du carnet`;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => lancer(() => marquerVerifie({ id, verifie: !verifie }))}
          disabled={pending}
          aria-pressed={verifie}
          aria-label={libelleVerifie}
          title={libelleVerifie}
          className={`${ROND} ${
            verifie
              ? "border-transparent bg-[#5ECB33] text-[#0a0a0a]"
              : "border-admin-line bg-admin-card text-admin-muted hover:border-[#5ECB33] hover:text-admin-green"
          }`}
        >
          <BadgeCheck className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => (confirmer ? lancer(() => supprimerAcheteur(id)) : setConfirmer(true))}
          disabled={pending}
          aria-label={libelleRetrait}
          title={libelleRetrait}
          className={`${ROND} ${
            confirmer
              ? "border-admin-tint-red-line bg-admin-tint-red-strong text-admin-danger"
              : "border-admin-line bg-admin-card text-admin-muted hover:border-admin-tint-red-line hover:text-admin-danger"
          }`}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : confirmer ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {erreur && (
        <p role="alert" className="text-[12px] text-admin-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}
