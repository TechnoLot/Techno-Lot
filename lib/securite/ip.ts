/**
 * Adresse IP du visiteur, pour les limites de débit et le journal de sécurité.
 *
 * Compatible Edge (middleware.ts) : ni `server-only` ni `node:*`.
 *
 * - Vercel (`process.env.VERCEL`) : Vercel ÉCRASE `x-forwarded-for` et fournit
 *   `x-real-ip` / `x-vercel-forwarded-for`, fiables.
 * - Ailleurs (Hostinger, LiteSpeed devant Node) : chaque mandataire AJOUTE
 *   l'adresse de son client à droite de `x-forwarded-for`. Seule la DERNIÈRE
 *   entrée (ajoutée par LiteSpeed) est fiable ; les premières viennent du
 *   client et sont falsifiables. Repli : `x-real-ip`.
 *
 * À CONFIRMER EN PRODUCTION : la position exacte chez Hostinger n'est pas
 * documentée. Après la mise en ligne, appeler GET /api/admin/diagnostic-ip
 * (admin connecté) une fois normalement et une fois avec un faux
 * `X-Forwarded-For: 203.0.113.9`, comparer avec sa vraie IP ; si le CDN
 * Hostinger est actif, la dernière entrée peut être celle du CDN.
 */

/** Source d'en-têtes : `Request`, `Headers` ou `headers()` de Next. */
export type SourceEntetes = Request | { get(nom: string): string | null };

export const IP_INCONNUE = "inconnue";

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/** Valide une IPv4 ou une IPv6 « simple » ; renvoie la forme normalisée ou null. */
export function normaliserIp(valeur: string | null | undefined): string | null {
  if (!valeur) return null;
  let v = valeur.trim();
  if (v.length === 0 || v.length > 45) return null;
  if (IPV4.test(v)) return v;
  // IPv6 éventuellement entre crochets (« [2001:db8::1] »).
  if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1);
  if (!v.includes(":") || !/^[0-9a-fA-F:.]+$/.test(v)) return null;
  try {
    // Le parseur WHATWG valide strictement les IPv6 (et normalise la forme).
    const hote = new URL(`http://[${v}]/`).hostname;
    return hote.slice(1, -1);
  } catch {
    return null;
  }
}

/** En-têtes d'une source (sans `instanceof`, sûr d'un environnement à l'autre). */
export function entetesDe(source: SourceEntetes): { get(nom: string): string | null } {
  return "headers" in source && typeof source.headers?.get === "function"
    ? source.headers
    : (source as { get(nom: string): string | null });
}

function lireEntete(source: SourceEntetes, nom: string): string | null {
  return entetesDe(source).get(nom);
}

function entrees(liste: string | null): string[] {
  if (!liste) return [];
  return liste
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Première entrée non vide d'une liste séparée par des virgules. */
function premiere(liste: string | null): string | null {
  return entrees(liste)[0] ?? null;
}

/** Dernière entrée non vide d'une liste séparée par des virgules. */
function derniere(liste: string | null): string | null {
  const parties = entrees(liste);
  return parties.length > 0 ? parties[parties.length - 1] : null;
}

/**
 * IP du client selon l'hébergement, ou `"inconnue"` si l'en-tête attendu est
 * absent ou mal formé.
 */
export function ipClient(source: SourceEntetes): string {
  if (process.env.VERCEL) {
    const ip =
      normaliserIp(lireEntete(source, "x-real-ip")) ??
      // Posé par Vercel lui-même (le client ne peut pas l'imposer) : client d'origine en tête.
      normaliserIp(premiere(lireEntete(source, "x-vercel-forwarded-for")));
    return ip ?? IP_INCONNUE;
  }
  const ip =
    normaliserIp(derniere(lireEntete(source, "x-forwarded-for"))) ??
    normaliserIp(lireEntete(source, "x-real-ip"));
  return ip ?? IP_INCONNUE;
}
