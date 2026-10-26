"use client";

import { useState } from "react";
import { Check, CheckCircle2, CircleDashed, Copy, FileText } from "lucide-react";
import type { ConfigStatus } from "@/lib/ads/types";
import { PlatformIcon } from "./PlatformBadge";

export const META_URL_PARAMS =
  "?utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}";

export const GOOGLE_URL_PARAMS =
  "{lpurl}?utm_source=google&utm_medium=paid&utm_campaign={campaignid}&utm_content={creative}&campaign_id={campaignid}&adset_id={adgroupid}&ad_id={creative}&placement={network}";

function CopyField({ label, value, hint }: { label: string; value: string; hint: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-300">{label}</p>
        <button
          type="button"
          onClick={copy}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            copied ? "border-accent/40 bg-accent/10 text-accent-bright" : "border-white/10 text-slate-300 hover:border-accent/40 hover:text-white"
          }`}
          aria-label={`Copier ${label}`}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? "Copié !" : "Copier"}
        </button>
      </div>
      <code className="mt-2 block max-h-28 overflow-auto break-all rounded-xl border border-white/10 bg-night-950/70 p-3 font-mono text-[11px] leading-relaxed text-accent-bright/90">
        {value}
      </code>
      <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>
      <span className="sr-only" aria-live="polite">{copied ? "Copié dans le presse-papiers" : ""}</span>
    </div>
  );
}

function Status({ ok, name, platform }: { ok: boolean; name: string; platform: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <PlatformIcon platform={platform} className="h-4 w-4 text-slate-300" />
        {name}
      </span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-bright">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Configuré
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
          <CircleDashed className="h-3.5 w-3.5" aria-hidden /> Non configuré
        </span>
      )}
    </li>
  );
}

/** Encart « Comment connecter » : statut des API + paramètres d'URL à copier. */
export default function ConnectGuide({ config }: { config: ConfigStatus }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Connexion des API</p>
        <ul className="mt-3 space-y-2">
          <Status ok={config.meta} name="Meta Ads (Facebook / Instagram)" platform="meta" />
          <Status ok={config.google} name="Google Ads" platform="google" />
        </ul>
        <ol className="mt-4 list-decimal space-y-1.5 pl-4 text-xs text-slate-400 marker:text-slate-600">
          <li>Ajoute les clés dans les variables d&apos;environnement du serveur.</li>
          <li>Colle les paramètres d&apos;URL dans chaque pub.</li>
          <li>Clique « Synchroniser » pour importer dépenses et impressions.</li>
        </ol>
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400">
          <FileText className="h-3.5 w-3.5 text-accent" aria-hidden />
          Guide complet : <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-slate-200">docs/PUBLICITES-SETUP.md</code>
        </p>
      </div>
      <div className="min-w-0 space-y-5">
        <CopyField
          label="Paramètres d'URL — Meta"
          value={META_URL_PARAMS}
          hint="Gestionnaire de pubs → Pub → Destination → Paramètres d'URL."
        />
        <CopyField
          label="Modèle de suivi — Google Ads"
          value={GOOGLE_URL_PARAMS}
          hint="Paramètres du compte ou de la campagne → Options d'URL → Modèle de suivi."
        />
      </div>
    </div>
  );
}
