import { createClient } from "@/lib/supabase/server";
import { isEbayConfigured } from "@/lib/ebay/client";
import { sumEbayOrders, torontoRangeUtc, type EbayCountable, type EbayOrderRow } from "@/lib/ebay/totaux";

export type EbayTotals = {
  /** Les clés eBay sont présentes dans l'environnement */
  configured: boolean;
  /** Total payé par les acheteurs (articles + livraison + taxes), en $ */
  revenue: number;
  /** Frais eBay connus pour ces commandes (null si eBay ne les fournit pas) */
  fees: number | null;
  /** Nombre de commandes comptées */
  orders: number;
  /** Date de la dernière synchronisation (ISO), null si jamais synchronisé */
  lastSync: string | null;
};

export type EbaySyncStatus = {
  /** Dernière synchronisation réussie (ISO) */
  lastSync: string | null;
  /** Dernière tentative (réussie ou non) */
  lastRun: { at: string; ok: boolean; message: string | null } | null;
  /** Accès aux frais lors de la dernière synchro réussie (null = inconnu) */
  feesAvailable: boolean | null;
};

const PAGE = 1000;

/**
 * Commandes de la période (jours inclusifs « YYYY-MM-DD » à l'heure de
 * Toronto ; null = sans borne), toutes pages confondues.
 */
export async function getEbayOrderRows<K extends keyof EbayOrderRow>(
  from: string | null,
  to: string | null,
  columns: readonly K[],
): Promise<Array<Pick<EbayOrderRow, K>>> {
  const supabase = createClient();
  const { gte, lt } = torontoRangeUtc(from, to);
  const out: Array<Pick<EbayOrderRow, K>> = [];
  for (let offset = 0; offset < 200_000; offset += PAGE) {
    let q = supabase
      .from("ebay_orders")
      .select(columns.join(", "))
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (gte) q = q.gte("created_at", gte);
    if (lt) q = q.lt("created_at", lt);
    const { data, error } = await q;
    if (error || !data) break;
    for (const r of data as unknown as Array<Record<string, unknown>>) {
      out.push(normalizeRow(r) as Pick<EbayOrderRow, K>);
    }
    if (data.length < PAGE) break;
  }
  return out;
}

/** Les colonnes numeric arrivent parfois en texte : on les convertit. */
function normalizeRow(r: Record<string, unknown>): Record<string, unknown> {
  const out = { ...r };
  for (const k of ["total", "subtotal", "shipping", "tax", "refunded", "fees"]) {
    if (k in out && out[k] != null) out[k] = Number(out[k]);
  }
  return out;
}

/** Dernière synchronisation (réussie et tentée) et accès aux frais. */
export async function getEbaySyncStatus(): Promise<EbaySyncStatus> {
  const supabase = createClient();
  const [{ data: lastOk }, { data: last }] = await Promise.all([
    supabase
      .from("ebay_sync_runs")
      .select("ran_at, fees_available")
      .eq("ok", true)
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ebay_sync_runs")
      .select("ran_at, ok, message")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  let lastSync = (lastOk?.ran_at as string | undefined) ?? null;
  if (!lastSync) {
    const { data } = await supabase
      .from("ebay_orders")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastSync = (data?.synced_at as string | undefined) ?? null;
  }
  return {
    lastSync,
    lastRun: last ? { at: last.ran_at as string, ok: Boolean(last.ok), message: (last.message as string) ?? null } : null,
    feesAvailable: (lastOk?.fees_available as boolean | null | undefined) ?? null,
  };
}

/** Dernières commandes (toutes, y compris annulées) pour l'affichage. */
export async function getRecentEbayOrders(limit = 20): Promise<EbayOrderRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ebay_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("[ebay] Lecture des dernières commandes impossible :", error.message);
  return (data ?? []).map((r) => normalizeRow(r) as unknown as EbayOrderRow);
}

/**
 * Une page des commandes de la période (toutes, y compris annulées et
 * remboursées), plus récentes d'abord. Jours inclusifs « YYYY-MM-DD » à
 * l'heure de Toronto ; null = sans borne. La page est ramenée dans
 * [1, pageCount].
 */
export async function getEbayOrdersPage(
  from: string | null,
  to: string | null,
  page: number,
  parPage: number,
): Promise<{ rows: EbayOrderRow[]; total: number; page: number; pageCount: number }> {
  const supabase = createClient();
  const { gte, lt } = torontoRangeUtc(from, to);
  const taille = Math.max(1, Math.floor(parPage) || 1);
  const nbPages = (total: number) => Math.max(1, Math.ceil(total / taille));

  const lire = (n: number) => {
    let q = supabase
      .from("ebay_orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((n - 1) * taille, n * taille - 1);
    if (gte) q = q.gte("created_at", gte);
    if (lt) q = q.lt("created_at", lt);
    return q;
  };

  let courante = Math.max(1, Math.floor(page) || 1);
  let res = await lire(courante);

  // Page hors limites (PostgREST répond alors une erreur) : on compte, puis on relit.
  if (res.error || (res.count != null && courante > nbPages(res.count))) {
    let q = supabase.from("ebay_orders").select("order_id", { count: "exact", head: true });
    if (gte) q = q.gte("created_at", gte);
    if (lt) q = q.lt("created_at", lt);
    const { count, error } = await q;
    if (error) return { rows: [], total: 0, page: 1, pageCount: 1 };
    courante = Math.min(courante, nbPages(count ?? 0));
    res = await lire(courante);
  }

  if (res.error) return { rows: [], total: 0, page: 1, pageCount: 1 };
  const total = res.count ?? 0;
  return {
    rows: (res.data ?? []).map((r) => normalizeRow(r) as unknown as EbayOrderRow),
    total,
    page: courante,
    pageCount: nbPages(total),
  };
}

/**
 * Totaux des ventes eBay d'une période, pour les tuiles « Ventes » et
 * « Profit » du tableau de bord, avec les commandes elles-mêmes (graphique
 * « Évolution »). Jours inclusifs « YYYY-MM-DD » à l'heure de Toronto ;
 * null = sans borne.
 *
 * Lit la table `ebay_orders` (remplie par POST /api/admin/ebay-sync).
 * Les commandes annulées ou entièrement remboursées ne comptent pas.
 */
export async function getEbayTotals(
  from: string | null,
  to: string | null,
): Promise<EbayTotals & { rows: Array<EbayCountable & { created_at: string }> }> {
  const configured = isEbayConfigured();
  try {
    const [rows, status] = await Promise.all([
      getEbayOrderRows<keyof EbayCountable | "created_at">(from, to, [
        "created_at",
        "total",
        "refunded",
        "fees",
        "cancelled",
        "payment_status",
      ]),
      getEbaySyncStatus(),
    ]);
    const sums = sumEbayOrders(rows);
    return { configured, revenue: sums.revenue, fees: sums.fees, orders: sums.orders, lastSync: status.lastSync, rows };
  } catch {
    return { configured, revenue: 0, fees: null, orders: 0, lastSync: null, rows: [] };
  }
}
