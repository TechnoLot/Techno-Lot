import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { bearerCronValide } from "@/lib/securite/garde";
import { lireJson } from "@/lib/securite/requete";
import { uuid } from "@/lib/securite/schemas";
import { clientServiceCron, refusCron, reponseServiceManquant } from "@/lib/admin/cron";
import { avecRef, journaliserErreur } from "@/lib/admin/erreurs-admin";
import { pieceDeLecture } from "@/lib/acheteurs/file-lecture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SANS_CACHE = { "Cache-Control": "no-store" };
const MAX_OCTETS = 1_024;

const pieceSchema = z.strictObject({ id: uuid, jeton: uuid, index: z.number().int().min(0).max(100) });

/**
 * Agent Acheteurs : télécharge une pièce d'une lecture prise par
 * /api/cron/acheteurs/lecture/prendre, `{ id, jeton, index }`. 200 : les octets
 * (photo réduite et sans métadonnées en `image/jpeg`, ou `application/pdf`).
 * 409 : lecture relancée ou reprise depuis la prise. 422 : pièce illisible,
 * l'agent passe à la suivante. Auth : `Authorization: Bearer $AGENT_ACHETEURS_SECRET`.
 */
export async function POST(request: Request) {
  if (!bearerCronValide(request, "AGENT_ACHETEURS_SECRET")) return refusCron(request);
  const supabase = clientServiceCron();
  if (!supabase) return reponseServiceManquant();

  const lu = await lireJson(request, MAX_OCTETS);
  if (!lu.ok) return lu.reponse;
  const v = pieceSchema.safeParse(lu.donnees);
  if (!v.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400, headers: SANS_CACHE });

  try {
    const r = await pieceDeLecture(supabase, v.data);
    if (r.etat === "perimee") {
      return NextResponse.json({ error: "Lecture relancée ou reprise." }, { status: 409, headers: SANS_CACHE });
    }
    if (r.etat === "illisible") {
      return NextResponse.json({ error: "Pièce illisible." }, { status: 422, headers: SANS_CACHE });
    }
    return new NextResponse(new Uint8Array(r.octets), {
      headers: { ...SANS_CACHE, "Content-Type": r.type, "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    const ref = await journaliserErreur(err, "cron.acheteurs.lecture.piece", { requestId: randomUUID() }, { request });
    return NextResponse.json({ error: avecRef("Pièce non remise.", ref) }, { status: 500, headers: SANS_CACHE });
  }
}
