import { NextResponse } from "next/server";
import { estRefus, exigerAdminRoute } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { WEBMAIL_URL } from "@/lib/admin/config";
import { PRIVE } from "@/lib/admin/requete-admin";
import { uuid } from "@/lib/admin/schemas";
import { fetchSoumission } from "@/lib/admin/soumissions";
import { isMailApiConfigured } from "@/lib/hostinger/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTROUVABLE = () => NextResponse.json({ error: "Soumission introuvable." }, { status: 404, headers: PRIVE });

/**
 * GET : une soumission du site pour la calculatrice (« Ouvrir dans la
 * calculatrice » de l'onglet Soumissions) et le lot de calculatrice qui y est
 * déjà lié (saved_lots.data.soumissionId, le plus récent), s'il y en a un.
 * La calculatrice tire la liste du message et pré-remplit le devis.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  const id = uuid.safeParse((await props.params).id);
  if (!id.success) return INTROUVABLE();

  const s = await fetchSoumission(garde.supabase, id.data);
  if (!s) return INTROUVABLE();

  const { data: lot, error } = await garde.supabase
    .from("saved_lots")
    .select("id, name, data, updated_at")
    .eq("data->>soumissionId", s.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return reponseErreur(500, "Lecture du lot de la soumission impossible.", {
      request,
      err: error,
      requestId: garde.requestId,
      userId: garde.user.id,
    });
  }

  return NextResponse.json(
    {
      soumission: {
        id: s.id,
        date: s.date,
        nom: s.nom,
        entreprise: s.entreprise,
        ville: s.ville,
        courriel: s.courriel,
        telephone: s.telephone,
        message: s.message,
        fichiers: s.fichiers,
        lotId: s.lotId,
        // Même lien que « Ouvrir dans Hostinger » de l'onglet Soumissions.
        lienCourriel: isMailApiConfigured() ? `/api/admin/soumissions/${s.id}/courriel/hostinger` : WEBMAIL_URL,
      },
      lot: lot ?? null,
    },
    { headers: PRIVE },
  );
}
