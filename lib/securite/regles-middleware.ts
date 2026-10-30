/**
 * Règles pures du middleware (`middleware.ts`) : CSP à nonce de l'admin et
 * adresses de retour vers la connexion.
 *
 * Compatible Edge : ni `server-only` ni `node:*` (Web Crypto seulement).
 * Isolé ici pour être testé sans Next ni Supabase (tests/securite/f4-*.test.ts).
 */
import { cheminInterne } from "./chemin-interne";
import { estPageMfa } from "./mfa";

/** Message affiché sur /admin/login à un compte connecté qui n'est pas admin (même texte que la garde). */
export const MESSAGE_COURRIEL_REFUSE = "Ce courriel n'est pas autorisé à accéder au tableau de bord.";

/**
 * Pages de connexion : accessibles sans session (mais avec la CSP à nonce).
 * Exception : la PAGE de double authentification (`/admin/auth/mfa`) exige une
 * session (niveau aal1 suffit) ; ses routes POST font leur propre garde.
 */
export function estRouteAdminPublique(pathname: string): boolean {
  if (estPageMfa(pathname)) return false;
  return pathname === "/admin/login" || pathname.startsWith("/admin/auth/");
}

/**
 * Vrai si le middleware pose la CSP à nonce sur ce chemin /admin.
 * Exclus : les routes d'API (`/admin/…/api/…`, réponses JSON) et les outils
 * HTML encadrés (`/admin/…/embed`), qui posent leur propre politique (leurs
 * gestionnaires `onclick=` en ligne ne peuvent pas porter de nonce).
 */
export function poserCspAdmin(pathname: string): boolean {
  if (pathname.includes("/api/") || pathname.endsWith("/api")) return false;
  if (/\/embed\/?$/.test(pathname)) return false;
  return true;
}

/** Nonce aléatoire de 128 bits en base64 (une valeur par requête). */
export function genererNonce(): string {
  const octets = crypto.getRandomValues(new Uint8Array(16));
  let binaire = "";
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire);
}

/** Origine http(s) d'une URL de configuration, ou null. */
function origine(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * CSP des pages /admin (modèle T7 b). `'strict-dynamic'` : seuls les scripts
 * porteurs du nonce (ceux de Next) et ceux qu'ils chargent s'exécutent ; un
 * script injecté ou un gestionnaire `on…=` est bloqué.
 *  - style-src 'unsafe-inline' : attributs `style` de React et framer-motion ;
 *  - img-src https: : pièces jointes, images d'un courriel affichées sur demande ;
 *  - connect-src : le site + Supabase (NEXT_PUBLIC_SUPABASE_URL) ;
 *  - frame-src 'self' : outils encadrés (calculatrice, eBay) ;
 *  - 'unsafe-eval' en développement seulement (rechargement à chaud de Next).
 */
export function cspAdmin(
  nonce: string,
  options: { supabaseUrl?: string; dev?: boolean } = {},
): string {
  const supabase = origine(options.supabaseUrl);
  const script = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (options.dev) script.push("'unsafe-eval'");
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${supabase ? ` ${supabase}` : ""}`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Adresse de la page de connexion (chemin + requête), avec un `next` toujours
 * interne (`cheminInterne` : jamais de redirection ouverte).
 *  - `non_connecte` → /admin/login?next=… ;
 *  - `session_expiree` → /admin/login?error=session_expiree&next=… ;
 *  - `courriel_refuse` → /admin/login?error=<message> (pas de `next` : le
 *    compte n'a rien à faire dans l'admin).
 */
export function urlConnexion(
  motif: "non_connecte" | "session_expiree" | "courriel_refuse",
  cheminDemande?: string,
): string {
  if (motif === "courriel_refuse") {
    return `/admin/login?error=${encodeURIComponent(MESSAGE_COURRIEL_REFUSE)}`;
  }
  const next = encodeURIComponent(cheminInterne(cheminDemande));
  return motif === "session_expiree"
    ? `/admin/login?error=session_expiree&next=${next}`
    : `/admin/login?next=${next}`;
}
