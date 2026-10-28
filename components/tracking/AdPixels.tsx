"use client";

import Script from "next/script";

const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GOOGLE_LEAD_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL;
// GA4 (désactivé par défaut) : partage le même gtag que Google Ads.
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
// Identifiant utilisé pour charger gtag.js (Google Ads en priorité).
const GTAG_ID = GOOGLE_ID || GA4_ID;

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

/** Charge Meta Pixel / Google tag (Ads, GA4) seulement si les variables d'env existent. */
export default function AdPixels() {
  if (!META_ID && !GTAG_ID) return null;
  return (
    <>
      {META_ID && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_ID}');fbq('track','PageView');`}
        </Script>
      )}
      {GTAG_ID && (
        <>
          <Script
            id="gtag-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`}
            strategy="lazyOnload"
          />
          <Script id="gtag-init" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());${GOOGLE_ID ? `gtag('config','${GOOGLE_ID}');` : ""}${GA4_ID ? `gtag('config','${GA4_ID}');` : ""}`}
          </Script>
        </>
      )}
    </>
  );
}
