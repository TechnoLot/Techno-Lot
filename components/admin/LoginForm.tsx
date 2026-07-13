"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail, TriangleAlert } from "lucide-react";

export default function LoginForm({
  email,
  next,
  initialError,
}: {
  email: string;
  next: string;
  initialError?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    initialError ? "error" : "idle",
  );
  const [error, setError] = useState(initialError ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/admin/auth/request", {
        method: "POST",
        body: new URLSearchParams({ next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Une erreur est survenue.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-accent/30 bg-accent/10 p-6 text-center"
      >
        <CheckCircle2 className="mx-auto h-9 w-9 text-accent" aria-hidden />
        <p className="mt-3 font-display text-lg font-semibold text-white">
          Lien envoyé.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Vérifie la boîte de{" "}
          <span className="font-semibold text-white">{email}</span> et clique
          sur le lien pour te connecter. Il expire dans quelques minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {/* Affichage de l'adresse (non modifiable) */}
      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          Destinataire
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent" aria-hidden />
          <span className="font-medium text-white">{email}</span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Envoi…
          </>
        ) : (
          <>
            Envoyer le lien de connexion
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
