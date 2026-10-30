import { z } from "zod";
import { estRefus, exigerSessionMfaRoute } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { ipClient } from "@/lib/securite/ip";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { limiterSelon, reponse429, TABLE_LIMITES } from "@/lib/securite/limite";
import { CODE_TOTP, facteursTotp, type FacteurMfa } from "@/lib/securite/mfa";
import { lireJson } from "@/lib/securite/requete";
import { uuid } from "@/lib/securite/schemas";
import {
  codeFaux,
  MESSAGE_CODE_FORMAT,
  MESSAGE_CODE_INVALIDE,
  MESSAGE_MFA_DESACTIVEE,
  MESSAGE_TROP_DE_CODES,
  mfaDesactivee,
  reponseMfa,
} from "@/lib/admin/mfa-serveur";

export const runtime = "nodejs";

/**
 * POST /admin/auth/mfa/verification — code à 6 chiffres de l'application
 * d'authentification. Corps JSON :
 *  - `{ code, factorId }` : fin de l'activation (facteur non vérifié préparé
 *    par …/activation) ;
 *  - `{ code }` : connexion (facteur déjà vérifié).
 * Succès : `challengeAndVerify` donne une session aal2, dont les témoins sont
 * posés ici par le client serveur (`await createClient()` de la garde).
 *
 * Ordre (refus par défaut) :
 *  1. JSON ≤ 1 Ko et code = exactement 6 chiffres → sinon 400/415, AVANT tout
 *     appel à Supabase (session comprise) ;
 *  2. garde de session (origine du site, courriel de ADMIN_EMAILS, < 24 h ;
 *     aal1 suffit) ;
 *  3. limites : 5 essais / 5 min par compte ET par IP, comptés avant la
 *     vérification (5 codes faux → le 6e essai reçoit 429 + Retry-After) ;
 *  4. vérification par Supabase ; code faux → 401 + `auth.mfa_echec`.
 * Journal : `auth.mfa_active` (activation), `auth.connexion` niveau aal2.
 */

const TAILLE_MAX = 1_024;

const SchemaCode = z
  .object({
    code: z.string().regex(CODE_TOTP),
    factorId: uuid.optional(),
  })
  .strict();

export async function POST(request: Request) {
  const lu = await lireJson<unknown>(request, TAILLE_MAX);
  if (!lu.ok) return lu.reponse;
  const parse = SchemaCode.safeParse(lu.donnees);
  if (!parse.success) return reponseMfa({ error: MESSAGE_CODE_FORMAT }, 400);
  const { code, factorId } = parse.data;
  const activation = factorId !== undefined;

  const garde = await exigerSessionMfaRoute(request);
  if (estRefus(garde)) return garde;
  const { supabase, user, requestId } = garde;

  for (const [regle, cle] of [
    [TABLE_LIMITES.mfaCompte5min, user.id],
    [TABLE_LIMITES.mfaIp5min, ipClient(request)],
  ] as const) {
    const v = await limiterSelon(regle, cle, { request, requestId, userId: user.id });
    if (!v.permis) return reponse429(v.attente, MESSAGE_TROP_DE_CODES);
  }

  const { verifies, nonVerifies } = facteursTotp(user.factors);
  let candidats: FacteurMfa[];
  if (activation) {
    const facteur = nonVerifies.find((f) => f.id === factorId);
    if (!facteur || verifies.length > 0) {
      return reponseMfa({ error: "Cette activation n'est plus valide. Recharge la page." }, 409);
    }
    candidats = [facteur];
  } else {
    if (verifies.length === 0) {
      return reponseMfa({ error: "Aucune application d'authentification n'est activée. Recharge la page." }, 409);
    }
    candidats = verifies.slice(0, 5);
  }

  let derniereErreur: { code?: string; status?: number } | null = null;
  let reussi: FacteurMfa | null = null;
  try {
    for (const facteur of candidats) {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: facteur.id, code });
      if (!error) {
        reussi = facteur;
        break;
      }
      derniereErreur = { code: error.code ?? undefined, status: error.status };
      // Un autre facteur ne peut aider que si CE code était faux pour celui-ci.
      if (!codeFaux(error.code)) break;
    }
  } catch (err) {
    return reponseErreur(500, "Erreur interne. Réessaie plus tard.", { request, err, requestId, userId: user.id });
  }

  if (!reussi) {
    const errcode = derniereErreur?.code;
    if (mfaDesactivee(errcode)) {
      void journaliser(EVENEMENTS.erreur5xx, {
        resultat: "echec",
        request,
        requestId,
        userId: user.id,
        statut: 503,
        details: { operation: "mfa.verification", errcode },
      });
      return reponseMfa({ error: MESSAGE_MFA_DESACTIVEE }, 503);
    }
    if (derniereErreur?.status === 429) {
      void journaliser(EVENEMENTS.authMfaEchec, {
        resultat: "refus",
        request,
        requestId,
        userId: user.id,
        statut: 429,
        details: { mode: activation ? "activation" : "connexion", motif: "limite_supabase" },
      });
      return reponse429(60, MESSAGE_TROP_DE_CODES);
    }
    if (codeFaux(errcode)) {
      void journaliser(EVENEMENTS.authMfaEchec, {
        resultat: "echec",
        request,
        requestId,
        userId: user.id,
        statut: 401,
        details: { mode: activation ? "activation" : "connexion", errcode },
      });
      return reponseMfa({ error: MESSAGE_CODE_INVALIDE }, 401);
    }
    return reponseErreur(502, "Vérification impossible pour le moment. Réessaie.", {
      request,
      err: derniereErreur,
      requestId,
      userId: user.id,
    });
  }

  if (activation) {
    void journaliser(EVENEMENTS.authMfaActive, {
      resultat: "ok",
      request,
      requestId,
      userId: user.id,
      statut: 200,
      details: { facteur: reussi.id },
    });
  }
  void journaliser(EVENEMENTS.authConnexion, {
    resultat: "ok",
    request,
    requestId,
    userId: user.id,
    statut: 200,
    details: { methode: "totp", niveau: "aal2" },
  });

  return reponseMfa({ ok: true });
}
