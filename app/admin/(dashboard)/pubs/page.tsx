import type { Metadata } from "next";
import {
  getAdsOverview,
  getAdsSyncState,
  getConfigStatus,
  getLastSync,
  getTrackingCoverage,
  parsePlatformFilter,
} from "@/lib/ads/queries";
import PubsOverview from "@/components/admin/ads/PubsOverview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publicités — Admin Techno Lot" };

export default async function PubsPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string; platform?: string };
}) {
  const platform = parsePlatformFilter(searchParams.platform);
  const [data, lastSync, liveSync] = await Promise.all([
    getAdsOverview(searchParams),
    getLastSync(platform === "all" ? null : platform),
    getAdsSyncState(),
  ]);
  const coverage = await getTrackingCoverage({
    range: data.range,
    platform: data.platform,
    attributedLeads: data.totals.leads,
  });

  return (
    <PubsOverview
      data={data}
      lastSync={lastSync}
      config={getConfigStatus()}
      coverage={coverage}
      liveSync={liveSync}
    />
  );
}
