import type { Locale } from "@/lib/i18n";

/**
 * Textes de la page d'accueil (calquée sur Info Liquidation Recycle).
 *
 * Faits confirmés par le client uniquement : rachat de lots (on paie le
 * client), réponse en 24 h, ramassage gratuit partout au Québec, aucun
 * minimum, emballage + chargement + transport par notre équipe, la moitié du
 * paiement au ramassage et le solde sans délai après l'inspection (15 jours
 * ouvrables au maximum), certificat de destruction des données sans frais.
 * Jamais « paiement avant notre départ », ni destruction « sur place ».
 * Les chiffres des maquettes (45 portables, etc.) sont des exemples d'interface.
 */
export type StatItem = {
  prefix?: string;
  value?: number;
  suffix?: string;
  /** Remplace le compteur par du texte (ex. « Certificat »). */
  text?: string;
  label: string;
};

export type ServiceItem = {
  key: "rachat" | "soumission" | "estimation" | "prise-en-charge" | "donnees" | "serveurs" | "postes";
  title: string;
  text: string;
  href: string;
};

export type AccueilContenu = {
  hero: {
    titleLead: string;
    titleAccent: string;
    /** `replay` : fin du libellé accessible de la pastille (clic = rejouer le compteur). */
    badge: { prefix: string; value: number; unit: string; side: string; replay: string };
    promise: string;
    ctaPrimary: string;
    ctaHow: string;
    devicesLabel: string;
    devicesTagline: string;
    /** Noms des catégories montrées par le héros 3D, par type d'appareil. */
    devices: Record<
      "portable" | "serveur" | "ecran" | "poste" | "reseau" | "stockage" | "telephone" | "imprimante",
      string
    >;
    /** Texte affiché sous le logo sur l'écran du portable 3D. */
    screenLine: string;
  };
  stats: StatItem[];
  steps: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    items: { title: string; text: string }[];
    mock: {
      rows: { label: string; count: number }[];
      totalLabel: string;
      photosChip: string;
      calendarTitle: string;
      replyChip: string;
      payTitle: string;
      payRows: { share: string; label: string }[];
      payNote: string;
      /** Statut d'une ligne de paiement réglée (maquette 4). */
      paidLabel: string;
    };
  };
  palette: {
    title: string;
    text: string;
    counterLabel: string;
    /** Libellé accessible de l'illustration (palette chargée). */
    sceneLabel: string;
    note: string;
    done: string;
    cta: string;
  };
  donnees: {
    eyebrow: string;
    title: string;
    text: string;
    bullets: string[];
    cta: string;
    certificateTitle: string;
    certificateText: string;
  };
  zones: {
    eyebrow: string;
    title: string;
    text: string;
    regions: string[];
    marqueeLabel: string;
    cities: string[];
  };
  flux: {
    title: string;
    subtitle: string;
    items: { title: string; text: string }[];
  };
  services: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: ServiceItem[];
  };
  appelFinal: {
    title: string;
    subtitle: string;
    button: string;
  };
};

const NBSP = " ";

const CITIES = [
  "Montréal",
  "Laval",
  "Longueuil",
  "Québec",
  "Lévis",
  "Gatineau",
  "Sherbrooke",
  "Trois-Rivières",
  "Saguenay",
  "Terrebonne",
  "Mascouche",
  "Repentigny",
  "Saint-Jérôme",
  "Blainville",
  "Brossard",
  "Drummondville",
  "Granby",
  "Saint-Hyacinthe",
  "Joliette",
  "Rimouski",
  "Victoriaville",
  "Shawinigan",
  "Saint-Jean-sur-Richelieu",
  "Vaudreuil-Dorion",
  "Mirabel",
  "Rouyn-Noranda",
  "Val-d'Or",
  "Sept-Îles",
];

