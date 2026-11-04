"use client";

import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  TriangleAlert,
  User,
} from "lucide-react";
import { cheminInterne } from "@/lib/securite/chemin-interne";

export default function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">(
    initialError ? "error" : "idle",
  );
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Une erreur est survenue.");
      // Rechargement complet : le middleware lit les nouveaux cookies.
      // Défense en profondeur : `next` est déjà filtré par la page (serveur).
      window.location.assign(cheminInterne(next));
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  const busy = status === "loading";

  return (
    // method/action : sans JavaScript (ou avant l'hydratation), l'envoi natif
    // reste un POST vers la route — le mot de passe n'est jamais dans l'URL.
    <form
      method="post"
      action="/admin/auth/password"
      onSubmit={submit}
      className="space-y-5"
      noValidate
    >
      <input type="hidden" name="next" value={cheminInterne(next)} />
      <div>
        <label
          htmlFor="admin-username"
          className="mb-1.5 block text-sm font-medium text-admin-ink"
        >
          Nom d&apos;utilisateur
        </label>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted"
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
            className="w-full rounded-[10px] border border-admin-line-strong bg-admin-card py-3 text-[15px] text-admin-ink placeholder:text-admin-faint transition-colors focus:border-[#6bd63b] focus:outline-none focus:ring-2 focus:ring-[#6bd63b]/40 pl-10 pr-4"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="mb-1.5 block text-sm font-medium text-admin-ink"
        >
          Mot de passe
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted"
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
            className="w-full rounded-[10px] border border-admin-line-strong bg-admin-card py-3 text-[15px] text-admin-ink placeholder:text-admin-faint transition-colors focus:border-[#6bd63b] focus:outline-none focus:ring-2 focus:ring-[#6bd63b]/40 pl-10 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-admin-muted transition-colors hover:text-admin-ink"
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
          className="flex items-start gap-2 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#257a10] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#1f6a0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? (
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
    </form>
  );
}
