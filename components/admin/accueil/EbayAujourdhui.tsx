import Link from "next/link";
import { ArrowRight } from "lucide-react";
import EbayAutoSync from "@/components/admin/ebay/EbayAutoSync";
import { formatCount, formatMoney, pctChange } from "@/lib/admin/format";
import type { EbaySums } from "@/lib/ebay/totaux";

const card = "rounded-2xl border border-admin-line bg-admin-card p-4 sm:p-5";

/** « Ventes eBay aujourd'hui » : montant, commandes et comparaison avec hier (heure de Toronto). */
export default function EbayAujourdhui({
  configured,
  lastSync,
  today,
  yesterday,
}: {
  configured: boolean;
  /** Dernière synchro réussie (ISO) */
  lastSync: string | null;
  today: EbaySums;
  yesterday: EbaySums;
}) {
  const variation = yesterday.revenue === 0 ? null : pctChange(today.revenue, yesterday.revenue);
  const pctFmt = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0, signDisplay: "exceptZero" });

  return (
    <section aria-labelledby="ebay-aujourdhui-titre">
      <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="ebay-aujourdhui-titre"
          className="font-display text-lg font-semibold tracking-tight text-admin-ink"
        >
          Ventes eBay aujourd’hui
        </h2>
        <EbayAutoSync variant="badge" configured={configured} lastSync={lastSync} />
      </div>

      {!configured ? (
        <div className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="text-[15px] font-semibold leading-snug text-admin-ink">eBay pas encore connecté</p>
          <SeeLink />
        </div>
      ) : (
        <div className={card}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-admin-muted">Vendu aujourd’hui</p>
              <p className="mt-2 truncate font-display text-[34px] font-semibold leading-none tracking-tight tabular-nums text-admin-ink sm:text-[40px]">
                {formatMoney(today.revenue, true)}
              </p>
              {today.orders === 0 && (
                <p className="mt-2 text-[12.5px] leading-snug text-admin-muted">Aucune commande pour l’instant</p>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[13px] font-medium text-admin-muted">Commandes</p>
              <p className="mt-2 font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums text-admin-ink">
                {formatCount(today.orders)}
              </p>
              <p className="mt-2 text-[12.5px] leading-snug tabular-nums text-admin-muted">
                Hier : {formatCount(yesterday.orders)}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[13px] font-medium text-admin-muted">Hier</p>
              <p className="mt-2 truncate font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums text-admin-ink">
                {formatMoney(yesterday.revenue, true)}
              </p>
              {variation != null && (
                <p
                  className={`mt-2 text-[12.5px] font-semibold leading-snug tabular-nums ${
                    variation > 0 ? "text-admin-green" : variation < 0 ? "text-admin-danger" : "text-admin-muted"
                  }`}
                >
                  {pctFmt.format(Math.round(variation))} % aujourd’hui
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-admin-line-soft pt-3">
            <SeeLink />
          </div>
        </div>
      )}
    </section>
  );
}

function SeeLink() {
  return (
    <Link
      href="/admin/ventes-ebay"
      className="admin-focus inline-flex items-center gap-1 self-start rounded-md text-[13px] font-semibold text-admin-green hover:underline"
    >
      Voir les ventes eBay
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}
