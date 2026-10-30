/**
 * Chemin de retour (« ?next= ») sûr pour l'admin.
 *
 * Compatible Edge (middleware.ts) : ni `server-only` ni `node:*`.
 *
 * Pourquoi : un paramètre `next` accepté tel quel permet une redirection
 * ouverte (`//evil.com`, `/\evil.com`, `/%09/evil.com`…) : le visiteur croit
 * suivre un lien de technolot.ca et atterrit sur un faux écran de connexion.
 *
 * Comment : la valeur brute est d'abord filtrée (caractères de contrôle et
 * antislash refusés), puis résolue par le parseur WHATWG (`new URL`) contre
 * une origine fictive. Le parseur retire tabulations et sauts de ligne et
 * traite `\` comme un navigateur : si l'origine résolue change, la valeur
 * pointait hors du site. Seuls les chemins sous `/admin` sont acceptés, et la
 * forme normalisée (chemin + requête + ancre) est renvoyée.
 */

const ORIGINE_FICTIVE = "https://exemple.invalid";
const LONGUEUR_MAX = 2048;
// Caractères de contrôle C0 et DEL (tabulation, sauts de ligne, NUL…).
const CONTROLE = /[\u0000-\u001F\u007F]/;
const ANTISLASH = "\\";

/**
 * Renvoie `valeur` normalisée si c'est un chemin du même site sous `/admin`,
 * sinon `defaut`.
 *
 * Exemples : `/admin/crm?x=1` → `/admin/crm?x=1` ; `//evil.com` → `/admin` ;
 * `/blog` → `/admin`.
 */
export function cheminInterne(valeur: unknown, defaut = "/admin"): string {
  if (typeof valeur !== "string") return defaut;
  if (valeur.length === 0 || valeur.length > LONGUEUR_MAX) return defaut;
  if (CONTROLE.test(valeur) || valeur.includes(ANTISLASH)) return defaut;
  // Chemin absolu du site seulement (pas de schéma, pas de « // »).
  if (!valeur.startsWith("/") || valeur.startsWith("//")) return defaut;

  let url: URL;
  try {
    url = new URL(valeur, ORIGINE_FICTIVE);
  } catch {
    return defaut;
  }
  if (url.origin !== ORIGINE_FICTIVE) return defaut;

  // Contrôle APRÈS normalisation (« /admin/../blog » devient « /blog »).
  const chemin = url.pathname;
  if (chemin !== "/admin" && !chemin.startsWith("/admin/")) return defaut;
  // Un chemin normalisé qui commencerait par « // » serait relu comme une
  // origine par un navigateur.
  if (chemin.startsWith("//")) return defaut;

  return chemin + url.search + url.hash;
}
