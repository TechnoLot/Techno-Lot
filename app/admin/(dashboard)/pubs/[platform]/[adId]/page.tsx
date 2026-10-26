import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Info } from "lucide-react";
import { emptyTotals, getAdDetail, getLastSync } from "@/lib/ads/queries";
import { NO_ID, type AdPlatform } from "@/lib/ads/types";
import AdsFilters from "@/components/admin/ads/AdsFilters";
import SyncButton from "@/components/admin/ads/SyncButton";
import AdsKpiGrid from "@/components/admin/ads/AdsKpiGrid";
import AdsTrendChart from "@/components/admin/ads/AdsTrendChart";
import AdsFunnel from "@/components/admin/ads/AdsFunnel";
import AdsBreakdown from "@/components/admin/ads/AdsBreakdown";
import AdsLeadsList from "@/components/admin/ads/AdsLeadsList";
import PlatformBadge from "@/components/admin/ads/PlatformBadge";
import PeriodCaption from "@/components/admin/ads/PeriodCaption";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Détail d'une pub — Admin Techno Lot" };

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default async function AdDetailPage({
  params,
  searchParams,
}: {
  params: { platform: string; adId: string };
  searchParams: { period?: string; from?: string; to?: string };
}) {
  if (params.platform !== "meta" && params.platform !== "google") notFound();
  const platform = params.platform as AdPlatform;
  const adId = safeDecode(params.adId);

  const [data, lastSync] = await Promise.all([
    getAdDetail({ platform, adId, ...searchParams }),
    getLastSync(),
  ]);
  const ad = data.ad;
  const totals = ad ?? emptyTotals();
  const back = new URLSearchParams();
  if (searchParams.period) back.set("period", searchParams.period);
  if (searchParams.from) back.set("from", searchParams.from);
  if (searchParams.to) back.set("to", searchParams.to);
  const backHref = `/admin/pubs${back.toString() ? `?${back}` : ""}`;

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-accent-bright"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Toutes les publicités
      </Link>

      <header className="mb-8 mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PlatformBadge platform={platform} publishers={ad?.publishers ?? []} />
            {ad?.publishers
              .filter((p) => p !== "facebook" && p !== "instagram")
              .slice(0, 3)
              .map((p) => (
                <span key={p} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">
                  {p}
                </span>
              ))}
          </div>
          <h1 className="mt-3 break-words font-display text-2xl font-bold text-white sm:text-3xl">
            {ad?.name ?? adId}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Campagne : <span className="text-slate-200">{ad?.campaign ?? "inconnue"}</span>
            {adId !== NO_ID && (
              <span className="ml-2 font-mono text-[11px] text-slate-500">ID {adId}</span>
            )}
          </p>
          <div className="mt-3">
            <PeriodCaption range={data.range} prev={data.prevRange} />
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <AdsFilters period={data.periodKey} from={data.range.from} to={data.range.to} showPlatform={false} />
          <SyncButton lastSync={lastSync} days={Math.min(Math.max(data.range.days, 7), 90)} />
        </div>
      </header>

      {data.error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Erreur de chargement des données : {data.error}
        </div>
      )}

      {!ad && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          Aucune activité pour cette pub sur la période choisie. Essaie une période plus longue.
        </div>
      )}

      <div className="space-y-6">
        <AdsKpiGrid totals={totals} prev={data.prevTotals} />

        <div className="grid gap-6 xl:grid-cols-5">
          <div className="min-w-0 xl:col-span-3">
            <AdsTrendChart data={data.daily} title="Évolution quotidienne" />
          </div>
          <div className="min-w-0 xl:col-span-2">
            <AdsFunnel funnel={totals} title="Funnel de cette pub" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="min-w-0 lg:col-span-3">
            <AdsLeadsList
              leads={data.leads}
              title="Qui a rempli le formulaire"
              subtitle={`${data.leads.length} lead${data.leads.length > 1 ? "s" : ""} · ${totals.clients} client${totals.clients > 1 ? "s" : ""}`}
              showAd={false}
              emptyText="Personne n'a encore rempli le formulaire via cette pub sur la période."
            />
          </div>
          <div className="min-w-0 lg:col-span-2">
            <AdsBreakdown
              title="Répartition"
              tabs={[
                { key: "device", label: "Appareil", items: data.byDevice },
                { key: "publisher", label: "Placement", items: data.byPublisher },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
