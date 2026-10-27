"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, PRENOM_MAX_LENGTH } from "@/lib/admin/config";

/** Prénom enregistré dans user_metadata.prenom (null si absent ou sans session). */
export async function getAdminPrenom(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  const prenom = user.user_metadata?.prenom;
  return typeof prenom === "string" && prenom.trim() ? prenom.trim() : null;
}

export type PrenomResult = { ok: true; prenom: string } | { ok: false; error: string };

/** Enregistre le prénom affiché sur l'accueil (1 à 40 caractères). */
export async function updateAdminPrenom(raw: string): Promise<PrenomResult> {
  const prenom = (typeof raw === "string" ? raw : "").replace(/\s+/g, " ").trim();
  if (prenom.length < 1 || prenom.length > PRENOM_MAX_LENGTH) {
    return {
      ok: false,
      error: `Le prénom doit contenir entre 1 et ${PRENOM_MAX_LENGTH} caractères.`,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return { ok: false, error: "Session expirée. Reconnecte-toi puis réessaie." };
  }

  const { error } = await supabase.auth.updateUser({ data: { prenom } });
  if (error) return { ok: false, error: `Supabase : ${error.message}` };

  revalidatePath("/admin", "layout");
  return { ok: true, prenom };
}
