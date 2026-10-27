import { ExternalLink, MessageSquare, RotateCcw, Star, Tag, Truck } from "lucide-react";
import {
  getActiveListingsCount,
  getActiveReturnsCount,
  getAwaitingShipmentCount,
  getFeedbackSummary,
} from "@/lib/ebay/client";

export type EbayLiveData = {
  awaitingShip: number | null;
  returns: number | null;
  listings: number | null;
  feedback: { score: number; positivePercent: number } | null;
};

/** Lecture en direct de la boutique (À expédier, retours, annonces, évaluations). */
export async function loadEbayLiveData(): Promise<EbayLiveData> {
  const [ship, returns, listings, feedback] = await Promise.allSettled([
    getAwaitingShipmentCount(),
    getActiveReturnsCount(),
    getActiveListingsCount(),
    getFeedbackSummary(),
  ]);
  const fb = feedback.status === "fulfilled" ? feedback.value : null;
  return {
    awaitingShip: ship.status === "fulfilled" ? ship.value : null,
    returns: returns.status === "fulfilled" ? returns.value : null,
    listings: listings.status === "fulfilled" ? listings.value : null,
    feedback: fb && fb.score > 0 ? { score: fb.score, positivePercent: fb.positivePercent } : null,
  };
}

/** Panneau « Boutique en direct » (composant serveur asynchrone, à placer dans un Suspense). */
export default async function EbayLivePanel() {
  return <EbayLiveList data={await loadEbayLiveData()} />;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("fr-CA")} ${n > 1 ? many : one}`;

export function EbayLiveList({ data }: { data: EbayLiveData }) {
  const rows = [
    {
      label: "À expédier",
      value: data.awaitingShip == null ? "—" : plural(data.awaitingShip, "commande", "commandes"),
      href: "https://www.ebay.ca/sh/ord/?filter=status:AWAITING_SHIPMENT",
      icon: Truck,
      hot: (data.awaitingShip ?? 0) > 0,
    },
    {
      label: "Retours et remboursements",
      value: data.returns == null ? "—" : `${data.returns} en cours`,
      href: "https://www.ebay.ca/sh/ord/returns",
      icon: RotateCcw,
      hot: (data.returns ?? 0) > 0,
    },
    {
      label: "Annonces actives",
      value: data.listings == null ? "—" : data.listings.toLocaleString("fr-CA"),
      href: "https://www.ebay.ca/sh/lst/active",
      icon: Tag,
      hot: false,
    },
    {
      label: "Évaluations",
      value: data.feedback ? `${data.feedback.score} · ${data.feedback.positivePercent} %` : "—",
      href: "https://www.ebay.ca/fdbk/feedback_profile",
      icon: Star,
      hot: false,
    },
    {
      label: "Messages",
      value: "Ouvrir",
      href: "https://www.ebay.ca/cnt/viewMessage?group_type=CORE&conversation_type=FROM_MEMBERS&status=UNREAD",
      icon: MessageSquare,
      hot: false,
    },
  ];

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label}>
          <a
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
              r.hot
                ? "border-[#6bd63b] bg-[#f0fae9] text-[#0a0a0a]"
                : "border-[#e3eadf] bg-white text-[#0a0a0a] hover:border-[#c9d6c3]"
            }`}
          >
            <r.icon className={`h-4 w-4 shrink-0 ${r.hot ? "text-[#257a10]" : "text-[#4f5a52]"}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums text-[#4f5a52]">{r.value}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#4f5a52]" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function EbayLiveSkeleton() {
  return (
    <ul className="mt-4 flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="h-[42px] animate-pulse rounded-xl border border-[#e3eadf] bg-[#f4f7f2]" />
      ))}
    </ul>
  );
}
