// Conversion « Lead » des pixels publicitaires, sans next/script : le formulaire
// n'embarque plus AdPixels (chargé par le layout) dans son propre fichier JS.
// Mêmes variables d'environnement que components/tracking/AdPixels.tsx.

const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GOOGLE_LEAD_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

type PixelWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

/** Déclenche la conversion « Lead » sur les pixels configurés. */
export function trackLeadConversion(): void {
  try {
    const w = window as PixelWindow;
    if (META_ID && w.fbq) w.fbq("track", "Lead");
    if (GOOGLE_ID && GOOGLE_LEAD_LABEL && w.gtag) {
      w.gtag("event", "conversion", {
        send_to: `${GOOGLE_ID}/${GOOGLE_LEAD_LABEL}`,
      });
    }
    if (GA4_ID && w.gtag) {
      w.gtag("event", "generate_lead", { send_to: GA4_ID });
    }
  } catch {
    /* ne jamais bloquer le formulaire */
  }
}
