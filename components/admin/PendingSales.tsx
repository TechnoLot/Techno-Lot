import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

export default function PendingSales({ lots }: { lots: Lot[] }) {
  const pending = lots.filter(
    (l) => l.status === "purchased" && (l.sale_price == null),
  );

  return (
    <div className="glass p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle
            className="h-3.5 w-3.5 text-amber-400"
            aria-hidden
          />
          <h2 className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            Prix de vente manquant
          </h2>
        </div>
        {pending.length > 0 && (
          <span className="rounded-full bg-amber-400/10 px-2 py-0.5 font-display text-[10px] font-semibold tabular-nums text-amber-300">
            {pending.length}
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Tous les lots achetés ont un prix de vente enregistré.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {pending.slice(0, 8).map((lot) => (
            <li key={lot.id} className="py-3 first:pt-2 last:pb-0">
              <Link
                href={`/admin/lots/${lot.id}`}
                className="group flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white group-hover:text-accent-bright">
                    {lot.client_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Acheté le {formatDate(lot.purchased_at)} ·{" "}
                    {formatMoney(lot.purchase_price)}
                  </p>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-colors group-hover:text-accent"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
