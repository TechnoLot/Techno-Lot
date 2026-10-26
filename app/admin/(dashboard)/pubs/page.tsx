import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { getAdsOverview, getConfigStatus, getLastSync } from "@/lib/ads/queries";
import AdsFilters from "@/components/admin/ads/AdsFilters";
import SyncButton from "@/components/admin/ads/SyncButton";
import AdsKpiGrid from "@/components/admin/ads/AdsKpiGrid";
import AdsTrendChart from "@/components/admin/ads/AdsTrendChart";
import AdsFunnel from "@/components/admin/ads/AdsFunnel";
import AdsLeaderboard from "@/components/admin/ads/AdsLeaderboard";
import AdsBreakdown from "@/components/admin/ads/AdsBreakdown";
import AdsLeadsList from "@/components/admin/ads/AdsLeadsList";
import AdsEmptyState from "@/components/admin/ads/AdsEmptyState";
import ConnectGuide from "@/components/admin/ads/ConnectGuide";
import PeriodCaption from "@/components/admin/ads/PeriodCaption";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publicités — Admin Techno Lot" };

export default async function PubsPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string; platform?: string };
}) {
  const [data, lastSync] = await Promise.all([getAdsOverview(searchParams), getLastSync()]);
  const config = getConfigStatus();
  const filterLabel = data.platform === "meta" ? "Meta" : data.platform === "google" ? "Google" : null;

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Acquisition</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">Publicités</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Meta (Facebook / Instagram) et Google Ads : ce que chaque pub coûte, combien de visiteurs elle amène et
            qui remplit le formulaire.
          </p>
          <div className="mt-3">
            <PeriodCaption range={data.range} prev={data.prevRange} />
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <AdsFilters period={data.periodKey} from={data.range.from} to={data.range.to} platform={data.platform} />
          <SyncButton lastSync={lastSync} days={Math.min(Math.max(data.range.days, 7), 90)} />
        </div>
      </header>

      {data.error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Erreur de chargement des données : {data.error}
        </div>
      )}

      {!data.hasAnyData ? (
        <AdsEmptyState config={config} />
      ) : (
        <div className="space-y-6">
          <AdsKpiGrid totals={data.totals} prev={data.prevTotals} />

          <div className="grid gap-6 xl:grid-cols-5">
            <div className="min-w-0 xl:col-span-3">
              <AdsTrendChart data={data.daily} />
            </div>
            <div className="min-w-0 xl:col-span-2">
              <AdsFunnel funnel={data.totals} title={filterLabel ? `Funnel ${filterLabel}` : "Funnel global"} />
            </div>
          </div>

          <AdsLeaderboard ads={data.ads} bestAdKey={data.bestAdKey} />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <AdsBreakdown
                tabs={[
                  {
                    key: "source",
                    label: "Source",
                    items: data.bySource,
                    note: "Toutes les sources du site, y compris organique et direct, peu importe le filtre plateforme.",
                  },
                  { key: "publisher", label: "Placement", items: data.byPublisher, note: "Visites et leads payants par réseau de diffusion." },
                  { key: "device", label: "Appareil", items: data.byDevice },
                ]}
              />
            </div>
            <div className="min-w-0">
              <AdsLeadsList
                leads={data.recentLeads}
                title="Derniers leads issus des pubs"
                subtitle={`${data.totals.leads} sur la période`}
              />
            </div>
          </div>

          <details className="glass group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-medium text-slate-300 hover:text-white sm:px-6 [&::-webkit-details-marker]:hidden">
              <Settings2 className="h-4 w-4 text-accent" aria-hidden />
              Configuration et paramètres d&apos;URL des pubs
              <span className="ml-auto text-xs text-slate-500 group-open:hidden">Afficher</span>
              <span className="ml-auto hidden text-xs text-slate-500 group-open:inline">Masquer</span>
            </summary>
            <div className="border-t border-white/5 p-5 sm:p-6">
              <ConnectGuide config={config} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
