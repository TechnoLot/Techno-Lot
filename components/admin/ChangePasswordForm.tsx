"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { changerMotDePasse } from "@/lib/admin/mot-de-passe-actions";

// Mêmes bornes que l'action serveur (qui vérifie de toute façon).
const MIN_LENGTH = 12;
const MAX_LENGTH = 72;

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!current) {
      setStatus("error");
      setError("Entre ton mot de passe actuel.");
      return;
    }
    const longueur = [...password].length;
    if (longueur < MIN_LENGTH) {
      setStatus("error");
      setError(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`);
      return;
    }
    if (longueur > MAX_LENGTH) {
      setStatus("error");
      setError(`Le mot de passe doit contenir au plus ${MAX_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setStatus("loading");
    let resultat: Awaited<ReturnType<typeof changerMotDePasse>>;
    try {
      resultat = await changerMotDePasse({ actuel: current, nouveau: password });
    } catch {
      resultat = { ok: false, error: "Une erreur est survenue. Réessaie." };
    }
    if (!resultat.ok) {
      setStatus("error");
      setError(resultat.error);
      return;
    }
    setCurrent("");
    setPassword("");
    setConfirm("");
    setStatus("done");
  }

  const changer = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (status !== "loading") setStatus("idle");
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-admin-ink">
          Mot de passe actuel
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={changer(setCurrent)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-admin-ink">
          Nouveau mot de passe
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={changer(setPassword)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-admin-ink">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={changer(setConfirm)}
          className="field"
        />
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
          <span>
            Mot de passe enregistré. Tes autres appareils ont été déconnectés ; utilise-le à ta
            prochaine connexion.
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Enregistrer le mot de passe
      </button>
    </form>
  );
}
