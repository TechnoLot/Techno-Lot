import type { Locale } from "@/lib/i18n";
import { getHomeContent } from "@/lib/home-content";
import { getAccueil, type ServiceItem } from "./contenu";

/**
 * Textes des chapitres Stats, SecondeVie, Rachetons et AppelFinal (FR + EN).
 *
 * Faits confirmés seulement : réponse garantie en 24 h, ramassage et transport
 * gratuits partout au Québec, la moitié du paiement au ramassage et le solde
 * sans délai après l'inspection. Aucun tiret cadratin, aucun chiffre inventé.
 * Les catégories rachetées viennent de `lib/home-content.ts` (clé `range`),
 * les services et l'appel final de `./contenu.ts`.
 */

const NBSP = " ";

export type EngagementKey = "reponse" | "ramassage" | "paiement";

export type Engagement = {
  key: EngagementKey;
  /** Valeur animée (Counter). Absente : `text` est affiché tel quel. */
  value?: number;
  text?: string;
  unit: string;
  /** Unité avant le nombre (« $0 » en anglais). */
  unitBefore?: boolean;
  /** Lecture complète pour les lecteurs d'écran (« 24 h »). */
  spoken: string;
  title: string;
  caption: string;
};

export type CategorieKey = "serveurs" | "portables" | "ecrans" | "reseau" | "stockage" | "postes";

export type Categorie = { key: CategorieKey; name: string; desc: string; image: string };

export type ChapitresContenu = {
  stats: { title: string; items: Engagement[] };
  secondeVie: { lead: string; accent: string; text: string; imageAlt: string };
  rachetons: {
    titleStart: string;
    titleAccent: string;
    intro: string;
    items: Categorie[];
    more: string;
    moreLink: string;
    servicesLabel: string;
    services: ServiceItem[];
  };
  appelFinal: { title: string; subtitle: string; button: string; orCall: string };
};

/** Ordre d'affichage et image de chaque catégorie rachetée. */
const CATEGORIES: { key: CategorieKey; image: string }[] = [
  { key: "serveurs", image: "/images/services/serveur.webp" },
  { key: "portables", image: "/images/services/portable.webp" },
  { key: "ecrans", image: "/images/services/ecran.webp" },
  { key: "reseau", image: "/images/services/reseau.webp" },
  { key: "stockage", image: "/images/services/stockage.webp" },
  { key: "postes", image: "/images/palette/obj-tour.webp" },
];

/** Les quatre services repris en liens sous la liste. */
const SERVICES: ServiceItem["key"][] = ["soumission", "estimation", "prise-en-charge", "donnees"];

const textes: Record<
  Locale,
  {
    stats: ChapitresContenu["stats"];
    secondeVie: ChapitresContenu["secondeVie"];
    rachetons: { moreLink: string; servicesLabel: string };
  }
> = {
  fr: {
    stats: {
      title: "Nos engagements",
      items: [
        {
          key: "reponse",
          value: 24,
          unit: "h",
          spoken: `24${NBSP}h`,
          title: "Réponse garantie",
          caption: "Votre lot est évalué en 24 heures, partout au Québec.",
        },
        {
          key: "ramassage",
          text: "0",
          unit: "$",
          spoken: `0${NBSP}$`,
          title: "Ramassage gratuit",
          caption: "Aucuns frais de ramassage ni de transport.",
        },
        {
          key: "paiement",
          value: 50,
          unit: "%",
          spoken: `50${NBSP}%`,
          title: "Payé au ramassage",
          caption: "Le solde sans délai après l'inspection.",
        },
      ],
    },
    secondeVie: {
      lead: "Chaque appareil mérite",
      accent: "une seconde vie.",
      text: "Revendre votre matériel plutôt que le jeter, c'est réduire les déchets électroniques, préserver les ressources naturelles et récupérer de la valeur.",
      imageAlt: "Trois portables et deux écrans prêts pour une seconde vie",
    },
    rachetons: { moreLink: "Tout ce que nous rachetons", servicesLabel: "Nos services" },
  },
  en: {
    stats: {
      title: "Our commitments",
      items: [
        {
          key: "reponse",
          value: 24,
          unit: "h",
          spoken: `24${NBSP}h`,
          title: "Guaranteed response",
          caption: "Your lot is appraised within 24 hours, anywhere in Québec.",
        },
        {
          key: "ramassage",
          text: "0",
          unit: "$",
          unitBefore: true,
          spoken: "$0",
          title: "Free pickup",
          caption: "No pickup or transport fees.",
        },
        {
          key: "paiement",
          value: 50,
          unit: "%",
          spoken: "50%",
          title: "Paid at pickup",
          caption: "The balance right after inspection.",
        },
      ],
    },
    secondeVie: {
      lead: "Every device deserves",
      accent: "a second life.",
      text: "Reselling your equipment instead of throwing it away means less electronic waste, preserved natural resources and recovered value.",
      imageAlt: "Three laptops and two monitors ready for a second life",
    },
    rachetons: { moreLink: "Everything we buy", servicesLabel: "Our services" },
  },
};

export function getChapitres(locale: Locale): ChapitresContenu {
  const t = textes[locale];
  const { range } = getHomeContent(locale);
  const { services, appelFinal } = getAccueil(locale);

  const items = CATEGORIES.map(({ key, image }) => {
    const item = range.items.find((i) => i.key === key);
    return { key, image, name: item?.name ?? key, desc: item?.desc ?? "" };
  });

  return {
    stats: { title: t.stats.title, items: [...t.stats.items] },
    secondeVie: { ...t.secondeVie },
    rachetons: {
      titleStart: range.titleStart,
      titleAccent: range.titleAccent,
      intro: range.intro,
      items,
      more: range.more,
      moreLink: t.rachetons.moreLink,
      servicesLabel: t.rachetons.servicesLabel,
      services: SERVICES.map((key) => services.items.find((s) => s.key === key)).filter(
        (s): s is ServiceItem => Boolean(s),
      ),
    },
    appelFinal,
  };
}
