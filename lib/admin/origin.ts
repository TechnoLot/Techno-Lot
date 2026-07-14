import { site } from "@/lib/site";

/**
 * Détermine l'origin réel du site (ex. https://www.technolot.ca) même
 * quand Next.js tourne derrière un proxy (Hostinger, Cloudflare…).
 *
 * `new URL(request.url).origin` renvoie souvent l'adresse interne du
 * conteneur (ex. http://0.0.0.0:3000), ce qui casse les redirections
 * post-auth. On préfère lire les en-têtes `x-forwarded-*` posés par le
 * proxy, avec plusieurs fallbacks.
 */
export function getRequestOrigin(request: Request): string {
  const headers = request.headers;

  const forwardedHost =
    headers.get("x-forwarded-host") ?? headers.get("host");
  const forwardedProto =
    headers.get("x-forwarded-proto") ??
    (forwardedHost?.includes("localhost") ? "http" : "https");

  if (
    forwardedHost &&
    !forwardedHost.startsWith("0.0.0.0") &&
    !forwardedHost.startsWith("127.0.0.1")
  ) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Dernier recours : origin du request.url ; s'il pointe vers 0.0.0.0,
  // on retombe sur l'URL canonique définie dans lib/site.ts.
  try {
    const fromUrl = new URL(request.url).origin;
    if (
      fromUrl &&
      !fromUrl.includes("0.0.0.0") &&
      !fromUrl.includes("127.0.0.1")
    ) {
      return fromUrl;
    }
  } catch {
    // Ignoré
  }

  return site.url;
}
