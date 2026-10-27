"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { createCompany } from "@/lib/crm/actions";

/**
 * Bouton « Ajouter un prospect » du dashboard CRM : ouvre un formulaire
 * modal minimal (nom requis, reste optionnel) et redirige vers la fiche
 * de la nouvelle compagnie pour y ajouter les contacts TI.
 */
export default function AddCompanyButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const employees = fd.get("employee_count");
      const score = fd.get("fit_score");
      const res = await createCompany({
        name: (fd.get("name") as string) ?? "",
        domain: fd.get("domain") as string,
        industry: fd.get("industry") as string,
        region: fd.get("region") as string,
        employee_count: employees ? Number(employees) : null,
        main_phone: fd.get("main_phone") as string,
        fit_score: score ? Number(score) : null,
        street_address: fd.get("street_address") as string,
        notes: fd.get("notes") as string,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.push(`/admin/crm/${res.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary !px-4 !py-2.5 !text-sm"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter un prospect
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0a0f1c]/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-company-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={submit}
            className="glass w-full max-w-lg p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <p
                id="add-company-title"
                className="font-display text-lg font-semibold text-[#0a0a0a]"
              >
                Nouveau prospect
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-full border border-[#c9d6c3] bg-white p-1.5 text-[#4f5a52] hover:bg-[#f4f7f2] hover:text-[#0a0a0a]"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="name"
                required
                autoFocus
                placeholder="Nom de la compagnie *"
                className="field !py-2.5 text-sm sm:col-span-2"
              />
              <input
                name="domain"
                placeholder="Site web (ex. : exemple.ca)"
                className="field !py-2.5 text-sm"
              />
              <input
                name="industry"
                placeholder="Industrie"
                className="field !py-2.5 text-sm"
              />
              <input
                name="region"
                placeholder="Région (ex. : Montréal)"
                className="field !py-2.5 text-sm"
              />
              <input
                name="employee_count"
                type="number"
                min={1}
                placeholder="Nb employés"
                className="field !py-2.5 text-sm"
              />
              <input
                name="main_phone"
                placeholder="Téléphone principal"
                className="field !py-2.5 text-sm"
              />
              <input
                name="fit_score"
                type="number"
                min={1}
                max={10}
                placeholder="Fit score (1-10)"
                className="field !py-2.5 text-sm"
              />
              <input
                name="street_address"
                placeholder="Adresse (optionnel)"
                className="field !py-2.5 text-sm sm:col-span-2"
              />
              <textarea
                name="notes"
                placeholder="Notes (optionnel)"
                rows={2}
                className="field !py-2.5 text-sm sm:col-span-2"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-[#f4c7c3] bg-[#fef3f2] px-3 py-2 text-xs text-[#b42318]"
              >
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#c9d6c3] bg-white px-5 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending}
                className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                )}
                Créer le prospect
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
