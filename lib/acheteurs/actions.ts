"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminPourAction } from "@/lib/securite/garde";
import { limiter } from "@/lib/securite/limite";
import {
  echecAction,
  echecValidation,
  journaliserAction,
  REFUS_ACTION,
  type EchecAction,
} from "@/lib/admin/erreurs-admin";
import { uuid } from "@/lib/admin/schemas";
import { lireArticlesSaisis } from "@/lib/acheteurs/articles";
import { domainesDe, lireResultats } from "@/lib/acheteurs/recherche";
import { LIMITES, type StatutRecherche } from "@/lib/acheteurs/types";

/*
 * Actions de l'agent « Acheteurs » (onglet Soumissions, CRM → Acheteurs).
 * Aucune n'appelle d'IA ni n'envoie de courriel : la recherche est mise en
 * file, puis faite par l'agent de l'ordinateur de l'utilisateur
 * (scripts/agent-acheteurs → /api/cron/acheteurs/*, lib/acheteurs/file.ts) ;
 * l'envoi passe par les actions de l'Envoi en gros
 * (lib/crm/envoi-en-gros-actions.ts : vérification, limite, désabonnés, traces).
 */

function revalider() {
  revalidatePath("/admin");
  revalidatePath("/admin/soumissions");
  revalidatePath("/admin/crm/acheteurs");
}

const TABLE = "recherches_acheteurs";

const demandeSchema = z.strictObject({
  soumissionId: uuid,
  articles: z.string().max(LIMITES.texteArticles),
  autres: z.boolean(),
});

/**
 * « Lancer la recherche » : met la recherche en file ; l'agent de l'ordinateur
 * la prend dans les 5 minutes. `autres` (« Chercher d'autres acheteurs ») :
 * les compagnies déjà trouvées sont exclues de la demande, et les nouvelles
 * s'ajoutent aux résultats. Les résultats précédents restent affichés d'ici là.
 */
export async function demanderRecherche(entree: {
  soumissionId: string;
  articles: string;
  autres: boolean;
}): Promise<{ ok: true } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const v = demandeSchema.safeParse(entree);
  if (!v.success) return echecValidation(v.error, { articles: "Articles" });
  const articles = lireArticlesSaisis(v.data.articles);
  if (articles.length === 0) return { ok: false, error: "Ajoutez au moins un article." };

  const verdict = await limiter("acheteurs:demande", ctx.user.id, 3_600, 30);
  if (!verdict.permis) {
    return { ok: false, error: "Trop de recherches en peu de temps. Réessayez dans quelques minutes." };
  }

  try {
    const { data: avant, error: erreurLecture } = await ctx.supabase
      .from(TABLE)
      .select("resultats")
      .eq("soumission_id", v.data.soumissionId)
      .maybeSingle();
    if (erreurLecture) return echecAction(erreurLecture, "acheteurs.demande", ctx, "Recherche impossible.");
    const exclus = v.data.autres ? domainesDe(lireResultats(avant?.resultats)).slice(0, LIMITES.domainesExclus) : [];

    const { error } = await ctx.supabase.from(TABLE).upsert(
      {
        soumission_id: v.data.soumissionId,
        statut: "en_attente",
        articles,
        domaines_exclus: exclus,
        erreur: null,
        demande_le: new Date().toISOString(),
        pris_le: null,
        jeton: null,
        lance_par: ctx.user.id,
      },
      { onConflict: "soumission_id" },
    );
    if (error) return echecAction(error, "acheteurs.demande", ctx, "Recherche impossible.");
  } catch (err) {
    return echecAction(err, "acheteurs.demande", ctx, "Recherche impossible.");
  }

  void journaliserAction("acheteurs.demande", ctx, {
    cible: v.data.soumissionId,
    articles: articles.length,
    autres: v.data.autres,
  });
  revalider();
  return { ok: true };
}

