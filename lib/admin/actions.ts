"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminPourAction } from "@/lib/securite/garde";
import {
  echecAction,
  echecValidation,
  journaliserAction,
  REFUS_ACTION,
  type EchecAction,
} from "@/lib/admin/erreurs-admin";
import { LIBELLES_LOT, lotSchema, uuid, type LotValide } from "@/lib/admin/schemas";
import type { LotSource, LotStatus } from "@/lib/admin/types";

/**
 * Payload accepté par createLot / updateLot. Les champs optionnels
 * peuvent être `null` pour effacer une valeur existante lors d'un update.
 * Validé à l'exécution par `lotSchema` (lib/admin/schemas.ts) : champ inconnu,
 * montant négatif ou chaîne trop longue → refus.
 */
export type LotInput = {
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  purchase_price: number;
  sale_price?: number | null;
  status: LotStatus;
  purchased_at: string; // YYYY-MM-DD
  sold_at?: string | null;
  description?: string | null;
  notes?: string | null;
  /** Indication seulement : le serveur décide de la source (voir createLot). */
  source?: LotSource;
  /** Soumission du site à l'origine du lot (création seulement). */
  soumission_id?: string | null;
};

/** Colonnes modifiables d'un lot, depuis des données validées. */
function colonnes(v: LotValide) {
  return {
    client_name: v.client_name,
    client_email: v.client_email,
    client_phone: v.client_phone,
    purchase_price: v.purchase_price,
    sale_price: v.sale_price,
    status: v.status,
    purchased_at: v.purchased_at,
    sold_at: v.sold_at,
    description: v.description,
    notes: v.notes,
  };
}

/**
 * Insère un nouveau lot. La source est décidée par le serveur : « form »
 * seulement si `soumission_id` désigne une soumission qui existe (le lot y est
 * alors lié), « email » si l'admin l'a rempli depuis un courriel collé,
 * sinon « manual ».
 */
export async function createLot(
  input: LotInput,
): Promise<{ ok: true; id: string } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const parse = lotSchema.safeParse(input);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_LOT);
  const v = parse.data;
  const { supabase, user } = ctx;

  try {
    let soumissionId: string | null = null;
    if (v.soumission_id) {
      const { data: trouvee, error: erreurSoumission } = await supabase.rpc("admin_soumissions", {
        p_id: v.soumission_id,
        p_limit: 1,
      });
      if (erreurSoumission) return await echecAction(erreurSoumission, "lot.creer.soumission", ctx);
      if (!Array.isArray(trouvee) || trouvee.length === 0) {
        return { ok: false, error: "Cette soumission n'existe plus.", champs: { soumission_id: "Introuvable." } };
      }
      soumissionId = v.soumission_id;
    }
    const source: LotSource = soumissionId ? "form" : v.source === "email" ? "email" : "manual";

    const { data, error } = await supabase
      .from("lots")
      .insert({ ...colonnes(v), source, soumission_id: soumissionId, created_by: user.id })
      .select("id")
      .single();
    if (error) return await echecAction(error, "lot.creer", ctx, "Création du lot impossible.");

    void journaliserAction("lot.cree", ctx, { cible: data.id as string, source });
    revalidatePath("/admin");
    revalidatePath("/admin/lots");
    revalidatePath("/admin/soumissions");
    return { ok: true, id: data.id as string };
  } catch (err) {
    return echecAction(err, "lot.creer", ctx, "Création du lot impossible.");
  }
}

/** Met à jour un lot existant (la source et la soumission liée ne changent pas). */
export async function updateLot(
  id: string,
  input: LotInput,
): Promise<{ ok: true } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const idValide = uuid.safeParse(id);
  if (!idValide.success) return { ok: false, error: "Lot introuvable." };
  const parse = lotSchema.safeParse(input);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_LOT);

  try {
    const { data, error } = await ctx.supabase
      .from("lots")
      .update(colonnes(parse.data))
      .eq("id", idValide.data)
      .select("id");
    if (error) return await echecAction(error, "lot.modifier", ctx, "Mise à jour du lot impossible.");
    if (!data?.length) return { ok: false, error: "Ce lot n'existe plus." };

    void journaliserAction("lot.modifie", ctx, { cible: idValide.data });
    revalidatePath("/admin");
    revalidatePath("/admin/lots");
    revalidatePath(`/admin/lots/${idValide.data}`);
    return { ok: true };
  } catch (err) {
    return echecAction(err, "lot.modifier", ctx, "Mise à jour du lot impossible.");
  }
}

/**
 * Supprime un lot et redirige vers la liste. En cas d'échec (ex. :
 * contrainte de clé étrangère), renvoie l'erreur au lieu de lancer une
 * exception — sinon Next affiche une page « server-side exception ».
 */
export async function deleteLot(id: string): Promise<EchecAction | never> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const idValide = uuid.safeParse(id);
  if (!idValide.success) return { ok: false, error: "Lot introuvable." };

  try {
    const { error } = await ctx.supabase.from("lots").delete().eq("id", idValide.data);
    if (error) return await echecAction(error, "lot.supprimer", ctx, "Suppression du lot impossible.");
  } catch (err) {
    return echecAction(err, "lot.supprimer", ctx, "Suppression du lot impossible.");
  }

  void journaliserAction("lot.supprime", ctx, { cible: idValide.data });
  revalidatePath("/admin");
  revalidatePath("/admin/lots");
  redirect("/admin/lots");
}
