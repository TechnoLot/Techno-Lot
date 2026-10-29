import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, WEBMAIL_URL } from "@/lib/admin/config";
import { fetchSoumission } from "@/lib/admin/soumissions";
import { isMailApiConfigured } from "@/lib/hostinger/config";
import { lienWebmail } from "@/lib/hostinger/courriel-regles";
import { trouverCourrielSoumission } from "@/lib/hostinger/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rediriger(url: string) {
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
}

/**
 * GET : « Ouvrir dans Hostinger » → redirection vers le webmail, ouvert
 * directement sur le courriel de cette demande. Clé absente, demande ou
 * courriel introuvable, erreur de Hostinger : boîte de réception.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isMailApiConfigured()) return rediriger(WEBMAIL_URL);
  try {
    const soumission = await fetchSoumission(supabase, params.id);
    if (!soumission) return rediriger(WEBMAIL_URL);
    const lieu = await trouverCourrielSoumission(soumission);
    return rediriger(lieu ? lienWebmail(lieu.dossier, lieu.uid) : WEBMAIL_URL);
  } catch {
    return rediriger(WEBMAIL_URL);
  }
}
