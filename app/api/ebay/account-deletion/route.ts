import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Point de terminaison « marketplace account deletion » exigé par eBay pour
 * activer un jeu de clés Production.
 *
 * - GET  : eBay envoie un `challenge_code`, on répond le SHA-256 de
 *          challengeCode + verificationToken + URL du point de terminaison.
 * - POST : eBay signale qu'un utilisateur a supprimé son compte. Techno Lot ne
 *          conserve aucune donnée personnelle d'acheteur (seulement ses propres
 *          commandes), il n'y a donc rien à effacer : on accuse réception.
 *
 * Variables côté serveur : EBAY_VERIFICATION_TOKEN (32-80 caractères) et
 * EBAY_DELETION_ENDPOINT (l'URL exacte déclarée dans le portail eBay).
 */

export async function GET(request: Request) {
  const token = process.env.EBAY_VERIFICATION_TOKEN;
  const endpoint = process.env.EBAY_DELETION_ENDPOINT;
  const challenge = new URL(request.url).searchParams.get("challenge_code");

  if (!token || !endpoint) {
    return Response.json({ error: "endpoint non configuré" }, { status: 500 });
  }
  if (!challenge) {
    return Response.json({ error: "challenge_code manquant" }, { status: 400 });
  }

  const hash = createHash("sha256");
  hash.update(challenge);
  hash.update(token);
  hash.update(endpoint);

  return Response.json({ challengeResponse: hash.digest("hex") }, { status: 200 });
}

export async function POST(request: Request) {
  const body = await request.text();
  console.log("[eBay] notification de suppression de compte:", body.slice(0, 500));
  return new Response(null, { status: 200 });
}
