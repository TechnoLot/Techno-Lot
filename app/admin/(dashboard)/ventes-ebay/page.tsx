import type { Metadata } from "next";
import { ExternalLink, MessageSquare, RotateCcw, Tag, Truck, TriangleAlert } from "lucide-react";
import KpiCards from "@/components/admin/KpiCards";
import EbaySalesChart from "@/components/admin/ebay/EbaySalesChart";
import { formatMoney } from "@/lib/admin/format";
import {
  getActiveListingsCount,
  getActiveReturnsCount,
  getDailyRevenue,
  getFeedbackSummary,
  getRecentOrders,
  getSummary,
  getTrafficReport,
} from "@/lib/ebay/client";

export const metadata: Metadata = {
  title: "Ventes eBay — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SELLER_HUB = "https://www.ebay.ca/sh/ovw";

async function loadData() {
  try {
    const [summary, orders, daily, listings, feedback, traffic, returns] = await Promise.all([
      getSummary(),
      getRecentOrders(20),
      getDailyRevenue(30),
      getActiveListingsCount(),
      getFeedbackSummary(),
      getTrafficReport(90),
      getActiveReturnsCount(),
    ]);
    return { ok: true as const, summary, orders, daily, listings, feedback, traffic, returns };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

export default async function VentesEbayPage() {
  const data = await loadData();

  if (!data.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Ventes eBay</h1>
        <div className="glass p-6 text-sm text-slate-300">
          <p className="font-medium text-red-400">Impossible de charger les données eBay.</p>
          <p className="mt-2 text-slate-400">{data.error}</p>
          <p className="mt-2 text-slate-500">
            Vérifie que EBAY_APP_ID, EBAY_CERT_ID et EBAY_REFRESH_TOKEN (compte eBay Techno Lot) sont
            définis côté serveur.
          </p>
        </div>
      </div>
    );
  }

  const { summary, orders, daily, listings, feedback, traffic, returns } = data;

  const actions = [
    {
      label: "À expédier",
      value: `${summary.awaitingShipCount} commande${summary.awaitingShipCount > 1 ? "s" : ""}`,
      href: "https://www.ebay.ca/sh/ord/?filter=status:AWAITING_SHIPMENT",
      icon: Truck,
      hot: summary.awaitingShipCount > 0,
    },
    {
      label: "Retours et remboursements",
      value: `${returns} en cours`,
      href: "https://www.ebay.ca/sh/ord/returns",
      icon: RotateCcw,
      hot: returns > 0,
    },
    {
      label: "Messages",
      value: "Ouvrir",
      href: "https://www.ebay.ca/cnt/viewMessage?group_type=CORE&conversation_type=FROM_MEMBERS&status=UNREAD",
      icon: MessageSquare,
      hot: false,
    },
    {
      label: "Offres éligibles",
      value: `${listings} annonces`,
      href: "https://www.ebay.ca/sh/lst/active?pill_status=sioEligible",
      icon: Tag,
      hot: false,
    },
    {
      label: "Litiges",
      value: "Ouvrir",
      href: "https://www.ebay.ca/sh/resolutions?filter=ISSUE_STATE%3AAWAITING_DECISION",
      icon: TriangleAlert,
      hot: false,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="glass flex flex-wrap items-center justify-between gap-5 p-5 lg:p-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Ventes eBay</h1>
          <p className="mt-1 text-sm text-slate-400">
            Techno Lot · eBay.ca{summary.user?.username ? ` · ${summary.user.username}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <StoreMetric
            label="Feedback"
            value={feedback.score ? `${feedback.score} · ${feedback.positivePercent}%` : "—"}
          />
          <StoreMetric label="Annonces actives" value={listings.toLocaleString("fr-CA")} />
          <StoreMetric label="Commandes 90 j" value={summary.ordersCount90d.toLocaleString("fr-CA")} />
          <StoreMetric label="Vues 90 j" value={traffic.views.toLocaleString("fr-CA")} />
          <a href={SELLER_HUB} target="_blank" rel="noopener" className="btn-primary inline-flex items-center gap-2 text-sm">
            Seller Hub <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </header>

      <KpiCards
        cards={[
          { label: "Aujourd'hui", value: summary.salesToday, prev: null, format: "money", variant: "green" },
          { label: "7 derniers jours", value: summary.sales7d, prev: null, format: "money" },
          { label: "30 derniers jours", value: summary.sales30d, prev: null, format: "money", variant: "gradient" },
          { label: "90 derniers jours", value: summary.sales90d, prev: null, format: "money" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass p-5 lg:col-span-2 lg:p-6">
          <h2 className="font-display text-sm font-semibold text-white">Ventes par jour · 30 jours</h2>
          <EbaySalesChart data={daily.map(([day, total]) => ({ day, total }))} />
        </section>

        <section className="glass p-5 lg:p-6">
          <h2 className="font-display text-sm font-semibold text-white">Actions à faire</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {actions.map((a) => (
              <li key={a.label}>
                <a
                  href={a.href}
                  target="_blank"
                  rel="noopener"
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    a.hot
                      ? "border-accent/40 bg-accent/10 text-white"
                      : "border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/10"
                  }`}
                >
                  <a.icon className={`h-4 w-4 ${a.hot ? "text-accent" : "text-slate-500"}`} aria-hidden />
                  <span className="flex-1">{a.label}</span>
                  <span className="tabular-nums text-slate-400">{a.value}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="glass p-5 lg:p-6">
        <h2 className="font-display text-sm font-semibold text-white">
          Dernières ventes eBay <span className="font-normal text-slate-500">· {orders.length}</span>
        </h2>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucune vente dans les 30 derniers jours.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Article</th>
                  <th className="py-2 pr-4 text-right font-medium">Prix</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Acheteur</th>
                  <th className="py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((o) => {
                  const item = o.items[0];
                  const title = item?.title ?? `Commande ${o.id ?? ""}`;
                  const cancelled = (o.status ?? "").toUpperCase() === "CANCELLED";
                  return (
                    <tr key={o.id} className="text-slate-300">
                      <td className="max-w-[28rem] truncate py-2.5 pr-4 font-medium text-white">
                        {item?.url ? (
                          <a href={item.url} target="_blank" rel="noopener" className="hover:text-accent-bright">
                            {title}
                          </a>
                        ) : (
                          title
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{formatMoney(o.total, true)}</td>
                      <td className="py-2.5 pr-4 tabular-nums text-slate-400">
                        {o.date
                          ? new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(o.date))
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400">{o.buyer ?? "—"}</td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            cancelled ? "bg-red-500/10 text-red-400" : "bg-accent/15 text-accent-bright"
                          }`}
                        >
                          {cancelled ? "Annulé" : "Vendu"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StoreMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-lg font-semibold tabular-nums text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
    </div>
  );
}
