/**
 * Âge de la session admin : reconnexion obligatoire chaque jour (décision du
 * 30 oct. 2026 : 24 h au plus depuis la dernière authentification).
 *
 * Compatible Edge (middleware.ts) : fonctions pures, ni `server-only` ni
 * `node:*`. Partagé par `lib/securite/garde.ts` (pages, routes, actions) et
 * `middleware.ts`, pour que les deux appliquent exactement le même calcul.
 */

/** Durée maximale depuis la dernière connexion (24 h). */
export const DUREE_MAX_SESSION_S = 24 * 60 * 60;

/** Méthodes de second facteur : elles ne comptent pas comme une connexion. */
function estSecondFacteur(methode: string): boolean {
  return methode === "totp" || methode.startsWith("mfa/");
}

/**
 * Horodatage (secondes UNIX) de la dernière authentification PRIMAIRE (mot de
 * passe, lien magique, OTP…) d'après la revendication `amr` du jeton vérifié ;
 * repli sur les entrées de second facteur, puis sur `last_sign_in_at`.
 * null si rien n'est lisible (traité comme expiré : refus par défaut).
 */
export function derniereAuthentification(
  amr: unknown,
  dernierSignIn?: string | null,
): number | null {
  const entrees = Array.isArray(amr)
    ? amr.filter(
        (e): e is { method: string; timestamp: number } =>
          !!e &&
          typeof e === "object" &&
          typeof (e as { method?: unknown }).method === "string" &&
          typeof (e as { timestamp?: unknown }).timestamp === "number" &&
          Number.isFinite((e as { timestamp: number }).timestamp),
      )
    : [];
  const primaires = entrees.filter((e) => !estSecondFacteur(e.method));
  const retenues = primaires.length > 0 ? primaires : entrees;
  if (retenues.length > 0) return Math.max(...retenues.map((e) => e.timestamp));

  if (dernierSignIn) {
    const ms = Date.parse(dernierSignIn);
    if (Number.isFinite(ms)) return Math.floor(ms / 1000);
  }
  return null;
}

/** Vrai si la dernière authentification date de plus de 24 h (ou est inconnue). */
export function sessionExpiree(
  derniereAuthS: number | null,
  maintenantS: number = Math.floor(Date.now() / 1000),
): boolean {
  if (derniereAuthS === null) return true;
  return maintenantS - derniereAuthS > DUREE_MAX_SESSION_S;
}
