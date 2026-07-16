"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { markFollowupDone } from "@/lib/crm/actions";

/**
 * « Suivi fait » : remet le compteur de statut à zéro et efface la date
 * de rappel planifiée — le rappel disparaît jusqu'au prochain délai ou
 * à la prochaine note datée.
 */
export default function FollowupDoneButton({
  companyId,
}: {
  companyId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setError(false);
        startTransition(async () => {
          const res = await markFollowupDone(companyId);
          if (!res.ok) setError(true);
          else router.refresh();
        });
      }}
      title="Marque le suivi comme fait — le rappel reviendra après le prochain délai"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${
        error
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-amber-400/30 bg-amber-400/10 text-amber-200 hover:border-amber-400/60"
      }`}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <Check className="h-3 w-3" aria-hidden />
      )}
      {error ? "Erreur — réessayer" : "Suivi fait"}
    </button>
  );
}
