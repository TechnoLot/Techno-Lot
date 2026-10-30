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
 *  2. le site répond avec et sans « www » : l'hôte demandé par le navigateur
 *     s'il est l'une de ces deux formes du domaine de `SITE_URL` (sinon le
 *     témoin PKCE posé sur l'un ne serait pas lu au retour sur l'autre) ;
 *     tout autre hôte est ignoré ;
 *  3. `SITE_URL` (variable serveur, URL http(s)) ;
 *  4. l'URL canonique de `lib/site.ts`.
 */
export function origineConfiguree(request?: Request): string {
  if (process.env.NODE_ENV !== "production" && request) {
    const locale = origineLocale(request);
    if (locale) return locale;
  }

  const base = baseConfiguree();
  if (request) {
    const hote = hotePublicDemande(request, base);
    if (hote) return `${base.protocol}//${hote}`;
  }
  return base.origin;
}

/** `SITE_URL` si elle est une URL http(s) valide, sinon l'URL canonique de lib/site.ts. */
function baseConfiguree(): URL {
  const configuree = process.env.SITE_URL;
  if (configuree) {
    try {
      const u = new URL(configuree);
      if (u.protocol === "https:" || u.protocol === "http:") return u;
    } catch {
      // SITE_URL invalide : signalée au démarrage (lib/securite/env.ts).
    }
  }
  return new URL(site.url);
}

/**
 * Hôte de la requête s'il est exactement le domaine de `base` avec ou sans
 * « www » (même port), sinon null. Les en-têtes ne servent qu'à choisir entre
 * ces deux formes connues : une valeur inventée est ignorée.
 */
function hotePublicDemande(request: Request, base: URL): string | null {
  const domaine = base.hostname.toLowerCase().replace(/^www\./, "");
  const port = base.port ? `:${base.port}` : "";
  const permis = new Set([`${domaine}${port}`, `www.${domaine}${port}`]);

  const candidats = [request.headers.get("x-forwarded-host"), request.headers.get("host")];
  try {
    candidats.push(new URL(request.url).host);
  } catch {
    // URL de requête illisible : seuls les en-têtes comptent.
  }
  for (const candidat of candidats) {
    const hote = candidat?.split(",")[0]?.trim().toLowerCase();
    if (hote && permis.has(hote)) return hote;
  }
  return null;
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
 * `origineConfiguree` (les en-têtes ne servent qu'à choisir entre les formes
 * avec et sans « www » du domaine configuré).
 */
export function getRequestOrigin(request: Request): string {
  return origineConfiguree(request);
}
