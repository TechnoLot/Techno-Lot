import type { Locale } from "@/lib/i18n";

/**
 * Contenu des pages locales (« rachat de matériel informatique à <ville> »),
 * une entrée par page et par langue. Rendu : components/pages/local/LocalPage.tsx.
 * Chaque page doit aussi être inscrite au registre lib/seo/routes.ts.
 *
 * Règles de contenu : aucune promesse d'achat avant l'évaluation, de prix, de
 * délai de ramassage, de certification ou de bureau dans la ville ; jamais
 * « paiement avant notre départ » (dire « paiement rapide et garanti »).
 */

/** Catégories de matériel, dans l'ordre d'affichage. */
export type LocalCategoryKey =
  | "ordinateurs"
  | "serveurs"
  | "reseau"
  | "stockage"
  | "telecom"
  | "bureautique"
  | "ecrans";

/**
 * Page catégorie prévue pour chaque famille (chemin français). Le lien n'est
 * utilisé que si la page est inscrite au registre ; sinon, repli sur
 * CATEGORY_FALLBACK.
 */
export const CATEGORY_PAGES: Record<LocalCategoryKey, string> = {
  ordinateurs: "/rachat-ordinateurs-portables-en-lot",
  ecrans: "/rachat-ordinateurs-portables-en-lot",
  serveurs: "/rachat-serveurs-et-stockage",
  stockage: "/rachat-serveurs-et-stockage",
  reseau: "/rachat-equipements-reseau-telecom",
  telecom: "/rachat-equipements-reseau-telecom",
  bureautique: "/achat-de-lot-description",
};

/** Page générale « Ce que nous rachetons » (chemin français). */
export const CATEGORY_FALLBACK = "/achat-de-lot-description";

type TitledText = { title: string; text: string };

export type LocalPageContent = {
  /** Chemin français de la page (clé du registre). */
  frPath: string;
  /** Ville pour le fil d'Ariane et areaServed du JSON-LD Service. */
  city: string;
  breadcrumbHome: string;
  hero: {
    title: string;
    intro: string;
    cta: string;
    call: string;
    imageAlt: string;
  };
  categories: {
    title: string;
    intro: string;
    items: (TitledText & { key: LocalCategoryKey })[];
  };
  advantages: { title: string; items: TitledText[] };
  /** Section propre à la ville (texte surtout unique). */
  local: {
    title: string;
    paragraphs: string[];
    areasTitle: string;
    areas: { label: string; list: string }[];
  };
  steps: { title: string; items: TitledText[] };
  faq: { title: string; items: { question: string; answer: string }[] };
  /** Autres pages locales (chemins français) : affichées si inscrites au registre. */
  nearby: { title: string; items: { frPath: string; label: string }[] };
  cta: { title: string; text: string };
  /** Données structurées Service. */
  service: { name: string; description: string };
};

/** Blocs communs des pages locales en français (identiques d'une ville à l'autre). */
const FR_CATEGORIES: LocalPageContent["categories"] = {
  title: "Ce que nous rachetons",
  intro:
    "Tout le matériel informatique et électronique de votre entreprise, quelle que soit la taille du lot.",
  items: [
    {
      key: "ordinateurs",
      title: "Ordinateurs et portables",
      text: "Postes fixes et portables, même plus anciens : ils peuvent être valorisés par le reconditionnement ou le recyclage des composants.",
    },
    {
      key: "serveurs",
      title: "Serveurs",
      text: "Lorsqu'ils deviennent obsolètes ou que l'entreprise passe au nuage, leur revente permet de libérer de la place.",
    },
    {
      key: "reseau",
      title: "Équipements réseau",
      text: "Routeurs, commutateurs (switchs), pare-feu et autres équipements réseau font aussi partie du rachat.",
    },
    {
      key: "stockage",
      title: "Stockage",
      text: "Disques durs, baies de stockage ou SSD, surtout s'ils contiennent des données sensibles à effacer de manière sécurisée.",
    },
    {
      key: "telecom",
      title: "Télécommunication",
      text: "Téléphones d'entreprise, systèmes de visioconférence et autres outils de communication.",
    },
    {
      key: "bureautique",
      title: "Bureautique",
      text: "Imprimantes, numériseurs, photocopieurs et autres équipements de bureau.",
    },
    {
      key: "ecrans",
      title: "Écrans et moniteurs",
      text: "Moniteurs de postes de travail ou de configurations multi-écrans, en particulier ceux de grande qualité ou à haute résolution.",
    },
  ],
};

