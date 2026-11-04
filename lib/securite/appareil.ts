import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { secretRpc } from "./rpc";

/**
 * Appareil de confiance de la connexion admin.
 *
 * Après un mot de passe juste, le navigateur reçoit le témoin
 * `tl_admin_appareil` = `<uuid>.<hmac hex>` (HMAC-SHA256 de
 * « appareil-admin:<uuid> » avec SECURITE_RPC_SECRET). Un navigateur qui le
 * présente échappe aux compteurs par IP, par empreinte et globaux, et n'a que
 * son propre compteur : un attaquant ne peut donc pas bloquer le vrai admin
 * sur ses ordinateurs habituels, et il ne peut pas fabriquer ce témoin sans le
 * secret serveur.
 *
 * Le témoin ne donne AUCUN accès : il ne change que le compteur d'essais. Sans
 * secret, ou si les témoins sont illisibles, le navigateur est traité comme
 * inconnu (le parcours le plus strict).
 *
 * Passe par `cookies()` de next/headers, comme les témoins de Supabase dans
 * cette route : Next les ajoute aux deux formes de réponse (JSON et 303).
 */

export const TEMOIN_APPAREIL = "tl_admin_appareil";

const DUREE_S = 365 * 24 * 60 * 60;
const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FORME_HMAC = /^[0-9a-f]{64}$/;

function signature(id: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`appareil-admin:${id}`).digest();
}

/** Valeur du témoin pour cet identifiant, ou null sans secret. */
export function valeurTemoinAppareil(id: string): string | null {
  const secret = secretRpc();
  if (!secret) return null;
  return `${id}.${signature(id, secret).toString("hex")}`;
}

/** Identifiant de l'appareil si la valeur est bien signée par ce serveur, sinon null. */
export function verifierTemoinAppareil(valeur: string | null | undefined): string | null {
  const secret = secretRpc();
  if (!secret || !valeur) return null;
  const point = valeur.indexOf(".");
  if (point < 0) return null;
  const id = valeur.slice(0, point);
  const recu = valeur.slice(point + 1);
  if (!FORME_UUID.test(id) || !FORME_HMAC.test(recu)) return null;
  return timingSafeEqual(Buffer.from(recu, "hex"), signature(id, secret)) ? id : null;
}

/** Appareil de confiance de la requête en cours, ou null (navigateur inconnu). */
export async function lireAppareil(): Promise<string | null> {
  try {
    const magasin = await cookies();
    return verifierTemoinAppareil(magasin.get(TEMOIN_APPAREIL)?.value);
  } catch {
    return null;
  }
}

/**
 * Pose le témoin (nouvel appareil) ou renouvelle sa durée (`id` déjà connu).
 * Ne lève jamais d'erreur : une connexion réussie ne doit pas échouer ici.
 */
export async function poserAppareil(id: string | null): Promise<void> {
  const valeur = valeurTemoinAppareil(id ?? randomUUID());
  if (!valeur) return;
  try {
    const magasin = await cookies();
    magasin.set(TEMOIN_APPAREIL, valeur, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/admin/auth",
      maxAge: DUREE_S,
    });
  } catch {
    // Sans témoin, le navigateur reste simplement inconnu.
  }
}
