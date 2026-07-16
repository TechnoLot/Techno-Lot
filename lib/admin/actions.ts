"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import type { LotSource, LotStatus } from "@/lib/admin/types";

/**
 * Payload accepté par createLot / updateLot. Les champs optionnels
 * peuvent être `null` pour effacer une valeur existante lors d'un update.
 */
export type LotInput = {
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  purchase_price: number;
  sale_price?: number | null;
  status: LotStatus;
  purchased_at: string; // YYYY-MM-DD
  sold_at?: string | null;
  description?: string | null;
  notes?: string | null;
  source?: LotSource;
};

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Non autorisé");
  }
  return { supabase, user };
}

/** Insère un nouveau lot et redirige vers le détail. */
export async function createLot(
  input: LotInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireAdmin();

  const { data, error } = await supabase
    .from("lots")
    .insert({
      client_name: input.client_name.trim(),
      client_email: input.client_email?.trim() || null,
      client_phone: input.client_phone?.trim() || null,
      purchase_price: input.purchase_price,
      sale_price: input.sale_price ?? null,
      status: input.status,
      purchased_at: input.purchased_at,
      sold_at: input.sold_at || null,
      description: input.description?.trim() || null,
      notes: input.notes?.trim() || null,
      source: input.source ?? "manual",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/lots");
  return { ok: true, id: data.id };
}

/** Met à jour un lot existant. */
export async function updateLot(
  id: string,
  input: LotInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("lots")
    .update({
      client_name: input.client_name.trim(),
      client_email: input.client_email?.trim() || null,
      client_phone: input.client_phone?.trim() || null,
      purchase_price: input.purchase_price,
      sale_price: input.sale_price ?? null,
      status: input.status,
      purchased_at: input.purchased_at,
      sold_at: input.sold_at || null,
      description: input.description?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/lots");
  revalidatePath(`/admin/lots/${id}`);
  return { ok: true };
}

/**
 * Supprime un lot et redirige vers la liste. En cas d'échec (ex. :
 * contrainte de clé étrangère), renvoie l'erreur au lieu de lancer une
 * exception — sinon Next affiche une page « server-side exception ».
 */
export async function deleteLot(
  id: string,
): Promise<{ ok: false; error: string } | never> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("lots").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/lots");
  redirect("/admin/lots");
}
