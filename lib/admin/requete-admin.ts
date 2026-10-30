import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { lireJson, type LectureJson } from "@/lib/securite/requete";
import { champsEnErreur } from "@/lib/admin/erreurs-admin";

/**
 * Lecture des corps JSON des routes admin (checks 06 et 16), par-dessus
 * `lireJson` (lib/securite/requete.ts) : type `application/json` exigé
 * (un formulaire `text/plain` d'un autre site est refusé, 415), taille bornée
 * avant lecture complète (411/413), JSON illisible → 400.
 */

/**
 * Corps JSON FACULTATIF (ex. `{ auto: true }` ou rien) : un corps vide
 * (`Content-Length: 0`) donne `{}` ; sinon mêmes règles que `lireJson`.
 * `exigerType: false` (chemin Bearer des tâches planifiées seulement) :
 * accepte un corps vide sans type de contenu.
 */
export async function lireJsonFacultatif(
  request: Request,
  maxOctets: number,
  { exigerType = true }: { exigerType?: boolean } = {},
): Promise<LectureJson<unknown>> {
  const longueur = request.headers.get("content-length");
  const vide = longueur !== null && longueur.trim() === "0";
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (vide && (!exigerType || type === "application/json")) return { ok: true, donnees: {} };
  if (!exigerType && !type && (longueur === null || vide) && !request.body) return { ok: true, donnees: {} };
  return lireJson<unknown>(request, maxOctets);
}

/** 400 propre avec le détail par champ (jamais de pile ni de message brut). */
export function reponseInvalide(erreur: z.ZodError, requestId?: string): NextResponse {
  return NextResponse.json(
    { error: "Données invalides.", champs: champsEnErreur(erreur) },
    {
      status: 400,
      headers: { "Cache-Control": "no-store", ...(requestId ? { "X-Request-Id": requestId } : {}) },
    },
  );
}

/** En-têtes des réponses JSON privées (données admin). */
export const PRIVE = { "Cache-Control": "no-store" } as const;
