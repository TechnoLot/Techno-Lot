"use client";

import Link from "next/link";
import { Calculator, ExternalLink, FolderOpen } from "lucide-react";
import { formatMoney } from "@/lib/admin/format";

export type CalcLotSummary = {
  id: string;
  name: string;
  offerPrice: number;
  unitCount: number;
  itemCount: number;
  updatedAt: string;
};

export default function SavedCalcLots({
  lots,
}: {
  lots: CalcLotSummary[];
}) {
  if (lots.length === 0) return null;

  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-admin-line-soft px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-admin-ink">
          <Calculator className="h-4 w-4 text-admin-green" aria-hidden />
          Lots calculatrice
        </h2>
        <Link
          href="/admin/calculatrice/enregistres"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-admin-green hover:underline"
        >
          <FolderOpen className="h-3 w-3" aria-hidden />
          Voir tout
        </Link>
      </div>
      <ul className="divide-y divide-admin-line-soft">
        {lots.map((lot) => (
          <li key={lot.id}>
            <Link
              href={`/admin/calculatrice?lot=${lot.id}`}
              className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-admin-subtle"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-admin-ink group-hover:text-admin-green">
                  {lot.name}
                </p>
                <p className="mt-0.5 text-xs text-admin-muted">
                  {lot.itemCount} item{lot.itemCount > 1 ? "s" : ""} · {lot.unitCount} unité{lot.unitCount > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-display text-sm font-semibold tabular-nums text-admin-green">
                  {formatMoney(lot.offerPrice)}
                </span>
                <ExternalLink
                  className="h-3.5 w-3.5 text-admin-muted transition-colors group-hover:text-admin-green"
                  aria-hidden
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
