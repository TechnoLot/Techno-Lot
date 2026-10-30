import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emailForUsername, isAdminEmail } from "@/lib/admin/config";
import { origineConfiguree } from "@/lib/admin/origin";
import { cheminInterne } from "@/lib/securite/chemin-interne";
import { ipClient } from "@/lib/securite/ip";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import {
  limiterSelon,
  reponse429,
  TABLE_LIMITES,
  type RegleLimite,
} from "@/lib/securite/limite";
import { lireJson, verifierTaille } from "@/lib/securite/requete";

export const runtime = "nodejs";

/**
 * POST /admin/auth/password — connexion par nom d'utilisateur + mot de passe.
 * Le nom est traduit en courriel côté serveur (ADMIN_USERNAMES), puis Supabase
 * vérifie le mot de passe et pose les témoins de session.
 *
 * Deux formes acceptées :
 *  - JSON (`application/json`, envoi par le formulaire avec JavaScript) →
 *    réponse JSON `{ ok: true }` ou `{ error }` ;
 *  - formulaire natif (`application/x-www-form-urlencoded`, sans JavaScript)
 *    → redirection 303 vers `next` ou vers `/admin/login?error=<code>`.
 *    Le formulaire est en POST : le mot de passe ne passe jamais dans l'URL.
 *
 * Sécurité : corps ≤ 4 Ko ; limites 5 / min et 20 / h par IP, et par compte
 * visé 10 / 15 min puis 20 / h, 30 / 6 h, 40 / 24 h (délai croissant) ; même
 * message générique et temps de réponse comparable (≥ 600 ms) que le compte
 * existe ou non ; aucun texte de Supabase renvoyé ; jamais de mot de passe
 * journalisé.
 */

const TAILLE_MAX = 4_096;
const INVALIDE = "Identifiants invalides.";
const TROP = "Trop de tentatives. Réessaie dans quelques minutes.";
const DUREE_MIN_ECHEC_MS = 600;

/** Paliers supplémentaires par compte : plus d'essais = attente plus longue. */
const PALIERS_COMPTE: readonly RegleLimite[] = [
  TABLE_LIMITES.motDePasseCompte15min,
  { route: "auth-mdp:compte:1h", fenetreSecondes: 3_600, max: 20 },
  { route: "auth-mdp:compte:6h", fenetreSecondes: 21_600, max: 30 },
  { route: "auth-mdp:compte:24h", fenetreSecondes: 86_400, max: 40 },
];

const SchemaConnexion = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
  next: z.string().max(2048).optional(),
});

type Forme = "json" | "formulaire";

function typeMime(request: Request): string {
  return (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
}

async function attendreAuMoins(debut: number, ms: number) {
  const reste = ms - (Date.now() - debut);
  if (reste > 0) await new Promise((r) => setTimeout(r, reste));
}

export async function POST(request: Request) {
  const debut = Date.now();
  const requestId = randomUUID();
  const mime = typeMime(request);
  const forme: Forme | null =
    mime === "application/json" ? "json" : mime === "application/x-www-form-urlencoded" ? "formulaire" : null;

  if (!forme) {
    return NextResponse.json(
      { error: "Type de contenu non pris en charge." },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Lecture bornée du corps.
  let brut: unknown;
  if (forme === "json") {
    const lu = await lireJson<unknown>(request, TAILLE_MAX);
    if (!lu.ok) return lu.reponse;
    brut = lu.donnees;
  } else {
    const taille = verifierTaille(request, TAILLE_MAX);
    if (!taille.ok) return taille.reponse;
    const form = await request.formData().catch(() => null);
    brut = form
      ? {
          username: form.get("username") ?? undefined,
          password: form.get("password") ?? undefined,
          next: form.get("next") ?? undefined,
        }
      : null;
  }

  const nextBrut =
    brut && typeof brut === "object" ? (brut as Record<string, unknown>).next : undefined;
  const next = cheminInterne(nextBrut);

  /** Réponse d'échec selon la forme (JSON ou redirection 303). */
  const repondre = (status: 401 | 429, attente = 60) => {
    if (forme === "formulaire") {
      const url = new URL("/admin/login", origineConfiguree(request));
      url.searchParams.set("error", status === 429 ? "trop_de_tentatives" : "identifiants");
      if (next !== "/admin") url.searchParams.set("next", next);
      return NextResponse.redirect(url, {
        status: 303,
        headers: status === 429 ? { "Retry-After": String(Math.max(1, Math.ceil(attente))) } : undefined,
      });
    }
    return status === 429
      ? reponse429(attente, TROP)
      : NextResponse.json({ error: INVALIDE }, { status: 401, headers: { "Cache-Control": "no-store" } });
  };

  const echec = async (motif: string, compteConnu: boolean, errcode?: string) => {
    void journaliser(EVENEMENTS.authEchec, {
      resultat: "echec",
      request,
      requestId,
      statut: 401,
      details: { methode: "mot_de_passe", motif, compte_connu: compteConnu, errcode },
    });
    await attendreAuMoins(debut, DUREE_MIN_ECHEC_MS);
    return repondre(401);
  };

  // Limites par IP (avant toute vérification).
  const ip = ipClient(request);
  for (const regle of [TABLE_LIMITES.motDePasseIpMinute, TABLE_LIMITES.motDePasseIpHeure]) {
    const v = await limiterSelon(regle, ip, { request, requestId });
    if (!v.permis) return repondre(429, v.attente);
  }

  const parse = SchemaConnexion.safeParse(brut);
  if (!parse.success) return echec("donnees_invalides", false);
  const { username, password } = parse.data;

  // Limites par compte visé (courriel si connu, sinon nom saisi), délai croissant.
  const email = emailForUsername(username);
  const cleCompte = (email ?? username).toLowerCase().slice(0, 254);
  for (const regle of PALIERS_COMPTE) {
    const v = await limiterSelon(regle, cleCompte, { request, requestId });
    if (!v.permis) return repondre(429, v.attente);
  }

  if (!email || !isAdminEmail(email)) return echec("compte_inconnu", false);

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.status === 429) {
        void journaliser(EVENEMENTS.authEchec, {
          resultat: "refus",
          request,
          requestId,
          statut: 429,
          details: { methode: "mot_de_passe", motif: "limite_supabase" },
        });
        return repondre(429, 60);
      }
      return echec(
        error.code === "invalid_credentials" ? "identifiants" : "supabase",
        true,
        error.code ?? undefined,
      );
    }
    userId = data.user?.id ?? null;
  } catch {
    return echec("exception", true);
  }

  void journaliser(EVENEMENTS.authConnexion, {
    resultat: "ok",
    request,
    requestId,
    userId,
    statut: forme === "json" ? 200 : 303,
    details: { methode: "mot_de_passe" },
  });

  if (forme === "formulaire") {
    return NextResponse.redirect(new URL(next, origineConfiguree(request)), 303);
  }
  return NextResponse.json({ ok: true, next }, { headers: { "Cache-Control": "no-store" } });
}
