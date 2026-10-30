import { estRefus, exigerSessionMfaRoute } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { facteursTotp, NOM_FACTEUR_TOTP } from "@/lib/securite/mfa";
import { MESSAGE_MFA_DESACTIVEE, mfaDesactivee, reponseMfa } from "@/lib/admin/mfa-serveur";

export const runtime = "nodejs";

/**
 * POST /admin/auth/mfa/activation — prépare l'activation de la double
 * authentification : désinscrit d'abord un facteur TOTP non vérifié laissé par
 * un essai précédent, puis inscrit un nouveau facteur et renvoie le code QR
 * (image `data:` SVG) et la clé à saisir à la main.
 *
 * Garde : origine du site (CSRF), session de moins de 24 h d'un courriel de
 * ADMIN_EMAILS ; aal1 suffit (c'est la première activation). Refus si un
 * facteur VÉRIFIÉ existe déjà (409) : une session aal1 ne peut pas ajouter un
 * second appareil ; le changement d'appareil passe par Mon compte (aal2).
 * TOTP désactivé dans le projet Supabase → 503 avec le réglage à faire.
 */
export async function POST(request: Request) {
  const garde = await exigerSessionMfaRoute(request);
  if (estRefus(garde)) return garde;
  const { supabase, user, requestId } = garde;

  const { verifies, nonVerifies } = facteursTotp(user.factors);
  if (verifies.length > 0) {
    return reponseMfa({ error: "La double authentification est déjà activée. Recharge la page." }, 409);
  }

  try {
    for (const facteur of nonVerifies) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: facteur.id });
      if (error) {
        return reponseErreur(502, "Activation impossible pour le moment. Réessaie.", {
          request,
          err: error,
          requestId,
          userId: user.id,
        });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: NOM_FACTEUR_TOTP,
    });
    if (error || !data || data.type !== "totp") {
      if (mfaDesactivee(error?.code)) {
        void journaliser(EVENEMENTS.erreur5xx, {
          resultat: "echec",
          request,
          requestId,
          userId: user.id,
          statut: 503,
          details: { operation: "mfa.activation", errcode: error?.code },
        });
        return reponseMfa({ error: MESSAGE_MFA_DESACTIVEE }, 503);
      }
      return reponseErreur(502, "Activation impossible pour le moment. Réessaie.", {
        request,
        err: error ?? new Error("Réponse d'inscription inattendue"),
        requestId,
        userId: user.id,
      });
    }

    return reponseMfa({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  } catch (err) {
    return reponseErreur(500, "Erreur interne. Réessaie plus tard.", {
      request,
      err,
      requestId,
      userId: user.id,
    });
  }
}
