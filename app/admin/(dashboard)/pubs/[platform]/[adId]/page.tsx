import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  daysBetween,
  getAdDetail,
  getAdsSyncState,
  getConfigStatus,
  getLastSync,
  torontoDay,
} from "@/lib/ads/queries";
import type { AdPlatform } from "@/lib/ads/types";
import AdDetailView from "@/components/admin/ads/AdDetailView";

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

  const [data, lastSync, liveSync] = await Promise.all([
    getAdDetail({ platform, adId, ...searchParams }),
    getLastSync(platform),
    getAdsSyncState(),
  ]);
  const config = getConfigStatus();
  const syncDays = Math.min(Math.max(daysBetween(data.range.from, torontoDay(new Date())), 30), 365);

  const back = new URLSearchParams();
  if (searchParams.period) back.set("period", searchParams.period);
  if (searchParams.from) back.set("from", searchParams.from);
  if (searchParams.to) back.set("to", searchParams.to);
  if (platform === "google") back.set("platform", "google");
  const backHref = `/admin/pubs${back.toString() ? `?${back}` : ""}`;

  return (
    <AdDetailView
      platform={platform}
      adId={adId}
      data={data}
      lastSync={lastSync}
      connected={config[platform]}
      syncDays={syncDays}
      backHref={backHref}
      liveSync={liveSync}
    />
  );
}
