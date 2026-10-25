import type { Locale } from "@/lib/i18n";

/**
 * Textes de la page d'accueil (scène partagée avant / après).
 *
 * Règles : aucun chiffre qui ne soit pas déjà publié sur le site (24 h,
 * la moitié au ramassage, 15 jours ouvrables), aucun tiret cadratin,
 * « paiement rapide et garanti » plutôt que « avant notre départ ».
 */
export type HomeContent = {
  seam: { avant: string; apres: string; vous: string; nous: string };
  hero: {
    avant: string;
    title: string;
    sub: string;
    cta: string;
    label: string;
    lotAlt: string;
  };
  cost: {
    titleAvant: string;
    titleApres: string;
    rows: { avant: string; apres: string; photoAlt: string }[];
  };
  process: {
    titleVous: string;
    titleNous: string;
    steps: { vous: string; vousNote: string; nous: string; nousNote: string }[];
  };
  ledger: {
    title: string;
    titleDone: string;
    lines: { item: string; status: string }[];
    more: string;
    payment: { label: string; value: string }[];
    cta: string;
  };
  close: {
    title: string;
    text: string;
    unique: string;
    contactLabels: { phone: string; email: string; address: string; delay: string };
    delayValue: string;
  };
};

const fr: HomeContent = {
  seam: { avant: "Avant", apres: "Après", vous: "Vous", nous: "Nous" },
  hero: {
    avant: "Votre ancien matériel informatique dort dans un entrepôt.",
    title: "On le rachète.",
    sub: "Serveurs, portables, réseau, stockage : une offre en 24 heures, un ramassage gratuit et un paiement rapide et garanti.",
    cta: "Faire une soumission",
    label: "Un lot type : portables, réseau, serveurs et postes de travail, sur une palette.",
    lotAlt:
      "Une palette de matériel informatique usagé : portables, commutateurs réseau, serveurs et tours, empilés sous une lampe dans un entrepôt sombre.",
  },
  cost: {
    titleAvant: "Le garder coûte.",
    titleApres: "Le vendre rapporte.",
    rows: [
      {
        avant: "Il occupe un espace que vous payez chaque mois.",
        apres:
          "Notre équipe vient l'emballer, le charger et le transporter. Le ramassage est gratuit.",
        photoAlt: "Une palette de matériel usagé au fond d'un entrepôt vide.",
      },
      {
        avant: "Il perd de la valeur à chaque trimestre.",
        apres:
          "Envoyez des photos et votre inventaire : vous recevez notre offre dans un délai de 24 heures.",
        photoAlt:
          "Une trace de doigt dans la poussière, sur la façade d'un serveur.",
      },
      {
        avant: "Vos données sont toujours dessus.",
        apres:
          "Vos informations sensibles sont effacées de façon définitive avant la revente ou le recyclage.",
        photoAlt: "Un disque dur ouvert : le plateau et la tête de lecture.",
      },
    ],
  },
  process: {
    titleVous: "De votre côté, trois gestes.",
    titleNous: "Du nôtre, tout le reste.",
    steps: [
      {
        vous: "Décrivez votre lot.",
        vousNote: "Des photos, un inventaire Excel, PDF ou CSV.",
        nous: "Une offre en 24 heures.",
        nousNote: "Établie à partir de vos photos et de votre inventaire.",
      },
      {
        vous: "Acceptez l'offre.",
        vousNote: "L'estimation est gratuite et sans engagement.",
        nous: "On planifie le ramassage.",
        nousNote: "Les dates et la logistique sont coordonnées avec vous.",
      },
      {
        vous: "Ouvrez la porte.",
        vousNote: "On s'occupe du reste, sur place.",
        nous: "On emballe, on charge, on paie.",
        nousNote: "La moitié du paiement est versée sur place, au ramassage.",
      },
    ],
  },
  ledger: {
    title: "Votre lot, ligne par ligne.",
    titleDone: "Votre espace est libre.",
    lines: [
      { item: "Portables", status: "Rachetés" },
      { item: "Équipement réseau", status: "Racheté" },
      { item: "Serveurs", status: "Rachetés" },
      { item: "Postes de travail", status: "Rachetés" },
      { item: "Ramassage et transport", status: "Gratuits" },
    ],
    more: "Et tout le reste : écrans, stockage, téléphonie, bureautique, composants.",
    payment: [
      { label: "Au ramassage", value: "La moitié du paiement, sur place." },
      {
        label: "Après l'inspection",
        value: "Le solde, sans délai. L'inspection prend 15 jours ouvrables au maximum.",
      },
    ],
    cta: "Faire une soumission",
  },
  close: {
    title: "Obtenez votre offre en 24 heures.",
    text: "Décrivez votre lot et joignez des photos ou un inventaire. Vos informations restent confidentielles.",
    unique:
      "Techno Lot est une entreprise unique au Québec, spécialisée dans le rachat de lots informatiques et électroniques.",
    contactLabels: {
      phone: "Téléphone",
      email: "Courriel",
      address: "Adresse",
      delay: "Délai de réponse",
    },
    delayValue: "24 heures maximum",
  },
};

