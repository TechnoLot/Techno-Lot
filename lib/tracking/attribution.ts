// Attribution publicitaire côté navigateur (aucun import serveur).
// L'attribution est stockée dans localStorage ("tl_attr") pendant 30 jours.

export type Platform =
  | "meta"
  | "google"
  | "organic"
  | "referral"
  | "direct"
  | "email"
  | "other";

export type EventType =
  | "page_view"
  | "cta_click"
  | "form_view"
  | "form_start"
  | "form_submit";

export type Attribution = {
  id: string;
  platform: Platform;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  placement?: string;
  fbclid?: string;
  gclid?: string;
  landing_path?: string;
  referrer?: string;
  device?: "mobile" | "tablet" | "desktop";
  locale?: "fr" | "en";
};

const STORAGE_KEY = "tl_attr";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const META_SOURCES = ["facebook", "fb", "instagram", "ig", "meta"];
const PAID_MEDIUMS = ["cpc", "ppc", "paid", "paidsearch", "paid_search"];
const SEARCH_ENGINES =
  /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|qwant|brave|baidu|yandex)\./i;

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    /* repli ci-dessous */
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function detectDevice(): Attribution["device"] {
  try {
    const ua = navigator.userAgent;
    if (
      /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
      (/Android/i.test(ua) && !/Mobile/i.test(ua))
    ) {
      return "tablet";
    }
    if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  } catch {
    /* ignore */
  }
  return "desktop";
}

function detectLocale(): "fr" | "en" {
  try {
    const p = window.location.pathname;
    return p === "/en" || p.startsWith("/en/") ? "en" : "fr";
  } catch {
    return "fr";
  }
}

/** Y a-t-il des paramètres publicitaires dans l'URL courante ? */
function hasPaidParams(p: URLSearchParams): boolean {
  return [
    "fbclid",
    "gclid",
    "gbraid",
    "wbraid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
  ].some((k) => p.has(k));
}

function detectPlatform(p: URLSearchParams, referrerHost: string): Platform {
  const source = (p.get("utm_source") ?? "").toLowerCase();
  const medium = (p.get("utm_medium") ?? "").toLowerCase();

  if (p.has("fbclid") || META_SOURCES.includes(source)) return "meta";
  if (
    p.has("gclid") ||
    p.has("gbraid") ||
    p.has("wbraid") ||
    (source === "google" && PAID_MEDIUMS.includes(medium))
  ) {
    return "google";
  }
  if (medium === "email") return "email";
  if (source || medium) return "other";
  if (referrerHost) {
    return SEARCH_ENGINES.test(referrerHost) ? "organic" : "referral";
  }
  return "direct";
}

function clean(value: string | null, max: number): string | undefined {
  if (!value) return undefined;
  const v = value.trim().slice(0, max);
  return v || undefined;
}

function buildFromUrl(): Attribution {
  const p = new URLSearchParams(window.location.search);
  // Référent : nom d'hôte seulement (ex. « www.google.com »), jamais le
  // chemin ni les paramètres. Fixé à la première visite avec l'attribution.
  let referrerHost = "";
  try {
    if (document.referrer) {
      const u = new URL(document.referrer);
      if (u.hostname !== window.location.hostname) {
        referrerHost = u.hostname.slice(0, 255);
      }
    }
  } catch {
    /* referrer illisible */
  }

  return {
    id: uuid(),
    platform: detectPlatform(p, referrerHost),
    utm_source: clean(p.get("utm_source"), 300),
    utm_medium: clean(p.get("utm_medium"), 300),
    utm_campaign: clean(p.get("utm_campaign"), 300),
    utm_content: clean(p.get("utm_content"), 300),
    utm_term: clean(p.get("utm_term"), 300),
    campaign_id: clean(
      p.get("campaign_id") ?? p.get("gad_campaignid") ?? p.get("utm_id"),
      100,
    ),
    adset_id: clean(p.get("adset_id"), 100),
    ad_id: clean(p.get("ad_id"), 100),
    placement: clean(p.get("placement"), 100),
    fbclid: clean(p.get("fbclid"), 500),
    gclid: clean(p.get("gclid") ?? p.get("gbraid") ?? p.get("wbraid"), 500),
    // Page d'arrivée : chemin seul, sans paramètres ni ancre.
    landing_path: window.location.pathname.slice(0, 500),
    referrer: referrerHost || undefined,
    device: detectDevice(),
    locale: detectLocale(),
  };
}

function readStored(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { exp?: number; attr?: Attribution };
    if (!parsed?.attr?.id || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed.attr;
  } catch {
    return null;
  }
}

function store(attr: Attribution): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ exp: Date.now() + TTL_MS, attr }),
    );
  } catch {
    /* localStorage indisponible */
  }
}

// Repli en mémoire si localStorage est bloqué.
let memoryAttr: Attribution | null = null;

/** L'attribution stockée correspond-elle aux paramètres de l'URL actuelle ? */
function sameParams(a: Attribution, p: URLSearchParams): boolean {
  const trim = (k: string, max: number) => (p.get(k) ?? "").trim().slice(0, max);
  return (
    (a.fbclid ?? "") === trim("fbclid", 500) &&
    (a.gclid ?? "") ===
      (trim("gclid", 500) || trim("gbraid", 500) || trim("wbraid", 500)) &&
    (a.utm_source ?? "") === trim("utm_source", 300) &&
    (a.utm_campaign ?? "") === trim("utm_campaign", 300) &&
    (a.utm_content ?? "") === trim("utm_content", 300) &&
    (a.ad_id ?? "") === trim("ad_id", 100)
  );
}

/**
 * Retourne l'attribution courante. Une visite avec paramètres pub remplace
 * l'attribution existante (last-click payant) ; sinon on garde l'existante.
 */
export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const stored = readStored() ?? memoryAttr;

    if (stored && (!hasPaidParams(params) || sameParams(stored, params))) {
      return stored;
    }
    const fresh = buildFromUrl();
    memoryAttr = fresh;
    store(fresh);
    return fresh;
  } catch {
    return memoryAttr;
  }
}

/** Envoie un événement à /api/track (sendBeacon, repli fetch keepalive). */
export function sendEvent(type: EventType, path?: string): void {
  if (typeof window === "undefined") return;
  try {
    const session = getAttribution();
    if (!session) return;
    const body = JSON.stringify({
      session,
      event: { type, path: (path ?? window.location.pathname).slice(0, 500) },
    });
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon("/api/track", blob)) return;
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* le tracking ne doit jamais casser le site */
  }
}

/** Raccourci pour les composants : trackEvent("cta_click"). */
export function trackEvent(type: EventType): void {
  sendEvent(type);
}

export type CtaLabel = "soumission" | "tel" | "mailto";

/**
 * Type d'appel à l'action d'un lien, ou null s'il n'en est pas un :
 * lien interne vers /soumission ou /en/soumission, tel: ou mailto:.
 */
export function ctaLabelFor(link: HTMLAnchorElement): CtaLabel | null {
  try {
    const href = link.getAttribute("href") ?? "";
    if (/^\s*tel:/i.test(href)) return "tel";
    // Partage par courriel (mailto: sans destinataire) : pas un contact.
    if (/^\s*mailto:\s*(\?|$)/i.test(href)) return null;
    if (/^\s*mailto:/i.test(href)) return "mailto";
    const u = new URL(link.href, window.location.href);
    if (u.origin !== window.location.origin) return null;
    const path = u.pathname.replace(/\/+$/, "");
    return path === "/soumission" || path === "/en/soumission"
      ? "soumission"
      : null;
  } catch {
    return null;
  }
}
