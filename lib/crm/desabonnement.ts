import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Courriels (en minuscules) des contacts désabonnés (LCAP). Un envoi est
 * refusé si l'adresse y figure, même quand la demande a été notée sur une
 * autre fiche (doublon d'import). Lecture impossible : on n'envoie rien.
 * L'erreur de la base est rendue dans `erreur` (pour le journal), jamais
 * comme message affichable.
 */
export async function courrielsDesabonnes(
  supabase: SupabaseClient,
): Promise<{ ok: true; emails: Set<string> } | { ok: false; erreur: unknown }> {
  const { data, error } = await supabase
    .from("contacts")
    .select("email")
    .not("unsubscribed_at", "is", null);
  if (error) return { ok: false, erreur: error };

  const emails = new Set<string>();
  for (const c of (data ?? []) as { email: string | null }[]) {
    const email = c.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }
  return { ok: true, emails };
}
