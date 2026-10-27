import type { CSSProperties } from "react";

type WordRevealProps = {
  text: string;
  className?: string;
  /** Mots (index, base 0) colorés en vert accent (text-emerald, s'adapte au thème) */
  accentWords?: number[];
  /** Délai de départ en secondes */
  delay?: number;
  /** Écart entre deux mots en secondes */
  stagger?: number;
  as?: "h1" | "h2" | "p" | "span";
};

/**
 * Titre révélé mot par mot (montée masquée). Animation en CSS pur (.hero-word dans
 * app/site.css) : elle démarre dès le premier affichage, sans attendre le
 * JavaScript — utilisable au-dessus de la ligne de flottaison sans nuire au LCP.
 * Composant serveur ; mouvement réduit respecté par la feuille de style.
 */
export function WordReveal({
  text,
  className,
  accentWords = [],
  delay = 0.15,
  stagger = 0.08,
  as: Tag = "h1",
}: WordRevealProps) {
  const words = text.split(" ");
  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`inline-block overflow-hidden pb-1 align-bottom ${i < words.length - 1 ? "me-[0.28em]" : ""}`}
        >
          <span
            className={`hero-word inline-block ${accentWords.includes(i) ? "text-emerald" : ""}`}
            style={{ "--d": `${(delay + i * stagger).toFixed(2)}s` } as CSSProperties}
          >
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}
