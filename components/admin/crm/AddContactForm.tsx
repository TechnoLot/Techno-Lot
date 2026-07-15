"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { createContact } from "@/lib/crm/actions";

/**
 * Saisie manuelle d'un contact TI (pas d'enrichissement automatique
 * branché) — formulaire repliable sur la fiche compagnie.
 */
export default function AddContactForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(async () => {
      const res = await createContact({
        company_id: companyId,
        first_name: fd.get("first_name") as string,
        last_name: fd.get("last_name") as string,
        title: fd.get("title") as string,
        email: fd.get("email") as string,
        phone: fd.get("phone") as string,
        linkedin_url: fd.get("linkedin_url") as string,
        notes: fd.get("notes") as string,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        form.reset();
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary !px-4 !py-2.5 !text-xs"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter un contact
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="glass w-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-sm font-semibold uppercase tracking-wider text-white">
          Nouveau contact
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-slate-400 hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="first_name" placeholder="Prénom" className="field !py-2.5 text-sm" />
        <input name="last_name" placeholder="Nom" className="field !py-2.5 text-sm" />
        <input
          name="title"
          placeholder="Titre (ex. : Directeur TI)"
          className="field !py-2.5 text-sm sm:col-span-2"
        />
        <input
          name="email"
          type="email"
          placeholder="Courriel"
          className="field !py-2.5 text-sm"
        />
        <input name="phone" placeholder="Téléphone" className="field !py-2.5 text-sm" />
        <input
          name="linkedin_url"
          type="url"
          placeholder="URL LinkedIn (optionnel)"
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
          className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary !px-5 !py-2 !text-xs disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-3.5 w-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
      </div>
    </form>
  );
}
