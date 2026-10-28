import Link from "next/link";
import { AlertTriangle, ArrowLeft, Info } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { NO_ID, type AdDetail, type AdPlatform, type LastSync } from "@/lib/ads/types";
import { judgeAd } from "@/lib/ads/verdict";
import AdsFilters from "./AdsFilters";
import SyncButton from "./SyncButton";
import AdsLiveSync from "./AdsLiveSync";
import AdsKpis from "./AdsKpis";
import AdsFunnel from "./AdsFunnel";
import AdsDailyChart from "./AdsDailyChart";
import AdLeadsList from "./AdLeadsList";
import VerdictPill from "./VerdictPill";
import { periodText } from "./PeriodCaption";
import { card } from "./ui";
import { formatCost } from "./format";

export type AdDetailViewProps = {
  platform: AdPlatform;
  adId: string;
  data: AdDetail & { periodKey: string; error: string | null };
  lastSync: LastSync;
  connected: boolean;
  syncDays: number;
  /** Lien de retour (garde la période et la plateforme) */
  backHref: string;
};

const ZERO = {
  impressions: 0,
  clicks: 0,
  visits: 0,
  formViews: 0,
  formStarts: 0,
  leads: 0,
  clients: 0,
  spend: 0,
  cpl: null,
  profit: 0,
};

/** Contenu de /admin/pubs/[platform]/[adId] (séparé pour l'alimenter en données de test). */
export default function AdDetailView({ platform, adId, data, lastSync, connected, syncDays, backHref }: AdDetailViewProps) {
  const ad = data.ad;
  const totals = ad ?? ZERO;
  const judged = judgeAd(totals, data.avgCpl);
  const platformName = platform === "meta" ? "Meta" : "Google";
  const unidentified = adId === NO_ID;
  const title = unidentified ? "Pub non identifiée" : ad?.name ?? adId;
  const spendKnown = connected || totals.spend > 0;

  const eyebrow = [`Pub ${platformName}`, ad?.campaign ? `Campagne ${ad.campaign}` : null].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full text-[13px] font-medium text-admin-muted transition-colors hover:text-admin-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-green"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Toutes les pubs
      </Link>

      <PageHeader
        eyebrow={eyebrow}
        title={<span className="break-words">{title}</span>}
        description={
          <>
            {unidentified
              ? "Leads arrivés sans identifiant de pub : vérifiez les paramètres d'URL de vos pubs. "
              : adId !== title
                ? `ID ${adId} · `
                : ""}
            Chiffres {periodText(data.range)}.
          </>
        }
        actions={
          <div className="flex flex-col items-start gap-2">
            {connected && (
              <SyncButton lastSync={lastSync} days={syncDays} label={`Mettre à jour depuis ${platformName}`} />
            )}
            <AdsLiveSync enabled={connected} lastSync={lastSync?.at ?? null} />
          </div>
        }
      />

      <div className="mb-6">
        <AdsFilters period={data.periodKey} from={data.range.from} to={data.range.to} showPlatform={false} />
      </div>

      <div className="space-y-6">
        {data.error && (
          <p role="alert" className="flex gap-2 rounded-2xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Erreur de chargement des données : {data.error}
          </p>
        )}

        {!ad && (
          <p className="flex gap-2 rounded-2xl border border-admin-line bg-admin-card px-4 py-3 text-sm text-admin-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-admin-green" aria-hidden />
            Aucune activité pour cette pub sur la période choisie. Essayez une période plus longue.
          </p>
        )}

        <section className={`${card} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6`} aria-label="Verdict">
          <div className="shrink-0">
            <VerdictPill verdict={judged.verdict} size="lg" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-medium leading-snug text-admin-ink [text-wrap:pretty]">{judged.reason}</p>
            <p className="mt-1 text-[13px] text-admin-muted">
              {data.avgCpl != null
                ? `Coût par lead moyen ${platformName} sur la période : ${formatCost(data.avgCpl)}.`
                : `Pas encore de coût par lead moyen ${platformName} sur la période.`}
            </p>
          </div>
        </section>

        <AdsKpis
          totals={totals}
          spendKnown={spendKnown}
          spendHint={spendKnown ? "sur la période" : `${platformName} non connecté`}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <AdsFunnel funnel={totals} spendKnown={spendKnown} />
          <AdsDailyChart data={data.daily} />
        </div>

        <AdLeadsList leads={data.leads} clients={totals.clients} />
      </div>
    </div>
  );
}
