/**
 * Onglet Notifications : règles pures partagées serveur + client (retraits,
 * nouveautés à signaler, son, titre de l'onglet, validation de l'API).
 * Aucun accès réseau, base ou navigateur ici.
 */
import type { PeriodeKey } from "@/lib/admin/periodes";
import type { NotificationItem } from "@/lib/admin/notifications-types";

const DAY_MS = 86_400_000;

/** Périodes proposées dans l'onglet (mêmes que les ventes eBay). */
export const PERIODES_NOTIFICATIONS: PeriodeKey[] = [
  "aujourdhui",
  "hier",
  "semaine",
  "7j",
  "30j",
  "90j",
  "annee",
  "tout",
];
export const PERIODE_NOTIFICATIONS_DEFAUT: PeriodeKey = "30j";

export function periodeNotifications(value: string | null | undefined): PeriodeKey {
  return PERIODES_NOTIFICATIONS.find((p) => p === value) ?? PERIODE_NOTIFICATIONS_DEFAUT;
}

/** Instant (ISO) dans [gte, lt[ ; une borne null ne limite pas. */
export function dansFenetre(at: string, gte: string | null, lt: string | null): boolean {
  const t = Date.parse(at);
  if (gte && t < Date.parse(gte)) return false;
  if (lt && t >= Date.parse(lt)) return false;
  return true;
}

/** Une alerte ne remonte pas plus loin que 7 jours. */
export const NOUVEAUX_MAX_JOURS = 7;
/** Éléments renvoyés au plus dans `nouveaux`. */
export const NOUVEAUX_MAX = 5;

type Arrivee = { key: string; arrivedAt: string };

/** Retiré un à un, ou arrivé avant (ou pile à) « Tout effacer ». */
export function estRetiree(item: Arrivee, retirees: ReadonlySet<string>, clearedAt: string | null): boolean {
  if (retirees.has(item.key)) return true;
  if (!clearedAt) return false;
  const c = Date.parse(clearedAt);
  return Number.isFinite(c) && Date.parse(item.arrivedAt) <= c;
}

export function sansRetirees<T extends Arrivee>(
  items: T[],
  retirees: ReadonlySet<string>,
  clearedAt: string | null,
): T[] {
  return items.filter((i) => !estRetiree(i, retirees, clearedAt));
}

/** Arrivée la plus récente (ISO), null si la liste est vide. */
export function plusGrandeArrivee(items: Arrivee[]): string | null {
  let max: string | null = null;
  for (const it of items) if (!max || Date.parse(it.arrivedAt) > Date.parse(max)) max = it.arrivedAt;
  return max;
}

/**
 * Paramètre `depuis` du GET : null s'il est absent ou illisible, ramené à
 * 7 jours s'il est plus vieux (ISO).
 */
export function normaliserDepuis(value: string | null | undefined, now: number): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return null;
  return new Date(Math.max(t, now - NOUVEAUX_MAX_JOURS * DAY_MS)).toISOString();
}

/** Arrivés après `depuis`, plus récents d'abord, 5 au plus. */
export function selectionnerNouveaux<T extends Arrivee>(items: T[], depuis: string | null, max = NOUVEAUX_MAX): T[] {
  if (!depuis) return [];
  const d = Date.parse(depuis);
  return items
    .filter((i) => Date.parse(i.arrivedAt) > d)
    .sort((a, b) => Date.parse(b.arrivedAt) - Date.parse(a.arrivedAt))
    .slice(0, max);
}

/** Nouveautés pas encore signalées (par cet onglet ou un autre) : arrivées après `dejaSignale`. */
export function choisirFrais<T extends Arrivee>(nouveaux: T[], dejaSignale: string | null): T[] {
  const s = dejaSignale ? Date.parse(dejaSignale) : NaN;
  if (!Number.isFinite(s)) return nouveaux;
  return nouveaux.filter((i) => Date.parse(i.arrivedAt) > s);
}

/** Le plus tardif de deux instants ISO (null ignoré). */
export function plusTard(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(b) > Date.parse(a) ? b : a;
}

export type TypeSon = "vente" | "soumission";

/** Cha-ching dès qu'il y a une vente eBay, sinon le son des soumissions. */
export function choisirSon(items: Pick<NotificationItem, "kind">[]): TypeSon {
  return items.some((i) => i.kind === "vente-ebay") ? "vente" : "soumission";
}

const PREFIXE_TITRE = /^\(\d+\+?\) /;

/** Titre de l'onglet avec « (n) » devant quand il y a des nouveautés (99+ au-delà). */
export function titreAvecCompte(titre: string, n: number): string {
  const base = titre.replace(PREFIXE_TITRE, "");
  if (n <= 0) return base;
  return `(${n > 99 ? "99+" : n}) ${base}`;
}

/** Titre de la fenêtre d'alerte. */
export function titreAlerte(item: NotificationItem): string {
  if (item.kind === "vente-ebay") return "Nouvelle vente eBay";
  const pub = item.pub ? ` · Pub ${item.pub.platform === "meta" ? "Meta" : "Google"}` : "";
  if (item.soumissionId === null && item.pub) return `Nouveau lead${pub}`;
  return `Nouvelle soumission${pub}`;
}

/* ------------------------------------------------------------------ */
/* API POST                                                            */
/* ------------------------------------------------------------------ */

/** Clés du fil : « ebay:<commande> », « soumission:<uuid> », « lead:<uuid> ». */
const CLE_RE = /^(ebay|soumission|lead):[A-Za-z0-9._-]+$/;
export const CLE_MAX = 120;
export const RETRAIT_MAX = 200;

export function cleValide(k: unknown): k is string {
  return typeof k === "string" && k.length <= CLE_MAX && CLE_RE.test(k);
}

export type ActionNotifications =
  | { action: "vu"; upTo: string | null }
  | { action: "retirer"; keys: string[] }
  | { action: "effacer"; upTo: string };

/**
 * Corps du POST. `action` absent : « vu » (comportement d'origine, `upTo`
 * facultatif). Renvoie un message en français si l'entrée est invalide.
 */
export function lireActionNotifications(
  body: unknown,
): { ok: true; value: ActionNotifications } | { ok: false; message: string } {
  const b = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const action = b.action ?? "vu";
  if (action === "vu") {
    return { ok: true, value: { action: "vu", upTo: typeof b.upTo === "string" ? b.upTo : null } };
  }
  if (action === "retirer") {
    const keys = b.keys;
    if (!Array.isArray(keys) || keys.length === 0) {
      return { ok: false, message: "Aucune notification à retirer." };
    }
    if (keys.length > RETRAIT_MAX) {
      return { ok: false, message: `Pas plus de ${RETRAIT_MAX} notifications à la fois.` };
    }
    if (!keys.every(cleValide)) {
      return { ok: false, message: "Notification inconnue : clé invalide." };
    }
    return { ok: true, value: { action: "retirer", keys: Array.from(new Set(keys)) } };
  }
  if (action === "effacer") {
    if (typeof b.upTo !== "string" || !Number.isFinite(Date.parse(b.upTo))) {
      return { ok: false, message: "Date de fin du fil manquante ou invalide." };
    }
    return { ok: true, value: { action: "effacer", upTo: b.upTo } };
  }
  return { ok: false, message: "Action inconnue." };
}