const fr: AccueilContenu = {
  hero: {
    titleLead: "Vos lots informatiques",
    titleAccent: "ont de la valeur",
    badge: { prefix: "Réponse en", value: 24, unit: "h", side: "partout au Québec", replay: "Rejouer l'animation" },
    promise: `On vous paie pour votre matériel. Ramassage gratuit et certificat de destruction des données sans frais.`,
    ctaPrimary: "Faire une soumission",
    ctaHow: "Comment ça marche",
    devicesLabel: "Ce que nous rachetons",
    devicesTagline: "Chaque appareil a de la valeur.",
    devices: {
      portable: "Portables",
      serveur: "Serveurs et tours",
      ecran: "Écrans",
      poste: "Postes de travail",
      reseau: "Réseau",
      stockage: "Stockage",
      telephone: "Téléphones et tablettes",
      imprimante: "Bureautique",
    },
    screenLine: "Rachat de lots informatiques · Partout au Québec",
  },
  stats: [
    { prefix: "Réponse en", value: 24, suffix: `${NBSP}h`, label: "Pour évaluer votre lot" },
    { prefix: "Ramassage", text: `0${NBSP}$`, label: "De frais de ramassage ou de transport" },
    { prefix: "Paiement de", value: 50, suffix: `${NBSP}%`, label: "Dès le ramassage" },
    { text: "Certificat", label: "De destruction des données sans frais" },
    { text: "Unique", label: "Au Québec dans le rachat de lots" },
  ],
  steps: {
    eyebrow: "Simple et rapide",
    title: `Comment ça marche${NBSP}?`,
    subtitle: `De la soumission au paiement${NBSP}: une étape pour vous, trois pour nous.`,
    cta: "Faire une soumission",
    items: [
      {
        title: "Faites votre soumission",
        text: "Décrivez votre matériel en ligne, photos et inventaire à l'appui.",
      },
      {
        title: `On vous répond en 24${NBSP}h`,
        text: "Vous recevez notre offre, puis on fixe ensemble la date du ramassage.",
      },
      {
        title: "On ramasse, gratuitement",
        text: "Notre équipe se rend sur place pour emballer, charger et transporter le matériel.",
      },
      {
        title: "Vous êtes payé",
        text: "La moitié au ramassage, le solde sans délai après l'inspection.",
      },
    ],
    mock: {
      rows: [
        { label: "Portables", count: 45 },
        { label: "Écrans", count: 30 },
        { label: "Serveurs", count: 6 },
      ],
      totalLabel: "appareils au total",
      photosChip: "Photos et inventaire joints",
      calendarTitle: "Date du ramassage",
      replyChip: `Réponse en 24${NBSP}h`,
      payTitle: "Votre paiement",
      payRows: [
        { share: `50${NBSP}%`, label: "Au ramassage" },
        { share: `50${NBSP}%`, label: "Après l'inspection" },
      ],
      payNote: "Inspection en 15 jours ouvrables au maximum",
      paidLabel: "Payé",
    },
  },
  palette: {
    title: "Petit lot ou parc complet, on se déplace.",
    text: `Portables, écrans, serveurs, réseau, stockage${NBSP}: on emballe, on charge et on transporte votre matériel, sans frais, partout au Québec.`,
    counterLabel: "appareils sur la palette",
    sceneLabel: "Palette de bois chargée d'appareils informatiques",
    note: `Aucun minimum${NBSP}: chaque lot compte.`,
    done: `Palette prête${NBSP}: on passe la chercher, gratuitement.`,
    cta: "Faire une soumission",
  },
  donnees: {
    eyebrow: "Destruction des données",
    title: "Vos données détruites, certificat inclus.",
    text: "Les données de vos appareils sont détruites et un certificat de destruction vous est remis, sans frais. Vous gardez une preuve claire pour vos dossiers.",
    bullets: [
      "Destruction des données",
      "Certificat de destruction sans frais",
      "Ramassage et transport gratuits",
    ],
    cta: "Faire une soumission",
    certificateTitle: "Certificat de destruction",
    certificateText: "Remis sans frais",
  },
  zones: {
    eyebrow: "Zones desservies",
    title: "Partout au Québec",
    text: `Où que vous soyez au Québec, notre équipe vient chercher votre matériel gratuitement. Aucun minimum${NBSP}: petit lot ou parc complet.`,
    regions: ["Grand Montréal", "Rive-Nord et Rive-Sud", "Québec et environs", "Toutes les régions"],
    marqueeLabel: "Quelques villes où nous passons",
    cities: CITIES,
  },
  flux: {
    title: "Rien ne se perd.",
    subtitle: "Du ramassage à la seconde vie, on s'occupe de tout.",
    items: [
      { title: "On ramasse", text: "Gratuitement, partout au Québec." },
      { title: "On détruit les données", text: "Certificat de destruction sans frais." },
      { title: "On donne une seconde vie", text: "Votre matériel est revalorisé plutôt que jeté." },
    ],
  },
  services: {
    eyebrow: "Nos services",
    title: "Un service clé en main pour votre matériel informatique",
    subtitle:
      "De la soumission au paiement, nous prenons en charge le rachat de vos équipements informatiques et électroniques, neufs ou usagés.",
    items: [
      {
        key: "rachat",
        title: "Rachat de lots informatiques",
        text: `Serveurs, portables, écrans, réseau${NBSP}: on rachète votre matériel, neuf ou usagé.`,
        href: "/achat-de-lot-description",
      },
      {
        key: "soumission",
        title: "Soumission personnalisée",
        text: `Décrivez votre lot en ligne${NBSP}: réponse garantie en 24${NBSP}heures.`,
        href: "/soumission",
      },
      {
        key: "estimation",
        title: "Estimation de votre lot",
        text: "Photos et inventaire à l'appui, on évalue la valeur de votre matériel.",
        href: "/consultation",
      },
      {
        key: "prise-en-charge",
        title: "Prise en charge complète",
        text: "Notre équipe emballe, charge et transporte le matériel, sans frais.",
        href: "/prise-en-charge-complete",
      },
      {
        key: "donnees",
        title: "Destruction des données",
        text: "Un certificat de destruction des données vous est remis sans frais.",
        href: "/soumission",
      },
      {
        key: "serveurs",
        title: "Serveurs et réseau",
        text: "Serveurs, commutateurs, routeurs et pare-feu, même obsolètes.",
        href: "/achat-de-lot-description",
      },
      {
        key: "postes",
        title: "Écrans et postes de travail",
        text: "Du poste unique au parc complet, avec ou sans écrans.",
        href: "/achat-de-lot-description",
      },
    ],
  },
  appelFinal: {
    title: `Prêt à vendre votre matériel${NBSP}?`,
    subtitle: "Ramassage gratuit partout au Québec",
    button: "Faire une soumission",
  },
};

