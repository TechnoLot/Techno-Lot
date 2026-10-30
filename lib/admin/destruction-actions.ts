"use server";

import { revalidatePath } from "next/cache";
import { adminPourAction } from "@/lib/securite/garde";
import { echecAction, journaliserAction, REFUS_ACTION, type EchecAction } from "@/lib/admin/erreurs-admin";
import {
  echapperLike,
  validerCertificat,
  type ClientCertificat,
  type ValeursCertificat,
} from "@/lib/admin/destruction";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = "/admin/destruction-donnees";
const FICHES = "/admin/crm/[id]";

/**
 * Enregistre le certificat avant chaque téléchargement : création (la base
 * attribue le numéro TL-AAAA-NNNN) ou mise à jour du certificat ouvert, dont
 * le numéro ne change jamais. `companyId` lie le certificat à la fiche client ;
 * sans choix dans la liste, une compagnie du CRM au nom identique est liée.
 */
export async function enregistrerCertificat(
  id: string | null,
  brut: ValeursCertificat,
  companyId: string | null,
): Promise<{ ok: true; id: string; numero: string; companyId: string | null } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const verif = validerCertificat(brut);
  if (!verif.ok) return verif;
  if (id !== null && (typeof id !== "string" || !UUID.test(id))) return { ok: false, error: "Certificat introuvable." };
  if (companyId !== null && (typeof companyId !== "string" || !UUID.test(companyId))) {
    return { ok: false, error: "Fiche client introuvable." };
  }
  const v = verif.valeurs;
  const { supabase, user } = ctx;

  try {
    let fiche = companyId;
    if (!fiche) {
      const { data: memeNom } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", echapperLike(v.compagnie))
        .limit(2);
      if (memeNom?.length === 1) fiche = memeNom[0].id as string;
    }

    const ligne = {
      compagnie: v.compagnie,
      adresse: v.adresse || null,
      materiel: v.materiel || null,
      nb_appareils: v.nbAppareils,
      date_destruction: v.dateDestruction,
      date_emission: v.dateEmission,
      company_id: fiche,
    };

    const { data, error } = id
      ? await supabase
          .from("certificats_destruction")
          .update({ ...ligne, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("id, numero")
          .maybeSingle()
      : await supabase
          .from("certificats_destruction")
          .insert({ ...ligne, created_by: user.email ?? null })
          .select("id, numero")
          .single();

    if (error) {
      if (error.code === "23503") {
        return { ok: false, error: "Cette fiche client n’existe plus. Choisis le client de nouveau." };
      }
      return await echecAction(error, "certificat.enregistrer", ctx, "Enregistrement impossible.");
    }
    if (!data) return { ok: false, error: "Ce certificat n’existe plus (supprimé ?)." };

    void journaliserAction(id ? "certificat.modifie" : "certificat.cree", ctx, {
      cible: data.id as string,
      fiche: fiche ?? null,
    });
    revalidatePath(PAGE);
    revalidatePath(FICHES, "page");
    return { ok: true, id: data.id as string, numero: data.numero as string, companyId: fiche };
  } catch (err) {
    return echecAction(err, "certificat.enregistrer", ctx, "Enregistrement impossible.");
  }
}

/**
 * Compagnies du CRM dont le nom contient la recherche : les clients (convertis)
 * d'abord, puis les prospects. Choisir l'une d'elles remplit le nom et l'adresse.
 */
export async function chercherClients(recherche: string): Promise<ClientCertificat[]> {
  const ctx = await adminPourAction();
  if (!ctx) return [];
  const texte = (typeof recherche === "string" ? recherche : "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (texte.length < 2) return [];
  const { supabase } = ctx;

  const motif = `%${echapperLike(texte)}%`;
  const chercher = () =>
    supabase
      .from("companies")
      .select("id, name, street_address, research_status")
      .ilike("name", motif)
      .order("name");
  const [clients, prospects] = await Promise.all([
    chercher().eq("research_status", "converted").limit(8),
    chercher().neq("research_status", "converted").limit(30),
  ]);

  const debut = texte.toLowerCase();
  const commencePar = (nom: string) => (nom.toLowerCase().startsWith(debut) ? 1 : 0);
  const versClient = (c: { id: string; name: string; street_address: string | null; research_status: string }) => ({
    id: c.id,
    nom: c.name,
    adresse: c.street_address ?? "",
    client: c.research_status === "converted",
  });
  const autres = (prospects.data ?? [])
    .map(versClient)
    .sort((a, b) => commencePar(b.nom) - commencePar(a.nom) || a.nom.localeCompare(b.nom, "fr"));
  return [...(clients.data ?? []).map(versClient), ...autres].slice(0, 8);
}

/** Retire un certificat du registre (ex. un essai) ; son numéro n'est jamais redonné. */
export async function supprimerCertificat(id: string): Promise<{ ok: true } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, error: "Certificat introuvable." };

  try {
    const { data, error } = await ctx.supabase
      .from("certificats_destruction")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) return await echecAction(error, "certificat.supprimer", ctx, "Suppression impossible.");
    if (!data?.length) return { ok: false, error: "Ce certificat n’existe plus (déjà supprimé ?)." };
  } catch (err) {
    return echecAction(err, "certificat.supprimer", ctx, "Suppression impossible.");
  }

  void journaliserAction("certificat.supprime", ctx, { cible: id });
  revalidatePath(PAGE);
  revalidatePath(FICHES, "page");
  return { ok: true };
}
