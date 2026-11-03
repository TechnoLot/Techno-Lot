import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { bearerCronValide } from "@/lib/securite/garde";
import { lireJson } from "@/lib/securite/requete";
import { uuid } from "@/lib/securite/schemas";
import { clientServiceCron, refusCron, reponseServiceManquant } from "@/lib/admin/cron";
import { avecRef, journaliserErreur } from "@/lib/admin/erreurs-admin";
import { recevoirReponse } from "@/lib/acheteurs/file";
import { ECHECS_AGENT, LIMITES } from "@/lib/acheteurs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SANS_CACHE = { "Cache-Control": "no-store" };
/** 200 000 caractères au plus, accents et échappements JSON compris. */
const MAX_OCTETS = 1_500_000;

const envoiSchema = z.union([
  z.strictObject({ id: uuid, jeton: uuid, reponse: z.string().min(1).max(LIMITES.reponse) }),
  z.strictObject({ id: uuid, jeton: uuid, echec: z.enum(ECHECS_AGENT) }),
]);

/**
 * Agent Acheteurs : réponse d'une recherche prise par /api/cron/acheteurs/prendre,
 * `{ id, jeton, reponse }` (texte de Claude, traité comme non fiable par
 * lib/acheteurs/reponse.ts) ou `{ id, jeton, echec }` (raison fixe). 409 : la
 * recherche a été annulée, relancée ou reprise depuis la prise (réponse
 * ignorée). Auth : `Authorization: Bearer $AGENT_ACHETEURS_SECRET`.
 */
export async function POST(request: Request) {
  if (!bearerCronValide(request, "AGENT_ACHETEURS_SECRET")) return refusCron(request);
  const supabase = clientServiceCron();
  if (!supabase) return reponseServiceManquant();

  const lu = await lireJson(request, MAX_OCTETS);
  if (!lu.ok) return lu.reponse;
  const v = envoiSchema.safeParse(lu.donnees);
  if (!v.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400, headers: SANS_CACHE });

  try {
    const r = await recevoirReponse(supabase, v.data);
    if (r.etat === "perimee") {
      return NextResponse.json(
        { error: "Recherche annulée, relancée ou reprise : réponse ignorée." },
        { status: 409, headers: SANS_CACHE },
      );
    }
    return NextResponse.json(r, { headers: SANS_CACHE });
  } catch (err) {
    const ref = await journaliserErreur(err, "cron.acheteurs.reponse", { requestId: randomUUID() }, { request });
    return NextResponse.json({ error: avecRef("Réponse non enregistrée.", ref) }, { status: 500, headers: SANS_CACHE });
  }
}
