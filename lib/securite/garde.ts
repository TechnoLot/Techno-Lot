import "server-only";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import { derniereAuthentification, sessionExpiree, DUREE_MAX_SESSION_S } from "./age-session";
import { cheminInterne } from "./chemin-interne";
import { EVENEMENTS, journaliser } from "./journal";

/**
 * Garde commune de l'admin (checks 01, 09, 16) : une seule vérification,
 * appelée EN TÊTE de chaque page, route et action admin (le middleware ne
 * suffit pas : il ne vérifie que la session, et peut être contourné).
 *
 * Refus par défaut, dans l'ordre :
 *  1. `getUser()` (session revalidée par le serveur Auth, jamais `getSession()`)
 *     → 401 sans session ;
 *  2. courriel dans ADMIN_EMAILS (variable serveur) → sinon 403 ;
 *  3. `rpc("est_admin")` = rôle par UUID dans public.admins (non modifiable par
 *     l'utilisateur) → 403 si la réponse n'est pas exactement `true` ou en cas
 *     d'erreur ;
 *  4. reconnexion obligatoire chaque jour (décision du 30 oct. 2026) : 401
 *     motif `session_expiree` si la dernière authentification a plus de 24 h.
 */

type ClientSupabase = Awaited<ReturnType<typeof createClient>>;

export type ContexteAdmin = { supabase: ClientSupabase; user: User; requestId: string };

export type MotifRefus =
  | "non_connecte"
  | "session_expiree"
  | "courriel_non_autorise"
  | "role_refuse"
  | "origine_refusee"
  | "configuration";

export type VerdictAdmin =
  | { ok: true; ctx: ContexteAdmin }
  | { ok: false; status: 401 | 403; motif: MotifRefus; requestId: string; userId: string | null };

// --- Âge de la session ------------------------------------------------------------

// Calcul pur partagé avec middleware.ts (runtime Edge) : lib/securite/age-session.ts.
export { DUREE_MAX_SESSION_S, derniereAuthentification, sessionExpiree };

// --- Vérification -----------------------------------------------------------------

function refus(
  status: 401 | 403,
  motif: MotifRefus,
  requestId: string,
  userId: string | null = null,
): VerdictAdmin {
  return { ok: false, status, motif, requestId, userId };
}

/** Session + rôle admin + âge de la session. Refus par défaut. */
export async function verifierAdmin(): Promise<VerdictAdmin> {
  const requestId = randomUUID();

  let supabase: ClientSupabase;
  let user: User | null = null;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return refus(401, "non_connecte", requestId);
  }
  if (!user) return refus(401, "non_connecte", requestId);

  if (!isAdminEmail(user.email)) return refus(403, "courriel_non_autorise", requestId, user.id);

  try {
    const { data: estAdmin, error } = await supabase.rpc("est_admin");
    if (error || estAdmin !== true) return refus(403, "role_refuse", requestId, user.id);
  } catch {
    return refus(403, "role_refuse", requestId, user.id);
  }

  // Revendications VÉRIFIÉES (signature ou serveur Auth), lues après getUser().
  let amr: unknown = undefined;
  try {
    const { data } = await supabase.auth.getClaims();
    if (data?.claims && data.claims.sub === user.id) amr = data.claims.amr;
  } catch {
    // Repli sur last_sign_in_at ci-dessous.
  }
  if (sessionExpiree(derniereAuthentification(amr, user.last_sign_in_at))) {
    return refus(401, "session_expiree", requestId, user.id);
  }

  return { ok: true, ctx: { supabase, user, requestId } };
}

// --- Origine (CSRF, check 16) ---------------------------------------------------------

const METHODES_SURES = new Set(["GET", "HEAD", "OPTIONS"]);

function ajouterOrigine(ensemble: Set<string>, valeur: string | undefined): void {
  if (!valeur) return;
  try {
    const u = new URL(valeur);
    if (u.protocol === "https:" || u.protocol === "http:") ensemble.add(u.origin);
  } catch {
    // Valeur invalide : ignorée.
  }
}

/**
 * Origines acceptées pour une requête non sûre, ou null si aucune n'est
 * configurée (SITE_URL absente hors Vercel et hors développement).
 * Ne lit JAMAIS `X-Forwarded-Host` ni `Host` en production (le client les choisit).
 */
export function originesPermises(request: Request): Set<string> | null {
  const permises = new Set<string>();

  const site = process.env.SITE_URL;
  if (site) {
    try {
      const u = new URL(site);
      if (u.protocol === "https:" || u.protocol === "http:") {
        const domaine = u.hostname.replace(/^www\./i, "");
        const port = u.port ? `:${u.port}` : "";
        permises.add(u.origin);
        permises.add(`${u.protocol}//${domaine}${port}`);
        permises.add(`${u.protocol}//www.${domaine}${port}`);
      }
    } catch {
      // SITE_URL invalide : signalée au démarrage (lib/securite/env.ts).
    }
  }

  if (process.env.VERCEL) {
    if (process.env.VERCEL_URL) ajouterOrigine(permises, `https://${process.env.VERCEL_URL}`);
    if (process.env.VERCEL_BRANCH_URL) ajouterOrigine(permises, `https://${process.env.VERCEL_BRANCH_URL}`);
  }

  if (process.env.NODE_ENV === "development") {
    let port = process.env.PORT || "3000";
    try {
      port = new URL(request.url).port || port;
    } catch {
      // Port par défaut.
    }
    permises.add(`http://localhost:${port}`);
    permises.add(`http://127.0.0.1:${port}`);
  }

  return permises.size > 0 ? permises : null;
}

type VerdictOrigine = "ok" | "refusee" | "non_configuree";

