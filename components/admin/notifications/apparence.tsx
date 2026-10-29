import { CircleDollarSign, Inbox, Megaphone, type LucideIcon } from "lucide-react";
import type { NotificationItem } from "@/lib/admin/notifications-types";

/** Couleur et icône d'une notification : vente (vert), soumission (bleu), venue d'une pub (violet). */
export function apparenceNotif(item: NotificationItem): { tint: string; icon: LucideIcon } {
  if (item.kind === "vente-ebay") {
    return { tint: "bg-admin-tint-green text-admin-tint-green-ink", icon: CircleDollarSign };
  }
  return item.pub
    ? { tint: "bg-admin-tint-violet text-admin-tint-violet-ink", icon: Megaphone }
    : { tint: "bg-admin-tint-blue text-admin-tint-blue-ink", icon: Inbox };
}

/** Pastille d'icône des cartes du fil et des fenêtres d'alerte. */
export function PastilleIcone({ item }: { item: NotificationItem }) {
  const { tint, icon: Icon } = apparenceNotif(item);
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}
