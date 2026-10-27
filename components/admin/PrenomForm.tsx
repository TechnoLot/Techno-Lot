"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { updateAdminPrenom } from "@/app/admin/(dashboard)/compte/actions";
import { ADMIN_PRENOM_EVENT, PRENOM_MAX_LENGTH } from "@/lib/admin/config";

/** Champ « Prénom » de Mon compte : enregistré dans user_metadata.prenom. */
export default function PrenomForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [prenom, setPrenom] = useState(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = prenom.replace(/\s+/g, " ").trim();
    if (value.length < 1 || value.length > PRENOM_MAX_LENGTH) {
      setStatus("error");
      setError(`Le prénom doit contenir entre 1 et ${PRENOM_MAX_LENGTH} caractères.`);
      return;
    }
    setStatus("loading");
    const res = await updateAdminPrenom(value);
    if (!res.ok) {
      setStatus("error");
      setError(res.error);
      return;
    }
    setPrenom(res.prenom);
    setStatus("done");
    // La carte du menu se met à jour sans rechargement ; l'accueil au prochain rendu.
    window.dispatchEvent(new CustomEvent(ADMIN_PRENOM_EVENT, { detail: res.prenom }));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="admin-prenom" className="mb-1.5 block text-sm font-medium text-admin-ink">
          Prénom
        </label>
        <input
          id="admin-prenom"
          type="text"
          autoComplete="given-name"
          maxLength={PRENOM_MAX_LENGTH}
          value={prenom}
          onChange={(e) => {
            setPrenom(e.target.value);
            if (status !== "loading") setStatus("idle");
          }}
          aria-describedby="admin-prenom-aide"
          className="field"
        />
        <p id="admin-prenom-aide" className="mt-1.5 text-xs text-admin-muted">
          Affiché sur l&apos;accueil (« Bonjour {prenom.trim() || "…"} ») et dans le menu.
        </p>
      </div>

      {status === "error" && error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {status === "done" && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-admin-tint-green-line bg-admin-tint-green px-4 py-3 text-sm text-admin-green"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Prénom enregistré.</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Enregistrer le prénom
      </button>
    </form>
  );
}
