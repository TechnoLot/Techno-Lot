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
        className="inline-flex items-center justify-center gap-2 rounded-full border border-admin-line-strong bg-admin-card px-5 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter un contact
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="glass w-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-base font-semibold text-admin-ink">
          Nouveau contact
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="rounded-full border border-admin-line-strong bg-admin-card p-1.5 text-admin-muted hover:bg-admin-page hover:text-admin-ink"
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
          className="mt-3 rounded-lg border border-admin-tint-red-line bg-admin-tint-red px-3 py-2 text-xs text-admin-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-admin-line-strong bg-admin-card px-5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-page"
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
          Enregistrer
        </button>
      </div>
    </form>
  );
}
