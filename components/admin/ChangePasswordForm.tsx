"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 10;

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_LENGTH) {
      setStatus("error");
      setError(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setStatus("loading");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setStatus("error");
      setError(
        updateError.code === "same_password"
          ? "C'est déjà ton mot de passe actuel."
          : updateError.code === "weak_password"
            ? "Mot de passe trop faible. Allonge-le ou ajoute des chiffres et symboles."
            : `Supabase : ${updateError.message}`,
      );
      return;
    }
    setPassword("");
    setConfirm("");
    setStatus("done");
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">
          Nouveau mot de passe
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (status !== "loading") setStatus("idle");
          }}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (status !== "loading") setStatus("idle");
          }}
          className="field"
        />
      </div>

      {status === "error" && error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[#f4c7c3] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {status === "done" && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-[#b7dca5] bg-[#eaf6e3] px-4 py-3 text-sm text-[#257a10]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Mot de passe enregistré. Utilise-le à ta prochaine connexion.</span>
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
