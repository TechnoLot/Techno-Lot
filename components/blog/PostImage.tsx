import Image from "next/image";

/**
 * Image d'article : next/image pour les photos locales, <img> pour les images
 * Soro (domaine Supabase externe non déclaré dans next.config).
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
  if (!src) return <div className={`blog-img-fallback absolute inset-0 ${className}`} aria-hidden="true" />;
  if (src.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
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
