"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";

/**
 * Supprime une demande du formulaire (fonction admin_supprimer_soumission,
 * migration 20261029130000) : le lead de pub du même envoi part aussi, le lot
 * éventuel reste.
 */
export async function supprimerSoumission(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, error: "Demande introuvable." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false, error: "Non autorisé." };

  const { data, error } = await supabase.rpc("admin_supprimer_soumission", { p_id: id });
  if (error) {
    return {
      ok: false,
      error: error.code === "42501" ? "Non autorisé." : `Suppression impossible : ${error.message}`,
    };
  }
  if (data !== true) return { ok: false, error: "Cette demande n’existe plus (déjà supprimée ?)." };

  revalidatePath("/admin");
  revalidatePath("/admin/soumissions");
  revalidatePath("/admin/notifications");
  return { ok: true };
}
