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
export type StepIcon = "form" | "reply" | "pickup" | "pay";

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
    titleStart: string;
    titleAccent: string;
    intro: string;
    items: { key: string; name: string; desc: string; alt: string }[];
    more: string;
    cta: string;
  };
  steps: {
    title: string;
    intro: string;
    list: { title: string; text: string; fact: string; icon: StepIcon }[];
    data: string;
  };
  care: {
    titleStart: string;
    titleAccent: string;
    sub: string;
    videoAlt: string;
    replay: string;
    play: string;
    tabsLabel: string;
    simple: {
      tab: string;
      title: string;
      text: string;
      you: string;
      youItems: string[];
      us: string;
      usItems: string[];
    };
    efficace: { tab: string; title: string; text: string; flow: [string, string, string] };
    paiement: {
      tab: string;
      title: string;
      text: string;
      first: string;
      firstNote: string;
      second: string;
      secondNote: string;
    };
  };
  peak: {
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
    titleStart: "Ce que nous",
    titleAccent: "rachetons",
    intro:
      "Du poste de travail au centre de données\u00a0: Techno Lot valorise tout votre matériel informatique et électronique.",
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
    more: "Et aussi\u00a0: télécommunication, bureautique, tablettes, composants, audio et vidéo.",
    cta: "Faire une soumission",
  },
  steps: {
    title: "Notre fonctionnement",
    intro: "De la soumission au paiement\u00a0: une étape pour vous, trois pour nous.",
    list: [
      {
        title: "Vous faites une soumission",
        text: "Décrivez votre matériel et joignez des photos.",
        fact: "En ligne",
        icon: "form",
      },
      {
        title: "On vous répond en 24 heures",
        text: "Réponse garantie dans un délai de 24 heures.",
        fact: "24 h",
        icon: "reply",
      },
      {
        title: "On vient tout chercher",
        text: "Ramassage gratuit\u00a0: notre équipe se rend sur place pour emballer, charger et transporter le matériel.",
        fact: "Gratuit",
        icon: "pickup",
      },
      {
        title: "Vous êtes payé",
        text: "La moitié au ramassage, le solde sans délai après l'inspection (15 jours ouvrables au maximum).",
        fact: "Garanti",
        icon: "pay",
      },
    ],
    data: "Vos données sont détruites et un certificat de destruction vous est remis.",
  },
  care: {
    titleStart: "On s'occupe",
    titleAccent: "de tout.",
    sub: "Notre équipe se rend sur place pour emballer, charger et transporter le matériel.",
    videoAlt: "Le fourgon lettré Techno Lot arrêté dans une cour de chargement, de nuit.",
    replay: "Revoir l'arrivée",
    play: "Voir l'arrivée",
    tabsLabel: "Nos engagements",
    simple: {
      tab: "Simple",
      title: "Une seule étape pour vous",
      text: "Vous décrivez votre matériel en ligne, photos à l'appui. Nous nous chargeons du reste.",
      you: "Vous",
      youItems: ["La soumission en ligne"],
      us: "Techno Lot",
      usItems: [
        "La réponse en 24 heures",
        "L'emballage",
        "Le chargement",
        "Le transport",
        "La destruction des données, avec certificat",
      ],
    },
    efficace: {
      tab: "Efficace",
      title: "Ramassage gratuit, sur place",
      text: "Notre équipe se rend sur place pour emballer, charger et transporter le matériel, sans frais.",
      flow: ["Emballer", "Charger", "Transporter"],
    },
    paiement: {
      tab: "Paiement garanti",
      title: "Paiement rapide et garanti",
      text: "La moitié au ramassage, le solde sans délai après l'inspection.",
      first: "50 %",
      firstNote: "au ramassage",
      second: "50 %",
      secondNote: "après l'inspection, 15 jours ouvrables au maximum",
    },
  },
  peak: {
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
    titleStart: "What we",
    titleAccent: "buy",
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
    title: "How we work",
    intro: "From quote to payment: one step for you, three for us.",
    list: [
      {
        title: "You request a quote",
        text: "Describe your equipment and attach photos.",
        fact: "Online",
        icon: "form",
      },
      {
        title: "We reply within 24 hours",
        text: "Guaranteed response within 24 hours.",
        fact: "24 h",
        icon: "reply",
      },
      {
        title: "We pick everything up",
        text: "Free pickup: our team comes on site to pack, load and transport the equipment.",
        fact: "Free",
        icon: "pickup",
      },
      {
        title: "You get paid",
        text: "Half at pickup, the balance immediately after inspection (up to 15 business days).",
        fact: "Guaranteed",
        icon: "pay",
      },
    ],
    data: "Your data is destroyed and you receive a certificate of destruction.",
  },
  care: {
    titleStart: "We take care",
    titleAccent: "of everything.",
    sub: "Our team comes on site to pack, load and transport the equipment.",
    videoAlt: "The lettered Techno Lot van stopped in a loading yard at night.",
    replay: "Replay the arrival",
    play: "Play the arrival",
    tabsLabel: "Our commitments",
    simple: {
      tab: "Simple",
      title: "Only one step is yours",
      text: "You describe your equipment online, with photos. We handle the rest.",
      you: "You",
      youItems: ["The online quote request"],
      us: "Techno Lot",
      usItems: [
        "The reply within 24 hours",
        "Packing",
        "Loading",
        "Transport",
        "Data destruction, with a certificate",
      ],
    },
    efficace: {
      tab: "Efficient",
      title: "Free pickup, on site",
      text: "Our team comes on site to pack, load and transport the equipment, free of charge.",
      flow: ["Pack", "Load", "Transport"],
    },
    paiement: {
      tab: "Guaranteed payment",
      title: "Fast and guaranteed payment",
      text: "Half at pickup, the balance immediately after inspection.",
      first: "50%",
      firstNote: "at pickup",
      second: "50%",
      secondNote: "after inspection, within 15 business days at most",
    },
  },
  peak: {
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
