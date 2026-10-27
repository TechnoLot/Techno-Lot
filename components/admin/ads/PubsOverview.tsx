import { AlertTriangle, Info } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import type { AdsOverview, ConfigStatus, LastSync, PlatformFilter } from "@/lib/ads/types";
import { rankAds } from "@/lib/ads/verdict";
import AdsFilters from "./AdsFilters";
import SyncButton from "./SyncButton";
import AdsKpis from "./AdsKpis";
import AdsTable from "./AdsTable";
import VerdictGuide from "./VerdictGuide";
import MetaConnect, { UrlParamsCard } from "./MetaConnect";
import { periodText } from "./PeriodCaption";
import { card, cardSub, cardTitle } from "./ui";

const NAMES: Record<PlatformFilter, string> = { meta: "Meta", google: "Google Ads", all: "Meta et Google" };

export type PubsOverviewProps = {
  data: AdsOverview & { periodKey: string; platform: PlatformFilter; error: string | null };
  lastSync: LastSync;
  config: ConfigStatus;
  metaEnv: { token: boolean; account: boolean };
  /** Jours à resynchroniser (couvre la période affichée) */
  syncDays: number;
};

/** Contenu de /admin/pubs (séparé de la page pour l'alimenter en données de test). */
export default function PubsOverview({ data, lastSync, config, metaEnv, syncDays }: PubsOverviewProps) {
  const { platform, range } = data;
  const connected =
    platform === "meta" ? config.meta : platform === "google" ? config.google : config.meta || config.google;
  const spendKnown = connected || data.totals.spend > 0;
  const ranked = rankAds(data.ads, data.avgCpl);
  const name = NAMES[platform];

  const query = new URLSearchParams();
  if (data.periodKey !== "30d") query.set("period", data.periodKey);
  if (data.periodKey === "custom") {
    query.set("from", range.from);
    query.set("to", range.to);
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        eyebrow="Publicités"
        title={platform === "all" ? "Vos pubs" : `Vos pubs ${name}`}
        description={`Ce que chaque pub coûte, combien de leads et de clients elle amène, ${periodText(range)}.`}
        actions={
          connected ? (
            <SyncButton
              lastSync={lastSync}
              days={syncDays}
              label={platform === "google" ? "Mettre à jour depuis Google" : platform === "all" ? "Mettre à jour" : "Mettre à jour depuis Meta"}
            />
          ) : undefined
        }
      />

      <div className="mb-6">
        <AdsFilters period={data.periodKey} from={range.from} to={range.to} platform={platform} />
      </div>

      <div className="space-y-6">
        {data.error && (
          <p role="alert" className="flex gap-2 rounded-2xl border border-[#f4c7c3] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Erreur de chargement des données : {data.error}
          </p>
        )}

        {connected && lastSync && !lastSync.ok && (
          <p role="alert" className="flex gap-2 rounded-2xl border border-[#f6d7b0] bg-[#fdf6ec] px-4 py-3 text-sm text-[#b54708]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">
              La dernière mise à jour a échoué : {lastSync.message ?? "erreur inconnue"}
            </span>
          </p>
        )}

        {platform === "meta" && !config.meta && <MetaConnect env={metaEnv} />}

        {platform === "google" && !config.google && (
          <p className="flex gap-2 rounded-2xl border border-[#e3eadf] bg-white px-4 py-3 text-sm text-[#4f5a52]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#257a10]" aria-hidden />
            Google Ads n&apos;est pas connecté : les dépenses n&apos;apparaissent pas. Étapes dans docs/PUBLICITES-SETUP.md.
          </p>
        )}

        <AdsKpis
          totals={data.totals}
          spendKnown={spendKnown}
          spendHint={spendKnown ? "sur la période" : `${platform === "google" ? "Google" : "Meta"} non connecté`}
        />

        <section className={card} aria-labelledby="ads-table-title">
          <div className="px-5 pb-4 pt-5 sm:px-6">
            <h2 id="ads-table-title" className={cardTitle}>
              Vos pubs
            </h2>
            <p className={cardSub}>
              De la meilleure à la pire selon le verdict. Cliquez une pub pour voir son entonnoir et ses leads.
            </p>
          </div>
          {ranked.length === 0 ? (
            <p className="border-t border-[#edf2ea] px-5 py-10 text-center text-sm text-[#4f5a52] sm:px-6">
              Aucune pub {platform === "all" ? "" : `${name} `}n&apos;a eu d&apos;activité sur la période.{" "}
              {connected
                ? "Essayez une période plus longue ou mettez les chiffres à jour."
                : "Les leads venus de vos pubs apparaîtront ici dès que les paramètres d'URL seront en place."}
            </p>
          ) : (
            <div className="border-t border-[#edf2ea]">
              <AdsTable ads={ranked} totals={data.totals} query={query.toString()} showPlatform={platform === "all"}
                spendKnown={spendKnown}
              />
            </div>
          )}
        </section>

        <div className={`grid gap-6 ${connected && platform !== "google" ? "xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""}`}>
          <VerdictGuide avgCpl={data.avgCpl} />
          {connected && platform !== "google" && (
            <div>
              <UrlParamsCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
