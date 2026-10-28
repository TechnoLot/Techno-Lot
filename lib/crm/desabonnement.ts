import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Courriels (en minuscules) des contacts désabonnés (LCAP). Un envoi est
 * refusé si l'adresse y figure, même quand la demande a été notée sur une
 * autre fiche (doublon d'import). Lecture impossible : on n'envoie rien.
 */
export async function courrielsDesabonnes(
  supabase: SupabaseClient,
): Promise<{ ok: true; emails: Set<string> } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("contacts")
    .select("email")
    .not("unsubscribed_at", "is", null);
  if (error) return { ok: false, error: error.message };

  const emails = new Set<string>();
  for (const c of (data ?? []) as { email: string | null }[]) {
    const email = c.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }
  return { ok: true, emails };
}
