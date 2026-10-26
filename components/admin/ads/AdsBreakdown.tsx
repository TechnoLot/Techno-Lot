"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { BreakdownItem } from "@/lib/ads/types";
import { formatCount, formatMoney, formatPct } from "./format";

export type BreakdownTab = { key: string; label: string; items: BreakdownItem[]; note?: string };

const PALETTE = ["#5ECB33", "#34D399", "#22D3EE", "#8BE95F", "#F472B6", "#FBBF24", "#94A3B8", "#A78BFA"];

/**
 * Répartition (source / réseau / appareil) : barre de part empilée +
 * liste détaillée visites, leads, conversion, dépense.
 */
export default function AdsBreakdown({ tabs, title = "Répartition" }: { tabs: BreakdownTab[]; title?: string }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const reduce = useReducedMotion();
  const uid = useId();
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  const items = tab?.items ?? [];
  const totalVisits = items.reduce((s, i) => s + i.visits, 0);
  const totalLeads = items.reduce((s, i) => s + i.leads, 0);
  const base = totalVisits > 0 ? "visits" : "leads";
  const total = base === "visits" ? totalVisits : totalLeads;
  const max = Math.max(1, ...items.map((i) => i[base]));

  return (
    <section className="glass p-5 sm:p-6" aria-labelledby={`${uid}-t`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${uid}-t`} className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
          {title}
        </h2>
        {tabs.length > 1 && (
          <div role="tablist" aria-label={title} className="inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                id={`${uid}-${t.key}`}
                aria-selected={t.key === tab?.key}
                aria-controls={`${uid}-panel`}
                type="button"
                onClick={() => setActive(t.key)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  t.key === tab?.key ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-${tab?.key}`} className="mt-5">
        {items.length === 0 || total === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Aucune donnée pour l&apos;instant.</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab?.key}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.05]" aria-hidden>
                {items.map((it, i) => (
                  <motion.span
                    key={it.key}
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${(it[base] / total) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05 }}
                    style={{ background: PALETTE[i % PALETTE.length] }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                  />
                ))}
              </div>

              <ul className="mt-4 space-y-3">
                {items.map((it, i) => {
                  const share = total > 0 ? it[base] / total : 0;
                  const conv = it.visits > 0 ? it.leads / it.visits : null;
                  return (
                    <li key={it.key}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden />
                          <span className="truncate font-medium text-slate-200">{it.label}</span>
                          <span className="shrink-0 text-[11px] text-slate-500">{formatPct(share, 0)}</span>
                        </span>
                        <span className="shrink-0 text-right text-xs tabular-nums text-slate-400">
                          <strong className="font-semibold text-white">{formatCount(it.visits)}</strong> visites ·{" "}
                          <strong className="font-semibold text-accent-bright">{formatCount(it.leads)}</strong> leads
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: PALETTE[i % PALETTE.length], opacity: 0.8 }}
                          initial={reduce ? false : { width: 0 }}
                          animate={{ width: `${(it[base] / max) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
                        />
                      </div>
                      <p className="mt-1 flex gap-3 text-[11px] text-slate-500">
                        <span>Conv. {formatPct(conv)}</span>
                        {it.spend > 0 && <span>Dépense {formatMoney(it.spend)}</span>}
                        {it.spend > 0 && it.leads > 0 && <span>CPL {formatMoney(it.spend / it.leads, true)}</span>}
                      </p>
                    </li>
                  );
                })}
              </ul>
              {tab?.note && <p className="mt-4 text-[11px] text-slate-500">{tab.note}</p>}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
