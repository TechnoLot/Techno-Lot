import type { Locale } from "@/lib/i18n";

/**
 * Textes propres au héros de l'accueil qui ne sont pas dans lib/i18n.ts
 * (titre, sous-titre et boutons viennent de getDict(locale).hero).
 */
const CONTENU = {
  fr: {
    logoAlt: "Techno Lot",
    scrollLabel: "Faire défiler vers la suite",
  },
  en: {
    logoAlt: "Techno Lot",
    scrollLabel: "Scroll to the next section",
  },
} as const satisfies Record<Locale, { logoAlt: string; scrollLabel: string }>;

export function getContenuHero(locale: Locale) {
  return CONTENU[locale];
}