const en: HomeContent = {
  seam: { avant: "Before", apres: "After", vous: "You", nous: "Us" },
  hero: {
    avant: "Your old IT equipment is gathering dust in storage.",
    title: "We buy it.",
    sub: "Servers, laptops, networking, storage: an offer within 24 hours, free pickup and fast, guaranteed payment.",
    cta: "Get a quote",
    label: "A typical lot: laptops, networking, servers and workstations, on one pallet.",
    lotAlt:
      "A pallet of used IT equipment: laptops, network switches, servers and towers, stacked under a lamp in a dark warehouse.",
  },
  cost: {
    titleAvant: "Keeping it costs.",
    titleApres: "Selling it pays.",
    rows: [
      {
        avant: "It takes up space you pay for every month.",
        apres:
          "Our team comes to pack it, load it and haul it away. Pickup is free.",
        photoAlt: "A pallet of used equipment at the back of an empty warehouse.",
      },
      {
        avant: "It loses value every quarter.",
        apres:
          "Send photos and your inventory: you get our offer within 24 hours.",
        photoAlt: "A fingertip trail in the dust on the front of a server.",
      },
      {
        avant: "Your data is still on it.",
        apres:
          "Your sensitive information is permanently erased before resale or recycling.",
        photoAlt: "An open hard drive: the platter and the read head.",
      },
    ],
  },
  process: {
    titleVous: "On your side, three steps.",
    titleNous: "On ours, everything else.",
    steps: [
      {
        vous: "Describe your lot.",
        vousNote: "Photos, an Excel, PDF or CSV inventory.",
        nous: "An offer within 24 hours.",
        nousNote: "Based on your photos and your inventory.",
      },
      {
        vous: "Accept the offer.",
        vousNote: "The estimate is free, with no obligation.",
        nous: "We schedule the pickup.",
        nousNote: "Dates and logistics are coordinated with you.",
      },
      {
        vous: "Open the door.",
        vousNote: "We handle the rest, on site.",
        nous: "We pack, we load, we pay.",
        nousNote: "Half of the payment is made on site, at pickup.",
      },
    ],
  },
  ledger: {
    title: "Your lot, line by line.",
    titleDone: "Your space is clear.",
    lines: [
      { item: "Laptops", status: "Bought" },
      { item: "Network equipment", status: "Bought" },
      { item: "Servers", status: "Bought" },
      { item: "Workstations", status: "Bought" },
      { item: "Pickup and transport", status: "Free" },
    ],
    more: "And everything else: monitors, storage, telephony, office equipment, components.",
    payment: [
      { label: "At pickup", value: "Half of the payment, on site." },
      {
        label: "After inspection",
        value: "The balance, without delay. Inspection takes 15 business days at most.",
      },
    ],
    cta: "Get a quote",
  },
  close: {
    title: "Get your offer within 24 hours.",
    text: "Describe your lot and attach photos or an inventory. Your information remains confidential.",
    unique:
      "Techno Lot is a one-of-a-kind company in Québec, specializing in buying IT and electronic equipment lots.",
    contactLabels: {
      phone: "Phone",
      email: "Email",
      address: "Address",
      delay: "Response time",
    },
    delayValue: "24 hours maximum",
  },
};

export function getHomeContent(locale: Locale): HomeContent {
  return locale === "en" ? en : fr;
}
