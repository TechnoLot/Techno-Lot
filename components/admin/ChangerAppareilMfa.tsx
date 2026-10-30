"use client";

import { useState } from "react";
import { Loader2, Smartphone, TriangleAlert } from "lucide-react";
import { changerAppareilMfa } from "@/app/admin/(dashboard)/compte/actions";
import { urlMfa } from "@/lib/securite/mfa";

/**
 * Bouton « Changer d'appareil » de Mon compte : désinscrit le facteur actuel
 * (action serveur, session aal2 exigée) puis recharge /admin/auth/mfa, qui
 * propose l'activation d'un nouvel appareil.
 */
export default function ChangerAppareilMfa() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function changer() {
    setStatus("loading");
    setError("");
    let resultat: Awaited<ReturnType<typeof changerAppareilMfa>>;
    try {
      resultat = await changerAppareilMfa();
    } catch {
      resultat = { ok: false, error: "Une erreur est survenue. Réessaie." };
    }
    if (!resultat.ok) {
      setStatus("error");
      setError(resultat.error);
      return;
    }
    // Rechargement complet : nouveaux témoins (aal1), activation proposée.
    window.location.assign(urlMfa("/admin/compte"));
  }

  return (
    <div className="space-y-4">
      {status === "error" && error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      <button
        type="button"
        onClick={changer}
        disabled={status === "loading"}
        className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Smartphone className="h-4 w-4" aria-hidden />
        )}
        Changer d&apos;appareil
      </button>
    </div>
  );
}