const FR_ADVANTAGES: LocalPageContent["advantages"] = {
  title: "Pourquoi vendre votre lot à Techno Lot",
  items: [
    {
      title: "Une offre en 24 h",
      text: "Envoyez-nous la liste de votre matériel ou quelques photos : notre offre vous parvient en 24 h.",
    },
    {
      title: "Ramassage sans frais et sans minimum",
      text: "Petit ou gros lot, notre équipe se déplace : elle emballe, charge et transporte le matériel. Vous n'avez rien à déplacer.",
    },
    {
      title: "Données effacées en toute sécurité",
      text: "Les supports de stockage sont effacés de manière sécurisée et nous vous remettons un certificat de destruction des données, sans frais.",
    },
    {
      title: "Paiement rapide et garanti",
      text: "La moitié du paiement est versée au ramassage et le solde après l'inspection, qui prend 15 jours ouvrables au maximum.",
    },
  ],
};

const FR_STEPS: LocalPageContent["steps"] = {
  title: "Comment ça fonctionne",
  items: [
    {
      title: "Demandez une soumission",
      text: "Remplissez le formulaire en joignant la liste de votre matériel ou quelques photos.",
    },
    {
      title: "Recevez notre offre",
      text: "Nous évaluons votre lot et notre offre vous parvient en 24 h.",
    },
    {
      title: "Ramassage sans frais",
      text: "Notre équipe vient chercher le matériel à la date convenue. La moitié du paiement est versée au ramassage.",
    },
    {
      title: "Inspection et solde",
      text: "Nous inspectons le matériel en 15 jours ouvrables au maximum, puis le solde vous est versé.",
    },
  ],
};

export type LocalPageId = "montreal" | "laval" | "terrebonne-mascouche" | "rive-nord";

/**
 * Le français est obligatoire ; l'anglais est facultatif. Une page sans `en`
 * doit aussi être inscrite sans `en` au registre (page en français seulement).
 */
