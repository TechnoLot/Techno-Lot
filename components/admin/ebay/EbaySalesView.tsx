import { ExternalLink, Info, TriangleAlert } from "lucide-react";
import EbaySalesChart from "@/components/admin/ebay/EbaySalesChart";
import EbayAutoSync from "@/components/admin/ebay/EbayAutoSync";
import ConnectEbay, { type EbayEnvStatus } from "@/components/admin/ebay/ConnectEbay";
import PeriodeSelect from "@/components/admin/PeriodeSelect";
import Pagination from "@/components/admin/Pagination";
import { formatCount, formatMoney } from "@/lib/admin/format";
import { resumePage } from "@/lib/admin/pagination";
import { libellePeriode, type PeriodeKey } from "@/lib/admin/periodes";
import { ebayOrderStatus, type EbayOrderRow, type EbayRevenuePoint, type EbaySums } from "@/lib/ebay/totaux";
import type { EbaySyncStatus } from "@/lib/ebay/ventes";

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

// Jours « YYYY-MM-DD » sans heure : formatés en UTC pour éviter tout décalage.
const jourCourtFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", day: "numeric", month: "short" });
const jourAnneeFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const jourLongFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

function jourUtc(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** « Du 30 sept. au 29 oct. 2026 », « Jeudi 29 octobre » ou « Depuis le début ». */
function legendeDates(from: string | null, to: string | null): string {
  if (!from || !to) return "Depuis le début";
  if (from === to) {
    const s = jourLongFmt.format(jourUtc(from));
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const debut = from.slice(0, 4) === to.slice(0, 4) ? jourCourtFmt.format(jourUtc(from)) : jourAnneeFmt.format(jourUtc(from));
  return `Du ${debut} au ${jourAnneeFmt.format(jourUtc(to))}`;
}

/** Libellé de la période de comparaison ; null s'il n'y en a pas. */
function vsPrecedente(periode: PeriodeKey): string | null {
  switch (periode) {
    case "aujourdhui":
      return "vs la veille";
    case "hier":
      return "vs avant-hier";
    case "semaine":
      return "vs la semaine d’avant";
    case "7j":
      return "vs les 7 jours d’avant";
    case "30j":
      return "vs les 30 jours d’avant";
    case "90j":
      return "vs les 90 jours d’avant";
    default:
      return null;
  }
}

/** Sous-ligne de la tuile « Ventes » : variation vs la période précédente. */
function variation(periode: PeriodeKey, revenue: number, prev: number | null): string | null {
  const vs = vsPrecedente(periode);
  if (prev == null || !vs) return null;
  if (prev === 0) return "Rien la période d’avant";
  const pct = Math.round(((revenue - prev) / prev) * 100);
  const fleche = pct > 0 ? "↑ " : pct < 0 ? "↓ " : "";
  return `${fleche}${formatCount(Math.abs(pct))} % ${vs}`;
}

const card = "rounded-2xl border border-admin-line bg-admin-card";

/** Vue de la page Ventes eBay (données passées en props, sans accès réseau). */
export default function EbaySalesView({
  configured,
  env,
  status,
  periode,
  options,
  from,
  to,
  sums,
  prevRevenue,
  chart,
  granularite,
  orders,
  ordersTotal,
  page,
  pageCount,
  parPage,
  live,
}: {
  configured: boolean;
  env: EbayEnvStatus;
  status: EbaySyncStatus;
  periode: PeriodeKey;
  options: PeriodeKey[];
  /** Bornes de la période (jours inclusifs, Toronto) ; null = sans borne */
  from: string | null;
  to: string | null;
  sums: EbaySums;
  /** Ventes de la période précédente, null s'il n'y a pas de comparaison */
  prevRevenue: number | null;
  /** Série du graphique, null pour aujourd'hui et hier */
  chart: EbayRevenuePoint[] | null;
  granularite: "jour" | "mois";
  /** Commandes de la page courante */
  orders: EbayOrderRow[];
  ordersTotal: number;
  page: number;
  pageCount: number;
  parPage: number;
  /** Panneau « Boutique en direct » (Suspense), seulement si eBay est connecté */
  live?: React.ReactNode;
}) {
  const lastRunFailed =
    status.lastRun && !status.lastRun.ok && (!status.lastSync || status.lastRun.at > status.lastSync);
  const hasData = Boolean(status.lastSync) || ordersTotal > 0;
  const libelle = libellePeriode(periode);
  const net = sums.revenue - (sums.fees ?? 0);

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
          <EbayAutoSync configured={configured} lastSync={status.lastSync} />
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
        <Notice tone="info">eBay est connecté. La première synchronisation importe les 12 derniers mois ; elle démarre automatiquement.</Notice>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <PeriodeSelect current={periode} options={options} />
        <p className="text-[13px] text-admin-muted">{legendeDates(from, to)}</p>
      </div>

      <section aria-label="Ventes de la période" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Tile label="Ventes" value={formatMoney(sums.revenue)} sub={variation(periode, sums.revenue, prevRevenue)} highlight />
        <Tile label="Commandes" value={formatCount(sums.orders)} sub="annulées et remboursées exclues" />
        <Tile
          label="Frais eBay"
          value={sums.fees == null ? "—" : formatMoney(sums.fees)}
          sub={
            sums.fees == null
              ? "inconnus"
              : sums.ordersWithoutFees > 0
                ? `${sums.ordersWithoutFees} commande${sums.ordersWithoutFees > 1 ? "s" : ""} sans frais connus`
                : null
          }
        />
        <Tile
          label="Net après frais"
          value={formatMoney(net)}
          sub={sums.fees == null ? "frais inconnus non retirés" : "ventes − frais eBay"}
        />
      </section>

      {(chart || live) && (
        <div className="grid gap-6 lg:grid-cols-3">
          {chart && (
            <section className={`${card} min-w-0 p-5 lg:p-6 ${live ? "lg:col-span-2" : "lg:col-span-3"}`}>
              <h2 className="font-display text-sm font-semibold text-admin-ink">
                {granularite === "mois" ? "Ventes par mois" : "Ventes par jour"} · {libelle}
              </h2>
              <EbaySalesChart data={chart} granularite={granularite} />
            </section>
          )}

          {live && (
            <section className={`${card} p-5 lg:p-6 ${chart ? "" : "lg:col-span-3"}`}>
              <h2 className="font-display text-sm font-semibold text-admin-ink">
                Boutique en direct
              </h2>
              {live}
            </section>
          )}
        </div>
      )}

      <section className={`${card} p-5 lg:p-6`}>
        <h2 className="font-display text-sm font-semibold text-admin-ink">
          Commandes · {libelle} <span className="font-normal text-admin-muted">· {formatCount(ordersTotal)}</span>
        </h2>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-admin-muted">
            {configured ? `Aucune commande ${libelle.startsWith("les ") ? "dans " : ""}${libelle}.` : "Les commandes apparaîtront ici une fois eBay connecté."}
          </p>
        ) : (
          <>
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
            <div className="mt-5 flex flex-col items-center gap-2">
              <Pagination page={page} pageCount={pageCount} scroll={false} />
              <p className="text-[13px] text-admin-muted tabular-nums">
                {resumePage(page, parPage, ordersTotal)} commandes
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string | null;
  highlight?: boolean;
}) {
  const subTone = highlight ? "text-admin-ink/75" : "text-admin-muted";
  return (
    <div
      className={`flex min-w-0 flex-col rounded-2xl p-4 lg:p-5 ${
        highlight ? "bg-[#6bd63b] text-admin-ink" : "border border-admin-line bg-admin-card"
      }`}
    >
      <p className={`text-xs font-medium ${subTone}`}>{label}</p>
      <p className="mt-2 truncate font-display text-2xl font-semibold tabular-nums tracking-tight lg:text-[28px]">
        {value}
      </p>
      {sub && <p className={`mt-1 text-xs tabular-nums ${subTone}`}>{sub}</p>}
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
