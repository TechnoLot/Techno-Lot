import { site } from "@/lib/site";

/**
 * Origine publique du site (ex. https://www.technolot.ca) pour les liens et
 * redirections de l'authentification (lien magique, retour du callback).
 *
 * Jamais tirée des en-têtes `X-Forwarded-Host` / `Host` en production : le
 * client les choisit, et un lien magique pointant vers un autre domaine
 * donnerait la session de l'admin à celui qui l'a demandé (audit T5, 01-C).
 *
 * Ordre :
 *  1. développement (`NODE_ENV !== "production"`) : l'origine de la requête si
 *     elle est locale (localhost, 127.0.0.1, [::1]) ;
 *  2. `SITE_URL` (variable serveur, URL http(s)) ;
 *  3. l'URL canonique de `lib/site.ts`.
 */
export function origineConfiguree(request?: Request): string {
  if (process.env.NODE_ENV !== "production" && request) {
    const locale = origineLocale(request);
    if (locale) return locale;
  }

  const configuree = process.env.SITE_URL;
  if (configuree) {
    try {
      const u = new URL(configuree);
      if (u.protocol === "https:" || u.protocol === "http:") return u.origin;
    } catch {
      // SITE_URL invalide : signalée au démarrage (lib/securite/env.ts).
    }
  }

  return new URL(site.url).origin;
}

const HOTES_LOCAUX = new Set(["localhost", "127.0.0.1", "[::1]"]);

function origineLocale(request: Request): string | null {
  try {
    const u = new URL(request.url);
    return HOTES_LOCAUX.has(u.hostname) ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * Ancien nom, gardé pour les appelants existants : même comportement sûr que
 * `origineConfiguree` (n'utilise plus les en-têtes de la requête).
 */
export function getRequestOrigin(request: Request): string {
  return origineConfiguree(request);
}
