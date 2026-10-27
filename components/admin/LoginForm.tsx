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
        className="rounded-2xl border border-[#b7dca5] bg-[#eaf6e3] p-6 text-center"
      >
        <CheckCircle2 className="mx-auto h-9 w-9 text-[#257a10]" aria-hidden />
        <p className="mt-3 font-display text-lg font-semibold text-[#0a0a0a]">
          Lien envoyé.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#0a0a0a]">
          Vérifie la boîte de{" "}
          <span className="font-semibold text-[#0a0a0a]">{email}</span> et clique
          sur le lien pour te connecter. Tu pourras ensuite changer ton mot de
          passe dans « Mon compte ».
        </p>
      </div>
    );
  }

  const busy = status === "loading" || status === "sending-link";

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="admin-username"
          className="mb-1.5 block text-sm font-medium text-[#0a0a0a]"
        >
          Nom d&apos;utilisateur
        </label>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5a52]"
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
            className="w-full rounded-[10px] border border-[#c9d6c3] bg-white py-3 text-[15px] text-[#0a0a0a] placeholder:text-[#5f6b62] transition-colors focus:border-[#6bd63b] focus:outline-none focus:ring-2 focus:ring-[#6bd63b]/40 pl-10 pr-4"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="mb-1.5 block text-sm font-medium text-[#0a0a0a]"
        >
          Mot de passe
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5a52]"
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
            className="w-full rounded-[10px] border border-[#c9d6c3] bg-white py-3 text-[15px] text-[#0a0a0a] placeholder:text-[#5f6b62] transition-colors focus:border-[#6bd63b] focus:outline-none focus:ring-2 focus:ring-[#6bd63b]/40 pl-10 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#4f5a52] transition-colors hover:text-[#0a0a0a]"
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
          className="flex items-start gap-2 rounded-xl border border-[#f4c7c3] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]"
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
        title="Recevoir un lien de connexion par courriel"
        className="mx-auto flex items-center gap-1.5 rounded-md text-sm font-medium text-[#257a10] underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] disabled:opacity-60"
      >
        {status === "sending-link" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Mail className="h-3.5 w-3.5" aria-hidden />
        )}
        Mot de passe oublié ?
      </button>
    </form>
  );
}
