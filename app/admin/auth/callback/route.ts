import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { origineConfiguree } from "@/lib/admin/origin";
import { cheminInterne } from "@/lib/securite/chemin-interne";
import { ipClient } from "@/lib/securite/ip";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { limiterSelon, TABLE_LIMITES } from "@/lib/securite/limite";

export const runtime = "nodejs";

/**
 * GET /admin/auth/callback
 * Point de retour après clic sur un lien magique :
 *   - ?code=…              → PKCE (imposé par @supabase/ssr)
 *   - ?token_hash=…&type=… → OTP (magic link, recovery…)
 *
 * Sécurité : 20 appels / 10 min par IP ; `next` filtré par `cheminInterne`
 * (chemins /admin seulement) ; redirections bâties sur l'origine CONFIGURÉE
 * (jamais l'en-tête Host) ; la page de connexion ne reçoit qu'un CODE
 * d'erreur (jamais le texte de Supabase ni celui de l'URL).
 */

/** Types d'OTP acceptés (liste fermée). */
const TYPES_OTP: readonly EmailOtpType[] = [
  "magiclink",
  "email",
  "recovery",
  "invite",
  "email_change",
  "signup",
];

/** Codes d'erreur Supabase qui signifient « lien expiré ». */
const CODES_EXPIRE = new Set(["otp_expired", "flow_state_expired"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = origineConfiguree(request);
  const ip = ipClient(request);

  const limite = await limiterSelon(TABLE_LIMITES.callbackIp10min, ip, { request });
  if (!limite.permis) return redirectToLogin(origin, "trop_de_tentatives");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const typeBrut = url.searchParams.get("type");
  const supabaseError = url.searchParams.get("error");
  const supabaseErrorCode = url.searchParams.get("error_code");
  const next = cheminInterne(url.searchParams.get("next"));

  const echec = (motif: string, errcode?: string | null) => {
    void journaliser(EVENEMENTS.authEchec, {
      resultat: "echec",
      request,
      statut: 307,
      details: { methode: "lien_magique", motif, errcode: errcode?.slice(0, 60) ?? undefined },
    });
    return redirectToLogin(
      origin,
      errcode && CODES_EXPIRE.has(errcode) ? "lien_expire" : "lien_invalide",
    );
  };

  // Supabase peut inclure une erreur directement dans l'URL (lien expiré, déjà utilisé…).
  if (supabaseError) return echec("erreur_supabase", supabaseErrorCode);

  const supabase = await createClient();

  // — Flow PKCE : ?code=xxx
  if (code) {
    if (code.length > 512) return echec("code_invalide");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return echec("echange_code", error.code ?? null);
    return succes(request, origin, next, data.user?.id ?? null);
  }

  // — Flow OTP : ?token_hash=xxx&type=magiclink
  if (tokenHash && typeBrut) {
    const type = TYPES_OTP.find((t) => t === typeBrut);
    if (!type || tokenHash.length > 512) return echec("type_otp_invalide");
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return echec("verification_otp", error.code ?? null);
    return succes(request, origin, next, data.user?.id ?? null);
  }

  // — Aucun paramètre reconnu : lien mal formé
  return echec("parametres_absents");
}

function succes(request: Request, origin: string, next: string, userId: string | null) {
  void journaliser(EVENEMENTS.authConnexion, {
    resultat: "ok",
    request,
    userId,
    statut: 307,
    details: { methode: "lien_magique" },
  });
  return NextResponse.redirect(new URL(next, origin));
}

function redirectToLogin(origin: string, codeErreur: string) {
  const loginUrl = new URL("/admin/login", origin);
  loginUrl.searchParams.set("error", codeErreur);
  return NextResponse.redirect(loginUrl);
}
