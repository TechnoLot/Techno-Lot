export type Locale = "fr" | "en";

export const locales: Locale[] = ["fr", "en"];

/** Préfixe un chemin interne selon la locale (le français reste à la racine). */
export function localePath(locale: Locale, path: string): string {
  if (locale === "fr") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

/** Donne l'URL équivalente dans l'autre langue à partir du chemin courant. */
export function switchLocalePath(pathname: string, to: Locale): string {
  const bare = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
  return localePath(to, bare);
}

/** Locale déduite d'un chemin ("/en/..." → en, sinon fr). */
export function localeFromPath(pathname: string): Locale {
  return /^\/en(\/|$)/.test(pathname) ? "en" : "fr";
}

const fr = {
  htmlLang: "fr-CA",
  nav: [
    { href: "/", label: "Accueil" },
    { href: "/a-propos", label: "À Propos" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
    { href: "/faq", label: "FAQ" },
  ],
  secondaryNav: [
    { href: "/soumission", label: "Soumission" },
    { href: "/consultation", label: "Estimation de votre lot" },
    { href: "/achat-de-lot-description", label: "Ce que nous rachetons" },
    { href: "/prise-en-charge-complete", label: "Prise en charge complète" },
  ],
  header: {
    logoAria: "Techno Lot — Accueil",
    navAria: "Navigation principale",
    navMobileAria: "Navigation mobile",
    quoteButton: "Soumission",
    callPrefix: "Contactez-nous :",
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
    switcherAria: "Changer de langue",
  },
  footer: {
    blurb:
      "Le spécialiste de l'achat de lots informatiques et électroniques au Québec. Nous donnons une seconde vie à votre matériel high-tech usagé — et on vous paie pour ça.",
    facebook: "Suivez-nous sur Facebook",
    quickLinks: "Liens rapides",
    reachUs: "Nous joindre",
    headOffice: "Siège social :",
    copyright: "© 2024 - 2026 Techno Lot",
  },
  floatingCall: {
    label: "Appelez-nous",
    ariaPrefix: "Appelez-nous au",
  },
  marquee: [
    "Ordinateurs et portables",
    "Serveurs",
    "Équipements réseau",
    "Stockage",
    "Télécommunication",
    "Bureautique",
    "Écrans et moniteurs",
    "Composants",
    "Tablettes",
    "Audio / Vidéo",
  ],
  hero: {
    titleStart: "Vos lots informatiques ont",
    titleAccent: "de la valeur",
    subtitleStart: "On donne une seconde vie à votre matériel",
    subtitleEnd: "et on vous paie pour ça !",
    ctaPrimary: "Faire une soumission",
    ctaSecondary: "Comment ça marche",
    scrollAria: "Défiler vers nos services",
  },
  home: {
    trust: [
      "Réponse garantie en 24 heures",
      "Ramassage gratuit inclus",
      "Paiement rapide et garanti",
      "Unique au Québec",
    ],
    trustPaid: "Payé",
    servicesEyebrow: "Ce que nous faisons",
    servicesTitle: "Notre service clé en main",
    services: [
      {
        photoAlt: "Baies de serveurs avec câblage réseau et voyants verts",
        title: "Rachat de lots électroniques",
        text: "Spécialiste de la reprise des produits informatiques et électroniques. Techno Lot offre une seconde vie au matériel high-tech usagé.",
        cta: "Faire une demande",
      },
      {
        photoAlt:
          "Table de travail couverte d'ordinateurs portables et d'appareils électroniques",
        title: "Soumission personnalisée",
        text: "Pour obtenir une soumission de reprise de votre parc informatique ou de tout lot d'équipement électronique neuf ou usagé.",
        cta: "En savoir davantage",
      },
      {
        photoAlt: "Allée d'un entrepôt logistique remplie de palettes",
        title: "Prise en charge complète",
        text: "Lorsque notre offre est acceptée, notre équipe se rend sur place pour emballer, charger et transporter le matériel.",
        cta: "Processus d'achat de votre lot",
      },
    ],
    whoEyebrow: "Qui sommes-nous ?",
    whoTitle:
      "La durabilité au cœur de votre gestion de matériel électronique",
    whoP1: "Techno Lot est une entreprise unique au Québec, spécialisée dans le rachat de lots de produits électroniques et informatiques. Nous travaillons main dans la main avec vous pour allonger les cycles de vie de vos équipements afin d'intégrer la durabilité dans votre gestion de matériel électronique.",
    whoP2: "Nous prenons notre responsabilité dans la lutte climatique en sensibilisant nos partenaires et clients et en œuvrant activement à développer des solutions numériques plus vertes, durables et moins gourmandes en énergie et en ressources naturelles.",
    whoCta: "En savoir plus sur nous",
    missionEyebrow: "Notre mission",
    missionTitleStart: "Chaque appareil mérite",
    missionTitleAccent: "une seconde vie",
    missionText:
      "Revendre votre matériel plutôt que le jeter, c'est réduire les déchets électroniques, préserver les ressources naturelles — et récupérer de la valeur.",
    missionCta: "Faire une soumission",
    formEyebrow: "Soumission",
    formTitle: "Obtenez votre estimation gratuite",
    formText:
      "Pour une estimation sur mesure du rachat de votre matériel technologique, remplissez ce formulaire. Réponse en 24 heures.",
    locationEyebrow: "Localisation",
    locationTitle: "Venez nous voir",
  },
  orbit: {
    title: "Économie circulaire",
    text: "Prolonger la vie du matériel, réduire les déchets électroniques.",
  },
  timeline: {
    step: "Étape",
  },
  map: {
    titlePrefix: "Carte — Techno Lot,",
  },
  form: {
    honeypotLabel: "Ne pas remplir ce champ",
    nameLabel: "Nom",
    namePlaceholder: "Votre nom complet",
    nameError: "Veuillez entrer votre nom.",
    emailLabel: "Adresse courriel",
    emailPlaceholder: "vous@entreprise.ca",
    emailErrorEmpty: "Veuillez entrer votre adresse courriel.",
    emailErrorInvalid: "Cette adresse courriel ne semble pas valide.",
    phoneLabel: "Numéro de téléphone",
    phonePlaceholder: "514-555-1234",
    phoneErrorEmpty: "Veuillez entrer votre numéro de téléphone.",
    phoneErrorInvalid: "Ce numéro de téléphone ne semble pas valide.",
    messageLabel: "Message",
    messagePlaceholder:
      "Décrivez votre lot de matériel électronique (quantités, modèles, état…)",
    filesError:
      "Les fichiers joints dépassent 15 Mo au total. Veuillez réduire leur taille.",
    inventoryLabel: "Inventaire (Excel, PDF, CSV)",
    inventoryHint: "Cliquez pour joindre un fichier",
    photosLabel: "Photos du lot",
    photosHint: "Plusieurs images acceptées",
    photosSelected: (n: number) =>
      `${n} photo${n > 1 ? "s" : ""} sélectionnée${n > 1 ? "s" : ""}`,
    genericError:
      "Une erreur est survenue lors de l'envoi. Veuillez réessayer.",
    submit: "Envoyer ma soumission",
    submitting: "Envoi en cours…",
    successTitle: "Soumission envoyée !",
    successText:
      "Merci ! Nous avons bien reçu votre demande. Notre équipe vous répondra dans un délai de 24 heures.",
    successAgain: "Envoyer une autre demande",
    footnote:
      "Réponse garantie dans un délai de 24 heures. Vos informations restent confidentielles.",
  },
  cta: {
    defaultButton: "Faire une soumission",
  },
  blog: {
    category: "Écologie & TI",
    readArticle: "Lire l'article",
    backToBlog: "Retour au blog",
    publishedOn: "Publié le",
  },
  notFound: {
    title: "Cette page est introuvable",
    text: "La page que vous cherchez a peut-être été déplacée ou n'existe plus. Mais bonne nouvelle : votre matériel électronique, lui, a toujours de la valeur !",
    backHome: "Retour à l'accueil",
    cta: "Faire une soumission",
  },
};

export type Dict = typeof fr;

const en: Dict = {
  htmlLang: "en-CA",
  nav: [
    { href: "/", label: "Home" },
    { href: "/a-propos", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
    { href: "/faq", label: "FAQ" },
  ],
  secondaryNav: [
    { href: "/soumission", label: "Get a quote" },
    { href: "/consultation", label: "Lot appraisal" },
    { href: "/achat-de-lot-description", label: "What we buy" },
    { href: "/prise-en-charge-complete", label: "Full-service pickup" },
  ],
  header: {
    logoAria: "Techno Lot — Home",
    navAria: "Main navigation",
    navMobileAria: "Mobile navigation",
    quoteButton: "Get a quote",
    callPrefix: "Call us:",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    switcherAria: "Switch language",
  },
  footer: {
    blurb:
      "The specialist in purchasing IT and electronic lots in Québec. We give your used high-tech equipment a second life — and we pay you for it.",
    facebook: "Follow us on Facebook",
    quickLinks: "Quick links",
    reachUs: "Reach us",
    headOffice: "Head office:",
    copyright: "© 2024 - 2026 Techno Lot",
  },
  floatingCall: {
    label: "Call us",
    ariaPrefix: "Call us at",
  },
  marquee: [
    "Computers and laptops",
    "Servers",
    "Network equipment",
    "Storage",
    "Telecommunications",
    "Office equipment",
    "Screens and monitors",
    "Components",
    "Tablets",
    "Audio / Video",
  ],
  hero: {
    titleStart: "Your IT equipment lots have",
    titleAccent: "real value",
    subtitleStart: "We give your equipment a second life",
    subtitleEnd: "and we pay you for it!",
    ctaPrimary: "Get a quote",
    ctaSecondary: "How it works",
    scrollAria: "Scroll to our services",
  },
  home: {
    trust: [
      "Guaranteed response within 24 hours",
      "Free pickup included",
      "Fast, guaranteed payment",
      "One of a kind in Québec",
    ],
    trustPaid: "Paid",
    servicesEyebrow: "What we do",
    servicesTitle: "Our turnkey service",
    services: [
      {
        photoAlt: "Server racks with network cabling and green lights",
        title: "Purchase of electronic lots",
        text: "Specialists in buying back IT and electronic products. Techno Lot gives used high-tech equipment a second life.",
        cta: "Make a request",
      },
      {
        photoAlt: "Work table covered with laptops and electronic devices",
        title: "Custom quote",
        text: "Get a buyback quote for your IT fleet or any lot of new or used electronic equipment.",
        cta: "Learn more",
      },
      {
        photoAlt: "Warehouse aisle filled with pallets",
        title: "Full-service pickup",
        text: "Once our offer is accepted, our team comes on site to pack, load and transport the equipment.",
        cta: "Our lot purchase process",
      },
    ],
    whoEyebrow: "Who we are",
    whoTitle: "Sustainability at the heart of your electronic equipment management",
    whoP1: "Techno Lot is a one-of-a-kind company in Québec, specializing in the purchase of lots of electronic and IT products. We work hand in hand with you to extend the life cycles of your equipment and build sustainability into your electronic equipment management.",
    whoP2: "We take our responsibility in the fight against climate change seriously by raising awareness among our partners and clients, and by actively working to develop greener, more sustainable digital solutions that consume less energy and fewer natural resources.",
    whoCta: "Learn more about us",
    missionEyebrow: "Our mission",
    missionTitleStart: "Every device deserves",
    missionTitleAccent: "a second life",
    missionText:
      "Reselling your equipment instead of throwing it away means less electronic waste, preserved natural resources — and recovered value.",
    missionCta: "Get a quote",
    formEyebrow: "Quote",
    formTitle: "Get your free estimate",
    formText:
      "For a customized estimate of your technology equipment buyback, fill out this form. Response within 24 hours.",
    locationEyebrow: "Location",
    locationTitle: "Come see us",
  },
  orbit: {
    title: "Circular economy",
    text: "Extending equipment life, reducing electronic waste.",
  },
  timeline: {
    step: "Step",
  },
  map: {
    titlePrefix: "Map — Techno Lot,",
  },
  form: {
    honeypotLabel: "Do not fill in this field",
    nameLabel: "Name",
    namePlaceholder: "Your full name",
    nameError: "Please enter your name.",
    emailLabel: "Email address",
    emailPlaceholder: "you@company.ca",
    emailErrorEmpty: "Please enter your email address.",
    emailErrorInvalid: "This email address doesn't look valid.",
    phoneLabel: "Phone number",
    phonePlaceholder: "514-555-1234",
    phoneErrorEmpty: "Please enter your phone number.",
    phoneErrorInvalid: "This phone number doesn't look valid.",
    messageLabel: "Message",
    messagePlaceholder:
      "Describe your lot of electronic equipment (quantities, models, condition…)",
    filesError:
      "The attached files exceed 15 MB in total. Please reduce their size.",
    inventoryLabel: "Inventory (Excel, PDF, CSV)",
    inventoryHint: "Click to attach a file",
    photosLabel: "Photos of your lot",
    photosHint: "Multiple images accepted",
    photosSelected: (n: number) => `${n} photo${n > 1 ? "s" : ""} selected`,
    genericError: "Something went wrong while sending. Please try again.",
    submit: "Send my request",
    submitting: "Sending…",
    successTitle: "Request sent!",
    successText:
      "Thank you! We have received your request. Our team will get back to you within 24 hours.",
    successAgain: "Send another request",
    footnote:
      "Guaranteed response within 24 hours. Your information remains confidential.",
  },
  cta: {
    defaultButton: "Get a quote",
  },
  blog: {
    category: "Ecology & IT",
    readArticle: "Read article",
    backToBlog: "Back to blog",
    publishedOn: "Published on",
  },
  notFound: {
    title: "This page could not be found",
    text: "The page you're looking for may have been moved or no longer exists. But good news: your electronic equipment still has value!",
    backHome: "Back to home",
    cta: "Get a quote",
  },
};

const dictionaries: Record<Locale, Dict> = { fr, en };

export function getDict(locale: Locale): Dict {
  return dictionaries[locale];
}
