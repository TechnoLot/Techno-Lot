import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import { fetchSoumission } from "@/lib/admin/soumissions";
import { isMailApiConfigured } from "@/lib/hostinger/config";
import { ErreurHostinger, telechargerPiece, trouverCourrielSoumission } from "@/lib/hostinger/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function erreur(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

/**
 * GET : une pièce jointe du courriel de cette demande. Le message est
 * retrouvé ici à partir de la demande (jamais d'uid venu du navigateur) et la
 * pièce doit lui appartenir, sinon 404.
 */
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string; pieceId: string }> }
) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const soumission = await fetchSoumission(supabase, params.id);
  if (!soumission) return erreur("Soumission introuvable.", 404);
  if (!isMailApiConfigured()) return erreur("La Mail API de Hostinger n'est pas configurée.", 404);

  try {
    const lieu = await trouverCourrielSoumission(soumission);
    if (!lieu) return erreur("Courriel introuvable.", 404);
    const fichier = await telechargerPiece(lieu.dossier, lieu.uid, params.pieceId);
    return fichier ?? erreur("Pièce jointe introuvable.", 404);
  } catch (e) {
    if (e instanceof ErreurHostinger) return erreur(e.message, 502);
    return erreur("Erreur inattendue en lisant la pièce jointe.", 500);
  }
}