function verifierOrigine(request: Request): VerdictOrigine {
  if (METHODES_SURES.has(request.method.toUpperCase())) return "ok";
  const permises = originesPermises(request);
  if (!permises) return "non_configuree";
  const origine = request.headers.get("origin");
  if (!origine || origine === "null") return "refusee";
  try {
    return permises.has(new URL(origine).origin) ? "ok" : "refusee";
  } catch {
    return "refusee";
  }
}

/**
 * CSRF : GET/HEAD/OPTIONS → vrai ; sinon l'en-tête `Origin` est obligatoire et
 * doit être celle du site (SITE_URL et sa variante www, l'URL Vercel en
 * prévisualisation, localhost en développement).
 */
export function origineValide(request: Request): boolean {
  return verifierOrigine(request) === "ok";
}

// --- Routes, actions, pages ------------------------------------------------------------

const MESSAGES_REFUS: Record<MotifRefus, string> = {
  non_connecte: "Non connecté.",
  session_expiree: "Session expirée. Reconnectez-vous.",
  courriel_non_autorise: "Accès refusé.",
  role_refuse: "Accès refusé.",
  origine_refusee: "Origine refusée.",
  configuration: "Service temporairement indisponible.",
};

function reponseRefus(status: number, motif: MotifRefus, requestId: string): NextResponse {
  return NextResponse.json(
    { error: MESSAGES_REFUS[motif] },
    { status, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
  );
}

/** Vrai si `exigerAdminRoute` a renvoyé un refus (réponse à retourner telle quelle). */
export function estRefus(resultat: ContexteAdmin | NextResponse): resultat is NextResponse {
  return resultat instanceof Response;
}

/**
 * Route handlers admin : contexte, ou réponse de refus (401/403/503) à
 * renvoyer telle quelle. Contrôle d'origine pour POST/PUT/PATCH/DELETE.
 *
 * Exemple :
 *   export async function POST(request: Request) {
 *     const garde = await exigerAdminRoute(request);
 *     if (estRefus(garde)) return garde;
 *     const { supabase, user, requestId } = garde;
 *     …
 *   }
 */
export async function exigerAdminRoute(request: Request): Promise<ContexteAdmin | NextResponse> {
  const origine = verifierOrigine(request);
  if (origine !== "ok") {
    const requestId = randomUUID();
    const motif: MotifRefus = origine === "non_configuree" ? "configuration" : "origine_refusee";
    const status = origine === "non_configuree" ? 503 : 403;
    void journaliser(EVENEMENTS.adminRefus, {
      resultat: "refus",
      request,
      requestId,
      statut: status,
      details: { motif },
    });
    return reponseRefus(status, motif, requestId);
  }

  const v = await verifierAdmin();
  if (!v.ok) {
    void journaliser(EVENEMENTS.adminRefus, {
      resultat: "refus",
      request,
      requestId: v.requestId,
      userId: v.userId,
      statut: v.status,
      details: { motif: v.motif },
    });
    return reponseRefus(v.status, v.motif, v.requestId);
  }
  return v.ctx;
}

async function entetesCourants() {
  try {
    return await headers();
  } catch {
    return undefined; // hors d'une requête
  }
}

/**
 * Server actions : contexte, ou null (refus journalisé). Chaque action garde
 * sa convention de réponse (`{ ok: false, error }` ou exception).
 * (Next vérifie déjà l'origine des server actions.)
 */
export async function adminPourAction(): Promise<ContexteAdmin | null> {
  const v = await verifierAdmin();
  if (v.ok) return v.ctx;
  void journaliser(EVENEMENTS.adminRefus, {
    resultat: "refus",
    entetes: await entetesCourants(),
    methode: "ACTION",
    requestId: v.requestId,
    userId: v.userId,
    statut: v.status,
    details: { motif: v.motif },
  });
  return null;
}

const MESSAGE_403 = "Ce courriel n'est pas autorisé à accéder au tableau de bord.";

/**
 * Pages et layout admin : contexte, ou redirection vers la connexion.
 *  - 401 → /admin/login?next=<chemin> ;
 *  - session de plus de 24 h → /admin/login?error=session_expiree&next=<chemin> ;
 *  - 403 → /admin/login?error=<message>.
 * `cheminActuel` est filtré par `cheminInterne` (jamais de redirection ouverte).
 */
export async function exigerAdminPage(cheminActuel?: string): Promise<ContexteAdmin> {
  const v = await verifierAdmin();
  if (v.ok) return v.ctx;

  void journaliser(EVENEMENTS.adminRefus, {
    resultat: "refus",
    entetes: await entetesCourants(),
    methode: "GET",
    chemin: cheminInterne(cheminActuel),
    requestId: v.requestId,
    userId: v.userId,
    statut: v.status,
    details: { motif: v.motif },
  });

  const next = encodeURIComponent(cheminInterne(cheminActuel));
  if (v.status === 401) {
    redirect(
      v.motif === "session_expiree"
        ? `/admin/login?error=session_expiree&next=${next}`
        : `/admin/login?next=${next}`,
    );
  }
  redirect(`/admin/login?error=${encodeURIComponent(MESSAGE_403)}`);
}

// --- Tâches planifiées ------------------------------------------------------------------

const empreinte = (s: string) => createHash("sha256").update(s, "utf8").digest();

/**
 * Tâches planifiées : `Authorization: Bearer <CRON_SECRET>` comparé en temps
 * constant (empreintes SHA-256 de même longueur). Refus si CRON_SECRET est
 * absent ou fait moins de 32 caractères. Journaliser `cron.refus` côté appelant
 * (avec la requête) en cas de refus.
 */
export function bearerCronValide(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 32) return false;
  const recu = request.headers.get("authorization") ?? "";
  return timingSafeEqual(empreinte(recu), empreinte(`Bearer ${secret}`));
}
