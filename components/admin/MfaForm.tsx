"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, KeyRound, Loader2, LogOut, TriangleAlert } from "lucide-react";
import { cheminApresMfa, codeTotpValide, MOTIF_CODE_TOTP } from "@/lib/securite/mfa";

type Activation = { factorId: string; qr: string; secret: string };

/**
 * Formulaire de la double authentification (page /admin/auth/mfa), même
 * gabarit que LoginForm :
 *  - `activation` : prépare le facteur (POST …/activation), affiche le code QR
 *    et la clé, puis vérifie le premier code (POST …/verification + factorId) ;
 *  - `verification` : code à 6 chiffres (POST …/verification) + déconnexion.
 * Succès → rechargement complet vers `next` (le middleware lit les nouveaux
 * témoins aal2).
 */
export default function MfaForm({ mode, next }: { mode: "activation" | "verification"; next: string }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [activation, setActivation] = useState<Activation | null>(null);
  const [preparation, setPreparation] = useState<"en_cours" | "prete" | "echec">(
    mode === "activation" ? "en_cours" : "prete",
  );
  const [copie, setCopie] = useState(false);
  // Une seule préparation par affichage (le mode strict de React rejoue les effets).
  const preparee = useRef(false);

  useEffect(() => {
    if (mode !== "activation" || preparee.current) return;
    preparee.current = true;
    (async () => {
      try {
        const res = await fetch("/admin/auth/mfa/activation", { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || typeof json?.factorId !== "string" || typeof json?.qr !== "string") {
          throw new Error(json?.error ?? "Une erreur est survenue. Recharge la page.");
        }
        setActivation({ factorId: json.factorId, qr: json.qr, secret: String(json.secret ?? "") });
        setPreparation("prete");
      } catch (err) {
        setPreparation("echec");
        setStatus("error");
        setError(err instanceof Error ? err.message : "Une erreur est survenue. Recharge la page.");
      }
    })();
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!codeTotpValide(code)) {
      setStatus("error");
      setError("Entre le code à 6 chiffres de ton application d'authentification.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/admin/auth/mfa/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "activation" && activation ? { code, factorId: activation.factorId } : { code },
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Une erreur est survenue.");
      // Rechargement complet : le middleware lit les nouveaux témoins (aal2).
      window.location.assign(cheminApresMfa(next));
    } catch (err) {
      setCode("");
      setStatus("error");
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  async function copier() {
    if (!activation?.secret) return;
    try {
      await navigator.clipboard.writeText(activation.secret);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers refusé : la clé reste affichée et sélectionnable.
    }
  }

  const busy = status === "loading";

  if (mode === "activation" && preparation === "en_cours") {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-admin-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Préparation du code QR…
      </div>
    );
  }

  const erreurAffichee = error && (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{error}</span>
    </div>
  );

  if (mode === "activation" && preparation === "echec") return erreurAffichee || null;

  return (
    <div className="space-y-5">
      {mode === "activation" && activation && (
        <div className="space-y-4">
          <p className="text-sm text-admin-ink">
            Scanne ce code QR avec ton application d&apos;authentification.
          </p>
          {/* Image data: SVG fournie par Supabase (permise par img-src de la CSP). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activation.qr}
            alt="Code QR de la double authentification"
            width={192}
            height={192}
            className="mx-auto h-48 w-48 rounded-[10px] border border-admin-line-strong bg-white p-2"
          />
          {activation.secret && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-admin-ink">Ou entre cette clé à la main</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-[10px] border border-admin-line-strong bg-admin-card px-4 py-3 font-mono text-[15px] text-admin-ink">
                  {activation.secret}
                </code>
                <button type="button" onClick={copier} className="admin-btn shrink-0">
                  {copie ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                  {copie ? "Copiée" : "Copier"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* method/action : sans JavaScript, l'envoi reste un POST (le code n'est jamais dans l'URL). */}
      <form method="post" action="/admin/auth/mfa/verification" onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="admin-code-mfa" className="mb-1.5 block text-sm font-medium text-admin-ink">
            Code à 6 chiffres
          </label>
          <div className="relative">
            <KeyRound
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted"
              aria-hidden
            />
            <input
              id="admin-code-mfa"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={MOTIF_CODE_TOTP}
              maxLength={6}
              required
              autoFocus={mode === "verification"}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (!busy) setStatus("idle");
              }}
              className="w-full rounded-[10px] border border-admin-line-strong bg-admin-card py-3 text-[15px] text-admin-ink placeholder:text-admin-faint transition-colors focus:border-[#6bd63b] focus:outline-none focus:ring-2 focus:ring-[#6bd63b]/40 pl-10 pr-4"
            />
          </div>
        </div>

        {erreurAffichee}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#257a10] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#1f6a0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Vérification…
            </>
          ) : (
            <>
              {mode === "activation" ? "Activer" : "Vérifier"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </form>

      {mode === "verification" && (
        <form method="post" action="/admin/auth/signout">
          <button
            type="submit"
            disabled={busy}
            className="mx-auto flex items-center gap-1.5 rounded-md text-sm font-medium text-admin-green underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] disabled:opacity-60"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Se déconnecter
          </button>
        </form>
      )}
    </div>
  );
}
