"use client";

import { useState } from "react";
import { Calculator, Edit3, Sparkles } from "lucide-react";
import LotForm, { type LotFormInitial } from "@/components/admin/LotForm";
import PasteEmailPanel from "@/components/admin/PasteEmailPanel";
import type { LotSource } from "@/lib/admin/types";
import { formatMoney } from "@/lib/admin/format";
import type { CalcLotSummary } from "@/components/admin/SavedCalcLots";

export type CalcLotWithDesc = CalcLotSummary & { description: string };

type Tab = "manual" | "paste";

export default function NewLotTabs({
  calcLots = [],
}: {
  calcLots?: CalcLotWithDesc[];
}) {
  const [tab, setTab] = useState<Tab>("manual");
  const [initial, setInitial] = useState<LotFormInitial | undefined>(undefined);
  const [source, setSource] = useState<LotSource>("manual");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [selectedCalcLot, setSelectedCalcLot] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  function onExtracted(data: LotFormInitial, conf: number) {
    setInitial(data);
    setSource("email");
    setConfidence(conf);
    setSelectedCalcLot(null);
    setFormKey((k) => k + 1);
    setTab("manual");
  }

  function onSelectCalcLot(lot: CalcLotWithDesc) {
    setInitial({
      purchase_price: lot.offerPrice,
      description: lot.description || lot.name,
      notes: `Depuis calculatrice « ${lot.name} » — Valeur estimée : ${formatMoney(lot.offerPrice * 2.5)}, ${lot.unitCount} unité(s), ${lot.itemCount} item(s)`,
      status: "negotiating",
    });
    setSource("manual");
    setConfidence(null);
    setSelectedCalcLot(lot.id);
    setFormKey((k) => k + 1);
    setTab("manual");
  }

  return (
    <div>
      {calcLots.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            <Calculator className="h-3.5 w-3.5" aria-hidden />
            Pré-remplir depuis la calculatrice
          </h3>
          <div className="flex flex-wrap gap-2">
            {calcLots.map((lot) => (
              <button
                key={lot.id}
                type="button"
                onClick={() => onSelectCalcLot(lot)}
                className={`group rounded-xl border px-4 py-3 text-left transition ${
                  selectedCalcLot === lot.id
                    ? "border-accent/60 bg-accent/10 shadow-glow"
                    : "border-white/10 bg-white/[0.04] hover:border-accent/40"
                }`}
              >
                <p className="text-sm font-semibold text-white group-hover:text-accent-bright">
                  {lot.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatMoney(lot.offerPrice)} · {lot.unitCount} unité{lot.unitCount > 1 ? "s" : ""}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

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
          {selectedCalcLot && (
            <div className="mb-6 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-bright">
              Pré-rempli depuis la calculatrice. Ajuste le client et les détails avant d&apos;enregistrer.
            </div>
          )}
          <LotForm key={formKey} mode="create" initial={initial} source={source} />
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
