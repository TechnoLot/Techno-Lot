import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PERIODS, type Lot, type PeriodKey } from "@/lib/admin/types";
import { previousPeriodBounds, startOfPeriod } from "@/lib/admin/dates";
import PeriodPills from "@/components/admin/PeriodPills";
import KpiCards, { type KpiSpec } from "@/components/admin/KpiCards";
import LotsChart from "@/components/admin/LotsChart";
import TopClients from "@/components/admin/TopClients";
import RecentActivity from "@/components/admin/RecentActivity";

export const dynamic = "force-dynamic";

type Sale = { sale_price: number | string; sold_at: string };
type Metrics = { count: number; spent: number; revenue: number; profit: number };

function computeMetrics(lots: Lot[], sales: Sale[]): Metrics {
  let spent = 0;
  for (const l of lots) {
    spent += Number(l.purchase_price);
  }
  let revenue = 0;
  for (const s of sales) {
    revenue += Number(s.sale_price);
  }
  return {
    count: lots.length,
    spent,
    revenue,
    profit: revenue - spent,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = (
    PERIODS.find((p) => p.key === searchParams.period)?.key ?? "30d"
  ) as PeriodKey;

  const supabase = createClient();

  const start = startOfPeriod(period);
  const query = supabase
    .from("lots")
    .select("*")
    .order("purchased_at", { ascending: false });
  const { data: lotsRaw, error } = start
    ? await query.gte("purchased_at", start)
    : await query;
  const lots = (lotsRaw ?? []) as Lot[];

  const salesQuery = supabase.from("sales").select("sale_price, sold_at");
  const { data: salesRaw } = start
    ? await salesQuery.gte("sold_at", start)
    : await salesQuery;
  const sales = (salesRaw ?? []) as Sale[];

  const prevBounds = previousPeriodBounds(period);
  let prevLots: Lot[] = [];
  let prevSales: Sale[] = [];
  if (prevBounds) {
    const [{ data: pl }, { data: ps }] = await Promise.all([
      supabase
        .from("lots")
        .select("*")
        .gte("purchased_at", prevBounds.start)
        .lte("purchased_at", prevBounds.end),
      supabase
        .from("sales")
        .select("sale_price, sold_at")
        .gte("sold_at", prevBounds.start)
        .lte("sold_at", prevBounds.end),
    ]);
    prevLots = (pl ?? []) as Lot[];
    prevSales = (ps ?? []) as Sale[];
  }

  const current = computeMetrics(lots, sales);
  const prev = computeMetrics(prevLots, prevSales);
  const hasPrev = prevBounds !== null;

  const cards: KpiSpec[] = [
    {
      label: "Lots",
      value: current.count,
      prev: hasPrev ? prev.count : null,
      format: "count",
    },
    {
      label: "Investi",
      value: current.spent,
      prev: hasPrev ? prev.spent : null,
      format: "money",
    },
    {
      label: "Revenus",
      value: current.revenue,
      prev: hasPrev ? prev.revenue : null,
      format: "money",
      variant: "green",
    },
    {
      label: "Profit",
      value: current.profit,
      prev: hasPrev ? prev.profit : null,
      format: "money",
      variant: "gradient",
    },
  ];

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
            Aperçu
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            Tableau de bord
          </h1>
          <p className="mt-2 max-w-lg text-sm text-slate-400">
            Suivi de tes achats de lots, dépenses, revenus et profit.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <PeriodPills current={period} />
          <Link
            href="/admin/lots/nouveau"
            className="btn-primary !px-4 !py-2.5 !text-xs"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau lot
          </Link>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          Impossible de charger les données : {error.message}
        </div>
      )}

      <KpiCards cards={cards} />

      <div className="mt-6">
        <LotsChart lots={lots} period={period} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TopClients lots={lots} />
        <RecentActivity lots={lots.slice(0, 8)} />
      </div>
    </div>
  );
}
