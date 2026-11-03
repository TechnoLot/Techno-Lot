import { NextResponse } from "next/server";
import { estRefus, exigerAdminRoute } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { lireJson } from "@/lib/securite/requete";
import { echapperLike } from "@/lib/admin/destruction";
import { journaliserAction } from "@/lib/admin/erreurs-admin";
import { PRIVE, reponseInvalide } from "@/lib/admin/requete-admin";
import { lotEnregistreSchema, MAX_DONNEES_CALCULATRICE } from "@/lib/admin/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Corps JSON au plus : données (200 Ko) + nom + enveloppe. */
const MAX_OCTETS = MAX_DONNEES_CALCULATRICE + 10_000;

/** GET : liste tous les lots enregistrés (partagés entre tous les admins). */
export async function GET(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;

  const { data, error } = await garde.supabase
    .from("saved_lots")
    .select("id, name, data, created_at, updated_at, created_by_email")
    .order("updated_at", { ascending: false });

  if (error) {
    return reponseErreur(500, "Lecture des lots enregistrés impossible.", {
      request,
      err: error,
      requestId: garde.requestId,
      userId: garde.user.id,
    });
  }
  return NextResponse.json({ lots: data ?? [] }, { headers: PRIVE });
}

/**
 * POST : enregistre un lot { name, data, id?, nouveau? } (JSON exigé, schéma
 * strict : nom ≤ 120, données ≤ 200 Ko, items validés), dans cet ordre :
 *  1. `id` : ce lot-là, même renommé (s'il a été supprimé entre-temps, un
 *     nouveau lot est créé) ;
 *  2. `data.soumissionId` : le lot de la même soumission du site ;
 *  3. sinon, un lot du même nom (insensible à la casse, sans joker : `%` et
 *     `_` échappés) qui n'est pas lié à une soumission → 409 `conflit` : la
 *     calculatrice demande « Remplacer » (renvoi avec son `id`) ou « Garder
 *     les deux » (`nouveau: true`). Jamais d'écrasement en silence.
 */
export async function POST(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;

  const lu = await lireJson<unknown>(request, MAX_OCTETS);
  if (!lu.ok) return lu.reponse;
  const parse = lotEnregistreSchema.safeParse(lu.donnees);
  if (!parse.success) return reponseInvalide(parse.error, garde.requestId);
  const { name, data, id, nouveau } = parse.data;
  if (JSON.stringify(data).length > MAX_DONNEES_CALCULATRICE) {
    return NextResponse.json({ error: "Lot trop volumineux (200 Ko au plus)." }, { status: 413, headers: PRIVE });
  }

  const { supabase, user, requestId } = garde;
  const echec = (err: unknown) =>
    reponseErreur(500, "Enregistrement du lot impossible.", { request, err, requestId, userId: user.id });
  const now = new Date().toISOString();

  /** Met à jour le lot `cible` ; null s'il n'existe plus. */
  const mettreAJour = async (cible: string): Promise<string | null> => {
    const { data: maj, error } = await supabase
      .from("saved_lots")
      .update({ name, data, updated_at: now })
      .eq("id", cible)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return maj ? (maj.id as string) : null;
  };
  const misAJour = (cible: string) => {
    void journaliserAction("calculatrice.lot_modifie", garde, { cible }, request);
    return NextResponse.json({ id: cible, updated: true }, { headers: PRIVE });
  };

  try {
    if (id) {
      const maj = await mettreAJour(id);
      if (maj) return misAJour(maj);
    } else if (data.soumissionId) {
      const { data: lie, error } = await supabase
        .from("saved_lots")
        .select("id")
        .eq("data->>soumissionId", data.soumissionId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return echec(error);
      if (lie) {
        const maj = await mettreAJour(lie.id as string);
        if (maj) return misAJour(maj);
      }
    } else if (!nouveau) {
      const { data: memes, error } = await supabase
        .from("saved_lots")
        .select("id, name, soumission:data->>soumissionId")
        .ilike("name", echapperLike(name))
        .limit(10);
      if (error) return echec(error);
      const autre = ((memes ?? []) as { id: string; name: string; soumission: string | null }[]).find((l) => !l.soumission);
      if (autre) {
        return NextResponse.json(
          { error: `Un lot nommé « ${autre.name} » existe déjà.`, conflit: { id: autre.id, name: autre.name } },
          { status: 409, headers: PRIVE },
        );
      }
    }

    const { data: inserted, error } = await supabase
      .from("saved_lots")
      .insert({
        name,
        data,
        created_by: user.id,
        created_by_email: user.email ?? null,
      })
      .select("id")
      .single();
    if (error) return echec(error);

    void journaliserAction("calculatrice.lot_cree", garde, { cible: inserted.id as string }, request);
    return NextResponse.json({ id: inserted.id, updated: false }, { headers: PRIVE });
  } catch (err) {
    return echec(err);
  }
}
