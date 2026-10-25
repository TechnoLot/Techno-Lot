import type { Locale } from "@/lib/i18n";

/**
 * Textes de la page d'accueil « le centre de données ».
 *
 * Tout vient de ce qui est déjà publié sur le site (accueil, page « Ce que
 * nous rachetons », prise en charge, clause de paiement) ou de ce que
 * l'utilisateur a confirmé (destruction des données avec certificat).
 * Règles : aucun chiffre inventé, aucun tiret cadratin, « paiement rapide et
 * garanti » plutôt que « avant notre départ », un seul libellé d'action.
 */
export type HomeContent = {
  hero: {
    titleStart: string;
    titleAccent: string;
    sub: string;
    cta: string;
    logoLine: [string, string];
    videoLabel: string;
  };
  range: {
    title: string;
    intro: string;
    items: { key: string; name: string; desc: string; alt: string }[];
    more: string;
    cta: string;
  };
  steps: {
    title: string;
    intro: string;
    list: { title: string; text: string }[];
    data: string;
  };
  peak: {
    lead: string;
    leadText: string;
    titleStart: string;
    titleAccent: string;
    sub: string;
    cta: string;
  };
  close: {
    title: string;
    text: string;
    contactLabels: { phone: string; email: string; address: string; delay: string };
    delayValue: string;
    unique: string;
  };
};

const fr: HomeContent = {
  hero: {
    titleStart: "Vos lots informatiques ont",
    titleAccent: "de la valeur",
    sub: "On donne une seconde vie à votre matériel, et on vous paie pour ça.",
    cta: "Faire une soumission",
    logoLine: ["Rachat de lots informatiques et électroniques", "Unique au Québec"],
    videoLabel: "Une allée de serveurs, voyants verts allumés, dans un centre de données",
  },
  range: {
    title: "Ce que nous rachetons",
    intro:
      "Du poste de travail au centre de données : Techno Lot valorise tout votre matériel informatique et électronique.",
    items: [
      {
        key: "serveurs",
        name: "Serveurs",
        desc: "Quand ils deviennent obsolètes ou que vous passez au nuage.",
        alt: "Un serveur 2U en baie, façade à tiroirs de disques",
      },
      {
        key: "portables",
        name: "Portables",
        desc: "Même les machines plus anciennes peuvent être valorisées.",
        alt: "Un ordinateur portable ouvert, écran éteint",
      },
      {
        key: "reseau",
        name: "Réseau",
        desc: "Routeurs, commutateurs, pare\u2011feu.",
        alt: "Un commutateur réseau avec quelques câbles branchés",
      },
      {
        key: "stockage",
        name: "Stockage",
        desc: "Disques durs, SSD, baies de stockage.",
        alt: "Une pile de disques durs et un SSD",
      },
      {
        key: "ecrans",
        name: "Écrans",
        desc: "Pour un poste ou des configurations multi-écrans.",
        alt: "Un moniteur de bureau sur son pied, écran éteint",
      },
      {
        key: "postes",
        name: "Postes de travail",
        desc: "Ordinateurs fixes, du poste unique au parc complet.",
        alt: "Un petit ordinateur de bureau, boîtier noir",
      },
    ],
    more: "Et aussi : télécommunication, bureautique, tablettes, composants, audio et vidéo.",
    cta: "Faire une soumission",
  },
  steps: {
    title: "Comment ça marche",
    intro: "De la soumission au paiement, en quatre étapes.",
    list: [
      {
        title: "Vous faites une soumission",
        text: "Décrivez votre matériel et joignez des photos.",
      },
      {
        title: "On vous répond en 24 heures",
        text: "Réponse garantie dans un délai de 24 heures.",
      },
      {
        title: "On vient tout chercher",
        text: "Ramassage gratuit : notre équipe se rend sur place pour emballer, charger et transporter le matériel.",
      },
      {
        title: "Vous êtes payé",
        text: "La moitié au ramassage, le solde sans délai après l'inspection (15 jours ouvrables au maximum).",
      },
    ],
    data: "Vos données sont détruites et un certificat de destruction vous est remis.",
  },
  peak: {
    lead: "On s'occupe de tout.",
    leadText:
      "Notre équipe se rend sur place pour emballer, charger et transporter le matériel.",
    titleStart: "Votre espace est",
    titleAccent: "libre.",
    sub: "Ramassage gratuit, paiement rapide et garanti, données détruites avec certificat.",
    cta: "Faire une soumission",
  },
  close: {
    title: "Obtenez votre estimation gratuite",
    text: "Pour une estimation sur mesure du rachat de votre matériel technologique, remplissez ce formulaire. Réponse en 24 heures.",
    contactLabels: {
      phone: "Téléphone",
      email: "Courriel",
      address: "Adresse",
      delay: "Délai de réponse",
    },
    delayValue: "24 heures maximum",
    unique: "Techno Lot est une entreprise unique au Québec, spécialisée dans le rachat de lots de produits électroniques et informatiques.",
  },
};