/**
 * « Annuler la recherche » (en file ou en cours) ou fermer un échec : avec des
 * résultats précédents, on y revient ; sans, la recherche disparaît. Le jeton
 * est effacé : une réponse de l'agent arrivée ensuite est ignorée.
 */
export async function annulerRecherche(soumissionId: string): Promise<{ ok: true } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const v = uuid.safeParse(soumissionId);
  if (!v.success) return { ok: false, error: "Recherche introuvable." };

  const ouvertes = ["en_attente", "en_cours", "echec"];
  try {
    const { data: ligne, error: erreurLecture } = await ctx.supabase
      .from(TABLE)
      .select("statut, resultats")
      .eq("soumission_id", v.data)
      .maybeSingle();
    if (erreurLecture) return echecAction(erreurLecture, "acheteurs.annuler", ctx, "Annulation impossible.");
    if (!ligne || !ouvertes.includes(ligne.statut as string)) return { ok: true };

    const { error } = lireResultats(ligne.resultats)
      ? await ctx.supabase
          .from(TABLE)
          .update({ statut: "resultats", erreur: null, jeton: null, domaines_exclus: [] })
          .eq("soumission_id", v.data)
          .in("statut", ouvertes)
      : await ctx.supabase.from(TABLE).delete().eq("soumission_id", v.data).in("statut", ouvertes);
    if (error) return echecAction(error, "acheteurs.annuler", ctx, "Annulation impossible.");
  } catch (err) {
    return echecAction(err, "acheteurs.annuler", ctx, "Annulation impossible.");
  }

  void journaliserAction("acheteurs.annule", ctx, { cible: v.data });
  revalider();
  return { ok: true };
}

/**
 * État d'une recherche, relu par l'écran toutes les 15 secondes pendant
 * qu'elle est en file ou en cours (la page se recharge quand il change).
 */
export async function etatRecherche(soumissionId: string): Promise<
  | { ok: true; statut: StatutRecherche | null; prisLe: string | null; erreur: string | null }
  | EchecAction
> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const v = uuid.safeParse(soumissionId);
  if (!v.success) return { ok: false, error: "Recherche introuvable." };

  const { data, error } = await ctx.supabase
    .from(TABLE)
    .select("statut, pris_le, erreur")
    .eq("soumission_id", v.data)
    .maybeSingle();
  if (error) return echecAction(error, "acheteurs.etat", ctx, "État de la recherche illisible.");
  return {
    ok: true,
    statut: (data?.statut as StatutRecherche | undefined) ?? null,
    prisLe: (data?.pris_le as string | null | undefined) ?? null,
    erreur: (data?.erreur as string | null | undefined) ?? null,
  };
}

const verifieSchema = z.strictObject({ id: uuid, verifie: z.boolean() });

/** Carnet : « Vérifié » (coordonnées confirmées par l'admin) ou non. */
export async function marquerVerifie(entree: { id: string; verifie: boolean }): Promise<{ ok: true } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const v = verifieSchema.safeParse(entree);
  if (!v.success) return echecValidation(v.error);

  const { error } = await ctx.supabase.from("acheteurs").update({ verifie: v.data.verifie }).eq("id", v.data.id);
  if (error) return echecAction(error, "acheteurs.verifier", ctx, "Modification impossible.");

  void journaliserAction("acheteurs.verifie", ctx, { cible: v.data.id, verifie: v.data.verifie });
  revalider();
  return { ok: true };
}

/** Carnet : retire une compagnie (les recherches gardent leur texte). */
export async function supprimerAcheteur(id: string): Promise<{ ok: true } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const v = uuid.safeParse(id);
  if (!v.success) return { ok: false, error: "Compagnie introuvable." };

  const { error } = await ctx.supabase.from("acheteurs").delete().eq("id", v.data);
  if (error) return echecAction(error, "acheteurs.supprimer", ctx, "Suppression impossible.");

  void journaliserAction("acheteurs.supprime", ctx, { cible: v.data });
  revalider();
  return { ok: true };
}
