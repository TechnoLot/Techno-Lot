"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// Chemins seulement (pas lib/i18n) : l'en-tête de toutes les pages n'embarque pas les dictionnaires
import { locales, switchLocalePath, type Locale } from "@/lib/i18n-chemins";

type LangSwitcherProps = {
  currentLocale: Locale;
  label: string;
  /**
   * default : suit le thème de la section (tokens) ·
   * onDark : barre noire de l'en-tête ·
   * onGreen : aplat lime (pastille bleu nuit pour la langue active)
   */
  tone?: "default" | "onDark" | "onGreen";
};

/**
 * Sélecteur FR / EN en pilule — conserve la page courante. Sur écran tactile, chaque
 * langue reçoit une zone de toucher de 44 px (tl-hit, app/site.css) : FR s'étend à
 * gauche, EN à droite, et les deux se rejoignent au milieu de l'écart de 2 px.
 */
export function LangSwitcher({ currentLocale, label, tone = "default" }: LangSwitcherProps) {
  const pathname = usePathname() ?? "/";

  const wrap = {
    default: "border-line bg-surface",
    onDark: "border-white/15 bg-white/[0.04]",
    onGreen: "border-ink/15 bg-ink/10",
  }[tone];
  const active = {
    default: "bg-gradient-accent text-ink",
    onDark: "bg-gradient-accent text-ink",
    onGreen: "bg-night-900 text-paper",
  }[tone];
  const idle = {
    default: "text-moss hover:text-mist",
    onDark: "text-white/70 hover:bg-white/10 hover:text-white",
    onGreen: "text-ink/70 hover:text-ink",
  }[tone];

  return (
    <div role="group" aria-label={label} className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${wrap}`}>
      {locales.map((locale) => (
        <Link
          key={locale}
          href={switchLocalePath(pathname, locale)}
          hrefLang={locale === "fr" ? "fr-CA" : "en-CA"}
          lang={locale === "fr" ? "fr-CA" : "en-CA"}
          aria-current={locale === currentLocale ? "true" : undefined}
          className={`tl-hit rounded-full px-2.5 py-1 font-display text-xs font-bold uppercase tracking-wide transition-colors ${
            locale === currentLocale ? active : idle
          } ${locale === locales[0] ? "[--hit:-10px_-1px_-14px_-9px]" : "[--hit:-10px_-9px_-14px_-1px]"}`}
        >
          {locale}
        </Link>
      ))}
    </div>
  );
}
