import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin/config";
import { origineConfiguree } from "@/lib/admin/origin";
import { cheminInterne } from "@/lib/securite/chemin-interne";
import { reponseErreur } from "@/lib/securite/erreurs";
import { ipClient } from "@/lib/securite/ip";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { limiterSelon, reponse429, TABLE_LIMITES } from "@/lib/securite/limite";
import { verifierTaille } from "@/lib/securite/requete";

export const runtime = "nodejs";

/**
 * POST /admin/auth/request — route PUBLIQUE (c'est la page de connexion).
 * Envoie un lien magique au courriel admin configuré (ADMIN_EMAILS[0]).
 * Le client ne fournit PAS l'adresse — c'est le serveur qui décide.
 *
 * Sécurité : corps ≤ 4 Ko ; 3 demandes / h par IP et 5 / h au total ;
 * `next` filtré par `cheminInterne` ; lien bâti sur l'origine CONFIGURÉE
 * (SITE_URL), jamais sur l'en-tête Host ; aucun compte créé ; aucun détail
 * de Supabase dans la réponse (journal seulement).
 */

const TAILLE_MAX = 4_096;
const MESSAGE_LIMITE = "Trop de demandes de lien. Réessaie plus tard ou connecte-toi avec ton mot de passe.";
const MESSAGE_ECHEC = "Impossible d'envoyer le lien pour l'instant. Réessaie plus tard.";

export async function POST(request: Request) {
  const requestId = randomUUID();

  const taille = verifierTaille(request, TAILLE_MAX);
  if (!taille.ok) return taille.reponse;

  const ip = ipClient(request);
  const parIp = await limiterSelon(TABLE_LIMITES.lienMagiqueIpHeure, ip, { request, requestId });
  if (!parIp.permis) return reponse429(parIp.attente, MESSAGE_LIMITE);
  const total = await limiterSelon(TABLE_LIMITES.lienMagiqueGlobalHeure, "global", {
    request,
    requestId,
  });
  if (!total.permis) return reponse429(total.attente, MESSAGE_LIMITE);

  const target = getAdminEmails()[0];
  if (!target) {
    return reponseErreur(503, "Service temporairement indisponible.", {
      request,
      requestId,
      err: { name: "ConfigurationManquante", message: "liste des courriels admin vide" },
    });
  }

  // Destination souhaitée après connexion : chemin /admin seulement.
  const form = await request.formData().catch(() => new FormData());
  const next = cheminInterne(form.get("next"));

  const supabase = await createClient();
  const redirectTo = `${origineConfiguree(request)}/admin/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: target,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (error) {
    void journaliser(EVENEMENTS.authLienMagique, {
      resultat: "echec",
      request,
      requestId,
      statut: error.status === 429 ? 429 : 502,
      details: { errcode: error.code ?? undefined, statut_source: error.status ?? undefined },
    });
    if (error.status === 429) {
      return reponse429(60, "Un lien vient d'être envoyé. Attends une minute avant d'en demander un autre.");
    }
    return reponseErreur(502, MESSAGE_ECHEC, { request, requestId, err: error });
  }

  void journaliser(EVENEMENTS.authLienMagique, {
    resultat: "ok",
    request,
    requestId,
    statut: 200,
  });
  return NextResponse.json({ ok: true, sent: true }, { headers: { "Cache-Control": "no-store" } });
}
