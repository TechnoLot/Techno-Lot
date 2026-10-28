import type { Metadata } from "next";
import {
  daysBetween,
  getAdsOverview,
  getConfigStatus,
  getLastSync,
  getTrackingCoverage,
  parsePlatformFilter,
  torontoDay,
} from "@/lib/ads/queries";
import { getMetaEnvStatus } from "@/lib/ads/meta";
import PubsOverview from "@/components/admin/ads/PubsOverview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publicités — Admin Techno Lot" };

export default async function PubsPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string; platform?: string };
}) {
  const platform = parsePlatformFilter(searchParams.platform);
  const [data, lastSync] = await Promise.all([
    getAdsOverview(searchParams),
    getLastSync(platform === "all" ? null : platform),
  ]);
  const coverage = await getTrackingCoverage({
    range: data.range,
    platform: data.platform,
    attributedLeads: data.totals.leads,
  });
  // Resynchronise au moins 30 jours, et toute la période affichée (max. 1 an)
  const syncDays = Math.min(Math.max(daysBetween(data.range.from, torontoDay(new Date())), 30), 365);

  return (
    <PubsOverview
      data={data}
      lastSync={lastSync}
      config={getConfigStatus()}
      metaEnv={getMetaEnvStatus()}
      syncDays={syncDays}
      coverage={coverage}
    />
  );
}
