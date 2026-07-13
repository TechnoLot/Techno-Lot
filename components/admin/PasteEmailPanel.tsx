"use client";

import { useState } from "react";
import { Loader2, Sparkles, TriangleAlert } from "lucide-react";
import type { LotFormInitial } from "@/components/admin/LotForm";

type ExtractedData = {
  client_name?: string;
  client_email?: string | null;
  client_phone?: string | null;
  purchase_price?: number | null;
  description?: string | null;
  status?: "negotiating" | "purchased" | "sold" | null;
  confidence?: number;
};

export default function PasteEmailPanel({
  onExtracted,
}: {
  onExtracted: (data: LotFormInitial, confidence: number) => void;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/parse-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Erreur inconnue.");
      const ex: ExtractedData = json.extracted ?? {};
      onExtracted(
        {
          client_name: ex.client_name ?? "",
          client_email: ex.client_email ?? null,
          client_phone: ex.client_phone ?? null,
          purchase_price: ex.purchase_price ?? undefined,
          description: ex.description ?? null,
          status: ex.status ?? "purchased",
        },
        ex.confidence ?? 0,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="email-paste"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Colle le courriel
        </label>
        <textarea
          id="email-paste"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          rows={12}
          className="field resize-y font-mono text-xs leading-relaxed"
          placeholder={`Ex :\n\nBonjour,\n\nSuite à notre discussion, je confirme l'achat du lot de 25 ordinateurs portables Dell Latitude pour un montant de 4 200 $. Je pourrai passer les prendre vendredi.\n\nMerci,\nClient X\ntel : 514-555-0100`}
        />
        <p className="mt-2 text-xs text-slate-500">
          L&apos;IA va extraire le client, le montant et un résumé, puis pré-remplir le formulaire. Tu vérifies et enregistres.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={analyze}
        disabled={pending || email.trim().length < 20}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Analyse en cours…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" aria-hidden />
            Analyser avec l&apos;IA
          </>
        )}
      </button>
    </div>
  );
}
