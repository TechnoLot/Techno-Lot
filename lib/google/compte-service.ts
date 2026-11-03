import "server-only";
import { createSign } from "crypto";
import { ErreurAffichable } from "@/lib/admin/erreur-affichable";

/**
 * Comptes de service Google Cloud (clé JSON) : lecture de la clé et jeton
 * d'accès signé (JWT RS256), sans paquet npm. Partagé par Google Ads
 * (lib/ads/google.ts) et Google Agenda (lib/ramassages/google-agenda.ts),
 * chacun avec son propre compte de service et sa variable d'environnement.
 */

export type CompteService = { client_email: string; private_key: string; token_uri?: string };

const URL_JETON = "https://oauth2.googleapis.com/token";

/** Clé JSON d'un compte de service : contenu brut du fichier ou encodé en base64 ; null si absente ou illisible. */
export function lireCompteService(brut: string | undefined): CompteService | null {
  const raw = brut?.trim();
  if (!raw) return null;
  for (const text of [raw, Buffer.from(raw, "base64").toString("utf8")]) {
    try {
      const json = JSON.parse(text) as Partial<CompteService>;
      if (json.client_email && json.private_key) return json as CompteService;
    } catch {
      // essaie le format suivant
    }
  }
  return null;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * Échange un formulaire OAuth contre un jeton d'accès Google. Messages français
 * seulement : la description brute de Google part au journal (detail).
 */
export async function demanderJeton(
  url: string,
  body: URLSearchParams,
): Promise<{ jeton: string; expireDansS: number }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ErreurAffichable("Impossible de joindre Google OAuth (erreur réseau).");
  }
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    if (json.error === "invalid_grant") {
      throw new ErreurAffichable(
        "Identifiants Google refusés (invalid_grant) : clé du compte de service supprimée, ou refresh token expiré/révoqué.",
      );
    }
    throw new ErreurAffichable(`Authentification Google refusée (${res.status}).`, {
      error: json.error,
      error_description: json.error_description,
    });
  }
  return { jeton: json.access_token, expireDansS: Number(json.expires_in) || 3600 };
}

// Jetons gardés en mémoire, par compte et par portée, jusqu'à une minute de leur expiration.
const jetons = new Map<string, { jeton: string; expire: number }>();

/**
 * Jeton d'accès signé avec la clé du compte de service (JWT RS256), réutilisé
 * tant qu'il reste valide (une heure chez Google). `variable` : nom de la
 * variable d'environnement de la clé, pour le message d'erreur.
 */
export async function jetonCompteService(sa: CompteService, scope: string, variable: string): Promise<string> {
  const cle = `${sa.client_email} ${scope}`;
  const garde = jetons.get(cle);
  if (garde && garde.expire > Date.now()) return garde.jeton;

  const tokenUri = sa.token_uri || URL_JETON;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
    JSON.stringify({ iss: sa.client_email, scope, aud: tokenUri, iat: now, exp: now + 3600 }),
  )}`;
  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  } catch {
    throw new ErreurAffichable(`Clé privée du compte de service Google illisible (${variable}).`);
  }
  const { jeton, expireDansS } = await demanderJeton(
    tokenUri,
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  );
  jetons.set(cle, { jeton, expire: Date.now() + Math.max(0, expireDansS - 60) * 1000 });
  return jeton;
}

/** Oublie les jetons gardés (après un refus 401 de l'API, et dans les tests). */
export function oublierJetons(): void {
  jetons.clear();
}
