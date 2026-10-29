import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import { fetchSoumission } from "@/lib/admin/soumissions";
import type { ReponseCourriel } from "@/lib/admin/courriel-types";
import { isMailApiConfigured } from "@/lib/hostinger/config";
import { ErreurHostinger, lireCourriel, trouverCourrielSoumission } from "@/lib/hostinger/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function repondre(corps: ReponseCourriel, status = 200) {
  return NextResponse.json(corps, { status, headers: NO_STORE });
}

/**
 * GET : le courriel que le formulaire a envoyé à info@ pour cette demande,
 * lu par la Mail API de Hostinger → ReponseCourriel. Demande introuvable :
 * 404 ; erreur de Hostinger : 502 { etat: "erreur", message }.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const soumission = await fetchSoumission(supabase, params.id);
  if (!soumission) {
    return NextResponse.json({ error: "Soumission introuvable." }, { status: 404, headers: NO_STORE });
  }
  if (!isMailApiConfigured()) return repondre({ etat: "non-configure" });

  try {
    const lieu = await trouverCourrielSoumission(soumission);
    if (!lieu) return repondre({ etat: "introuvable" });
    const courriel = await lireCourriel(lieu.dossier, lieu.uid);
    return repondre({ etat: "trouve", courriel });
  } catch (e) {
    if (e instanceof ErreurHostinger) return repondre({ etat: "erreur", message: e.message }, 502);
    return repondre({ etat: "erreur", message: "Erreur inattendue en lisant le courriel." }, 500);
  }
}
