import { ExternalLink, Info, TriangleAlert } from "lucide-react";
import EbaySalesChart from "@/components/admin/ebay/EbaySalesChart";
import EbaySyncButton from "@/components/admin/ebay/EbaySyncButton";
import ConnectEbay, { type EbayEnvStatus } from "@/components/admin/ebay/ConnectEbay";
import { formatMoney } from "@/lib/admin/format";
import { ebayOrderStatus, type EbayOrderRow, type EbaySums } from "@/lib/ebay/totaux";
import type { EbaySyncStatus } from "@/lib/ebay/ventes";

export type EbayTile = { label: string; sums: EbaySums; highlight?: boolean };

const SELLER_HUB = "https://www.ebay.ca/sh/ovw";

const dateTimeFmt = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "America/Toronto",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "America/Toronto",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const card = "rounded-2xl border border-admin-line bg-admin-card";

/** Vue de la page Ventes eBay (données passées en props, sans accès réseau). */
export default function EbaySalesView({
  configured,
  env,
  status,
  tiles,
  daily,
  orders,
  live,
}: {
  configured: boolean;
  env: EbayEnvStatus;
  status: EbaySyncStatus;
  tiles: EbayTile[];
  daily: Array<{ day: string; total: number; orders: number }>;
  orders: EbayOrderRow[];
  /** Panneau « Boutique en direct » (Suspense), seulement si eBay est connecté */
  live?: React.ReactNode;
}) {
  const lastRunFailed =
    status.lastRun && !status.lastRun.ok && (!status.lastSync || status.lastRun.at > status.lastSync);
  const hasData = Boolean(status.lastSync) || orders.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-7 text-admin-ink sm:px-8 sm:py-9 lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-admin-ink sm:text-[32px]">
            Ventes eBay
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-admin-muted">
            Total payé par les acheteurs (articles, livraison et taxes). Les commandes annulées ou entièrement
            remboursées ne comptent pas.
          </p>
          <p className="mt-2 text-xs text-admin-muted">
            Dernière synchronisation :{" "}
            <span className="font-medium text-admin-ink">
              {status.lastSync ? dateTimeFmt.format(new Date(status.lastSync)) : "jamais"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <a
            href={SELLER_HUB}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-admin-line-strong bg-admin-card px-4 py-2 text-sm font-medium text-admin-ink transition-colors hover:border-admin-green"
          >
            Seller Hub <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
          <EbaySyncButton configured={configured} />
        </div>
      </header>

      {!configured && <ConnectEbay env={env} />}

      {lastRunFailed && status.lastRun && (
        <Notice tone="bad">
          La dernière synchronisation a échoué ({dateTimeFmt.format(new Date(status.lastRun.at))}) :{" "}
          {status.lastRun.message ?? "erreur inconnue"}
        </Notice>
      )}
      {configured && status.feesAvailable === false && (
        <Notice tone="warn">
          Les frais eBay ne sont pas accessibles : le jeton n’a pas le droit <code className="font-mono">sell.finances</code>.
          Les ventes comptent quand même, mais leurs frais ne sont retirés du profit que si eBay les indique dans la
          commande. Régénère le refresh token avec ce droit pour les avoir tous.
        </Notice>
      )}
      {configured && !hasData && (
        <Notice tone="info">eBay est connecté. Clique sur « Synchroniser avec eBay » pour importer les 12 derniers mois.</Notice>
      )}

      <section aria-label="Ventes par période" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {tiles.map((t) => (
          <Tile key={t.label} tile={t} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${card} min-w-0 p-5 lg:p-6 ${live ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <h2 className="font-display text-sm font-semibold text-admin-ink">Ventes par jour · 30 jours</h2>
          <EbaySalesChart data={daily} />
        </section>

        {live && (
          <section className={`${card} p-5 lg:p-6`}>
            <h2 className="font-display text-sm font-semibold text-admin-ink">
              Boutique en direct
            </h2>
            {live}
          </section>
        )}
      </div>

      <section className={`${card} p-5 lg:p-6`}>
        <h2 className="font-display text-sm font-semibold text-admin-ink">
          Dernières commandes <span className="font-normal text-admin-muted">· {orders.length}</span>
        </h2>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-admin-muted">
            {configured ? "Aucune commande enregistrée pour l’instant." : "Les commandes apparaîtront ici une fois eBay connecté."}
          </p>
        ) : (
          <div className="-mx-5 mt-4 overflow-x-auto px-5 lg:-mx-6 lg:px-6">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-admin-muted">
                <tr className="border-b border-admin-line-soft">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Article</th>
                  <th className="py-2 pr-4 font-medium">Acheteur</th>
                  <th className="py-2 pr-4 text-right font-medium">Total payé</th>
                  <th className="py-2 pr-4 text-right font-medium">Frais eBay</th>
                  <th className="py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line-soft">
                {orders.map((o) => (
                  <OrderRow key={o.order_id} order={o} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {configured && <ConnectEbay env={env} compact />}
    </div>
  );
}

function Tile({ tile }: { tile: EbayTile }) {
  const { sums, highlight } = tile;
  const sub = highlight ? "text-admin-ink/75" : "text-admin-muted";
  const fees =
    sums.orders === 0 ? null : sums.fees == null ? "frais inconnus" : `frais ${formatMoney(sums.fees)}`;
  return (
    <div
      className={`flex min-w-0 flex-col rounded-2xl p-4 lg:p-5 ${
        highlight ? "bg-[#6bd63b] text-admin-ink" : "border border-admin-line bg-admin-card"
      }`}
    >
      <p className={`text-xs font-medium ${sub}`}>{tile.label}</p>
      <p className="mt-2 truncate font-display text-2xl font-semibold tabular-nums tracking-tight lg:text-[28px]">
        {formatMoney(sums.revenue)}
      </p>
      <p className={`mt-1 text-xs tabular-nums ${sub}`}>
        {sums.orders} commande{sums.orders > 1 ? "s" : ""}
        {fees ? ` · ${fees}` : ""}
      </p>
    </div>
  );
}

const PILL: Record<"ok" | "warn" | "bad" | "neutral", string> = {
  ok: "bg-admin-tint-green text-admin-green",
  warn: "bg-admin-tint-amber text-admin-tint-amber-ink",
  bad: "bg-admin-tint-red-strong text-admin-danger",
  neutral: "bg-admin-tint-gray text-admin-muted",
};

function OrderRow({ order: o }: { order: EbayOrderRow }) {
  const item = o.items[0];
  const extra = o.items.length > 1 ? ` + ${o.items.length - 1} autre${o.items.length > 2 ? "s" : ""}` : "";
  const title = item?.title || `Commande ${o.order_id}`;
  const status = ebayOrderStatus(o);
  const excluded = status.tone === "bad";
  return (
    <tr className="align-top">
      <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-admin-muted">{dateFmt.format(new Date(o.created_at))}</td>
      <td className="max-w-[22rem] py-2.5 pr-4">
        <span className="block truncate font-medium text-admin-ink">
          {item?.itemId ? (
            <a
              href={`https://www.ebay.ca/itm/${item.itemId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-admin-green hover:underline"
            >
              {title}
            </a>
          ) : (
            title
          )}
        </span>
        {extra && <span className="text-xs text-admin-muted">{extra}</span>}
      </td>
      <td className="max-w-[10rem] truncate py-2.5 pr-4 text-admin-muted">{o.buyer ?? "—"}</td>
      <td className={`whitespace-nowrap py-2.5 pr-4 text-right tabular-nums ${excluded ? "text-admin-muted line-through" : "font-medium"}`}>
        {formatMoney(o.total, true)}
        {o.currency && o.currency !== "CAD" ? <span className="ml-1 text-xs text-admin-muted">{o.currency}</span> : null}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-admin-muted">
        {o.fees == null ? "—" : formatMoney(o.fees, true)}
      </td>
      <td className="py-2.5">
        <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${PILL[status.tone]}`}>
          {status.label}
        </span>
      </td>
    </tr>
  );
}

function Notice({ tone, children }: { tone: "info" | "warn" | "bad"; children: React.ReactNode }) {
  const styles = {
    info: "border-admin-line bg-admin-card text-admin-ink",
    warn: "border-admin-tint-amber-line bg-admin-tint-amber text-admin-ink",
    bad: "border-admin-tint-red-line bg-admin-tint-red text-admin-ink",
  }[tone];
  const Icon = tone === "info" ? Info : TriangleAlert;
  const iconColor = { info: "text-admin-green", warn: "text-admin-tint-amber-ink", bad: "text-admin-danger" }[tone];
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${styles}`} role="status">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden />
      <p className="min-w-0">{children}</p>
    </div>
  );
}
