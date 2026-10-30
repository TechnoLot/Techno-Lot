"use server";

import { revalidatePath } from "next/cache";
import { PRENOM_MAX_LENGTH } from "@/lib/admin/config";
import { adminPourAction } from "@/lib/securite/garde";
import { echecAction, journaliserAction, REFUS_ACTION } from "@/lib/admin/erreurs-admin";

/** Prénom enregistré dans user_metadata.prenom (null si absent ou sans session admin). */
export async function getAdminPrenom(): Promise<string | null> {
  const ctx = await adminPourAction();
  if (!ctx) return null;
  const prenom = ctx.user.user_metadata?.prenom;
  return typeof prenom === "string" && prenom.trim() ? prenom.trim() : null;
}

export type PrenomResult = { ok: true; prenom: string } | { ok: false; error: string };

/** Enregistre le prénom affiché sur l'accueil (1 à 40 caractères). */
export async function updateAdminPrenom(raw: string): Promise<PrenomResult> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;

  const prenom = (typeof raw === "string" ? raw : "").replace(/\s+/g, " ").trim();
  if (prenom.length < 1 || prenom.length > PRENOM_MAX_LENGTH) {
    return {
      ok: false,
      error: `Le prénom doit contenir entre 1 et ${PRENOM_MAX_LENGTH} caractères.`,
    };
  }

  try {
    const { error } = await ctx.supabase.auth.updateUser({ data: { prenom } });
    if (error) return await echecAction(error, "compte.prenom", ctx, "Enregistrement du prénom impossible.");
  } catch (err) {
    return echecAction(err, "compte.prenom", ctx, "Enregistrement du prénom impossible.");
  }

  void journaliserAction("compte.prenom_modifie", ctx, { cible: ctx.user.id });
  revalidatePath("/admin", "layout");
  return { ok: true, prenom };
}
