import { localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

/**
 * Registre des pages publiques indexables (les deux langues).
 *
 * Chaque page a un chemin français et un chemin anglais. Aujourd'hui l'anglais
 * reprend le slug français sous /en, mais une entrée peut avoir un slug anglais
 * différent, par exemple :
 *   { fr: "/rachat-materiel-informatique-montreal",
 *     en: "/en/it-equipment-buyback-montreal", … }
 *
 * Sert au plan du site, aux balises canonical/hreflang (alternatesFor) et au
 * futur sélecteur de langue (counterpartPath).
 */
export type SeoRoute = {
  /** Chemin français (clé du registre), ex. "/faq". */
  fr: string;
  /** Chemin anglais complet, préfixe /en compris, ex. "/en/faq". */
  en: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

/** Page dont le slug anglais est identique au slug français. */
function sameSlug(fr: string, priority = 0.8): SeoRoute {
  return { fr, en: localePath("en", fr), changeFrequency: "monthly", priority };
}

export const seoRoutes: readonly SeoRoute[] = [
  sameSlug("/", 1),
  sameSlug("/a-propos"),
  sameSlug("/contact"),
  sameSlug("/blog"),
  sameSlug("/faq"),
  sameSlug("/soumission"),
  sameSlug("/consultation"),
  sameSlug("/achat-de-lot-description"),
  sameSlug("/prise-en-charge-complete"),
];

/** URL absolue d'un chemin du site (la racine n'a pas de barre finale). */
export function absoluteUrl(path: string): string {
  return path === "/" ? site.url : `${site.url}${path}`;
}

/** Retire la barre finale (sauf pour la racine) pour comparer les chemins. */
function normalize(path: string): string {
  const bare = path.split(/[?#]/)[0] || "/";
  return bare.length > 1 && bare.endsWith("/") ? bare.slice(0, -1) : bare;
}

/** Entrée du registre correspondant à un chemin français ou anglais. */
export function findRoute(path: string): SeoRoute | undefined {
  const p = normalize(path);
  return seoRoutes.find((r) => r.fr === p || r.en === p);
}

/**
 * Chemins FR et EN d'une page à partir de son chemin français. Une page hors
 * registre (ex. un article de blogue) garde le même slug sous /en.
 */
function pathsFor(frPath: string): { fr: string; en: string } {
  const route = findRoute(frPath);
  if (route) return { fr: route.fr, en: route.en };
  const fr = normalize(frPath);
  return { fr, en: localePath("en", fr) };
}

/**
 * Balises alternates de Next pour une page : canonical dans la langue
 * demandée, hreflang fr-CA / en-CA, et x-default = version française.
 */
export function alternatesFor(frPath: string, locale: Locale) {
  const { fr, en } = pathsFor(frPath);
  return {
    canonical: absoluteUrl(locale === "fr" ? fr : en),
    languages: {
      "fr-CA": absoluteUrl(fr),
      "en-CA": absoluteUrl(en),
      "x-default": absoluteUrl(fr),
    },
  };
}

/**
 * Chemin équivalent dans l'autre langue (futur sélecteur de langue). Accepte un
 * chemin français ou anglais ; hors registre, on bascule le préfixe /en.
 */
export function counterpartPath(path: string, toLocale: Locale): string {
  const route = findRoute(path);
  if (route) return route[toLocale];
  const p = normalize(path);
  const bare = p.replace(/^\/en(?=\/|$)/, "") || "/";
  return localePath(toLocale, bare);
}
