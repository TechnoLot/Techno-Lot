"use client";

import Link from "next/link";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ArrowRight, Megaphone } from "lucide-react";
import {
  AD_PLATFORMS,
  AD_PLATFORM_ORDER,
  type AdPlatform,
} from "@/lib/ads/platforms";

/** État vide commun aux blocs de suivi publicitaire. */
export function TrackingEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.07] px-4 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-slate-500">
        <Megaphone className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-200">{title}</p>
      <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-slate-500">{text}</p>
      <Link href="/admin/pubs" className="admin-btn mt-4">
        Voir les publicités
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/**
 * Répartition des leads (table ad_leads) par plateforme d'origine sur la
 * période. Survol d'une ligne = mise en évidence du segment.
 */
export default function TrackingSources({
  counts,
}: {
  counts: Partial<Record<AdPlatform, number>>;
}) {
  const [hover, setHover] = useState<AdPlatform | null>(null);
  const data = AD_PLATFORM_ORDER.map((key) => ({
    key,
    name: AD_PLATFORMS[key].label,
    color: AD_PLATFORMS[key].color,
    value: counts[key] ?? 0,
  }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <section className="admin-card flex flex-col p-5 sm:p-6" aria-labelledby="sources-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="sources-title" className="admin-card-title">
          Sources des leads
        </h2>
        {total > 0 && (
          <span className="text-xs text-slate-500">
            {total} lead{total > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {total === 0 ? (
        <TrackingEmpty
          title="Aucun lead attribué"
          text="Les demandes de soumission arrivées par une pub, Google ou un lien direct seront réparties ici."
        />
      ) : (
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={data.length > 1 ? 2 : 0}
                  dataKey="value"
                  stroke="none"
                  animationDuration={700}
                >
                  {data.map((d) => (
                    <Cell
                      key={d.key}
                      fill={d.color}
                      opacity={hover && hover !== d.key ? 0.25 : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-semibold tabular-nums text-white">
                {hover ? (counts[hover] ?? 0) : total}
              </span>
              <span className="text-[11px] text-slate-500">
                {hover ? `${Math.round(((counts[hover] ?? 0) / total) * 100)} %` : "leads"}
              </span>
            </div>
          </div>

          <ul className="w-full flex-1 space-y-1">
            {data.map((d) => (
              <li
                key={d.key}
                onMouseEnter={() => setHover(d.key)}
                onMouseLeave={() => setHover(null)}
                className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  hover === d.key ? "bg-white/[0.04]" : ""
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: d.color }}
                    aria-hidden
                  />
                  <span className="truncate text-slate-300">{d.name}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-display font-semibold text-white">{d.value}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {Math.round((d.value / total) * 100)} %
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
