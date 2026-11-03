import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lireArticlesStockes, lireResultats } from "@/lib/acheteurs/recherche";
import {
  STATUTS_RECHERCHE,
  type AcheteurCarnet,
  type RechercheAcheteurs,
  type StatutRecherche,
} from "@/lib/acheteurs/types";

/*
 * Lectures de l'agent « Acheteurs » pour les pages admin (session de l'admin,
 * RLS est_admin()). Chaque fonction rend un résultat vide en cas d'erreur, avec
 * l'erreur à part : la page s'affiche quand même et la journalise.
 */

export const COLONNES_ACHETEUR =
  "id, nom, domaine, site, ville, region, pays, categories, modeles, courriel, telephone, formulaire, sources, confiance, verifie, notes, created_at";
const COLONNES_RECHERCHE =
  "id, soumission_id, statut, articles, domaines_exclus, resultats, lignes_refusees, erreur, demande_le, pris_le, resultats_le";

type RechercheBrute = {
  id: string;
  soumission_id: string;
  statut: string;
  articles: unknown;
  domaines_exclus: string[] | null;
  resultats: unknown;
  lignes_refusees: number | null;
  erreur: string | null;
  demande_le: string;
  pris_le: string | null;
  resultats_le: string | null;
};

const estStatut = (s: string): s is StatutRecherche => (STATUTS_RECHERCHE as readonly string[]).includes(s);

/** Recherche lisible, ou null (statut inconnu, ou « résultats » illisibles). */
function versRecherche(r: RechercheBrute): RechercheAcheteurs | null {
  if (!estStatut(r.statut)) return null;
  const resultats = lireResultats(r.resultats);
  if (r.statut === "resultats" && !resultats) return null;
  return {
    id: r.id,
    soumission_id: r.soumission_id,
    statut: r.statut,
    articles: lireArticlesStockes(r.articles),
    exclus: r.domaines_exclus?.length ?? 0,
    resultats,
    lignes_refusees: r.lignes_refusees ?? 0,
    erreur: r.erreur,
    demande_le: r.demande_le,
    pris_le: r.pris_le,
    resultats_le: r.resultats_le,
  };
}

/** Recherches des soumissions données, par soumission. */
export async function lireRecherches(
  supabase: SupabaseClient,
  soumissionIds: string[],
): Promise<{ recherches: Map<string, RechercheAcheteurs>; erreur: unknown }> {
  const recherches = new Map<string, RechercheAcheteurs>();
  if (soumissionIds.length === 0) return { recherches, erreur: null };
  const { data, error } = await supabase
    .from("recherches_acheteurs")
    .select(COLONNES_RECHERCHE)
    .in("soumission_id", soumissionIds.slice(0, 200));
  for (const brute of (data ?? []) as RechercheBrute[]) {
    const r = versRecherche(brute);
    if (r) recherches.set(r.soumission_id, r);
  }
  return { recherches, erreur: error };
}

/** Tout le carnet (CRM → Acheteurs), plus récentes d'abord. */
export async function lireCarnet(supabase: SupabaseClient): Promise<{ acheteurs: AcheteurCarnet[]; erreur: unknown }> {
  const { data, error } = await supabase
    .from("acheteurs")
    .select(COLONNES_ACHETEUR)
    .order("created_at", { ascending: false })
    .limit(2_000);
  return { acheteurs: (data ?? []) as AcheteurCarnet[], erreur: error };
}

/** Fiches du carnet, par domaine. */
export async function lireAcheteursParDomaines(
  supabase: SupabaseClient,
  domaines: string[],
): Promise<Map<string, AcheteurCarnet>> {
  const fiches = new Map<string, AcheteurCarnet>();
  const uniques = [...new Set(domaines)].slice(0, 500);
  if (uniques.length === 0) return fiches;
  const { data } = await supabase.from("acheteurs").select(COLONNES_ACHETEUR).in("domaine", uniques);
  for (const a of (data ?? []) as AcheteurCarnet[]) fiches.set(a.domaine, a);
  return fiches;
}

/**
 * Dernier échange du CRM avec chaque adresse (courriel en minuscules → date
 * ISO) : « Déjà joint » dans les résultats et le carnet. Les envois en gros
 * créent ou retrouvent la fiche contact de chaque adresse.
 */
export async function derniersContacts(supabase: SupabaseClient, courriels: string[]): Promise<Map<string, string>> {
  const dates = new Map<string, string>();
  const uniques = [...new Set(courriels.map((c) => c.toLowerCase()))].slice(0, 200);
  if (uniques.length === 0) return dates;

  const { data: contacts } = await supabase.from("contacts").select("id, email").in("email", uniques);
  const parContact = new Map(
    ((contacts ?? []) as { id: string; email: string | null }[])
      .filter((c) => c.email)
      .map((c) => [c.id, (c.email ?? "").toLowerCase()]),
  );
  if (parContact.size === 0) return dates;

  const { data: activites } = await supabase
    .from("outreach_activities")
    .select("contact_id, occurred_at")
    .in("contact_id", [...parContact.keys()])
    .order("occurred_at", { ascending: false })
    .limit(1_000);
  for (const a of (activites ?? []) as { contact_id: string; occurred_at: string }[]) {
    const courriel = parContact.get(a.contact_id);
    if (courriel && !dates.has(courriel)) dates.set(courriel, a.occurred_at);
  }
  return dates;
}

/** Comptes de la carte « Acheteurs » de l'accueil. */
export type ResumeAcheteurs = {
  /** soumission_id des soumissions qui ont déjà une recherche (en file, en cours, finie ou en échec) */
  avecRecherche: Set<string>;
  /** Recherches en file ou en cours sur l'ordinateur de l'agent */
  enCours: number;
  carnet: number;
  verifies: number;
};

export async function resumeAcheteurs(supabase: SupabaseClient): Promise<{ resume: ResumeAcheteurs; erreur: unknown }> {
  const [recherches, carnet, verifies] = await Promise.all([
    supabase.from("recherches_acheteurs").select("soumission_id, statut").limit(1_000),
    supabase.from("acheteurs").select("id", { count: "exact", head: true }),
    supabase.from("acheteurs").select("id", { count: "exact", head: true }).eq("verifie", true),
  ]);
  const lignes = (recherches.data ?? []) as { soumission_id: string; statut: string }[];
  return {
    resume: {
      avecRecherche: new Set(lignes.map((r) => r.soumission_id)),
      enCours: lignes.filter((r) => r.statut === "en_attente" || r.statut === "en_cours").length,
      carnet: carnet.count ?? 0,
      verifies: verifies.count ?? 0,
    },
    erreur: recherches.error ?? carnet.error ?? verifies.error ?? null,
  };
}
