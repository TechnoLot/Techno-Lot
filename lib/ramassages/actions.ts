"use server";

import { revalidatePath } from "next/cache";
import { adminPourAction } from "@/lib/securite/garde";
import {
  echecAction,
  echecValidation,
  journaliserAction,
  REFUS_ACTION,
  type ContexteJournal,
  type EchecAction,
} from "@/lib/admin/erreurs-admin";
import { ErreurAffichable, texteDetail } from "@/lib/admin/erreur-affichable";
import { echapperLike } from "@/lib/admin/destruction";
import { etagEvenement, idEvenement, LIBELLES_RAMASSAGE, ramassageSchema } from "@/lib/admin/schemas";
import { creerEvenement, modifierEvenement, supprimerEvenement } from "@/lib/ramassages/google-agenda";
import { lienFiche, type Ramassage, type SuggestionRamassage } from "@/lib/ramassages/ramassages";

/** Pages qui affichent les ramassages (calendrier et accueil). */
const PAGES = ["/admin/ramassages", "/admin"];

const INTROUVABLE: EchecAction = { ok: false, error: "Ramassage introuvable : actualise la page." };

/**
 * Échec d'un appel à Google : nos messages français tels quels ; le détail brut
 * de Google (s'il y en a un) part au journal et l'écran reçoit la référence.
 */
async function echecAgenda(
  err: unknown,
  operation: string,
  ctx: ContexteJournal,
  messageParDefaut: string,
): Promise<EchecAction> {
  if (err instanceof ErreurAffichable) {
    if (err.detail === undefined) return { ok: false, error: err.message };
    return echecAction(
      { name: "GoogleAgenda", message: `${err.message} | ${texteDetail(err.detail)}` },
      operation,
      ctx,
      err.message,
    );
  }
  return echecAction(err, operation, ctx, messageParDefaut);
}

/**
 * Crée (`cible` null) ou modifie un ramassage dans Google Agenda. `cible` : id et
 * version (ETag) lus avec l'événement ; Google refuse s'il a changé depuis.
 * `garderDates` : dates inchangées (événement de plusieurs jours, modifiable
 * seulement dans Google).
 */
export async function enregistrerRamassage(
  cible: { id: string; etag: string } | null,
  valeurs: unknown,
  garderDates: boolean = false,
): Promise<{ ok: true; ramassage: Ramassage } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const parse = ramassageSchema.safeParse(valeurs);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_RAMASSAGE);
  if (cible !== null) {
    if (
      typeof cible !== "object" ||
      !idEvenement.safeParse(cible.id).success ||
      !etagEvenement.safeParse(cible.etag).success
    ) {
      return INTROUVABLE;
    }
  }
  const v = parse.data;
  const lien = lienFiche(process.env.SITE_URL, v);

  try {
    const ramassage = cible
      ? await modifierEvenement(cible.id, cible.etag, v, lien, garderDates !== true)
      : await creerEvenement(v, lien);
    void journaliserAction(cible ? "ramassage.modifie" : "ramassage.cree", ctx, { cible: ramassage.id });
    for (const page of PAGES) revalidatePath(page);
    return { ok: true, ramassage };
  } catch (err) {
    return echecAgenda(err, cible ? "ramassage.modifier" : "ramassage.creer", ctx, "Enregistrement impossible.");
  }
}

/** Retire le ramassage de Google Agenda (refusé s'il a changé dans Google depuis sa lecture). */
export async function supprimerRamassage(id: string, etag: string): Promise<{ ok: true } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const idValide = idEvenement.safeParse(id);
  const etagValide = etagEvenement.safeParse(etag);
  if (!idValide.success || !etagValide.success) return INTROUVABLE;

  try {
    await supprimerEvenement(idValide.data, etagValide.data);
    void journaliserAction("ramassage.supprime", ctx, { cible: idValide.data });
    for (const page of PAGES) revalidatePath(page);
    return { ok: true };
  } catch (err) {
    return echecAgenda(err, "ramassage.supprimer", ctx, "Suppression impossible.");
  }
}

/**
 * Suggestions du champ Client : compagnies du CRM (clients convertis d'abord,
 * avec leur adresse) et lots négociés ou achetés dont le nom contient la recherche.
 */
export async function chercherPourRamassage(recherche: string): Promise<SuggestionRamassage[]> {
  const ctx = await adminPourAction();
  if (!ctx) return [];
  const texte = (typeof recherche === "string" ? recherche : "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (texte.length < 2) return [];
  const { supabase } = ctx;

  const motif = `%${echapperLike(texte)}%`;
  const compagnies = () =>
    supabase.from("companies").select("id, name, street_address, research_status").ilike("name", motif).order("name");
  const [clients, prospects, lots] = await Promise.all([
    compagnies().eq("research_status", "converted").limit(6),
    compagnies().neq("research_status", "converted").limit(20),
    supabase
      .from("lots")
      .select("id, client_name, status")
      .ilike("client_name", motif)
      .in("status", ["negotiating", "purchased"])
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  type Compagnie = { id: string; name: string; street_address: string | null; research_status: string };
  const debut = texte.toLowerCase();
  const commencePar = (nom: string) => (nom.toLowerCase().startsWith(debut) ? 1 : 0);
  const versSuggestion = (c: Compagnie): SuggestionRamassage => ({
    type: "compagnie",
    id: c.id,
    nom: c.name,
    adresse: c.street_address ?? "",
    etiquette: c.research_status === "converted" ? "Client" : "Prospect",
  });
  const autres = ((prospects.data ?? []) as Compagnie[])
    .map(versSuggestion)
    .sort((a, b) => commencePar(b.nom) - commencePar(a.nom) || a.nom.localeCompare(b.nom, "fr"));
  const deLots = ((lots.data ?? []) as { id: string; client_name: string; status: string }[]).map(
    (l): SuggestionRamassage => ({
      type: "lot",
      id: l.id,
      nom: l.client_name,
      adresse: "",
      etiquette: l.status === "negotiating" ? "Lot négocié" : "Lot acheté",
    }),
  );
  return [...((clients.data ?? []) as Compagnie[]).map(versSuggestion), ...autres].slice(0, 6).concat(deLots);
}
