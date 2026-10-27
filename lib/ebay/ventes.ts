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
  const { data } = await supabase
    .from("ebay_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => normalizeRow(r) as unknown as EbayOrderRow);
}

/**
 * Totaux des ventes eBay d'une période, pour les tuiles « Ventes » et
 * « Profit » du tableau de bord. Jours inclusifs « YYYY-MM-DD » à l'heure de
 * Toronto ; null = sans borne.
 *
 * Lit la table `ebay_orders` (remplie par POST /api/admin/ebay-sync).
 * Les commandes annulées ou entièrement remboursées ne comptent pas.
 */
export async function getEbayTotals(from: string | null, to: string | null): Promise<EbayTotals> {
  const configured = isEbayConfigured();
  try {
    const [rows, status] = await Promise.all([
      getEbayOrderRows<keyof EbayCountable>(from, to, ["total", "refunded", "fees", "cancelled", "payment_status"]),
      getEbaySyncStatus(),
    ]);
    const sums = sumEbayOrders(rows);
    return { configured, revenue: sums.revenue, fees: sums.fees, orders: sums.orders, lastSync: status.lastSync };
  } catch {
    return { configured, revenue: 0, fees: null, orders: 0, lastSync: null };
  }
}
