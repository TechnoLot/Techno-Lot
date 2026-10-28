// Import de type seulement (effacé à la compilation) : lib/i18n.ts importe ce
// fichier (switchLocalePath), un import d'exécution créerait un cycle.
import type { Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

/**
 * Registre des pages publiques indexables.
 *
 * Chaque page a un chemin français et, si elle existe, une version anglaise.
 * L'anglais reprend souvent le slug français sous /en (sameSlug), mais une
 * entrée peut avoir un slug anglais différent (ex. la page locale Montréal).
 * Une page sans `en` est en français seulement : pas de hreflang en-CA, seul
 * le français est listé au plan du site, et le sélecteur de langue mène à /en.
 *
 * Sert au plan du site (sitemapEntries), aux balises canonical/hreflang
 * (alternatesFor) et au sélecteur de langue (counterpartPath, repris par
 * switchLocalePath dans lib/i18n.ts).
 */
export type SeoRoute = {
  /** Chemin français (clé du registre), ex. "/faq". */
  fr: string;
  /** Chemin anglais complet, préfixe /en compris, ex. "/en/faq". Absent : page en français seulement. */
  en?: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

/** Entrée qui a une version anglaise. */
export type BilingualSeoRoute = SeoRoute & { en: string };

/** "/" → "/en", sinon "/en" + chemin (équivalent local de localePath("en", …)). */
function enPath(frPath: string): string {
  return frPath === "/" ? "/en" : `/en${frPath}`;
}

/** Chemin dans une langue à partir du chemin français, hors registre. */
function prefixed(locale: Locale, frPath: string): string {
  return locale === "fr" ? frPath : enPath(frPath);
}

/** Page dont le slug anglais est identique au slug français. */
function sameSlug(fr: string, priority = 0.8): BilingualSeoRoute {
  return { fr, en: enPath(fr), changeFrequency: "monthly", priority };
}

/** Toutes les pages du registre, bilingues ou en français seulement. */
export const allSeoRoutes: readonly SeoRoute[] = [
  sameSlug("/", 1),
  sameSlug("/a-propos"),
  sameSlug("/contact"),
  sameSlug("/blog"),
  sameSlug("/faq"),
  sameSlug("/soumission"),
  sameSlug("/consultation"),
  sameSlug("/achat-de-lot-description"),
  sameSlug("/prise-en-charge-complete"),
  // Pages locales (contenu : lib/seo/local-pages.ts)
  {
    fr: "/rachat-materiel-informatique-montreal",
    en: "/en/it-equipment-buyback-montreal",
    changeFrequency: "monthly",
    priority: 0.9,
  },
];

function isBilingual(route: SeoRoute): route is BilingualSeoRoute {
  return typeof route.en === "string";
}

/**
 * Pages qui existent dans les deux langues.
 * @deprecated Pour le plan du site, utiliser sitemapEntries(), qui inclut
 * aussi les pages en français seulement.
 */
export const seoRoutes: readonly BilingualSeoRoute[] = allSeoRoutes.filter(isBilingual);

/** URL absolue d'un chemin du site (la racine n'a pas de barre finale). */
export function absoluteUrl(path: string): string {
  return path === "/" ? site.url : `${site.url}${path}`;
}

/**
 * Entrées du plan du site pour les pages du registre : la version française,
 * plus la version anglaise quand elle existe.
 */
export function sitemapEntries(): {
  url: string;
  changeFrequency: SeoRoute["changeFrequency"];
  priority: number;
}[] {
  return allSeoRoutes.flatMap((route) =>
    [route.fr, route.en]
      .filter((path): path is string => typeof path === "string")
      .map((path) => ({
        url: absoluteUrl(path),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })),
  );
}

/** Retire la barre finale (sauf pour la racine) pour comparer les chemins. */
function normalize(path: string): string {
  const bare = path.split(/[?#]/)[0] || "/";
  return bare.length > 1 && bare.endsWith("/") ? bare.slice(0, -1) : bare;
}

/** Entrée du registre correspondant à un chemin français ou anglais. */
export function findRoute(path: string): SeoRoute | undefined {
  const p = normalize(path);
  return allSeoRoutes.find((r) => r.fr === p || r.en === p);
}

/**
 * Chemins FR et EN d'une page à partir de son chemin français. Une page hors
 * registre (ex. un article de blogue) garde le même slug sous /en ; une page
 * du registre en français seulement n'a pas de chemin anglais.
 */
function pathsFor(frPath: string): { fr: string; en?: string } {
  const route = findRoute(frPath);
  if (route) return { fr: route.fr, en: route.en };
  const fr = normalize(frPath);
  return { fr, en: enPath(fr) };
}

/**
 * Balises alternates de Next pour une page : canonical dans la langue
 * demandée, hreflang fr-CA / en-CA, et x-default = version française.
 * Page en français seulement : canonical français, sans en-CA.
 */
export function alternatesFor(frPath: string, locale: Locale) {
  const { fr, en } = pathsFor(frPath);
  if (!en) {
    return {
      canonical: absoluteUrl(fr),
      languages: {
        "fr-CA": absoluteUrl(fr),
        "x-default": absoluteUrl(fr),
      },
    };
  }
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
 * Chemin équivalent dans l'autre langue (sélecteur de langue). Accepte un
 * chemin français ou anglais ; hors registre, on bascule le préfixe /en.
 * Page en français seulement vers l'anglais : accueil anglais (/en).
 */
export function counterpartPath(path: string, toLocale: Locale): string {
  const route = findRoute(path);
  if (route) return toLocale === "fr" ? route.fr : route.en ?? "/en";
  const p = normalize(path);
  const bare = p.replace(/^\/en(?=\/|$)/, "") || "/";
  return prefixed(toLocale, bare);
}
