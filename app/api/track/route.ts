import { ipClient } from "@/lib/securite/ip";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { limiter, TABLE_LIMITES } from "@/lib/securite/limite";
import { lireJson } from "@/lib/securite/requete";
import { clientRpc, secretRpc } from "@/lib/securite/rpc";
import { nettoyerChaine, SchemaSuivi } from "@/lib/tracking/attribution-schema";

export const runtime = "nodejs";

/** Un événement de suivi pèse moins de 3 Ko (sendBeacon, application/json). */
const TAILLE_MAX = 4_096;
const BOT_RE = /bot|crawler|spider|lighthouse|headless/i;

const noContent = () => new Response(null, { status: 204 });

/**
 * POST /api/track — suivi des pubs (public, voulu).
 * Toujours 204 (rien à apprendre pour un robot), sauf corps refusé avant
 * lecture (411/413/415). Écriture par la fonction à secret
 * `suivi_pub_enregistrer` (plafonds par session et par minute en SQL).
 */
export async function POST(request: Request) {
  // En local (npm run dev) et sur les Preview Vercel, rien n'est enregistré :
  // la base est celle de la production et les visites de test fausseraient
  // les statistiques.
  if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
    return noContent();
  }

  try {
    if (BOT_RE.test(request.headers.get("user-agent") ?? "")) return noContent();

    const lu = await lireJson<unknown>(request, TAILLE_MAX);
    if (!lu.ok) return lu.reponse;

    // 120 / min par IP ; au-delà : 204 silencieux, rien d'enregistré (journal
    // sur la sortie standard seulement : un flot de suivi ne remplit pas la base).
    const regle = TABLE_LIMITES.suiviIpMinute;
    const v = await limiter(regle.route, ipClient(request), regle.fenetreSecondes, regle.max);
    if (!v.permis) {
      void journaliser(EVENEMENTS.limiteDepassee, {
        resultat: "refus",
        request,
        statut: 204,
        durable: false,
        details: { regle: regle.route, attente: v.attente },
      });
      return noContent();
    }

    const parse = SchemaSuivi.safeParse(lu.donnees);
    if (!parse.success) return noContent();
    const { session: s, event } = parse.data;

    const secret = secretRpc();
    const sb = clientRpc();
    if (!secret || !sb) return noContent();

    const { error } = await sb.rpc("suivi_pub_enregistrer", {
      p_secret: secret,
      p_session: {
        id: s.id,
        platform: s.platform,
        utm_source: nettoyerChaine(s.utm_source, 300),
        utm_medium: nettoyerChaine(s.utm_medium, 300),
        utm_campaign: nettoyerChaine(s.utm_campaign, 300),
        utm_content: nettoyerChaine(s.utm_content, 300),
        utm_term: nettoyerChaine(s.utm_term, 300),
        campaign_id: nettoyerChaine(s.campaign_id, 100),
        adset_id: nettoyerChaine(s.adset_id, 100),
        ad_id: nettoyerChaine(s.ad_id, 100),
        placement: nettoyerChaine(s.placement, 100),
        fbclid: nettoyerChaine(s.fbclid, 500),
        gclid: nettoyerChaine(s.gclid, 500),
        landing_path: nettoyerChaine(s.landing_path, 500),
        referrer: nettoyerChaine(s.referrer, 500),
        device: s.device ?? null,
        locale: s.locale === "en" ? "en" : "fr",
      },
      p_type: event.type,
      p_path: nettoyerChaine(event.path, 500),
    });
    if (error) {
      void journaliser(EVENEMENTS.erreur5xx, {
        resultat: "echec",
        request,
        durable: false,
        details: { etape: "suivi_pub_enregistrer", errcode: error.code },
      });
    }
  } catch {
    // Le suivi ne doit jamais renvoyer d'erreur au navigateur.
  }
  return noContent();
}
