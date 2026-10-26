import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const EVENT_TYPES = ["page_view", "cta_click", "form_view", "form_start", "form_submit"];
const PLATFORMS = ["meta", "google", "organic", "referral", "direct", "email", "other"];
const DEVICES = ["mobile", "tablet", "desktop"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_RE = /bot|crawler|spider|lighthouse|headless/i;

const noContent = () => new Response(null, { status: 204 });

/** Chaîne tronquée, ou null si absente/vide. */
function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, max);
  return v || null;
}

export async function POST(request: Request) {
  try {
    if (BOT_RE.test(request.headers.get("user-agent") ?? "")) return noContent();

    const body = (await request.json()) as {
      session?: Record<string, unknown>;
      event?: { type?: unknown; path?: unknown };
    };
    const s = body?.session;
    const type = body?.event?.type;
    if (
      !s ||
      typeof s.id !== "string" ||
      !UUID_RE.test(s.id) ||
      typeof type !== "string" ||
      !EVENT_TYPES.includes(type)
    ) {
      return noContent();
    }

    const supabase = createClient();

    // Fonction SQL track_ad_event (SECURITY DEFINER) : crée la session si
    // nouvelle puis ajoute l'événement — anon n'a aucun droit de lecture,
    // donc pas d'upsert direct possible.
    const { error } = await supabase.rpc("track_ad_event", {
      p_session: {
        id: s.id,
        platform: PLATFORMS.includes(String(s.platform)) ? s.platform : "direct",
        utm_source: str(s.utm_source, 300),
        utm_medium: str(s.utm_medium, 300),
        utm_campaign: str(s.utm_campaign, 300),
        utm_content: str(s.utm_content, 300),
        utm_term: str(s.utm_term, 300),
        campaign_id: str(s.campaign_id, 100),
        adset_id: str(s.adset_id, 100),
        ad_id: str(s.ad_id, 100),
        placement: str(s.placement, 100),
        fbclid: str(s.fbclid, 500),
        gclid: str(s.gclid, 500),
        landing_path: str(s.landing_path, 500),
        referrer: str(s.referrer, 500),
        device: DEVICES.includes(String(s.device)) ? s.device : null,
        locale: s.locale === "en" ? "en" : "fr",
      },
      p_type: type,
      p_path: str(body.event?.path, 500),
    });
    if (error) console.error("[track] Erreur :", error);
  } catch (err) {
    console.error("[track] Exception :", err);
  }
  return noContent();
}