const en: HomeContent = {
  hero: {
    titleStart: "Your IT equipment lots have",
    titleAccent: "real value",
    sub: "We give your equipment a second life, and we pay you for it.",
    cta: "Get a quote",
    logoLine: ["Buyback of IT and electronic equipment lots", "One of a kind in Québec"],
    videoLabel: "An aisle of servers with green status lights in a data centre",
  },
  range: {
    title: "What we buy",
    intro:
      "From workstations to data centres: Techno Lot values all your IT and electronic equipment.",
    items: [
      {
        key: "serveurs",
        name: "Servers",
        desc: "When they become obsolete or you move to the cloud.",
        alt: "A 2U rack server with a front row of drive bays",
      },
      {
        key: "portables",
        name: "Laptops",
        desc: "Even older machines can be valued.",
        alt: "An open laptop with its screen off",
      },
      {
        key: "reseau",
        name: "Networking",
        desc: "Routers, switches, firewalls.",
        alt: "A network switch with a few cables plugged in",
      },
      {
        key: "stockage",
        name: "Storage",
        desc: "Hard drives, SSDs, storage arrays.",
        alt: "A stack of hard drives and an SSD",
      },
      {
        key: "ecrans",
        name: "Monitors",
        desc: "For a single workstation or multi-screen setups.",
        alt: "An office monitor on its stand, screen off",
      },
      {
        key: "postes",
        name: "Desktops",
        desc: "From a single workstation to a whole fleet.",
        alt: "A small black desktop computer",
      },
    ],
    more: "Also: telecommunications, office equipment, tablets, components, audio and video.",
    cta: "Get a quote",
  },
  steps: {
    title: "How it works",
    intro: "From quote to payment, in four steps.",
    list: [
      {
        title: "You request a quote",
        text: "Describe your equipment and attach photos.",
      },
      {
        title: "We reply within 24 hours",
        text: "Guaranteed response within 24 hours.",
      },
      {
        title: "We pick everything up",
        text: "Free pickup: our team comes on site to pack, load and transport the equipment.",
      },
      {
        title: "You get paid",
        text: "Half at pickup, the balance immediately after inspection (up to 15 business days).",
      },
    ],
    data: "Your data is destroyed and you receive a certificate of destruction.",
  },
  peak: {
    lead: "We take care of everything.",
    leadText: "Our team comes on site to pack, load and transport the equipment.",
    titleStart: "Your space is",
    titleAccent: "free.",
    sub: "Free pickup, fast and guaranteed payment, data destroyed with a certificate.",
    cta: "Get a quote",
  },
  close: {
    title: "Get your free estimate",
    text: "For a customized estimate of your technology equipment buyback, fill out this form. Response within 24 hours.",
    contactLabels: {
      phone: "Phone",
      email: "Email",
      address: "Address",
      delay: "Response time",
    },
    delayValue: "24 hours maximum",
    unique: "Techno Lot is a one-of-a-kind company in Québec specializing in the purchase of electronic and IT equipment lots.",
  },
};

export function getHomeContent(locale: Locale): HomeContent {
  return locale === "en" ? en : fr;
}
