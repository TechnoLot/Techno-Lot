"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Send } from "lucide-react";
import { sendTemplateEmail } from "@/lib/crm/actions";
import type { TemplateType } from "@/lib/crm/types";

/**
 * Boutons Relance 1/2/3 d'une ligne du suivi. `sentSteps` = étapes déjà
 * envoyées (affichées cochées mais réenvoyables au besoin).
 */
export default function FollowupActions({
  contactId,
  sentSteps,
  disabled,
}: {
  contactId: string;
  sentSteps: number[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function send(step: 1 | 2 | 3) {
    setBusy(step);
    setError(null);
    startTransition(async () => {
      const res = await sendTemplateEmail(
        contactId,
        `followup_${step}` as TemplateType,
      );
      setBusy(null);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        {([1, 2, 3] as const).map((step) => {
          const sent = sentSteps.includes(step);
          return (
            <button
              key={step}
              type="button"
              disabled={disabled || pending}
              onClick={() => send(step)}
              title={
                sent
                  ? `Relance ${step} déjà envoyée — cliquer pour renvoyer`
                  : `Envoyer la relance ${step}`
              }
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                sent
                  ? "border-accent/30 bg-accent/5 text-accent-bright/70"
                  : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:border-cyan-400/60"
              }`}
            >
              {busy === step ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : sent ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <Send className="h-3 w-3" aria-hidden />
              )}
              R{step}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-right text-[11px] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
