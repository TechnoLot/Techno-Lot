/**
 * Mode de la Content-Security-Policy publique (tout sauf /admin) :
 *  - "report-only" : le navigateur signale les violations (console) sans rien bloquer ;
 *  - "enforce" : la politique est imposée.
 * Même principe que la constante MODE_CSP de middleware.ts (CSP à nonce de
 * l'admin) : passer à "enforce" après une tournée des pages sans violation.
 */
const MODE_CSP = "enforce";

const ENTETE_CSP =
  MODE_CSP === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

/**
 * CSP des pages publiques. Pas de nonce : il obligerait à rendre chaque page
 * à la demande et casserait le cache statique (le LCP en dépend). Donc
 * 'unsafe-inline' pour les scripts en ligne de Next (différents par page) et
 * les styles (CSS critique en ligne, attributs style de React). La politique
 * bloque quand même les scripts d'autres domaines, l'envoi de données hors de
 * la liste, <base>, <object>, l'encadrement par un autre site et les
 * formulaires externes.
 * Origines tierces : pixels Meta et Google (chargés seulement si leurs
 * variables NEXT_PUBLIC_* existent) et le repli du blogue Soro
 * (components/SoroBlogEmbed.tsx : script + lecture des articles sur
 * app.trysoro.com ; ses images viennent d'un stockage https).
 */
const cspPublique = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://app.trysoro.com https://connect.facebook.net https://www.googletagmanager.com https://*.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://app.trysoro.com https://www.facebook.com https://connect.facebook.net https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://googleads.g.doubleclick.net https://www.googleadservices.com https://pagead2.googlesyndication.com https://www.google.com https://www.google.ca",
  "frame-src https://td.doubleclick.net https://www.googletagmanager.com https://www.facebook.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Sert de l'AVIF en priorité (≈20-30 % plus léger que le WebP), puis
    // WebP en repli pour les navigateurs plus anciens.
    formats: ["image/avif", "image/webp"],
    // Cache les images optimisées 30 jours côté navigateur/CDN.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Images des articles Soro (stockage Supabase de Soro) : seul ce chemin
    // passe par l'optimiseur (voir components/blog/PostImage.tsx).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "afocirmbqdxnkyescnev.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/featured-images/**",
      },
    ],
  },
  experimental: {
    // N'importe que les icônes/animations réellement utilisées au lieu de
    // charger tout le paquet — allège le JavaScript envoyé au navigateur.
    optimizePackageImports: ["lucide-react", "framer-motion"],
    // Next 15 ne réutilise plus les pages dynamiques déjà visitées (0 s) :
    // on garde les 30 s de Next 14 pour que l'admin ne recharge pas tout
    // à chaque clic (les actions serveur invalident déjà ce cache).
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    // Headers de sécurité appliqués à toutes les réponses.
    // CSP : publique ci-dessous ; celle de /admin (à nonce) est posée par
    // middleware.ts ; les outils encadrés …/embed posent la leur.
    const securityHeaders = [
      {
        // Sans « preload » : l'inscription à la liste de préchargement des
        // navigateurs est quasi irréversible (à décider séparément).
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      // SAMEORIGIN (pas DENY) : l'admin encadre ses propres outils (…/embed).
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
    ];

    // Données privées : jamais gardées par le navigateur ni un cache partagé.
    const sansCache = [{ key: "Cache-Control", value: "no-store" }];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Tout sauf /admin et /admin/… (la CSP de l'admin vient du middleware).
        source: "/((?!admin(?:/|$)).*)",
        headers: [{ key: ENTETE_CSP, value: cspPublique }],
      },
      { source: "/api/admin/:path*", headers: sansCache },
      { source: "/admin/:segments*/api/:rest*", headers: sansCache },
      { source: "/api/cron/:path*", headers: sansCache },
      {
        // Photos et logo servis depuis /public : contenu stable, on
        // autorise un cache navigateur/CDN d'un an.
        source: "/:path(photos/.*|logo\\.png|favicon\\.ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
