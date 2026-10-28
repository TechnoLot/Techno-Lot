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

export type LocalPageId = "montreal";

export const localPages: Record<LocalPageId, Record<Locale, LocalPageContent>> = {
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
      categories: {
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
      },
      advantages: {
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
      },
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
      steps: {
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
      },
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
};

export function getLocalPage(id: LocalPageId, locale: Locale): LocalPageContent {
  return localPages[id][locale];
}
