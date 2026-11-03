import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { bearerCronValide } from "@/lib/securite/garde";
import { clientServiceCron, refusCron, reponseServiceManquant } from "@/lib/admin/cron";
import { avecRef, journaliserErreur } from "@/lib/admin/erreurs-admin";
import { prendreRecherche } from "@/lib/acheteurs/file";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SANS_CACHE = { "Cache-Control": "no-store" };

/**
 * Agent Acheteurs de l'ordinateur de l'utilisateur (scripts/agent-acheteurs),
 * toutes les 5 minutes : prend la prochaine recherche d'acheteurs demandée
 * dans l'admin et renvoie `{ id, jeton, demande }`, la demande à donner à
 * Claude (lignes d'articles masquées seulement, jamais de donnée du client).
 * 204 : rien à faire ; 429 : plafond de 24 h atteint.
 * Auth : `Authorization: Bearer $AGENT_ACHETEURS_SECRET` (refus journalisé
 * `cron.refus`). POST seulement : la prise modifie l'état.
 */
export async function POST(request: Request) {
  if (!bearerCronValide(request, "AGENT_ACHETEURS_SECRET")) return refusCron(request);
  const supabase = clientServiceCron();
  if (!supabase) return reponseServiceManquant();

  try {
    const r = await prendreRecherche(supabase);
    if (r.etat === "rien") return new NextResponse(null, { status: 204, headers: SANS_CACHE });
    if (r.etat === "plafond") {
      return NextResponse.json({ error: "Plafond de recherches atteint pour 24 h." }, { status: 429, headers: SANS_CACHE });
    }
    return NextResponse.json(r.prise, { headers: SANS_CACHE });
  } catch (err) {
    const ref = await journaliserErreur(err, "cron.acheteurs.prendre", { requestId: randomUUID() }, { request });
    return NextResponse.json({ error: avecRef("File des recherches illisible.", ref) }, { status: 500, headers: SANS_CACHE });
  }
}
