/**
 * Onglet Notifications : types et règles partagés serveur + client (aucun
 * accès réseau ni base ici ; le fil est construit par lib/admin/notifications.ts).
 */
import type { SessionPlatform } from "@/lib/ads/types";

/** Filtres de l'onglet (paramètre ?filtre=). « pubs » : soumissions venues d'une pub. */
export const FILTRES_NOTIFICATIONS = ["tout", "ebay", "soumissions", "pubs"] as const;
export type FiltreNotifications = (typeof FILTRES_NOTIFICATIONS)[number];

export type NotifCounts = Record<FiltreNotifications, number>;

export const ZERO_COUNTS: NotifCounts = { tout: 0, ebay: 0, soumissions: 0, pubs: 0 };

/** Pub Meta ou Google d'où vient un lead. */
export type NotifPub = {
  platform: "meta" | "google";
  /** Réseau de diffusion lisible (Facebook, Instagram, Google Recherche…) */
  network: string | null;
  /** Nom de la pub, null si inconnu */
  name: string | null;
  /** Fiche de la pub dans /admin/pubs */
  href: string;
};

type NotifBase = {
  key: string;
  /** Moment de l'événement (ISO) : commande passée, formulaire envoyé */
  at: string;
  /** Arrivée dans la base (ISO) : sert à savoir si c'est nouveau */
  arrivedAt: string;
  /** Arrivée après la dernière visite de l'onglet */
  isNew: boolean;
};

export type NotifVenteEbay = NotifBase & {
  kind: "vente-ebay";
  orderId: string;
  total: number;
  currency: string;
  /** Premier article de la commande */
  title: string;
  quantity: number;
  /** Autres articles dans la même commande */
  others: number;
  buyer: string | null;
  itemUrl: string | null;
  /** Statut lisible : à expédier, expédiée, annulée… */
  status: { label: string; tone: "ok" | "warn" | "bad" | "neutral" };
  /** false : annulée ou entièrement remboursée (ne compte pas dans les ventes) */
  counted: boolean;
};

export type NotifSoumission = NotifBase & {
  kind: "soumission";
  /** Ligne de la table soumissions, null si on ne connaît que le lead (soumission illisible) */
  soumissionId: string | null;
  nom: string;
  courriel: string | null;
  telephone: string | null;
  entreprise: string | null;
  ville: string | null;
  lotId: string | null;
  /** Provenance du visiteur, null si le formulaire ne l'a pas transmise */
  source: SessionPlatform | null;
  /** Renseigné quand la soumission vient d'une pub Meta ou Google */
  pub: NotifPub | null;
};

export type NotificationItem = NotifVenteEbay | NotifSoumission;

/** Pastille du menu : nouveautés depuis la dernière visite de l'onglet. */
export type NotificationsSummary = {
  unseen: NotifCounts;
  /** Arrivée la plus récente (ISO) : le fil ouvert se recharge quand elle change */
  latest: string | null;
};

/** Libellés des provenances hors pub. */
export const SOURCE_LABELS: Record<SessionPlatform, string> = {
  meta: "Pub Meta",
  google: "Pub Google",
  organic: "Recherche gratuite",
  referral: "Lien d'un autre site",
  direct: "Accès direct",
  email: "Courriel",
  other: "Autre source",
};

export function matchesFiltre(item: NotificationItem, filtre: FiltreNotifications): boolean {
  if (filtre === "tout") return true;
  if (filtre === "ebay") return item.kind === "vente-ebay";
  if (item.kind !== "soumission") return false;
  return filtre === "soumissions" || item.pub !== null;
}

export function countByFiltre(items: NotificationItem[]): NotifCounts {
  const out = { ...ZERO_COUNTS };
  for (const it of items) {
    for (const f of FILTRES_NOTIFICATIONS) if (matchesFiltre(it, f)) out[f] += 1;
  }
  return out;
}
