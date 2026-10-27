import type { SupabaseClient } from "@supabase/supabase-js";
import { EBAY_SCOPES, EbayApiError, ebayFetch, isEbayConfigured } from "@/lib/ebay/client";
import { mapApiOrder, type EbayApiOrder, type EbayOrderRow } from "@/lib/ebay/totaux";

/**
 * Synchronisation des commandes eBay vers la table `ebay_orders`.
 *
 * - Premier passage : commandes créées dans les 365 derniers jours.
 * - Ensuite : commandes modifiées depuis la dernière synchro réussie
 *   (avec 48 h de chevauchement), pour capter annulations et remboursements.
 * - Frais : API Finances (transactions SALE, `totalFeeAmount`). Sans le droit
 *   `sell.finances`, on garde le frais de place de marché de la commande s'il
 *   existe, sinon `fees` reste null, sans faire échouer la synchro.
 */

export type EbaySyncResult = {
  ok: boolean;
  mode: "initial" | "incremental" | null;
  /** Commandes reçues d'eBay et enregistrées */
  orders: number;
  /** true = API Finances accessible ; false = droit refusé ; null = non tenté / erreur */
  feesAvailable: boolean | null;
  /** Commandes dont les frais ont été mis à jour depuis l'API Finances */
  feesUpdated: number;
  message: string;
};

const FIRST_SYNC_DAYS = 365;
const OVERLAP_MS = 48 * 3600 * 1000;
const FEES_BACKFILL_DAYS = 90;
const ORDERS_PAGE = 200;
const FINANCES_PAGE = 1000;
const MAX_PAGES = 100;
const DAY_MS = 24 * 3600 * 1000;

type OrdersResp = { orders?: EbayApiOrder[]; total?: number };
type FinancesResp = {
  transactions?: Array<{
    orderId?: string;
    transactionType?: string;
    totalFeeAmount?: { value?: string; currency?: string };
  }>;
  total?: number;
};

/** Toutes les commandes correspondant au filtre (pagination complète). */
async function fetchAllOrders(filter: string): Promise<EbayApiOrder[]> {
  const out: EbayApiOrder[] = [];
  for (let page = 0, offset = 0; page < MAX_PAGES; page++, offset += ORDERS_PAGE) {
    const data = await ebayFetch<OrdersResp>(
      `/sell/fulfillment/v1/order?limit=${ORDERS_PAGE}&offset=${offset}&fieldGroups=TAX_BREAKDOWN&filter=${filter}`,
      { scopes: [EBAY_SCOPES.fulfillment] },
    );
    const batch = data.orders ?? [];
    out.push(...batch);
    const total = data.total ?? 0;
    if (batch.length < ORDERS_PAGE || offset + batch.length >= total) break;
  }
  return out;
}

/** Frais eBay totaux par commande (transactions SALE de l'API Finances). */
async function fetchFeesByOrder(sinceIso: string, untilIso: string): Promise<Map<string, number>> {
  const fees = new Map<string, number>();
  const range = `transactionDate:%5B${sinceIso}..${untilIso}%5D`;
  for (let page = 0, offset = 0; page < MAX_PAGES; page++, offset += FINANCES_PAGE) {
    const data = await ebayFetch<FinancesResp>(
      `/sell/finances/v1/transaction?limit=${FINANCES_PAGE}&offset=${offset}&filter=transactionType:%7BSALE%7D&filter=${range}`,
      { base: "apiz", scopes: [EBAY_SCOPES.finances] },
    );
    const batch = data.transactions ?? [];
    for (const t of batch) {
      if (!t.orderId || (t.transactionType && t.transactionType !== "SALE")) continue;
      const v = Number(t.totalFeeAmount?.value ?? NaN);
      if (!Number.isFinite(v)) continue;
      fees.set(t.orderId, Math.round(((fees.get(t.orderId) ?? 0) + v) * 100) / 100);
    }
    const total = data.total ?? 0;
    if (batch.length < FINANCES_PAGE || offset + batch.length >= total) break;
  }
  return fees;
}

async function logRun(
  supabase: SupabaseClient,
  r: Pick<EbaySyncResult, "ok" | "mode" | "orders" | "feesAvailable" | "message">,
) {
  await supabase.from("ebay_sync_runs").insert({
    ok: r.ok,
    mode: r.mode,
    orders_synced: r.orders,
    fees_available: r.feesAvailable,
    message: r.message.slice(0, 1000),
  });
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 400) : "Erreur inconnue";
}

