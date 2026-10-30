import { NextResponse } from "next/server";
import { estRefus, exigerAdminRoute } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { journaliserAction } from "@/lib/admin/erreurs-admin";
import { PRIVE } from "@/lib/admin/requete-admin";
import { uuid } from "@/lib/admin/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTROUVABLE = () => NextResponse.json({ error: "Introuvable." }, { status: 404, headers: PRIVE });

/** GET /api/saved/[id] — récupère un lot enregistré (pour le rouvrir dans la calculatrice). */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  const id = uuid.safeParse((await props.params).id);
  if (!id.success) return INTROUVABLE();

  const { data, error } = await garde.supabase
    .from("saved_lots")
    .select("id, name, data, created_at, updated_at, created_by_email")
    .eq("id", id.data)
    .maybeSingle();

  if (error) {
    return reponseErreur(500, "Lecture du lot impossible.", {
      request,
      err: error,
      requestId: garde.requestId,
      userId: garde.user.id,
    });
  }
  if (!data) return INTROUVABLE();
  return NextResponse.json({ lot: data }, { headers: PRIVE });
}

/** DELETE : supprime un lot enregistré (origine vérifiée par la garde). */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  const id = uuid.safeParse((await props.params).id);
  if (!id.success) return INTROUVABLE();

  const { error } = await garde.supabase.from("saved_lots").delete().eq("id", id.data);
  if (error) {
    return reponseErreur(500, "Suppression du lot impossible.", {
      request,
      err: error,
      requestId: garde.requestId,
      userId: garde.user.id,
    });
  }
  void journaliserAction("calculatrice.lot_supprime", garde, { cible: id.data }, request);
  return NextResponse.json({ ok: true }, { headers: PRIVE });
}
