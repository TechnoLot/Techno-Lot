import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StatusPill from "@/components/admin/StatusPill";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

export default function RecentActivity({ lots }: { lots: Lot[] }) {
  return (
    <div className="glass p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
          Activité récente
        </h2>
        <Link
          href="/admin/lots"
          className="inline-flex items-center gap-1 text-xs text-accent transition-colors hover:text-accent-bright"
        >
          Tous les lots
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {lots.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Aucune activité pour l&apos;instant. Ajoute ton premier lot pour
          commencer.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {lots.map((lot) => (
            <li
              key={lot.id}
              className="flex items-center gap-3 py-3 first:pt-2 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {lot.client_name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(lot.purchased_at)}
                </p>
              </div>
              <StatusPill status={lot.status} />
              <span className="w-24 shrink-0 text-right font-display text-sm font-semibold tabular-nums text-white">
                {formatMoney(lot.purchase_price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
