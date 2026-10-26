"use client";

import Script from "next/script";

const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GOOGLE_LEAD_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL;

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
  } catch {
    /* ne jamais bloquer le formulaire */
  }
}

/** Charge Meta Pixel / Google tag seulement si les variables d'env existent. */
export default function AdPixels() {
  if (!META_ID && !GOOGLE_ID) return null;
  return (
    <>
      {META_ID && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_ID}');fbq('track','PageView');`}
        </Script>
      )}
      {GOOGLE_ID && (
        <>
          <Script
            id="gtag-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ID}`}
            strategy="lazyOnload"
          />
          <Script id="gtag-init" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${GOOGLE_ID}');`}
          </Script>
        </>
      )}
    </>
  );
}
