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
    return [
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
