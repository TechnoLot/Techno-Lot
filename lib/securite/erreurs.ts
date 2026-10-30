import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { EVENEMENTS, journaliser } from "./journal";

/**
 * Réponses d'erreur sans fuite (check 20).
 *
 * Le navigateur reçoit un message générique + une référence (`ref`, aussi dans
 * l'en-tête `X-Request-Id`) ; le détail (nom, message, code de l'erreur) va
 * seulement au journal, rédigé. Jamais `err.message`, une pile d'appels, une
 * requête SQL ni un nom de table dans la réponse.
 */

export type OptionsErreur = {
  request?: Request;
  err?: unknown;
  requestId?: string;
  userId?: string | null;
};

/** Résumé journalisable d'une erreur quelconque (rédigé ensuite par le journal). */
export function decrireErreur(err: unknown): Record<string, unknown> {
  if (err === undefined || err === null) return {};
  if (typeof err !== "object") return { message: String(err) };
  const e = err as { name?: unknown; message?: unknown; code?: unknown; status?: unknown };
  return {
    nom: typeof e.name === "string" ? e.name : undefined,
    message: typeof e.message === "string" ? e.message : undefined,
    errcode: typeof e.code === "string" || typeof e.code === "number" ? e.code : undefined,
    statut_source: typeof e.status === "number" ? e.status : undefined,
  };
}

/**
 * Journalise puis renvoie `{ error: messagePublic, ref }`.
 * Statut ≥ 500 → événement `erreur.5xx` (durable, compte pour les alertes) ;
 * sinon `erreur.4xx` sur la sortie standard seulement.
 *
 * Exemple :
 *   } catch (err) {
 *     return reponseErreur(500, "Erreur interne. Réessayez plus tard.", { request, err });
 *   }
 */
export function reponseErreur(
  status: number,
  messagePublic: string,
  options: OptionsErreur = {},
): NextResponse {
  const requestId = options.requestId ?? randomUUID();
  const serveur = status >= 500;
  void journaliser(serveur ? EVENEMENTS.erreur5xx : EVENEMENTS.erreur4xx, {
    resultat: serveur ? "echec" : "refus",
    request: options.request,
    requestId,
    userId: options.userId ?? null,
    statut: status,
    details: decrireErreur(options.err),
    durable: serveur,
  });
  return NextResponse.json(
    { error: messagePublic, ref: requestId },
    {
      status,
      headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" },
    },
  );
}
