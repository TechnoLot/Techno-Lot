"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  TriangleAlert,
  User,
} from "lucide-react";

export default function LoginForm({
  email,
  next,
  initialError,
}: {
  email: string;
  next: string;
  initialError?: string;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "sending-link" | "sent" | "error"
  >(initialError ? "error" : "idle");
  const [error, setError] = useState(initialError ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setStatus("error");
      setError("Entre ton nom d'utilisateur et ton mot de passe.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/admin/auth/password", {
        method: "POST",
        body: new URLSearchParams({ username, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Une erreur est survenue.");
      // Rechargement complet : le middleware lit les nouveaux cookies.
      window.location.assign(next);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  /** Secours (mot de passe oublié) : lien magique au courriel officiel. */
  async function sendLink() {
    setStatus("sending-link");
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
          sur le lien pour te connecter. Tu pourras ensuite changer ton mot de
          passe dans « Mon compte ».
        </p>
      </div>
    );
  }

  const busy = status === "loading" || status === "sending-link";

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="admin-username"
          className="mb-1.5 block text-xs font-semibold text-slate-400"
        >
          Nom d&apos;utilisateur
        </label>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            id="admin-username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="field pl-10"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="mb-1.5 block text-xs font-semibold text-slate-400"
        >
          Mot de passe
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field pl-10 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-white"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
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
        disabled={busy}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Connexion…
          </>
        ) : (
          <>
            Se connecter
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={sendLink}
        disabled={busy}
        className="mx-auto flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-60"
      >
        {status === "sending-link" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Mail className="h-3.5 w-3.5" aria-hidden />
        )}
        Mot de passe oublié ? Recevoir un lien par courriel
      </button>
    </form>
  );
}
