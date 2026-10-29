import type { Metadata } from "next";
import { Suspense } from "react";
import EbaySalesView from "@/components/admin/ebay/EbaySalesView";
import EbayLivePanel, { EbayLiveSkeleton } from "@/components/admin/ebay/EbayLivePanel";
import { isEbayConfigured } from "@/lib/ebay/client";
import { dailyEbayRevenue, monthlyEbayRevenue, sumEbayOrders, torontoDay, type EbayRevenuePoint } from "@/lib/ebay/totaux";
import { getEbayOrderRows, getEbayOrdersPage, getEbaySyncStatus } from "@/lib/ebay/ventes";
import { bornesPeriode, granularitePeriode, parsePeriode, periodePrecedente, type PeriodeKey } from "@/lib/admin/periodes";
import { pageDepuisParam } from "@/lib/admin/pagination";

export const metadata: Metadata = {
  title: "Ventes eBay — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const OPTIONS: PeriodeKey[] = ["aujourdhui", "hier", "semaine", "7j", "30j", "90j", "annee", "tout"];
const PAR_PAGE = 25;

export default async function VentesEbayPage({
  searchParams,
}: {
  searchParams: { periode?: string; page?: string };
}) {
  const configured = isEbayConfigured();
  const today = torontoDay();
  const lue = parsePeriode(searchParams.periode, "30j");
  const periode: PeriodeKey = OPTIONS.includes(lue) ? lue : "30j";
  const { from, to } = bornesPeriode(periode, today);
  const prev = periodePrecedente(periode, today);

  const [rows, prevRows, ordersPage, status] = await Promise.all([
    getEbayOrderRows(from, to, ["created_at", "total", "refunded", "fees", "cancelled", "payment_status"]),
    prev
      ? getEbayOrderRows(prev.from, prev.to, ["total", "refunded", "fees", "cancelled", "payment_status"])
      : Promise.resolve(null),
    getEbayOrdersPage(from, to, pageDepuisParam(searchParams.page), PAR_PAGE),
    getEbaySyncStatus(),
  ]);

  const sums = sumEbayOrders(rows);
  const granularite = granularitePeriode(periode);

  let chart: EbayRevenuePoint[] | null = null;
  // Un seul jour (ex. « Cette semaine » un lundi) : pas de graphique.
  if (granularite === "jour" && from && to && from !== to) {
    chart = dailyEbayRevenue(rows, from, to);
  } else if (granularite === "mois") {
    const moisCourant = today.slice(0, 7);
    // Les lignes arrivent triées par date croissante : la première est la plus ancienne.
    const premier = from ? from.slice(0, 7) : rows[0] ? torontoDay(rows[0].created_at).slice(0, 7) : moisCourant;
    chart = monthlyEbayRevenue(rows, premier, moisCourant);
  }

  return (
    <EbaySalesView
      configured={configured}
      env={{
        appId: Boolean(process.env.EBAY_APP_ID),
        certId: Boolean(process.env.EBAY_CERT_ID),
        refreshToken: Boolean(process.env.EBAY_REFRESH_TOKEN),
        marketplace: Boolean(process.env.EBAY_MARKETPLACE_ID),
      }}
      status={status}
      periode={periode}
      options={OPTIONS}
      from={from}
      to={to}
      sums={sums}
      prevRevenue={prevRows ? sumEbayOrders(prevRows).revenue : null}
      chart={chart}
      granularite={granularite === "mois" ? "mois" : "jour"}
      orders={ordersPage.rows}
      ordersTotal={ordersPage.total}
      page={ordersPage.page}
      pageCount={ordersPage.pageCount}
      parPage={PAR_PAGE}
      live={
        configured ? (
          <Suspense fallback={<EbayLiveSkeleton />}>
            <EbayLivePanel />
          </Suspense>
        ) : undefined
      }
    />
  );
}
