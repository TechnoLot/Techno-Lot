"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Images Soro admises par l'optimiseur de Next : même domaine et même chemin que
 * `images.remotePatterns` dans next.config.mjs, formats que l'optimiseur sait lire.
 */
const SORO_OPTIMISABLE =
  /^https:\/\/afocirmbqdxnkyescnev\.supabase\.co\/storage\/v1\/object\/public\/featured-images\/[^?#]+\.(?:webp|avif|png|jpe?g)$/i;

/**
 * Image d'article : next/image (AVIF/WebP redimensionné) pour les photos locales
 * et les images Soro ; <img> brut pour toute autre adresse, ou en repli si
 * l'optimiseur échoue sur une image Soro.
 * Sans image : panneau de marque (lueur verte sur bleu nuit).
 */
export default function PostImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  // Adresse dont l'optimisation a échoué (repli sur l'image d'origine)
  const [echec, setEchec] = useState<string | null>(null);

  if (!src) return <div className={`blog-img-fallback absolute inset-0 ${className}`} aria-hidden="true" />;
  const local = src.startsWith("/");
  if (local || (SORO_OPTIMISABLE.test(src) && echec !== src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={local ? undefined : () => setEchec(src)}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
    />
  );
}
