import type { Locale } from "@/lib/i18n";
import { getHomeContent } from "@/lib/home-content";
import { getAccueil } from "./contenu";

/**
 * Textes des chapitres Stats, SecondeVie, Rachetons et AppelFinal (FR + EN).
 *
 * Faits confirmés seulement : réponse garantie en 24 h, ramassage et transport
 * gratuits partout au Québec, la moitié du paiement au ramassage et le solde
 * sans délai après l'inspection. Aucun tiret cadratin, aucun chiffre inventé.
 * Jamais de mention de revente par Techno Lot : on parle du bénéfice pour le client.
 * Les catégories rachetées viennent de `lib/home-content.ts` (clé `range`),
 * l'appel final de `./contenu.ts`.
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
  /** Page qui détaille l'engagement (chemin non localisé) et libellé du lien. */
  href: string;
  lien: string;
};

export type CategorieKey = "serveurs" | "portables" | "ecrans" | "reseau" | "stockage" | "postes";

export type Categorie = { key: CategorieKey; name: string; desc: string; image: string };

export type ChapitresContenu = {
  stats: {
    title: string;
    subtitle: string;
    items: Engagement[];
    /** Libellés de la barre de paiement (première moitié, solde). */
    barre: { debut: string; fin: string };
  };
  secondeVie: { lead: string; accent: string; text: string; imageAlt: string };
  rachetons: {
    titleStart: string;
    titleAccent: string;
    intro: string;
    items: Categorie[];
    more: string;
    moreLink: string;
  };
  appelFinal: { title: string; subtitle: string; button: string };
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

const textes: Record<
  Locale,
  {
    stats: ChapitresContenu["stats"];
    secondeVie: ChapitresContenu["secondeVie"];
    rachetons: { moreLink: string };
  }
> = {
  fr: {
    stats: {
      title: "Nos engagements",
      subtitle: "Trois promesses tenues à chaque lot, petit ou grand.",
      items: [
        {
          key: "reponse",
          value: 24,
          unit: "h",
          spoken: `24${NBSP}h`,
          title: "Réponse garantie",
          caption: "Votre lot est évalué en 24 heures, partout au Québec.",
          href: "/soumission",
          lien: "Faire une soumission",
        },
        {
          key: "ramassage",
          text: "0",
          unit: "$",
          spoken: `0${NBSP}$`,
          title: "Ramassage gratuit",
          caption: "Aucuns frais de ramassage ni de transport.",
          href: "/prise-en-charge-complete",
          lien: "Notre prise en charge",
        },
        {
          key: "paiement",
          value: 50,
          unit: "%",
          spoken: `50${NBSP}%`,
          title: "Payé au ramassage",
          caption: "Le solde sans délai après l'inspection.",
          href: "/consultation",
          lien: "Les étapes du paiement",
        },
      ],
      barre: { debut: "Ramassage", fin: "Inspection" },
    },
    secondeVie: {
      lead: "Chaque appareil mérite",
      accent: "une seconde vie.",
      text: `Faire affaire avec Techno Lot, c'est réduire votre empreinte carbone${NBSP}: moins de déchets électroniques, des ressources naturelles préservées et de la valeur récupérée pour vous.`,
      imageAlt: "Ordinateur portable posé sur de la mousse, avec une jeune pousse verte",
    },
    rachetons: { moreLink: "Tout ce que nous rachetons" },
  },
  en: {
    stats: {
      title: "Our commitments",
      subtitle: "Three promises we keep on every lot, big or small.",
      items: [
        {
          key: "reponse",
          value: 24,
          unit: "h",
          spoken: `24${NBSP}h`,
          title: "Guaranteed response",
          caption: "Your lot is appraised within 24 hours, anywhere in Québec.",
          href: "/soumission",
          lien: "Get a quote",
        },
        {
          key: "ramassage",
          text: "0",
          unit: "$",
          unitBefore: true,
          spoken: "$0",
          title: "Free pickup",
          caption: "No pickup or transport fees.",
          href: "/prise-en-charge-complete",
          lien: "How pickup works",
        },
        {
          key: "paiement",
          value: 50,
          unit: "%",
          spoken: "50%",
          title: "Paid at pickup",
          caption: "The balance right after inspection.",
          href: "/consultation",
          lien: "Payment steps",
        },
      ],
      barre: { debut: "Pickup", fin: "Inspection" },
    },
    secondeVie: {
      lead: "Every device deserves",
      accent: "a second life.",
      text: "Working with Techno Lot reduces your carbon footprint: less electronic waste, preserved natural resources and value recovered for you.",
      imageAlt: "A laptop resting on moss, with a young green sprout",
    },
    rachetons: { moreLink: "Everything we buy" },
  },
};

export function getChapitres(locale: Locale): ChapitresContenu {
  const t = textes[locale];
  const { range } = getHomeContent(locale);
  const { appelFinal } = getAccueil(locale);

  const items = CATEGORIES.map(({ key, image }) => {
    const item = range.items.find((i) => i.key === key);
    return { key, image, name: item?.name ?? key, desc: item?.desc ?? "" };
  });

  return {
    stats: { ...t.stats, items: [...t.stats.items] },
    secondeVie: { ...t.secondeVie },
    rachetons: {
      titleStart: range.titleStart,
      titleAccent: range.titleAccent,
      intro: range.intro,
      items,
      more: range.more,
      moreLink: t.rachetons.moreLink,
    },
    appelFinal,
  };
}
