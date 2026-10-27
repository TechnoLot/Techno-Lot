import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

type ButtonLinkProps = {
  /** Chemin DÉJÀ localisé (localePath(locale, "/soumission")), ou tel:/mailto:/https:// */
  href: string;
  children: ReactNode;
  className?: string;
  withArrow?: boolean;
  /** md (défaut) ou sm (en-tête, rangées serrées) */
  size?: "md" | "sm";
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  "aria-label"?: string;
};

const isExternal = (href: string) => /^(tel:|mailto:|https?:)/.test(href);

/** Lien interne via next/link, externe (tel:, mailto:, http) via <a>. */
function SmartLink({
  href,
  className,
  children,
  onClick,
  ariaLabel,
}: {
  href: string;
  className: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  ariaLabel?: string;
}) {
  if (isExternal(href)) {
    const blank = href.startsWith("http");
    return (
      <a
        href={href}
        className={className}
        onClick={onClick}
        aria-label={ariaLabel}
        {...(blank ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

/** Flèche qui glisse au survol (CSS .tl-btn-arrow dans app/site.css). */
function Arrow() {
  return <ArrowRight className="tl-btn-arrow" aria-hidden="true" />;
}

const cls = (variant: string, size: "md" | "sm", className?: string) =>
  `tl-btn tl-btn-${size} ${variant} ${className ?? ""}`;

/**
 * CTA principal, style de l'ancien site Techno Lot : pilule en dégradé
 * #5ECB33 → #34D399, libellé encre en majuscules espacées (Chakra Petch),
 * flèche qui glisse et lueur verte au survol, léger enfoncement à la pression.
 * Dans une section data-theme="lime" ou "green", il passe en bleu nuit, texte blanc.
 */
export function PrimaryButtonLink({ href, children, className, withArrow = true, size = "md", onClick, ...rest }: ButtonLinkProps) {
  return (
    <SmartLink href={href} onClick={onClick} ariaLabel={rest["aria-label"]} className={cls("tl-btn-primary", size, className)}>
      {children}
      {withArrow && <Arrow />}
    </SmartLink>
  );
}

/** CTA secondaire : pilule contour qui suit le thème de la section (border-line-strong, text-mist). */
export function GhostButtonLink({ href, children, className, withArrow = false, size = "md", onClick, ...rest }: ButtonLinkProps) {
  return (
    <SmartLink href={href} onClick={onClick} ariaLabel={rest["aria-label"]} className={cls("tl-btn-ghost", size, className)}>
      {children}
      {withArrow && <Arrow />}
    </SmartLink>
  );
}

/** CTA bleu nuit, texte blanc (pour fonds clairs, menthe ou lime) ; s'inverse en blanc sur les thèmes sombres. */
export function InkButtonLink({ href, children, className, withArrow = true, size = "md", onClick, ...rest }: ButtonLinkProps) {
  return (
    <SmartLink href={href} onClick={onClick} ariaLabel={rest["aria-label"]} className={cls("tl-btn-ink", size, className)}>
      {children}
      {withArrow && <Arrow />}
    </SmartLink>
  );
}

/**
 * Pilule blanche (bleu nuit sur thèmes clairs) avec pastille fléchée à droite ;
 * la pastille passe au dégradé vert et la flèche glisse au survol.
 */
export function PillArrowLink({ href, children, className, onClick, ...rest }: Omit<ButtonLinkProps, "withArrow" | "size">) {
  return (
    <SmartLink href={href} onClick={onClick} ariaLabel={rest["aria-label"]} className={`tl-btn tl-btn-pill ${className ?? ""}`}>
      {children}
      <span className="tl-btn-pill-dot">
        <Arrow />
      </span>
    </SmartLink>
  );
}
