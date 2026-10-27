import type { Metadata } from "next";
import { Suspense } from "react";
import EbaySalesView, { type EbayTile } from "@/components/admin/ebay/EbaySalesView";
import EbayLivePanel, { EbayLiveSkeleton } from "@/components/admin/ebay/EbayLivePanel";
import { isEbayConfigured } from "@/lib/ebay/client";
import { addDays, dailyEbayRevenue, inTorontoRange, sumEbayOrders, torontoDay } from "@/lib/ebay/totaux";
import { getEbayOrderRows, getEbaySyncStatus, getRecentEbayOrders } from "@/lib/ebay/ventes";

export const metadata: Metadata = {
  title: "Ventes eBay — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PERIODS = [
  { label: "Aujourd’hui", days: 1, highlight: true },
  { label: "7 derniers jours", days: 7 },
  { label: "30 derniers jours", days: 30 },
  { label: "90 derniers jours", days: 90 },
] as const;

export default async function VentesEbayPage() {
  const configured = isEbayConfigured();
  const today = torontoDay();
  const from90 = addDays(today, -89);

  const [rows, orders, status] = await Promise.all([
    getEbayOrderRows(from90, today, ["created_at", "total", "refunded", "fees", "cancelled", "payment_status"]),
    getRecentEbayOrders(20),
    getEbaySyncStatus(),
  ]);

  const tiles: EbayTile[] = PERIODS.map((p) => {
    const from = addDays(today, -(p.days - 1));
    return {
      label: p.label,
      highlight: "highlight" in p ? p.highlight : false,
      sums: sumEbayOrders(rows.filter((r) => inTorontoRange(r.created_at, from, today))),
    };
  });

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
      tiles={tiles}
      daily={dailyEbayRevenue(rows, 30, today)}
      orders={orders}
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
