import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import EbayAutoSync from "@/components/admin/ebay/EbayAutoSync";
import NotificationsFeed from "@/components/admin/notifications/NotificationsFeed";
import SonToggle from "@/components/admin/notifications/SonToggle";
import { isEbayConfigured } from "@/lib/ebay/client";
import { getEbaySyncStatus } from "@/lib/ebay/ventes";
import { getNotificationsFeed } from "@/lib/admin/notifications";
import { FILTRES_NOTIFICATIONS, type FiltreNotifications } from "@/lib/admin/notifications-types";
import { periodeNotifications } from "@/lib/admin/notifications-regles";
import { isMailApiConfigured } from "@/lib/hostinger/config";

export const dynamic = "force-dynamic";

/**
 * Onglet Notifications : nouvelles ventes eBay, nouvelles soumissions du
 * formulaire et leads venus des pubs Meta / Google, sur la période choisie
 * (30 derniers jours par défaut). L'ouverture remet la pastille du menu à
 * zéro ; le fil se recharge seul quand quelque chose arrive (et la synchro
 * eBay tourne pendant la visite).
 */
export default async function NotificationsPage(
  props: {
    searchParams: Promise<{ filtre?: string; periode?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const periode = periodeNotifications(searchParams.periode);
  const ebayConfigured = isEbayConfigured();
  const [feed, ebay] = await Promise.all([
    getNotificationsFeed(supabase, user, { periode }),
    ebayConfigured ? getEbaySyncStatus().catch(() => null) : Promise.resolve(null),
  ]);
  const filtre: FiltreNotifications = FILTRES_NOTIFICATIONS.includes(
    searchParams.filtre as FiltreNotifications,
  )
    ? (searchParams.filtre as FiltreNotifications)
    : "tout";

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        eyebrow="En direct"
        title="Notifications"
        description="Nouvelles ventes eBay, soumissions du site et leads venus de tes pubs. La page se met à jour toute seule."
        actions={
          <>
            {ebayConfigured && <EbayAutoSync configured lastSync={ebay?.lastSync ?? null} />}
            <SonToggle />
          </>
        }
      />

      {feed.errors.length > 0 && (
        <p
          role="alert"
          className="mb-6 flex gap-2 rounded-2xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">
            Lecture incomplète : {feed.errors.join(" · ")}
          </span>
        </p>
      )}

      <NotificationsFeed
        items={feed.items}
        counts={feed.counts}
        latest={feed.latest}
        renderedAt={feed.renderedAt}
        clearedAt={feed.clearedAt}
        periode={periode}
        filtreInitial={filtre}
        courrielApi={isMailApiConfigured()}
      />
    </div>
  );
}
