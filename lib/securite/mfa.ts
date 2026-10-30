/**
 * Double authentification (TOTP Supabase, niveau `aal2`) : règles pures
 * partagées par le middleware (runtime Edge), la garde (serveur), les routes
 * de `/admin/auth/mfa` et le formulaire du navigateur.
 *
 * Compatible Edge et navigateur : ni `server-only` ni `node:*`, aucun secret.
 * Isolé ici pour être testé sans Next ni Supabase (tests/securite/f5-*.test.ts).
 */
import { cheminInterne } from "./chemin-interne";

/** Page du code de vérification / de l'activation. */
export const CHEMIN_MFA = "/admin/auth/mfa";

/** Code d'une application d'authentification : exactement 6 chiffres. */
export const CODE_TOTP = /^[0-9]{6}$/;

/** Même règle pour l'attribut `pattern` du champ (le navigateur ajoute ^…$). */
export const MOTIF_CODE_TOTP = "[0-9]{6}";

/** Nom du facteur dans Supabase (affiché dans Mon compte et le tableau de bord Supabase). */
export const NOM_FACTEUR_TOTP = "Application d'authentification";

/** Vrai si `valeur` est un code à 6 chiffres (aucun espace, aucun autre caractère). */
export function codeTotpValide(valeur: unknown): valeur is string {
  return typeof valeur === "string" && CODE_TOTP.test(valeur);
}

/** Vrai pour la PAGE de double authentification (pas ses routes POST). */
export function estPageMfa(pathname: string): boolean {
  return pathname === CHEMIN_MFA || pathname === `${CHEMIN_MFA}/`;
}

/**
 * Niveau d'assurance (`aal1`, `aal2`) lu dans les revendications VÉRIFIÉES du
 * jeton (`getClaims()`), seulement si elles appartiennent bien à `userId`.
 * null si illisible : traité comme « pas aal2 » (refus par défaut).
 */
export function niveauAal(claims: unknown, userId: string): string | null {
  if (!claims || typeof claims !== "object") return null;
  const c = claims as { sub?: unknown; aal?: unknown };
  if (c.sub !== userId) return null;
  return typeof c.aal === "string" ? c.aal : null;
}

/**
 * Vrai si une session (déjà vérifiée : connectée, admin, moins de 24 h) doit
 * d'abord passer par la double authentification avant `pathname`.
 * La page `/admin/auth/mfa` elle-même n'est jamais redirigée (sinon boucle).
 */
export function doitPasserParMfa(pathname: string, aal: string | null): boolean {
  return !estPageMfa(pathname) && aal !== "aal2";
}

/**
 * Destination après le code : chemin interne de l'admin (`cheminInterne`),
 * jamais une page de connexion ni de double authentification (boucle).
 */
export function cheminApresMfa(next: unknown): string {
  const chemin = cheminInterne(next);
  const pathname = chemin.split(/[?#]/, 1)[0];
  if (pathname === "/admin/login" || pathname === "/admin/auth" || pathname.startsWith("/admin/auth/")) {
    return "/admin";
  }
  return chemin;
}

/** Facteur tel que renvoyé par Supabase dans `user.factors` (champs utiles seulement). */
export type FacteurMfa = {
  id: string;
  factor_type: string;
  status: string;
  created_at: string;
  friendly_name?: string;
};

/**
 * Facteurs TOTP du compte (`user.factors` de `getUser()`), séparés en
 * vérifiés (activation terminée) et non vérifiés (essai d'activation laissé).
 */
export function facteursTotp(factors: readonly FacteurMfa[] | null | undefined): {
  verifies: FacteurMfa[];
  nonVerifies: FacteurMfa[];
} {
  const totp = (factors ?? []).filter((f) => f && f.factor_type === "totp" && typeof f.id === "string");
  return {
    verifies: totp.filter((f) => f.status === "verified"),
    nonVerifies: totp.filter((f) => f.status !== "verified"),
  };
}

/** Adresse de la page de double authentification, avec un `next` toujours interne. */
export function urlMfa(cheminDemande?: string): string {
  return `${CHEMIN_MFA}?next=${encodeURIComponent(cheminApresMfa(cheminDemande))}`;
}
