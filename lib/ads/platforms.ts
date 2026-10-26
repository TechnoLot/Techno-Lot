/** Sources de trafic/leads : libellés et couleurs (partagé serveur + client). */
export type AdPlatform =
  | "meta"
  | "google"
  | "organic"
  | "referral"
  | "direct"
  | "email"
  | "other";

export const AD_PLATFORMS: Record<AdPlatform, { label: string; color: string }> = {
  meta: { label: "Meta (Facebook/Instagram)", color: "#7C9CF5" },
  google: { label: "Google Ads", color: "#E9B949" },
  organic: { label: "Organique", color: "#5ECB33" },
  direct: { label: "Direct", color: "#94A3B8" },
  referral: { label: "Référence", color: "#2DD4BF" },
  email: { label: "Courriel", color: "#C4A1F5" },
  other: { label: "Autre", color: "#64748B" },
};

export const AD_PLATFORM_ORDER: AdPlatform[] = [
  "meta",
  "google",
  "organic",
  "direct",
  "referral",
  "email",
  "other",
];

export function normalizePlatform(p: string | null | undefined): AdPlatform {
  return p && p in AD_PLATFORMS ? (p as AdPlatform) : "other";
}
