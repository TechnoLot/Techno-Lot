import { NextResponse } from "next/server";
import { reponseErreur } from "@/lib/securite/erreurs";
import { estRefus, exigerAdminRoute } from "@/lib/securite/garde";
import { clientRpc, secretRpc } from "@/lib/securite/rpc";
import { uuid } from "@/lib/securite/schemas";

export const runtime = "nodejs";

const MESSAGE_ERREUR = "Service temporairement indisponible.";

/**
 * POST /api/admin/activite : le navigateur signale une activité réelle de
 * l'utilisateur (assets/outils/garde-activite.js, au plus toutes les 5 min).
 * Note l'heure pour la session du jeton vérifié (revendication `session_id`,
 * jamais un identifiant venu du client) ; la tâche securite-sessions-inactives
 * ferme les sessions sans activité depuis 65 min.
 */
export async function POST(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  const { supabase, user, requestId } = garde;
  const contexte = { request, requestId, userId: user.id };

  let session: string | undefined;
  try {
    const { data } = await supabase.auth.getClaims();
    if (data?.claims && data.claims.sub === user.id) {
      const lu = uuid.safeParse(data.claims.session_id);
      if (lu.success) session = lu.data;
    }
  } catch (err) {
    return reponseErreur(500, MESSAGE_ERREUR, { ...contexte, err });
  }
  if (!session) return reponseErreur(400, "Session illisible.", contexte);

  const secret = secretRpc();
  const rpc = clientRpc();
  if (!secret || !rpc) return reponseErreur(503, MESSAGE_ERREUR, contexte);

  try {
    const { error } = await rpc.rpc("session_activite_noter", { p_secret: secret, p_session: session });
    if (error) return reponseErreur(500, MESSAGE_ERREUR, { ...contexte, err: error });
  } catch (err) {
    return reponseErreur(500, MESSAGE_ERREUR, { ...contexte, err });
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
