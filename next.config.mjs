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
  },
  experimental: {
    // N'importe que les icônes/animations réellement utilisées au lieu de
    // charger tout le paquet — allège le JavaScript envoyé au navigateur.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    // Headers de sécurité appliqués à toutes les réponses.
    // Pas de CSP ici — elle peut casser du contenu (fonts, scripts inline
    // Next.js) et demande un test en Report-Only avant activation.
    const securityHeaders = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
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
