"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCompany } from "@/lib/crm/actions";

/**
 * Bouton « Supprimer le prospect » sur la fiche compagnie : double-clic
 * pour confirmer (la confirmation se ré-arme après 3 s), puis redirige
 * vers /admin/crm. Supprime en cascade les contacts + activités.
 */
export default function DeleteCompanyButton({
  companyId,
  companyName,
  hasConvertedContacts,
}: {
  companyId: string;
  companyName: string;
  hasConvertedContacts: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      const res = await deleteCompany(companyId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/admin/crm");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        title={
          hasConvertedContacts
            ? `Attention : ${companyName} a un contact converti (client). La compagnie et ses contacts seront supprimés ; les lots liés restent intacts.`
            : `Supprimer ${companyName} et tous ses contacts + activités`
        }
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${
          confirming
            ? "border-red-500/60 bg-red-500/20 text-red-200"
            : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-red-500/40 hover:text-red-300"
        }`}
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-3 w-3" aria-hidden />
        )}
        {confirming ? "Confirmer la suppression" : "Supprimer le prospect"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
