import { NextResponse } from "next/server";
import { estRefus, exigerAdminRoute } from "@/lib/securite/garde";
import { avecRef, journaliserErreur } from "@/lib/admin/erreurs-admin";
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
  request: Request,
  props: { params: Promise<{ id: string; pieceId: string }> }
) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  const { supabase } = garde;
  const params = await props.params;

  const soumission = await fetchSoumission(supabase, params.id);
  if (!soumission) return erreur("Soumission introuvable.", 404);
  if (!isMailApiConfigured()) return erreur("La Mail API de Hostinger n'est pas configurée.", 404);

  try {
    const lieu = await trouverCourrielSoumission(soumission);
    if (!lieu) return erreur("Courriel introuvable.", 404);
    const fichier = await telechargerPiece(lieu.dossier, lieu.uid, params.pieceId);
    return fichier ?? erreur("Pièce jointe introuvable.", 404);
  } catch (e) {
    // Messages d'ErreurHostinger : rédigés par nous en français ; détail au journal.
    const ref = await journaliserErreur(e, "soumission.piece", garde, { request, durable: false });
    if (e instanceof ErreurHostinger) return erreur(avecRef(e.message, ref), 502);
    return erreur(avecRef("Erreur inattendue en lisant la pièce jointe.", ref), 500);
  }
}
