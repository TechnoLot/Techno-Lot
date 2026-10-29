/**
 * Locales et chemins par langue, sans aucun texte : module léger que les composants
 * client (en-tête, sélecteur de langue) importent sans embarquer les dictionnaires
 * FR + EN de lib/i18n.ts (qui réexporte tout ceci pour les autres fichiers).
 */
import { counterpartPath } from "@/lib/seo/routes";

export type Locale = "fr" | "en";

export const locales: Locale[] = ["fr", "en"];

/** Préfixe un chemin interne selon la locale (le français reste à la racine). */
export function localePath(locale: Locale, path: string): string {
  if (locale === "fr") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

/**
 * Donne l'URL équivalente dans l'autre langue à partir du chemin courant :
 * slug traduit des pages du registre (lib/seo/routes.ts), sinon bascule du
 * préfixe /en (ex. articles de blogue).
 */
export function switchLocalePath(pathname: string, to: Locale): string {
  return counterpartPath(pathname, to);
}

/** Locale déduite d'un chemin ("/en/..." → en, sinon fr). */
export function localeFromPath(pathname: string): Locale {
  return /^\/en(\/|$)/.test(pathname) ? "en" : "fr";
}
