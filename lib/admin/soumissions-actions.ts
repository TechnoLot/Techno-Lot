"use server";

import { revalidatePath } from "next/cache";
import { adminPourAction } from "@/lib/securite/garde";
import {
  echecAction,
  journaliserAction,
  journaliserErreur,
  REFUS_ACTION,
  type EchecAction,
} from "@/lib/admin/erreurs-admin";
import { uuid } from "@/lib/admin/schemas";

/**
 * Supprime une demande du formulaire (fonction admin_supprimer_soumission,
 * migration 20261029130000) : le lead de pub du même envoi part aussi, le lot
 * éventuel reste. La lecture de ses pièces jointes part aussi : le nom de ses
 * fichiers et la liste lue ne survivent pas à la demande.
 */
export async function supprimerSoumission(id: string): Promise<{ ok: true } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const idValide = uuid.safeParse(id);
  if (!idValide.success) return { ok: false, error: "Demande introuvable." };

  try {
    const { data, error } = await ctx.supabase.rpc("admin_supprimer_soumission", { p_id: idValide.data });
    if (error) {
      if (error.code === "42501") return REFUS_ACTION;
      return await echecAction(error, "soumission.supprimer", ctx, "Suppression impossible.");
    }
    if (data !== true) return { ok: false, error: "Cette demande n’existe plus (déjà supprimée ?)." };
  } catch (err) {
    return echecAction(err, "soumission.supprimer", ctx, "Suppression impossible.");
  }

  // La demande est déjà partie : cet échec est journalisé, sans faire échouer l'action.
  try {
    const { error } = await ctx.supabase.from("lectures_soumissions").delete().eq("soumission_id", idValide.data);
    if (error) void journaliserErreur(error, "soumission.supprimer.lecture", ctx);
  } catch (err) {
    void journaliserErreur(err, "soumission.supprimer.lecture", ctx);
  }

  void journaliserAction("soumission.supprimee", ctx, { cible: idValide.data });
  revalidatePath("/admin");
  revalidatePath("/admin/soumissions");
  revalidatePath("/admin/notifications");
  return { ok: true };
}