export const localPages: Record<LocalPageId, { fr: LocalPageContent; en?: LocalPageContent }> = {
  montreal: {
    fr: {
      frPath: "/rachat-materiel-informatique-montreal",
      city: "Montréal",
      breadcrumbHome: "Accueil",
      hero: {
        title: "Rachat de matériel informatique pour les entreprises de Montréal",
        intro:
          "Vous videz des bureaux, renouvelez votre parc informatique ou fermez une salle de serveurs ? Techno Lot rachète votre matériel en lot : notre offre vous parvient en 24 h et le ramassage se fait sans frais.",
        cta: "Obtenir une offre",
        call: "Appeler",
        imageAlt: "Pile d'ordinateurs portables d'entreprise",
      },
      categories: FR_CATEGORIES,
      advantages: FR_ADVANTAGES,
      local: {
        title: "Partout sur l'île de Montréal",
        paragraphs: [
          "Des tours du centre-ville aux parcs d'affaires de Saint-Laurent, autour du Technoparc, et d'Anjou, jusqu'à Lachine, LaSalle et l'Ouest-de-l'Île, les entreprises montréalaises renouvellent régulièrement leurs ordinateurs, leurs serveurs et leurs équipements réseau. Un déménagement, une fin de bail ou une mise à niveau laisse souvent derrière lui des postes de travail, des écrans et des baies complètes qui dorment dans une salle de rangement.",
          "Plutôt que de payer pour vous en débarrasser, autant en récupérer une partie de la valeur. Nous évaluons votre lot et vous faisons une offre : le matériel qui peut encore servir est remis en circulation, et le reste est dirigé vers le recyclage des composants. La somme récupérée peut ensuite être réinvestie dans le nouveau matériel.",
          "Dans un immeuble de bureaux, un ramassage se prépare. Vous nous indiquez les contraintes du bâtiment, comme le quai de chargement, l'accès au monte-charge ou les heures permises pour les livraisons, et nous planifions le ramassage en conséquence. Le jour venu, notre équipe emballe, charge et transporte le matériel ; vous n'avez rien à descendre ni à déplacer. Si le matériel est réparti sur plusieurs étages ou à plusieurs adresses sur l'île, précisez-le dans votre demande : nous en tenons compte dans la planification.",
        ],
        areasTitle: "Secteurs desservis",
        areas: [
          {
            label: "Arrondissements de Montréal",
            list: "Ville-Marie et le centre-ville, Saint-Laurent, Anjou, Saint-Léonard, Ahuntsic-Cartierville, Rosemont–La Petite-Patrie, Villeray–Saint-Michel–Parc-Extension, Mercier–Hochelaga-Maisonneuve, Rivière-des-Prairies–Pointe-aux-Trembles, Montréal-Nord, Lachine, LaSalle, Le Sud-Ouest, Verdun, Côte-des-Neiges–Notre-Dame-de-Grâce et Le Plateau-Mont-Royal.",
          },
          {
            label: "Villes de l'île",
            list: "Dorval, Pointe-Claire, Kirkland, Beaconsfield, Mont-Royal, Westmount et Côte-Saint-Luc.",
          },
        ],
      },
      steps: FR_STEPS,
      faq: {
        title: "Questions fréquentes sur le rachat à Montréal",
        items: [
          {
            question: "Vous déplacez-vous dans tous les arrondissements de Montréal et dans l'Ouest-de-l'Île ?",
            answer:
              "Oui. Nous ramassons le matériel dans tous les arrondissements de Montréal, dans l'Ouest-de-l'Île et dans les autres villes de l'île. Le ramassage est sans frais et sans minimum, partout au Québec.",
          },
          {
            question: "En combien de temps recevrai-je une offre ?",
            answer:
              "Notre offre vous parvient en 24 h. Une liste de votre matériel ou quelques photos suffisent pour évaluer votre lot.",
          },
          {
            question: "Rachetez-vous le matériel qui ne fonctionne plus ?",
            answer:
              "Nous évaluons tout : matériel neuf, usagé ou partiellement fonctionnel. Le prix dépend de cette évaluation. Ce qui ne peut pas être réemployé est dirigé vers le recyclage des composants.",
          },
          {
            question: "Qu'arrive-t-il aux données de nos ordinateurs et de nos serveurs ?",
            answer:
              "Les supports de stockage sont effacés de manière sécurisée, et nous vous remettons un certificat de destruction des données, sans frais.",
          },
          {
            question: "Comment le paiement fonctionne-t-il ?",
            answer:
              "La moitié du paiement est versée au ramassage. Nous inspectons ensuite le matériel, en 15 jours ouvrables au maximum, puis le solde vous est versé. Si l'état du matériel diffère de la description, l'offre est ajustée en conséquence.",
          },
          {
            question: "Y a-t-il une quantité minimale ?",
            answer: "Non, il n'y a aucun minimum de quantité. Petit ou gros lot, nous nous déplaçons.",
          },
        ],
      },
      nearby: {
        title: "Ailleurs dans le Grand Montréal",
        items: [
          { frPath: "/rachat-materiel-informatique-laval", label: "Laval" },
          { frPath: "/rachat-materiel-informatique-terrebonne-mascouche", label: "Terrebonne et Mascouche" },
          { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        ],
      },
      cta: {
        title: "Prêt à vendre votre lot à Montréal ?",
        text: "Décrivez votre matériel : notre offre vous parvient en 24 h.",
      },
      service: {
        name: "Rachat de matériel informatique à Montréal",
        description:
          "Vous videz des bureaux ou renouvelez votre parc à Montréal ? Techno Lot rachète vos lots informatiques : offre en 24 h, ramassage sans frais.",
      },
    },
    en: {
      frPath: "/rachat-materiel-informatique-montreal",
      city: "Montreal",
      breadcrumbHome: "Home",
      hero: {
        title: "IT equipment buyback for Montreal businesses",
        intro:
          "Clearing out an office, refreshing your computer fleet or shutting down a server room? Techno Lot buys your equipment in bulk. You get our offer within 24 hours, and pickup is free.",
        cta: "Get an offer",
        call: "Call",
        imageAlt: "Stack of business laptops",
      },
      categories: {
        title: "What we buy",
        intro: "All of your company's IT and electronic equipment, whatever the size of the lot.",
        items: [
          {
            key: "ordinateurs",
            title: "Computers and laptops",
            text: "Desktops and laptops, even older ones, can be valued through refurbishing or component recycling.",
          },
          {
            key: "serveurs",
            title: "Servers",
            text: "When servers become obsolete or your company moves to the cloud, reselling them frees up space.",
          },
          {
            key: "reseau",
            title: "Network equipment",
            text: "Routers, switches, firewalls and other network gear are also part of the buyback.",
          },
          {
            key: "stockage",
            title: "Storage",
            text: "Hard drives, storage arrays and SSDs, especially when they hold sensitive data that must be securely erased.",
          },
          {
            key: "telecom",
            title: "Telecommunications",
            text: "Business phones, videoconferencing systems and other communication tools.",
          },
          {
            key: "bureautique",
            title: "Office equipment",
            text: "Printers, scanners, photocopiers and other office equipment.",
          },
          {
            key: "ecrans",
            title: "Screens and monitors",
            text: "Workstation and multi-screen monitors, particularly high-quality or high-resolution models.",
          },
        ],
      },
      advantages: {
        title: "Why sell your lot to Techno Lot",
        items: [
          {
            title: "An offer within 24 hours",
            text: "Send us a list of your equipment or a few photos, and our offer will reach you within 24 hours.",
          },
          {
            title: "Free pickup, no minimum",
            text: "Small lot or large, our team comes to you and packs, loads and transports the equipment. You don't have to move a thing.",
          },
          {
            title: "Securely erased data",
            text: "Storage media are securely erased, and we provide a certificate of data destruction free of charge.",
          },
          {
            title: "Fast, guaranteed payment",
            text: "Half the payment is made at pickup and the balance after inspection, which takes no more than 15 business days.",
          },
        ],
      },
      local: {
        title: "From the West Island to Saint-Laurent and downtown",
        paragraphs: [
          "Across the West Island, from Dorval and Pointe-Claire to Kirkland and Beaconsfield, and in Saint-Laurent around the Technoparc, businesses replace their computers, servers and network gear on a regular cycle. The same goes for the downtown towers and the business parks of Anjou, Lachine and LaSalle. An office move, a lease ending or an upgrade project often leaves behind workstations, monitors and full racks sitting in a storage room.",
          "Rather than paying to get rid of that equipment, you can recover part of its value. We assess your lot and make you an offer: equipment that still has a use goes back into circulation, and the rest is sent to component recycling. The money you recover can then go toward your new equipment.",
          "Office buildings come with their own rules. Let us know about the loading dock, freight elevator access or permitted delivery hours, and we will plan the pickup around them. On the day, our team packs, loads and transports everything, so you don't have to carry or move a thing. If the equipment is spread over several floors or several addresses on the island, mention it in your request and we will factor it into the plan.",
        ],
        areasTitle: "Areas we serve",
        areas: [
          {
            label: "West Island and other island cities",
            list: "Dorval, Pointe-Claire, Kirkland, Beaconsfield, Town of Mount Royal, Westmount and Côte-Saint-Luc.",
          },
          {
            label: "Montreal boroughs",
            list: "Saint-Laurent, Ville-Marie and downtown, Anjou, Saint-Léonard, Ahuntsic-Cartierville, Rosemont–La Petite-Patrie, Villeray–Saint-Michel–Parc-Extension, Mercier–Hochelaga-Maisonneuve, Rivière-des-Prairies–Pointe-aux-Trembles, Montréal-Nord, Lachine, LaSalle, Le Sud-Ouest, Verdun, Côte-des-Neiges–Notre-Dame-de-Grâce and Le Plateau-Mont-Royal.",
          },
        ],
      },
      steps: {
        title: "How it works",
        items: [
          {
            title: "Request a quote",
            text: "Fill out the form with a list of your equipment or a few photos.",
          },
          {
            title: "Get our offer",
            text: "We assess your lot and our offer reaches you within 24 hours.",
          },
          {
            title: "Free pickup",
            text: "Our team collects the equipment on the agreed date. Half the payment is made at pickup.",
          },
          {
            title: "Inspection and balance",
            text: "We inspect the equipment within 15 business days at most, then pay you the balance.",
          },
        ],
      },
      faq: {
        title: "Montreal buyback FAQ",
        items: [
          {
            question: "Do you cover every Montreal borough and the West Island?",
            answer:
              "Yes. We pick up equipment in every Montreal borough, across the West Island and in the other cities on the island. Pickup is free, with no minimum, anywhere in Quebec.",
          },
          {
            question: "How quickly will I get an offer?",
            answer:
              "Our offer reaches you within 24 hours. A list of your equipment or a few photos are enough for us to assess your lot.",
          },
          {
            question: "Do you buy equipment that no longer works?",
            answer:
              "We assess everything: new, used or partly working equipment. The price depends on that assessment. Whatever can't be reused is sent to component recycling.",
          },
          {
            question: "What happens to the data on our computers and servers?",
            answer:
              "Storage media are securely erased, and we provide a certificate of data destruction free of charge.",
          },
          {
            question: "How does payment work?",
            answer:
              "Half the payment is made at pickup. We then inspect the equipment within 15 business days at most and pay you the balance. If the equipment's condition differs from the description, the offer is adjusted accordingly.",
          },
          {
            question: "Is there a minimum quantity?",
            answer: "No, there is no minimum quantity. Small lot or large, we come to you.",
          },
        ],
      },
      nearby: {
        title: "Elsewhere in Greater Montreal",
        items: [
          { frPath: "/rachat-materiel-informatique-laval", label: "Laval" },
          { frPath: "/rachat-materiel-informatique-terrebonne-mascouche", label: "Terrebonne and Mascouche" },
          { frPath: "/rachat-materiel-informatique-rive-nord", label: "North Shore" },
        ],
      },
      cta: {
        title: "Ready to sell your lot in Montreal?",
        text: "Tell us about your equipment and our offer will reach you within 24 hours.",
      },
      service: {
        name: "IT equipment buyback in Montreal",
        description:
          "Surplus laptops, servers or network gear in Montreal? Techno Lot buys business IT equipment in bulk: offer within 24 h, free pickup.",
      },
    },
  },

  // Laval : page en français seulement
  laval: {
    fr: {
      frPath: "/rachat-materiel-informatique-laval",
      city: "Laval",
      breadcrumbHome: "Accueil",
      hero: {
        title: "Rachat de matériel informatique pour les entreprises de Laval",
        intro:
          "Votre entreprise de Laval remplace ses ordinateurs, regroupe ses locaux ou ferme une succursale ? Techno Lot, votre voisine de Mascouche, rachète votre matériel informatique et électronique en lot. Notre offre vous parvient en 24 h et le ramassage est sans frais.",
        cta: "Obtenir une offre",
        call: "Appeler",
        imageAlt: "Pile d'ordinateurs portables d'entreprise",
      },
      categories: FR_CATEGORIES,
      advantages: FR_ADVANTAGES,
      local: {
        title: "De Chomedey à Saint-François, partout à Laval",
        paragraphs: [
          "Techno Lot est établie à Mascouche, juste de l'autre côté de la rivière des Mille Îles. Laval est donc notre voisine, et planifier un ramassage s'y fait simplement : quelques échanges suffisent pour convenir d'une date qui convient à votre équipe.",
          "Le territoire lavallois compte de nombreux parcs d'affaires et industriels le long des autoroutes 15, 440 et 25. À cela s'ajoutent la Cité de la Biotech, les bureaux et les sièges sociaux du centre de Laval, les commerces et les centres de distribution. Dans tous ces milieux, les postes de travail, les écrans, les serveurs et les équipements réseau arrivent tôt ou tard en fin de cycle. Un renouvellement du parc, un regroupement de locaux ou la fermeture d'une succursale laisse alors derrière lui du matériel inutilisé qui occupe de l'espace.",
          "Plutôt que de l'entreposer ou de payer pour l'évacuer, vous pouvez le vendre en un seul lot. Nous évaluons votre matériel, qu'il soit neuf, usagé ou partiellement fonctionnel, et notre offre vous parvient en 24 h. Ce qui peut encore servir est remis en circulation ; le reste est dirigé vers le recyclage des composants.",
          "Les immeubles des parcs industriels ont souvent leurs particularités : quai de chargement, porte de garage, entrée réservée aux livraisons ou heures de réception précises. Indiquez-les dans votre demande et nous planifions le ramassage en conséquence. Le jour venu, notre équipe emballe, charge et transporte le matériel ; vous n'avez rien à déplacer.",
        ],
        areasTitle: "Secteurs desservis",
        areas: [
          {
            label: "Secteurs de Laval",
            list: "Chomedey, Laval-des-Rapides, Pont-Viau, Vimont, Auteuil, Duvernay, Saint-François, Saint-Vincent-de-Paul, Sainte-Rose, Fabreville, Laval-Ouest, Sainte-Dorothée, Laval-sur-le-Lac et Îles-Laval.",
          },
          {
            label: "Milieux d'affaires",
            list: "Parcs d'affaires et industriels le long des autoroutes 15, 440 et 25, Cité de la Biotech, bureaux et sièges sociaux du centre de Laval, commerces et centres de distribution.",
          },
        ],
      },
      steps: FR_STEPS,
      faq: {
        title: "Questions fréquentes sur le rachat à Laval",
        items: [
          {
            question: "Vous déplacez-vous dans tous les secteurs de Laval ?",
            answer:
              "Oui. De Chomedey à Saint-François et de Sainte-Rose à Pont-Viau, nous ramassons le matériel dans tous les secteurs de Laval. Le ramassage est sans frais et sans minimum de quantité, partout au Québec.",
          },
          {
            question:
              "Notre immeuble est dans un parc industriel, avec un quai ou un accès particulier. Est-ce que ça pose problème ?",
            answer:
              "Non. Indiquez dans votre demande les particularités de l'immeuble, comme le quai de chargement, la porte de garage, l'entrée à utiliser ou les heures de réception, et nous planifions le ramassage en conséquence. Notre équipe emballe, charge et transporte le matériel.",
          },
          {
            question: "Pouvons-nous vendre un bureau complet en un seul lot ?",
            answer:
              "Oui. Postes de travail, portables, écrans, stations d'accueil, claviers, souris, imprimantes et téléphones peuvent être regroupés dans un même lot. Joignez la liste du matériel ou quelques photos à votre demande : nous évaluons l'ensemble et vous faisons une seule offre.",
          },
          {
            question: "En combien de temps recevrons-nous une offre ?",
            answer:
              "Notre offre vous parvient en 24 h. Une liste de votre matériel ou quelques photos suffisent pour évaluer votre lot.",
          },
          {
            question: "Que deviennent les données de nos postes et de nos serveurs ?",
            answer:
              "Les disques durs, les SSD et les autres supports de stockage sont effacés de manière sécurisée. Nous vous remettons ensuite un certificat de destruction des données, sans frais.",
          },
          {
            question: "Comment serons-nous payés ?",
            answer:
              "La moitié du paiement est versée au ramassage. Le solde suit l'inspection du matériel, qui prend 15 jours ouvrables au maximum. Si l'état du matériel diffère de la description, l'offre est ajustée en conséquence.",
          },
        ],
      },
      nearby: {
        title: "Ailleurs dans la région",
        items: [
          { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
          { frPath: "/rachat-materiel-informatique-terrebonne-mascouche", label: "Terrebonne et Mascouche" },
          { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        ],
      },
      cta: {
        title: "Prêt à vendre votre lot à Laval ?",
        text: "Envoyez-nous la liste de votre matériel ou quelques photos : notre offre vous parvient en 24 h.",
      },
      service: {
        name: "Rachat de matériel informatique à Laval",
        description:
          "Votre entreprise de Laval remplace ses ordinateurs ou ferme un local ? Techno Lot rachète vos lots informatiques et électroniques. Offre en 24 h.",
      },
    },
  },

  // Terrebonne et Mascouche : page en français seulement
  "terrebonne-mascouche": {
    fr: {
      frPath: "/rachat-materiel-informatique-terrebonne-mascouche",
      city: "Terrebonne et Mascouche",
      breadcrumbHome: "Accueil",
      hero: {
        title: "Rachat de matériel informatique à Terrebonne et Mascouche",
        intro:
          "Techno Lot est établie à Mascouche, au cœur de la MRC Les Moulins. Votre entreprise de Terrebonne ou de Mascouche a des ordinateurs, des serveurs ou des équipements réseau dont elle n'a plus besoin ? Nous rachetons le lot : notre offre vous parvient en 24 h et le ramassage est sans frais.",
        cta: "Obtenir une offre",
        call: "Appeler",
        imageAlt: "Pile d'ordinateurs portables d'entreprise",
      },
      categories: FR_CATEGORIES,
      advantages: FR_ADVANTAGES,
      local: {
        title: "Votre voisin dans la MRC Les Moulins",
        paragraphs: [
          "Techno Lot est établie au 3235, avenue de la Gare, à Mascouche, au cœur de la MRC Les Moulins. Les entreprises de Terrebonne et de Mascouche sont donc nos voisines, du Vieux-Terrebonne à Terrebonne-Ouest, de Lachenaie à La Plaine, et tout au long des autoroutes 25 et 640.",
          "PME manufacturières, commerces, bureaux professionnels : chaque entreprise de la région finit par remplacer ses ordinateurs, ses écrans, ses serveurs ou ses équipements réseau. L'ancien matériel s'accumule alors dans un coin d'entrepôt ou une salle de rangement. Vendu en lot, il libère de l'espace et vous permet d'en récupérer une partie de la valeur, à réinvestir dans le nouveau matériel. Ce qui peut encore servir est remis en circulation ; le reste est dirigé vers le recyclage des composants.",
          "Être voisins simplifie les échanges. Pour un gros lot, par exemple un parc complet de postes ou plusieurs baies de serveurs, appelez-nous au 514-944-3939 : nous en discutons directement et préparons la suite ensemble. Pour tout le reste, la demande de soumission suffit. Joignez-y la liste de votre matériel ou quelques photos, et notre offre vous parvient en 24 h. Notre équipe vient ensuite chercher le matériel chez vous ; elle l'emballe, le charge et le transporte.",
          "Nous rachetons aussi le matériel des entreprises des villes voisines : Bois-des-Filion, Lorraine, Sainte-Anne-des-Plaines, Repentigny, L'Assomption et Charlemagne. Pour ces secteurs, consultez également notre page consacrée à la Rive-Nord, accessible plus bas.",
        ],
        areasTitle: "Secteurs desservis",
        areas: [
          {
            label: "Terrebonne",
            list: "Vieux-Terrebonne, Terrebonne-Ouest, Lachenaie et La Plaine.",
          },
          {
            label: "Mascouche",
            list: "Tous les secteurs de Mascouche, dont les zones d'affaires le long des autoroutes 25 et 640.",
          },
          {
            label: "Villes voisines",
            list: "Bois-des-Filion, Lorraine, Sainte-Anne-des-Plaines, Repentigny, L'Assomption et Charlemagne.",
          },
        ],
      },
      steps: FR_STEPS,
      faq: {
        title: "Questions fréquentes sur le rachat à Terrebonne et à Mascouche",
        items: [
          {
            question: "Où êtes-vous situés ?",
            answer:
              "Techno Lot est établie au 3235, avenue de la Gare, à Mascouche (QC) J7K 3C1. Pour vendre votre matériel, le plus simple est de remplir la demande de soumission : nous évaluons votre lot, notre offre vous parvient en 24 h, puis notre équipe vient chercher le matériel chez vous.",
          },
          {
            question: "Couvrez-vous tous les secteurs de Terrebonne, dont Lachenaie et La Plaine ?",
            answer:
              "Oui : le Vieux-Terrebonne, Terrebonne-Ouest, Lachenaie et La Plaine, ainsi que tout Mascouche. Le ramassage est sans frais, comme partout au Québec.",
          },
          {
            question: "Nous n'avons que quelques ordinateurs à vendre. Est-ce possible ?",
            answer:
              "Oui, il n'y a aucun minimum de quantité. Quelques portables ou un parc complet : envoyez-nous la liste ou des photos et nous vous faisons une offre. Le ramassage reste sans frais.",
          },
          {
            question: "Rachetez-vous le matériel qui ne fonctionne plus ?",
            answer:
              "Nous évaluons tout le matériel, qu'il soit neuf, usagé ou partiellement fonctionnel, et le prix dépend de cette évaluation. Les appareils qui ne peuvent pas être réemployés sont dirigés vers le recyclage des composants.",
          },
          {
            question: "Comment protégez-vous les données de nos appareils ?",
            answer:
              "Tous les supports de stockage sont effacés de manière sécurisée, et nous vous remettons un certificat de destruction des données, sans frais.",
          },
          {
            question: "Comment le paiement se fait-il ?",
            answer:
              "Nous versons la moitié du paiement au ramassage. Après l'inspection du matériel, en 15 jours ouvrables au maximum, nous versons le solde. Si l'état du matériel diffère de la description, l'offre est ajustée en conséquence.",
          },
        ],
      },
      nearby: {
        title: "Ailleurs dans la région",
        items: [
          { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
          { frPath: "/rachat-materiel-informatique-laval", label: "Laval" },
          { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        ],
      },
      cta: {
        title: "Prêt à vendre votre lot dans Les Moulins ?",
        text: "Décrivez votre matériel ou appelez-nous au 514-944-3939 : notre offre vous parvient en 24 h.",
      },
      service: {
        name: "Rachat de matériel informatique à Terrebonne et Mascouche",
        description:
          "Techno Lot est établie à Mascouche, à quelques minutes de Terrebonne. Nous rachetons les lots informatiques des entreprises de la MRC Les Moulins.",
      },
    },
  },

  // Rive-Nord : page en français seulement
  "rive-nord": {
    fr: {
      frPath: "/rachat-materiel-informatique-rive-nord",
      city: "Rive-Nord",
      breadcrumbHome: "Accueil",
      hero: {
        title: "Rachat de matériel informatique pour les entreprises de la Rive-Nord",
        intro:
          "De Saint-Eustache à Repentigny, en passant par Blainville, Mirabel et Saint-Jérôme, Techno Lot rachète les ordinateurs, les serveurs et les équipements réseau des entreprises de la Rive-Nord. Notre offre vous parvient en 24 h, et le ramassage est sans frais et sans minimum de quantité.",
        cta: "Obtenir une offre",
        call: "Appeler",
        imageAlt: "Pile d'ordinateurs portables d'entreprise",
      },
      categories: FR_CATEGORIES,
      advantages: FR_ADVANTAGES,
      local: {
        title: "Des Basses-Laurentides à Lanaudière",
        paragraphs: [
          "La Rive-Nord s'étend des Basses-Laurentides jusqu'à Lanaudière. Thérèse-De Blainville, Mirabel, Deux-Montagnes, Saint-Jérôme, Repentigny : chaque secteur a ses parcs industriels, ses zones commerciales et ses bureaux, dont bon nombre se trouvent le long des autoroutes 15, 640 et 50.",
          "Fabricants, distributeurs, entreprises de services ou cabinets professionnels, tous finissent par renouveler leurs postes de travail, leurs écrans, leurs serveurs ou leurs équipements réseau. À Mirabel, autour du secteur de l'aéroport, comme dans les parcs industriels de Blainville et de Boisbriand, l'ancien matériel finit souvent par encombrer un entrepôt ou une salle technique. Plutôt que de payer pour vous en débarrasser, vendez-le en lot : nous l'évaluons, qu'il soit neuf, usagé ou partiellement fonctionnel, et notre offre vous parvient en 24 h.",
          "Votre entreprise a plusieurs sites, par exemple une usine à Saint-Jérôme et des bureaux à Sainte-Thérèse ? Indiquez toutes les adresses dans une même demande. Nous évaluons l'ensemble, et le ramassage est planifié avec vous. À chaque adresse, notre équipe emballe, charge et transporte le matériel ; vous n'avez rien à déplacer.",
          "Le matériel qui peut encore servir est remis en circulation, et le reste est dirigé vers le recyclage des composants. Les entreprises de Terrebonne et de Mascouche, dans la MRC Les Moulins, ont aussi leur propre page, accessible plus bas.",
        ],
        areasTitle: "Secteurs desservis",
        areas: [
          {
            label: "Thérèse-De Blainville",
            list: "Blainville, Boisbriand, Sainte-Thérèse, Rosemère, Lorraine et Bois-des-Filion.",
          },
          {
            label: "Mirabel",
            list: "Tous les secteurs de Mirabel, dont celui de l'aéroport.",
          },
          {
            label: "Deux-Montagnes",
            list: "Saint-Eustache, Deux-Montagnes et Sainte-Marthe-sur-le-Lac.",
          },
          {
            label: "Saint-Jérôme",
            list: "Tous les secteurs de Saint-Jérôme.",
          },
          {
            label: "Lanaudière",
            list: "Repentigny, L'Assomption et Charlemagne.",
          },
          {
            label: "MRC Les Moulins",
            list: "Terrebonne et Mascouche, qui ont leur propre page.",
          },
        ],
      },
      steps: FR_STEPS,
      faq: {
        title: "Questions fréquentes sur le rachat sur la Rive-Nord",
        items: [
          {
            question: "Quelles villes de la Rive-Nord desservez-vous ?",
            answer:
              "Entre autres Blainville, Boisbriand, Sainte-Thérèse, Rosemère, Lorraine, Bois-des-Filion, Mirabel, Saint-Eustache, Deux-Montagnes, Sainte-Marthe-sur-le-Lac, Saint-Jérôme, Repentigny, L'Assomption et Charlemagne, ainsi que Terrebonne et Mascouche. Le ramassage est sans frais et sans minimum, partout au Québec.",
          },
          {
            question: "Notre entreprise a plusieurs sites. Faut-il faire une demande par adresse ?",
            answer:
              "Non. Indiquez toutes vos adresses dans une même demande, avec la liste du matériel à chaque endroit ou quelques photos. Nous évaluons l'ensemble et le ramassage est planifié avec vous.",
          },
          {
            question: "En combien de temps recevrons-nous une offre ?",
            answer:
              "Notre offre vous parvient en 24 h, que votre matériel se trouve à un seul endroit ou à plusieurs. Une liste ou quelques photos suffisent pour l'évaluer.",
          },
          {
            question: "Rachetez-vous le matériel endommagé ou qui ne fonctionne plus ?",
            answer:
              "Nous évaluons tout : matériel neuf, usagé ou partiellement fonctionnel. Le prix dépend de cette évaluation. Ce qui ne peut pas être réemployé est dirigé vers le recyclage des composants.",
          },
          {
            question: "Comment le paiement fonctionne-t-il ?",
            answer:
              "La moitié du paiement est versée au ramassage, et le solde après l'inspection, qui prend 15 jours ouvrables au maximum. Si l'état du matériel diffère de la description, l'offre est ajustée en conséquence.",
          },
          {
            question: "Qu'advient-il des données stockées sur notre matériel ?",
            answer:
              "Les supports de stockage sont effacés de manière sécurisée, et nous vous remettons un certificat de destruction des données, sans frais.",
          },
        ],
      },
      nearby: {
        title: "Ailleurs dans la région",
        items: [
          { frPath: "/rachat-materiel-informatique-laval", label: "Laval" },
          { frPath: "/rachat-materiel-informatique-terrebonne-mascouche", label: "Terrebonne et Mascouche" },
          { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
        ],
      },
      cta: {
        title: "Prêt à vendre votre lot sur la Rive-Nord ?",
        text: "Un site ou plusieurs : décrivez votre matériel, et notre offre vous parvient en 24 h.",
      },
      service: {
        name: "Rachat de matériel informatique sur la Rive-Nord",
        description:
          "Blainville, Boisbriand, Sainte-Thérèse, Mirabel, Saint-Eustache, Saint-Jérôme, Repentigny : Techno Lot rachète les lots informatiques des entreprises.",
      },
    },
  },
};

export function getLocalPage(id: LocalPageId, locale: Locale): LocalPageContent {
  const content = localPages[id][locale];
  if (!content) throw new Error(`Page locale « ${id} » sans version « ${locale} ».`);
  return content;
}
