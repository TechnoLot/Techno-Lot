"use client";

import { useState } from "react";
import { Edit3, Sparkles } from "lucide-react";
import LotForm, { type LotFormInitial } from "@/components/admin/LotForm";
import PasteEmailPanel from "@/components/admin/PasteEmailPanel";
import type { LotSource } from "@/lib/admin/types";

type Tab = "manual" | "paste";

export default function NewLotTabs() {
  const [tab, setTab] = useState<Tab>("manual");
  const [initial, setInitial] = useState<LotFormInitial | undefined>(undefined);
  const [source, setSource] = useState<LotSource>("manual");
  const [confidence, setConfidence] = useState<number | null>(null);

  function onExtracted(data: LotFormInitial, conf: number) {
    setInitial(data);
    setSource("email");
    setConfidence(conf);
    setTab("manual");
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Mode de saisie"
        className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1"
      >
        <TabButton
          active={tab === "manual"}
          onClick={() => setTab("manual")}
          icon={<Edit3 className="h-3.5 w-3.5" aria-hidden />}
        >
          Saisie manuelle
        </TabButton>
        <TabButton
          active={tab === "paste"}
          onClick={() => setTab("paste")}
          icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
        >
          Depuis un courriel
        </TabButton>
      </div>

      {tab === "paste" ? (
        <div className="glass p-6 sm:p-8">
          <PasteEmailPanel onExtracted={onExtracted} />
        </div>
      ) : (
        <div className="glass p-6 sm:p-8">
          {confidence !== null && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                confidence >= 0.7
                  ? "border-accent/30 bg-accent/10 text-accent-bright"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-200"
              }`}
            >
              L&apos;IA a extrait ces valeurs avec une confiance de{" "}
              <strong>{Math.round(confidence * 100)}%</strong>.
              {confidence < 0.7
                ? " Vérifie-les attentivement avant d'enregistrer."
                : " Un rapide coup d'œil et c'est bon."}
            </div>
          )}
          <LotForm mode="create" initial={initial} source={source} />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? "bg-accent text-night-950 shadow-glow"
          : "text-slate-400 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
