import "server-only";
import { NextResponse } from "next/server";

/**
 * Lecture bornée des corps de requête (check 06 / 12).
 *
 * Sans limite, `request.json()` ou `request.formData()` lisent tout le corps en
 * mémoire avant la moindre validation : un envoi de plusieurs centaines de Mo
 * suffit à épuiser la mémoire du processus. Ces fonctions refusent tôt :
 *  - 415 : type de contenu inattendu ;
 *  - 411 : `Content-Length` absent (envoi « chunked » sans longueur annoncée) ;
 *  - 413 : longueur annoncée ou réelle au-delà du maximum ;
 *  - 400 : corps illisible (JSON invalide, UTF-8 invalide).
 * Le résultat est typé : `{ ok: true, … }` ou `{ ok: false, reponse }` à
 * renvoyer telle quelle.
 */

export type Refus = { ok: false; reponse: NextResponse };
export type LectureJson<T> = { ok: true; donnees: T } | Refus;

const MESSAGES = {
  400: "Requête invalide.",
  411: "Longueur de la requête requise.",
  413: "Requête trop volumineuse.",
  415: "Type de contenu non pris en charge.",
} as const;

function refus(status: keyof typeof MESSAGES): Refus {
  return {
    ok: false,
    reponse: NextResponse.json(
      { error: MESSAGES[status] },
      { status, headers: { "Cache-Control": "no-store" } },
    ),
  };
}

/** Type MIME sans paramètres (« application/json; charset=utf-8 » → « application/json »). */
function typeMime(request: Request): string {
  return (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
}

/** Contrôle de `Content-Length` : null si acceptable, sinon le refus. */
function controleLongueur(request: Request, maxOctets: number): Refus | null {
  const brut = request.headers.get("content-length");
  if (brut === null) return refus(411);
  if (!/^\d{1,15}$/.test(brut.trim())) return refus(400);
  if (Number(brut) > maxOctets) return refus(413);
  return null;
}

/**
 * Lit un corps JSON d'au plus `maxOctets` octets.
 *
 * Exemple :
 *   const lu = await lireJson<{ name?: unknown }>(request, 10_000);
 *   if (!lu.ok) return lu.reponse;
 *   const parse = monSchema.safeParse(lu.donnees);
 */
export async function lireJson<T = unknown>(
  request: Request,
  maxOctets: number,
): Promise<LectureJson<T>> {
  if (typeMime(request) !== "application/json") return refus(415);
  const longueur = controleLongueur(request, maxOctets);
  if (longueur) return longueur;
  if (!request.body) return refus(400);

  // Lecture en flux avec plafond : on ne se fie pas seulement à l'en-tête.
  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxOctets) {
        await lecteur.cancel().catch(() => {});
        return refus(413);
      }
      morceaux.push(value);
    }
  } catch {
    return refus(400);
  }

  const octets = new Uint8Array(total);
  let position = 0;
  for (const m of morceaux) {
    octets.set(m, position);
    position += m.byteLength;
  }

  try {
    const texte = new TextDecoder("utf-8", { fatal: true }).decode(octets);
    return { ok: true, donnees: JSON.parse(texte) as T };
  } catch {
    return refus(400);
  }
}

/**
 * Pour `request.formData()` : vérifie `Content-Length` (411 si absent, 413 au-delà
 * de `maxOctets`) AVANT la lecture. Le serveur HTTP de Node découpe le corps selon
 * cette longueur : la valeur annoncée borne bien la lecture.
 *
 * Exemple :
 *   const taille = verifierTaille(request, 16 * 1024 * 1024);
 *   if (!taille.ok) return taille.reponse;
 *   const data = await request.formData();
 */
export function verifierTaille(request: Request, maxOctets: number): { ok: true } | Refus {
  const longueur = controleLongueur(request, maxOctets);
  return longueur ?? { ok: true };
}
