import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import StatusPill from "@/components/admin/StatusPill";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

/** « Derniers lots » : 5 lignes simples + lien vers tous les lots. */
export default function DerniersLots({ lots }: { lots: Lot[] }) {
  return (
    <section
      aria-labelledby="derniers-lots-titre"
      className="rounded-2xl border border-admin-line bg-admin-card"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <h2
          id="derniers-lots-titre"
          className="font-display text-lg font-semibold tracking-tight text-admin-ink"
        >
          Derniers lots
        </h2>
        <Link
          href="/admin/lots"
          className="admin-focus inline-flex shrink-0 items-center gap-1 rounded-md text-[13px] font-semibold text-admin-green hover:underline"
        >
          Tous les lots
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {lots.length === 0 ? (
        <div className="px-5 pb-8 pt-6 text-center">
          <Package className="mx-auto h-7 w-7 text-admin-faint" aria-hidden />
          <p className="mt-2 text-sm text-admin-muted">Aucun lot pour l&apos;instant.</p>
        </div>
      ) : (
        <ul className="pb-2">
          {lots.map((lot) => (
            <li key={lot.id} className="border-t border-admin-line-soft first:border-t-0">
              <Link
                href={`/admin/lots/${lot.id}`}
                className="admin-focus flex items-center gap-3 px-4 py-3 transition-colors hover:bg-admin-subtle sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-admin-ink">
                    {lot.client_name}
                  </p>
                  <p className="truncate text-[13px] text-admin-muted">
                    {formatDate(lot.purchased_at)}
                    {lot.description ? ` · ${lot.description}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <span className="font-display text-[15px] font-semibold tabular-nums text-admin-ink">
                    {formatMoney(Number(lot.purchase_price))}
                  </span>
                  <StatusPill status={lot.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