const en: AccueilContenu = {
  hero: {
    titleLead: "Your IT equipment lots",
    titleAccent: "have real value",
    badge: { prefix: "Response in", value: 24, unit: "h", side: "anywhere in Québec", replay: "Replay the animation" },
    promise: "We pay you for your equipment. Free pickup and a free certificate of data destruction.",
    ctaPrimary: "Get a quote",
    ctaHow: "How it works",
    devicesLabel: "What we buy",
    devicesTagline: "Every device has value.",
    devices: {
      portable: "Laptops",
      serveur: "Servers and towers",
      ecran: "Monitors",
      poste: "Desktops",
      reseau: "Networking",
      stockage: "Storage",
      telephone: "Phones and tablets",
      imprimante: "Office equipment",
    },
    screenLine: "IT equipment lot buyback · Anywhere in Québec",
  },
  stats: [
    { prefix: "Response in", value: 24, suffix: `${NBSP}h`, label: "To appraise your lot" },
    { prefix: "Pickup", text: "$0", label: "In pickup or transport fees" },
    { prefix: "Payment of", value: 50, suffix: "%", label: "At pickup" },
    { text: "Certificate", label: "Of data destruction, free of charge" },
    { text: "One of a kind", label: "In Québec for lot buyback" },
  ],
  steps: {
    eyebrow: "Simple and fast",
    title: "How does it work?",
    subtitle: "From quote to payment: one step for you, three for us.",
    cta: "Get a quote",
    items: [
      {
        title: "Request a quote",
        text: "Describe your equipment online, with photos and an inventory.",
      },
      {
        title: `We reply within 24${NBSP}h`,
        text: "You receive our offer, then we set the pickup date together.",
      },
      {
        title: "We pick up, free of charge",
        text: "Our team comes on site to pack, load and transport the equipment.",
      },
      {
        title: "You get paid",
        text: "Half at pickup, the balance immediately after inspection.",
      },
    ],
    mock: {
      rows: [
        { label: "Laptops", count: 45 },
        { label: "Monitors", count: 30 },
        { label: "Servers", count: 6 },
      ],
      totalLabel: "devices in total",
      photosChip: "Photos and inventory attached",
      calendarTitle: "Pickup date",
      replyChip: `Reply within 24${NBSP}h`,
      payTitle: "Your payment",
      payRows: [
        { share: "50%", label: "At pickup" },
        { share: "50%", label: "After inspection" },
      ],
      payNote: "Inspection within 15 business days at most",
      paidLabel: "Paid",
    },
  },
  palette: {
    title: "Small lot or full fleet, we come to you.",
    text: "Laptops, monitors, servers, networking, storage: we pack, load and transport your equipment, free of charge, anywhere in Québec.",
    counterLabel: "devices on the pallet",
    sceneLabel: "Wooden pallet loaded with IT equipment",
    note: "No minimum: every lot counts.",
    done: "Pallet ready: we'll pick it up, free of charge.",
    cta: "Get a quote",
  },
  donnees: {
    eyebrow: "Data destruction",
    title: "Your data destroyed, certificate included.",
    text: "The data on your devices is destroyed and you receive a certificate of destruction, free of charge. Clear proof for your records.",
    bullets: ["Data destruction", "Certificate of destruction, free of charge", "Free pickup and transport"],
    cta: "Get a quote",
    certificateTitle: "Certificate of destruction",
    certificateText: "Issued free of charge",
  },
  zones: {
    eyebrow: "Service area",
    title: "Anywhere in Québec",
    text: "Wherever you are in Québec, our team picks up your equipment free of charge. No minimum: small lot or full fleet.",
    regions: ["Greater Montréal", "North and South Shores", "Québec City area", "Every region"],
    marqueeLabel: "Some of the cities we serve",
    cities: CITIES,
  },
  flux: {
    title: "Nothing goes to waste.",
    subtitle: "From pickup to second life, we take care of everything.",
    items: [
      { title: "We pick up", text: "Free of charge, anywhere in Québec." },
      { title: "We destroy the data", text: "Certificate of destruction, free of charge." },
      { title: "We give it a second life", text: "Your equipment gets new value instead of being thrown away." },
    ],
  },
  services: {
    eyebrow: "Our services",
    title: "A turnkey service for your IT equipment",
    subtitle:
      "From quote to payment, we handle the buyback of your new or used IT and electronic equipment.",
    items: [
      {
        key: "rachat",
        title: "IT lot buyback",
        text: "Servers, laptops, monitors, networking: we buy your equipment, new or used.",
        href: "/achat-de-lot-description",
      },
      {
        key: "soumission",
        title: "Custom quote",
        text: "Describe your lot online: guaranteed response within 24 hours.",
        href: "/soumission",
      },
      {
        key: "estimation",
        title: "Lot appraisal",
        text: "With photos and an inventory, we assess the value of your equipment.",
        href: "/consultation",
      },
      {
        key: "prise-en-charge",
        title: "Full-service pickup",
        text: "Our team packs, loads and transports the equipment, free of charge.",
        href: "/prise-en-charge-complete",
      },
      {
        key: "donnees",
        title: "Data destruction",
        text: "You receive a certificate of data destruction, free of charge.",
        href: "/soumission",
      },
      {
        key: "serveurs",
        title: "Servers and networking",
        text: "Servers, switches, routers and firewalls, even obsolete ones.",
        href: "/achat-de-lot-description",
      },
      {
        key: "postes",
        title: "Monitors and desktops",
        text: "From a single workstation to a whole fleet, with or without monitors.",
        href: "/achat-de-lot-description",
      },
    ],
  },
  appelFinal: {
    title: "Ready to sell your equipment?",
    subtitle: "Free pickup anywhere in Québec",
    button: "Get a quote",
  },
};

export function getAccueil(locale: Locale): AccueilContenu {
  return locale === "en" ? en : fr;
}
