import Image from "next/image";

/** Dimensions des fichiers public/logo-{clair,fonce}.png et public/logo-horizontal-{clair,fonce}.png. */
const FILES = {
  empile: { width: 640, height: 372, prefix: "/logo-" },
  horizontal: { width: 945, height: 239, prefix: "/logo-horizontal-" },
} as const;

type LogoProps = {
  /** clair = mot « TECHNO LOT » encre (fond blanc) ; fonce = mot blanc (fond noir) */
  variant?: "clair" | "fonce";
  /** empile = pictogramme au-dessus du mot ; horizontal = pictogramme à gauche (barre de navigation) */
  layout?: "empile" | "horizontal";
  /** Hauteur affichée en px (largeur calculée) */
  height?: number;
  priority?: boolean;
  /** eager : chargé tout de suite, sans la priorité haute ni le préchargement de `priority` */
  loading?: "eager" | "lazy";
  className?: string;
};

/** Logo officiel de Techno Lot (pictogramme vert + mot-symbole). Ne jamais le substituer. */
export function Logo({
  variant = "clair",
  layout = "empile",
  height = 52,
  priority = false,
  loading,
  className,
}: LogoProps) {
  const file = FILES[layout];
  const width = Math.round((height * file.width) / file.height);
  return (
    <Image
      src={`${file.prefix}${variant}.png`}
      alt="Techno Lot"
      width={width}
      height={height}
      priority={priority}
      loading={priority ? undefined : loading}
      className={className}
      style={{ width, height }}
    />
  );
}
