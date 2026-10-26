import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import CalculatriceButton from "@/components/admin/CalculatriceButton";
import { createClient } from "@/lib/supabase/server";
import { PERIODS, type Lot, type PeriodKey } from "@/lib/admin/types";
import { endOfPeriod, previousPeriodBounds, startOfPeriod } from "@/lib/admin/dates";
import PageHeader from "@/components/admin/PageHeader";
import PeriodPills from "@/components/admin/PeriodPills";
import KpiCards, { type KpiSpec } from "@/components/admin/KpiCards";
import LotsChart from "@/components/admin/LotsChart";
import TopClients from "@/components/admin/TopClients";
import RecentActivity from "@/components/admin/RecentActivity";
import PendingSales from "@/components/admin/PendingSales";
import SavedCalcLots, { type CalcLotSummary } from "@/components/admin/SavedCalcLots";
import TrackingSources from "@/components/admin/TrackingSources";
import {
  AD_PLATFORM_ORDER,
  normalizePlatform,
  type AdPlatform,
} from "@/lib/ads/platforms";
import TrackingFunnel from "@/components/admin/TrackingFunnel";
import TrackingRoi, { type AdSpendRow } from "@/components/admin/TrackingRoi";

export const dynamic = "force-dynamic";

type Sale = { sale_price: number | string; sold_at: string };
type Metrics = { count: number; spent: number; revenue: number; profit: number };

function computeMetrics(lots: Lot[], sales: Sale[]): Metrics {
  let spent = 0;
  let revenue = 0;
  for (const l of lots) {
    spent += Number(l.purchase_price);
    if (l.sale_price != null) {
      revenue += Number(l.sale_price);
    }
  }
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

const TZ = "America/Toronto";

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("fr-CA", { hour: "numeric", hourCycle: "h23", timeZone: TZ })
      .format(now)
      .replace(/\D/g, ""),
  );
  if (hour < 5 || hour >= 18) return "Bonsoir";
  if (hour < 12) return "Bonjour";
  return "Bon après-midi";
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

type SupabaseServer = ReturnType<typeof createClient>;

/**
 * Sessions distinctes par étape (page_view / form_view|form_start /
 * form_submit) sur la période. Paginé (PostgREST plafonne à 1000 lignes),
 * avec une limite de sécurité.
 */