export async function syncEbayOrders(supabase: SupabaseClient): Promise<EbaySyncResult> {
  if (!isEbayConfigured()) {
    return {
      ok: false,
      mode: null,
      orders: 0,
      feesAvailable: null,
      feesUpdated: 0,
      message: "Clés eBay manquantes : ajoute EBAY_APP_ID, EBAY_CERT_ID et EBAY_REFRESH_TOKEN côté serveur.",
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Fenêtre : premier passage ou depuis la dernière synchro réussie
  const { data: lastRun } = await supabase
    .from("ebay_sync_runs")
    .select("ran_at")
    .eq("ok", true)
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mode: EbaySyncResult["mode"] = lastRun?.ran_at ? "incremental" : "initial";
  const sinceIso =
    mode === "incremental"
      ? new Date(new Date(lastRun!.ran_at as string).getTime() - OVERLAP_MS).toISOString()
      : new Date(now.getTime() - FIRST_SYNC_DAYS * DAY_MS).toISOString();
  const filter =
    mode === "incremental"
      ? `lastmodifieddate:%5B${sinceIso}..%5D`
      : `creationdate:%5B${sinceIso}..%5D`;

  // 2. Commandes
  let apiOrders: EbayApiOrder[];
  try {
    apiOrders = await fetchAllOrders(filter);
  } catch (e) {
    const permission = e instanceof EbayApiError && e.isPermissionError;
    const message = permission
      ? "eBay refuse la lecture des commandes : le jeton doit inclure le droit sell.fulfillment (ou sell.fulfillment.readonly)."
      : `Lecture des commandes eBay impossible : ${errText(e)}`;
    await logRun(supabase, { ok: false, mode, orders: 0, feesAvailable: null, message });
    return { ok: false, mode, orders: 0, feesAvailable: null, feesUpdated: 0, message };
  }

  const mapped = apiOrders.map(mapApiOrder).filter((o): o is NonNullable<typeof o> => o !== null);
  const ids = mapped.map((o) => o.order_id);

  // 3. Frais via l'API Finances (fenêtre élargie aux commandes récentes sans frais)
  let financesSince = sinceIso;
  if (mode === "incremental") {
    const backfillFloor = new Date(now.getTime() - FEES_BACKFILL_DAYS * DAY_MS).toISOString();
    const { data: oldestMissing } = await supabase
      .from("ebay_orders")
      .select("created_at")
      .is("fees", null)
      .gte("created_at", backfillFloor)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (oldestMissing?.created_at && (oldestMissing.created_at as string) < financesSince) {
      financesSince = new Date(oldestMissing.created_at as string).toISOString();
    }
  } else if (mapped.length > 0) {
    // Les transactions SALE suivent la commande : on part de la plus ancienne.
    const oldest = mapped.reduce((min, o) => (o.created_at < min ? o.created_at : min), mapped[0].created_at);
    if (oldest < financesSince) financesSince = oldest;
  }

  let feesAvailable: boolean | null = null;
  let feesNote = "";
  let feeMap = new Map<string, number>();
  try {
    feeMap = await fetchFeesByOrder(financesSince, nowIso);
    feesAvailable = true;
  } catch (e) {
    if (e instanceof EbayApiError && e.isPermissionError) {
      feesAvailable = false;
      feesNote = " Frais eBay non accessibles (droit sell.finances manquant).";
    } else {
      feesNote = ` Frais eBay non lus : ${errText(e)}`;
    }
  }

  // 4. Frais déjà connus (à ne pas écraser par un frais moins complet)
  const existingFees = new Map<string, number | null>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await supabase
      .from("ebay_orders")
      .select("order_id, fees")
      .in("order_id", ids.slice(i, i + 300));
    for (const r of data ?? []) existingFees.set(r.order_id as string, r.fees == null ? null : Number(r.fees));
  }

  const rows: EbayOrderRow[] = mapped.map(({ marketplaceFee, ...o }) => ({
    ...o,
    fees: feeMap.get(o.order_id) ?? existingFees.get(o.order_id) ?? marketplaceFee ?? null,
    synced_at: nowIso,
  }));

  // 5. Enregistrement
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("ebay_orders").upsert(rows.slice(i, i + 500), { onConflict: "order_id" });
    if (error) {
      const message = `Enregistrement des commandes impossible : ${error.message}`;
      await logRun(supabase, { ok: false, mode, orders: i, feesAvailable, message });
      return { ok: false, mode, orders: i, feesAvailable, feesUpdated: 0, message };
    }
  }

  // 6. Frais trouvés pour des commandes déjà en base mais hors de ce lot
  let feesUpdated = rows.filter((r) => feeMap.has(r.order_id)).length;
  const inBatch = new Set(ids);
  const others = Array.from(feeMap.keys()).filter((id) => !inBatch.has(id));
  for (let i = 0; i < others.length; i += 300) {
    const { data } = await supabase
      .from("ebay_orders")
      .select("order_id, fees")
      .in("order_id", others.slice(i, i + 300));
    for (const r of data ?? []) {
      const fee = feeMap.get(r.order_id as string)!;
      if (r.fees != null && Number(r.fees) === fee) continue;
      const { error } = await supabase
        .from("ebay_orders")
        .update({ fees: fee, synced_at: nowIso })
        .eq("order_id", r.order_id as string);
      if (!error) feesUpdated++;
    }
  }

  const message =
    `${rows.length} commande${rows.length > 1 ? "s" : ""} synchronisée${rows.length > 1 ? "s" : ""}` +
    (mode === "initial" ? ` (${FIRST_SYNC_DAYS} derniers jours).` : ".") +
    feesNote;
  await logRun(supabase, { ok: true, mode, orders: rows.length, feesAvailable, message });
  return { ok: true, mode, orders: rows.length, feesAvailable, feesUpdated, message };
}
