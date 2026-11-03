import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fusionCarnet, type FicheExistante } from "@/lib/acheteurs/carnet";
import { construireDemande } from "@/lib/acheteurs/demande";
import {
  choisirRecherche,
  fusionResultats,
  lireArticlesStockes,
  lireResultats,
  type LigneFile,
} from "@/lib/acheteurs/recherche";
import { lireReponse } from "@/lib/acheteurs/reponse";
import {
  MESSAGE_PLAFOND,
  MESSAGES_ECHEC,
  RECHERCHES_PAR_JOUR,
  type AcheteurLu,
  type EchecAgent,
} from "@/lib/acheteurs/types";
import { limiter } from "@/lib/securite/limite";

/*
 * File des recherches d'acheteurs, côté serveur : client service_role des
 * routes /api/cron/acheteurs/*, appelées par l'agent de l'ordinateur de
 * l'utilisateur (scripts/agent-acheteurs). L'admin met une recherche en file
 * (lib/acheteurs/actions.ts) ; l'agent la prend, fait chercher Claude avec le
 * forfait de l'utilisateur, puis renvoie sa réponse. Le site n'appelle jamais
 * d'IA.
 */

const TABLE = "recherches_acheteurs";

export type Prise = { id: string; jeton: string; demande: string };
export type ResultatPrise = { etat: "prise"; prise: Prise } | { etat: "rien" } | { etat: "plafond" };

/**
 * Prend la prochaine recherche (en attente, ou abandonnée en cours) : elle passe
 * « en cours » avec un nouveau jeton. La mise à jour est conditionnelle (même
 * statut et même jeton qu'à la lecture) : deux prises ne visent jamais la
 * même recherche. Au plus RECHERCHES_PAR_JOUR prises par 24 h.
 */
export async function prendreRecherche(supabase: SupabaseClient, maintenant = Date.now()): Promise<ResultatPrise> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, statut, demande_le, pris_le, jeton")
    .in("statut", ["en_attente", "en_cours"])
    .order("demande_le", { ascending: true })
    .limit(50);
  if (error) throw error;
  const choisie = choisirRecherche((data ?? []) as LigneFile[], maintenant);
  if (!choisie) return { etat: "rien" };

  const verdict = await limiter("acheteurs:prises", "agent", 86_400, RECHERCHES_PAR_JOUR);
  if (!verdict.permis) {
    // Message pour l'écran, effacé à la prise.
    await supabase.from(TABLE).update({ erreur: MESSAGE_PLAFOND }).eq("id", choisie.id).eq("statut", "en_attente");
    return { etat: "plafond" };
  }

  const jeton = randomUUID();
  let maj = supabase
    .from(TABLE)
    .update({ statut: "en_cours", pris_le: new Date(maintenant).toISOString(), jeton, erreur: null })
    .eq("id", choisie.id)
    .eq("statut", choisie.statut);
  maj = choisie.jeton ? maj.eq("jeton", choisie.jeton) : maj.is("jeton", null);
  const { data: prise, error: erreurPrise } = await maj.select("id, articles, domaines_exclus").maybeSingle();
  if (erreurPrise) throw erreurPrise;
  if (!prise) return { etat: "rien" }; // prise ou annulée entre-temps

  const articles = lireArticlesStockes(prise.articles);
  if (articles.length === 0) {
    await terminer(supabase, prise.id, jeton, {
      statut: "echec",
      erreur: "Aucun article lisible : modifiez les articles, puis relancez.",
    });
    return { etat: "rien" };
  }
  const exclus = Array.isArray(prise.domaines_exclus) ? (prise.domaines_exclus as string[]) : [];
  return { etat: "prise", prise: { id: prise.id, jeton, demande: construireDemande({ articles, domainesExclus: exclus }) } };
}

/** Fin d'une prise : écrit seulement si la recherche porte encore ce jeton (sinon : annulée, relancée ou reprise). */
async function terminer(
  supabase: SupabaseClient,
  id: string,
  jeton: string,
  champs: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...champs, jeton: null })
    .eq("id", id)
    .eq("statut", "en_cours")
    .eq("jeton", jeton)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

const COLONNES_FUSION =
  "domaine, ville, region, pays, courriel, telephone, formulaire, notes, sources, categories, modeles, confiance, verifie";

/** Range les compagnies lues dans le carnet (fusion par domaine, lib/acheteurs/carnet.ts). */
async function rangerAuCarnet(supabase: SupabaseClient, lus: AcheteurLu[]): Promise<void> {
  if (lus.length === 0) return;
  const { data, error } = await supabase
    .from("acheteurs")
    .select(COLONNES_FUSION)
    .in(
      "domaine",
      lus.map((a) => a.domaine),
    );
  if (error) throw error;
  const parDomaine = new Map(((data ?? []) as (FicheExistante & { domaine: string })[]).map((e) => [e.domaine, e]));
  const fiches = lus.map((a) => fusionCarnet(parDomaine.get(a.domaine), a));
  const { error: erreurCarnet } = await supabase.from("acheteurs").upsert(fiches, { onConflict: "domaine" });
  if (erreurCarnet) throw erreurCarnet;
}

export type EnvoiAgent = { id: string; jeton: string } & ({ reponse: string } | { echec: EchecAgent });
export type Reception =
  | { etat: "resultats"; familles: number; acheteurs: number; refus: number }
  | { etat: "echec"; erreur: string }
  /** Recherche annulée, relancée ou reprise depuis la prise : réponse ignorée. */
  | { etat: "perimee" };

/**
 * Réponse de l'agent : la réponse de Claude (lue par lib/acheteurs/reponse.ts,
 * compagnies rangées au carnet, résultats gardés avec la soumission), ou la
 * raison de son échec (message fixe de MESSAGES_ECHEC). Une recherche
 * « d'autres acheteurs » ajoute ses compagnies aux résultats précédents.
 */
export async function recevoirReponse(supabase: SupabaseClient, envoi: EnvoiAgent): Promise<Reception> {
  const { data: ligne, error } = await supabase
    .from(TABLE)
    .select("id, statut, jeton, resultats, domaines_exclus")
    .eq("id", envoi.id)
    .maybeSingle();
  if (error) throw error;
  if (!ligne || ligne.statut !== "en_cours" || ligne.jeton !== envoi.jeton) return { etat: "perimee" };

  if ("echec" in envoi) {
    const erreur = MESSAGES_ECHEC[envoi.echec];
    return (await terminer(supabase, envoi.id, envoi.jeton, { statut: "echec", erreur }))
      ? { etat: "echec", erreur }
      : { etat: "perimee" };
  }

  const lu = lireReponse(envoi.reponse);
  if (!lu.ok) {
    const erreur = lu.erreur.slice(0, 300);
    return (await terminer(supabase, envoi.id, envoi.jeton, { statut: "echec", erreur }))
      ? { etat: "echec", erreur }
      : { etat: "perimee" };
  }

  await rangerAuCarnet(supabase, lu.acheteurs);
  const ancien = lireResultats(ligne.resultats);
  const autres = Array.isArray(ligne.domaines_exclus) && ligne.domaines_exclus.length > 0;
  const resultats = autres && ancien ? fusionResultats(ancien, lu.resultat) : lu.resultat;
  const ecrit = await terminer(supabase, envoi.id, envoi.jeton, {
    statut: "resultats",
    resultats,
    lignes_refusees: lu.refus.length,
    erreur: null,
    resultats_le: new Date().toISOString(),
  });
  if (!ecrit) return { etat: "perimee" };
  return { etat: "resultats", familles: resultats.familles.length, acheteurs: lu.acheteurs.length, refus: lu.refus.length };
}
