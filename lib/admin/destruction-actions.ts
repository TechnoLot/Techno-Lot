"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import { validerCertificat, type ValeursCertificat } from "@/lib/admin/destruction";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = "/admin/destruction-donnees";

/**
 * Enregistre le certificat avant chaque téléchargement : création (sans id)
 * ou mise à jour du certificat ouvert (id). Le numéro est unique.
 */
export async function enregistrerCertificat(
  id: string | null,
  brut: ValeursCertificat,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const verif = validerCertificat(brut);
  if (!verif.ok) return verif;
  if (id !== null && !UUID.test(id)) return { ok: false, error: "Certificat introuvable." };
  const v = verif.valeurs;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return { ok: false, error: "Session expirée. Reconnecte-toi puis réessaie." };
  }

  const ligne = {
    numero: v.numero,
    compagnie: v.compagnie,
    adresse: v.adresse || null,
    materiel: v.materiel || null,
    nb_appareils: v.nbAppareils,
    date_destruction: v.dateDestruction,
    date_emission: v.dateEmission,
  };

  const { data, error } = id
    ? await supabase
        .from("certificats_destruction")
        .update({ ...ligne, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("certificats_destruction")
        .insert({ ...ligne, created_by: user.email ?? null })
        .select("id")
        .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: `Le numéro ${v.numero} existe déjà. Change le numéro, ou ouvre ce certificat dans la liste.`,
      };
    }
    return { ok: false, error: `Enregistrement impossible : ${error.message}` };
  }
  if (!data) return { ok: false, error: "Ce certificat n’existe plus (supprimé ?)." };

  revalidatePath(PAGE);
  return { ok: true, id: data.id as string };
}

/** Retire un certificat du registre (ex. un essai) ; le fichier déjà envoyé au client reste valide. */
export async function supprimerCertificat(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID.test(id)) return { ok: false, error: "Certificat introuvable." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return { ok: false, error: "Session expirée. Reconnecte-toi puis réessaie." };
  }

  const { data, error } = await supabase
    .from("certificats_destruction")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: `Suppression impossible : ${error.message}` };
  if (!data?.length) return { ok: false, error: "Ce certificat n’existe plus (déjà supprimé ?)." };

  revalidatePath(PAGE);
  return { ok: true };
}