async function fetchFunnel(
  supabase: SupabaseServer,
  start: string | null,
  endExclusive: string | null,
) {
  const visits = new Set<string>();
  const forms = new Set<string>();
  const submits = new Set<string>();
  const PAGE = 1000;
  for (let page = 0; page < 20; page++) {
    let q = supabase
      .from("ad_events")
      .select("session_id, type")
      .in("type", ["page_view", "form_view", "form_start", "form_submit"])
      .order("id", { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (start) q = q.gte("created_at", start);
    if (endExclusive) q = q.lt("created_at", endExclusive);
    const { data, error } = await q;
    if (error || !data) break;
    for (const row of data as { session_id: string | null; type: string }[]) {
      const sid = row.session_id ?? "";
      if (!sid) continue;
      if (row.type === "page_view") visits.add(sid);
      else if (row.type === "form_submit") submits.add(sid);
      else forms.add(sid);
    }
    if (data.length < PAGE) break;
  }
  // Une session qui a envoyé le formulaire l'a forcément consulté.
  submits.forEach((s) => forms.add(s));
  forms.forEach((s) => visits.add(s));
  return { visits: visits.size, formViews: forms.size, submits: submits.size };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = (
    PERIODS.find((p) => p.key === searchParams.period)?.key ?? "30d"
  ) as PeriodKey;
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  const supabase = createClient();

  const start = startOfPeriod(period);
  const end = endOfPeriod(period);
  const endExclusive = end ? addDays(end, 1) : null;

  let lotsQuery = supabase
    .from("lots")
    .select("*")
    .order("purchased_at", { ascending: false });
  if (start) lotsQuery = lotsQuery.gte("purchased_at", start);
  if (end) lotsQuery = lotsQuery.lte("purchased_at", end);

  let salesQuery = supabase.from("sales").select("sale_price, sold_at");
  if (start) salesQuery = salesQuery.gte("sold_at", start);
  if (end) salesQuery = salesQuery.lte("sold_at", end);

  const pendingQuery = supabase
    .from("lots")
    .select("*")
    .eq("status", "purchased")
    .is("sale_price", null)
    .order("purchased_at", { ascending: false });

  const savedLotsQuery = supabase
    .from("saved_lots")
    .select("id, name, data, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  // Suivi publicitaire (tables ad_*)
  let leadsQuery = supabase.from("ad_leads").select("platform").limit(5000);
  if (start) leadsQuery = leadsQuery.gte("created_at", start);
  if (endExclusive) leadsQuery = leadsQuery.lt("created_at", endExclusive);

  let spendQuery = supabase.from("ad_metrics_daily").select("platform, spend").limit(10000);
  if (start) spendQuery = spendQuery.gte("date", start);
  if (end) spendQuery = spendQuery.lte("date", end);

  const prevBounds = previousPeriodBounds(period);

  const [
    { data: lotsRaw, error },
    { data: salesRaw },
    { data: pendingRaw },
    { data: savedLotsRaw },
    { data: leadsRaw },
    { data: spendRaw },
    funnel,
    prevResults,
  ] = await Promise.all([
    lotsQuery,
    salesQuery,
    pendingQuery,
    savedLotsQuery,
    leadsQuery,
    spendQuery,
    fetchFunnel(supabase, start, endExclusive),
    prevBounds
      ? Promise.all([
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
        ])
      : Promise.resolve(null),
  ]);

  const lots = (lotsRaw ?? []) as Lot[];
  const sales = (salesRaw ?? []) as Sale[];
  const pendingLots = (pendingRaw ?? []) as Lot[];
  const prevLots = (prevResults?.[0].data ?? []) as Lot[];
  const prevSales = (prevResults?.[1].data ?? []) as Sale[];

  const current = computeMetrics(lots, sales);
  const prev = computeMetrics(prevLots, prevSales);
  const hasPrev = prevBounds !== null;

  type SavedLotRow = {
    id: string;
    name: string;
    data: { items?: { desc: string; qte: number; bas: number | null; moyen: number | null }[]; usd?: boolean; taux?: number } | null;
    updated_at: string;
  };

  const calcLots: CalcLotSummary[] = ((savedLotsRaw ?? []) as SavedLotRow[]).map((l) => {
    const items = l.data?.items ?? [];
    const usd = l.data?.usd ?? false;
    const taux = usd ? (l.data?.taux ?? 1.37) : 1;
    let totalBas = 0;
    let totalMoyen = 0;
    let unites = 0;
    for (const it of items) {
      unites += it.qte;
      if (it.bas != null) totalBas += it.bas * it.qte * taux;
      if (it.moyen != null) totalMoyen += it.moyen * it.qte * taux;
    }
    const valeurLot = totalBas > 0 ? totalBas : totalMoyen;
    return {
      id: l.id,
      name: l.name,
      offerPrice: Math.round((valeurLot / 2.5) * 100) / 100,
      itemCount: items.length,
      unitCount: unites,
      updatedAt: l.updated_at,
    };
  });

  // Agrégats publicitaires
  const leadCounts: Partial<Record<AdPlatform, number>> = {};
  for (const row of (leadsRaw ?? []) as { platform: string | null }[]) {
    const p = normalizePlatform(row.platform);
    leadCounts[p] = (leadCounts[p] ?? 0) + 1;
  }
  const spendByPlatform: Partial<Record<AdPlatform, number>> = {};
  for (const row of (spendRaw ?? []) as { platform: string | null; spend: number | string | null }[]) {
    const p = normalizePlatform(row.platform);
    spendByPlatform[p] = (spendByPlatform[p] ?? 0) + Number(row.spend ?? 0);
  }
  const spendRows: AdSpendRow[] = AD_PLATFORM_ORDER.map((p) => ({
    platform: p,
    spend: spendByPlatform[p] ?? 0,
    leads: leadCounts[p] ?? 0,
  }));

  const cards: KpiSpec[] = [
    {
      label: "Lots achetés",
      value: current.count,
      prev: hasPrev ? prev.count : null,
      format: "count",
      icon: "lots",
    },
    {
      label: "Montant acheté",
      value: current.spent,
      prev: hasPrev ? prev.spent : null,
      format: "money",
      icon: "spent",
    },
    {
      label: "Ventes",
      value: current.revenue,
      prev: hasPrev ? prev.revenue : null,
      format: "money",
      variant: "green",
      icon: "revenue",
    },
    {
      label: "Profit",
      value: current.profit,
      prev: hasPrev ? prev.profit : null,
      format: "money",
      variant: "gradient",
      icon: "profit",
    },
  ];

  const now = new Date();
  const today = new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(now);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        eyebrow={today.charAt(0).toUpperCase() + today.slice(1)}
        title={`${greeting(now)}.`}
        description={`Achats, ventes et profit sur la période « ${periodLabel} ».`}
        actions={
          <>
            <CalculatriceButton />
            <Link href="/admin/lots/nouveau" className="admin-btn-accent !py-2.5">
              <Plus className="h-4 w-4" aria-hidden />
              Nouveau lot
            </Link>
          </>
        }
      />

      <div className="mb-5">
        <PeriodPills current={period} />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          Impossible de charger les données : {error.message}
        </div>
      )}

      <KpiCards cards={cards} />

      <div className="mt-4 animate-fade-up sm:mt-5" style={{ animationDelay: "120ms" }}>
        <LotsChart lots={lots} period={period} />
      </div>

      <div
        className="mt-4 grid animate-fade-up gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-2 2xl:grid-cols-3"
        style={{ animationDelay: "200ms" }}
      >
        <RecentActivity lots={lots.slice(0, 6)} />
        <PendingSales lots={pendingLots} />
        <div className="lg:col-span-2 2xl:col-span-1">
          <TopClients lots={lots} />
        </div>
      </div>

      {calcLots.length > 0 && (
        <div className="mt-4 sm:mt-5">
          <SavedCalcLots lots={calcLots} />
        </div>
      )}

      <section className="mt-10" aria-labelledby="marketing-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="marketing-title" className="font-display text-lg font-semibold tracking-tight text-white">
              Publicités et provenance des leads
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Suivi réel du site sur la période « {periodLabel} »</p>
          </div>
          <Link
            href="/admin/pubs"
            className="admin-focus inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-slate-400 transition-colors hover:text-accent-bright"
          >
            Voir les publicités
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          <TrackingSources counts={leadCounts} />
          <TrackingFunnel {...funnel} />
        </div>
        <div className="mt-4 sm:mt-5">
          <TrackingRoi rows={spendRows} />
        </div>
      </section>
    </div>
  );
}
