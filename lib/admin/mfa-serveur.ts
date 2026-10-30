import "server-only";
import { NextResponse } from "next/server";

/**
 * Réponses communes des routes de la double authentification
 * (`app/admin/auth/mfa/activation` et `…/verification`).
 * Aucun texte de Supabase n'est renvoyé au navigateur : nos messages
 * seulement, le code d'erreur de Supabase va au journal.
 */

/** Réglage du projet Supabase à vérifier (Authentication → Multi-Factor → TOTP). */
export const MESSAGE_MFA_DESACTIVEE =
  "La double authentification est désactivée dans Supabase. Dans Supabase → Authentication → Multi-Factor, mets TOTP (App Authenticator) à « Enabled », puis recharge la page.";

export const MESSAGE_CODE_FORMAT = "Entre le code à 6 chiffres de ton application d'authentification.";
export const MESSAGE_CODE_INVALIDE = "Code invalide. Vérifie l'heure de ton téléphone et réessaie.";
export const MESSAGE_TROP_DE_CODES = "Trop de codes erronés. Réessaie dans quelques minutes.";

/** Codes d'erreur de Supabase Auth : TOTP désactivé dans le projet. */
const CODES_MFA_DESACTIVEE = new Set(["mfa_totp_enroll_not_enabled", "mfa_totp_verify_not_enabled"]);

/** Codes d'erreur de Supabase Auth : le code saisi est faux ou périmé. */
const CODES_CODE_FAUX = new Set(["mfa_verification_failed", "mfa_verification_rejected", "mfa_challenge_expired"]);

export function mfaDesactivee(code: unknown): boolean {
  return typeof code === "string" && CODES_MFA_DESACTIVEE.has(code);
}

export function codeFaux(code: unknown): boolean {
  return typeof code === "string" && CODES_CODE_FAUX.has(code);
}

/** Réponse JSON sans cache (le secret TOTP et l'état de session ne se mettent jamais en cache). */
export function reponseMfa(corps: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(corps, { status, headers: { "Cache-Control": "no-store" } });
}
