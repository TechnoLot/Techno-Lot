/**
 * Contenu des pages catégories (« rachat de <famille de matériel> en lot »),
 * en français seulement. Gabarit : components/pages/category/CategoryPage.tsx.
 * Chaque page est inscrite au registre lib/seo/routes.ts (sans `en`).
 *
 * Règles de contenu : aucun prix, aucun délai de ramassage, aucune marque
 * citée, aucun achat garanti avant l'évaluation. Les facteurs qui influencent
 * l'offre sont des repères généraux.
 */

type TitledText = { title: string; text: string };

export type CategoryPageId = "portables" | "serveurs" | "reseau";

export type CategoryPageContent = {
  /** Chemin français de la page (clé du registre). */
  frPath: string;
  /** Nom court de la catégorie (fil d'Ariane, liens entre catégories). */
  label: string;
  hero: {
    title: string;
    intro: string;
    image: { src: string; alt: string; width: number };
  };
  /** Ce que nous rachetons dans cette catégorie. */
  items: { title: string; intro: string; items: (TitledText & { linkFrPath?: string })[] };
  /** Ce qui influence l'offre (repères généraux, sans prix). */
  factors: { title: string; intro: string; items: TitledText[]; note: string };
  /** Préparer le lot (ou planifier le décommissionnement). */
  prepare: { title: string; intro: string; items: TitledText[] };
  faq: { title: string; items: { question: string; answer: string }[] };
  cta: { title: string; text: string };
  /** Données structurées Service. */
  service: { name: string; description: string };
};

/** Fil d'Ariane commun : Accueil › Ce que nous rachetons › <catégorie>. */
export const CATEGORY_BREADCRUMB = {
  home: "Accueil",
  parent: { name: "Ce que nous rachetons", path: "/achat-de-lot-description" },
};

/** Les quatre avantages Techno Lot (mêmes faits que les pages locales). */
export const CATEGORY_ADVANTAGES: { title: string; items: TitledText[] } = {
  title: "Pourquoi vendre votre lot à Techno Lot",
  items: [
    {
      title: "Une offre en 24 h",
      text: "Envoyez-nous la liste de votre matériel ou quelques photos : notre offre vous parvient en 24 h.",
    },
    {
      title: "Ramassage sans frais et sans minimum",
      text: "Petit ou gros lot, partout au Québec, notre équipe se déplace : elle emballe, charge et transporte le matériel. Vous n'avez rien à déplacer.",
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

/** Section de maillage : pages locales (si inscrites au registre) et autres catégories. */
export const CATEGORY_NEARBY = {
  title: "Partout dans le Grand Montréal",
  intro:
    "Nous ramassons partout au Québec. Voyez aussi nos pages par ville et les autres familles de matériel que nous rachetons.",
  localTitle: "Par ville",
  categoriesTitle: "Autres catégories",
  localItems: [
    { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
    { frPath: "/rachat-materiel-informatique-laval", label: "Laval" },
    { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
    { frPath: "/rachat-materiel-informatique-rive-sud", label: "Rive-Sud" },
    { frPath: "/rachat-materiel-informatique-longueuil", label: "Longueuil" },
    { frPath: "/rachat-materiel-informatique-terrebonne-mascouche", label: "Terrebonne et Mascouche" },
  ],
};

const PAYMENT_ANSWER =
  "La moitié du paiement est versée au ramassage. Le solde suit l'inspection du matériel, qui prend 15 jours ouvrables au maximum. Si l'état du matériel diffère de ce qui avait été décrit, l'offre est ajustée en conséquence.";

export const categoryPages: Record<CategoryPageId, CategoryPageContent> = {
  portables: {
    frPath: "/rachat-ordinateurs-portables-en-lot",
    label: "Ordinateurs portables et postes de travail",
    hero: {
      title: "Rachat d'ordinateurs portables, de postes de travail et d'écrans en lot",
      intro:
        "Vous renouvelez le parc informatique de votre entreprise ou videz des bureaux ? Techno Lot rachète vos portables, ordinateurs de bureau et écrans en lot, neufs, usagés ou partiellement fonctionnels. Notre offre vous parvient en 24 h.",
      image: { src: "/images/palette/obj-portable.webp", alt: "Ordinateur portable", width: 86 },
    },
    items: {
      title: "Ce que nous rachetons",
      intro:
        "Tout le matériel informatique d'un parc d'entreprise, en état de marche ou non. Le prix dépend de l'évaluation du lot.",
      items: [
        {
          title: "Ordinateurs portables",
          text: "Portables d'affaires, ultraportables et modèles convertibles, avec ou sans leur chargeur.",
        },
        {
          title: "Ordinateurs de bureau et postes de travail",
          text: "Tours et boîtiers compacts des postes de vos employés, quel que soit leur âge.",
        },
        {
          title: "Mini-PC",
          text: "Petits ordinateurs fixés derrière un écran ou installés aux comptoirs et dans les salles de réunion.",
        },
        {
          title: "Stations de travail",
          text: "Postes puissants pour le dessin technique, le montage ou le calcul, avec leurs cartes graphiques.",
        },
        {
          title: "Écrans et moniteurs",
          text: "Moniteurs de bureau de toutes tailles, simples ou en lot, y compris les modèles avec un défaut d'affichage.",
        },
        {
          title: "Accessoires",
          text: "Chargeurs, stations d'accueil, claviers, souris et câbles qui accompagnent les appareils.",
        },
      ],
    },
    factors: {
      title: "Ce qui influence l'offre",
      intro: "Chaque lot est évalué au cas par cas. Voici, à titre de repères généraux, ce qui compte le plus :",
      items: [
        {
          title: "Âge et génération du processeur",
          text: "Un appareil récent garde plus de valeur qu'un modèle de plusieurs générations plus ancien.",
        },
        {
          title: "Mémoire et stockage",
          text: "La quantité de mémoire vive et le type de stockage (disque dur ou SSD) font partie de l'évaluation.",
        },
        {
          title: "État de l'appareil",
          text: "Écran, clavier, boîtier et batterie : les marques d'usure ou les pièces brisées sont prises en compte.",
        },
        {
          title: "Quantité de modèles identiques",
          text: "Un lot de plusieurs appareils du même modèle est plus simple à évaluer et à remettre en circulation.",
        },
        {
          title: "Chargeurs inclus",
          text: "Les portables livrés avec leur chargeur et leurs accessoires sont mieux valorisés.",
        },
        {
          title: "Appareils verrouillés",
          text: "Un mot de passe BIOS ou une inscription à la gestion des appareils de l'entreprise doit être libéré pour que l'appareil puisse être réemployé.",
        },
      ],
      note: "Pas besoin d'inventaire parfait : une liste du matériel ou quelques photos suffisent pour recevoir une offre en 24 h.",
    },
    prepare: {
      title: "Préparer votre lot",
      intro: "Quelques gestes simples accélèrent l'évaluation et évitent les surprises à l'inspection.",
      items: [
        {
          title: "Dressez une liste",
          text: "Notez le modèle, la quantité et l'état général de chaque type d'appareil.",
        },
        {
          title: "Retirez les verrous de gestion",
          text: "Quand c'est possible, désinscrivez les appareils de la gestion des appareils de l'entreprise et retirez les mots de passe BIOS.",
        },
        {
          title: "Regroupez chargeurs et accessoires",
          text: "Rassemblez chargeurs, stations d'accueil et câbles avec les appareils correspondants.",
        },
        {
          title: "Signalez le matériel non fonctionnel",
          text: "Indiquez dans votre demande les appareils qui ne démarrent plus ou qui ont une pièce brisée.",
        },
        {
          title: "Laissez les disques en place",
          text: "Pas besoin de retirer les disques : nous les effaçons de manière sécurisée et vous remettons un certificat de destruction des données.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes",
      items: [
        {
          question: "Rachetez-vous les portables à l'écran brisé ou qui ne démarrent plus ?",
          answer:
            "Oui. Nous rachetons le matériel neuf, usagé ou partiellement fonctionnel. Un appareil endommagé vaut moins qu'un appareil en bon état, mais ses composants peuvent être réemployés ou recyclés. Signalez-le simplement dans votre demande.",
        },
        {
          question: "Faut-il retirer les disques durs avant le ramassage ?",
          answer:
            "Non. Vous pouvez laisser les disques dans les appareils : nous les effaçons de manière sécurisée et vous remettons un certificat de destruction des données, sans frais.",
        },
        {
          question: "Combien vaut mon lot d'ordinateurs ?",
          answer:
            "Cela dépend de l'âge des appareils, de leur configuration, de leur état, de la quantité et des accessoires inclus. Envoyez-nous la liste de votre matériel ou quelques photos : notre offre vous parvient en 24 h.",
        },
        {
          question: "Y a-t-il un minimum d'appareils ?",
          answer:
            "Non. Le ramassage est sans frais et sans minimum, partout au Québec. Notre équipe emballe, charge et transporte le matériel.",
        },
        {
          question: "Comment le paiement fonctionne-t-il ?",
          answer: PAYMENT_ANSWER,
        },
      ],
    },
    cta: {
      title: "Prêt à vendre votre lot d'ordinateurs ?",
      text: "Décrivez votre matériel : notre offre vous parvient en 24 h.",
    },
    service: {
      name: "Rachat d'ordinateurs portables, de postes de travail et d'écrans en lot",
      description:
        "Rachat en lot des portables, ordinateurs de bureau, mini-PC, stations de travail et écrans des entreprises du Québec : offre en 24 h, ramassage sans frais, effacement sécurisé des données.",
    },
  },

  serveurs: {
    frPath: "/rachat-serveurs-et-stockage",
    label: "Serveurs et stockage",
    hero: {
      title: "Rachat de serveurs, de stockage et de matériel de centre de données",
      intro:
        "Vous fermez une salle de serveurs ou décommissionnez une partie de votre centre de données ? Techno Lot rachète vos serveurs, baies de stockage et composants en lot, et coordonne le ramassage avec votre équipe TI.",
      image: { src: "/images/palette/obj-serveur.webp", alt: "Serveur en rack", width: 86 },
    },
    items: {
      title: "Ce que nous rachetons",
      intro:
        "Le matériel d'une salle de serveurs ou d'un centre de données, en service ou retiré depuis un moment. Le prix dépend de l'évaluation du lot.",
      items: [
        {
          title: "Serveurs en rack et en tour",
          text: "Serveurs montés en baie ou autonomes, avec leur configuration d'origine ou modifiée.",
        },
        {
          title: "Serveurs lames",
          text: "Lames et châssis, complets ou partiellement garnis.",
        },
        {
          title: "Baies de stockage (SAN, NAS)",
          text: "Unités de stockage en réseau, avec leurs tiroirs d'extension et leurs contrôleurs.",
        },
        {
          title: "Disques durs et SSD",
          text: "Disques retirés des serveurs ou encore en place, effacés de manière sécurisée avec certificat.",
        },
        {
          title: "Composants",
          text: "Processeurs, barrettes de mémoire, cartes réseau, cartes contrôleur et autres cartes d'extension.",
        },
        {
          title: "Commutateurs et équipements réseau",
          text: "Les switchs et routeurs de la salle de serveurs ont leur propre page : rachat d'équipements réseau et télécom.",
          linkFrPath: "/rachat-equipements-reseau-telecom",
        },
      ],
    },
    factors: {
      title: "Ce qui influence l'offre",
      intro: "Chaque lot est évalué au cas par cas. Voici, à titre de repères généraux, ce qui compte le plus :",
      items: [
        {
          title: "Génération et modèle",
          text: "Les serveurs de générations récentes gardent davantage de valeur sur le marché du réemploi.",
        },
        {
          title: "Configuration",
          text: "Le nombre et le type de processeurs, la quantité de mémoire et les disques installés pèsent dans l'évaluation.",
        },
        {
          title: "État",
          text: "Matériel fonctionnel, retiré du service ou en panne : l'état est vérifié à l'inspection.",
        },
        {
          title: "Quantité",
          text: "Plusieurs unités identiques ou une salle complète se valorisent plus facilement qu'une pièce isolée.",
        },
        {
          title: "Accessoires",
          text: "Rails, alimentations, façades et câbles livrés avec les serveurs comptent dans l'offre.",
        },
      ],
      note: "Une liste du matériel ou quelques photos suffisent pour recevoir une offre en 24 h.",
    },
    prepare: {
      title: "Planifier le décommissionnement",
      intro: "Une salle de serveurs se vide en quelques étapes claires, coordonnées avec votre équipe TI.",
      items: [
        {
          title: "Un inventaire du matériel",
          text: "Modèles, configurations, quantités et, si vous les avez, numéros de série : c'est la base de notre offre.",
        },
        {
          title: "Une coordination avec votre équipe TI",
          text: "Nous convenons avec vos responsables de ce qui part, dans quel ordre et à quelles conditions d'accès.",
        },
        {
          title: "Un ramassage planifié",
          text: "Le ramassage a lieu à la date convenue avec vous ; notre équipe emballe, charge et transporte le matériel.",
        },
        {
          title: "L'effacement sécurisé des disques",
          text: "Les disques sont effacés de manière sécurisée et vous recevez un certificat de destruction des données, sans frais.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes",
      items: [
        {
          question: "Peut-on laisser les disques dans les serveurs ?",
          answer:
            "Oui. Les disques peuvent rester en place : nous les effaçons de manière sécurisée et vous remettons un certificat de destruction des données, sans frais.",
        },
        {
          question: "Rachetez-vous les vieux serveurs ?",
          answer:
            "Oui. Nous rachetons le matériel neuf, usagé ou partiellement fonctionnel. Un serveur ancien vaut moins qu'un modèle récent, mais ses composants peuvent être réemployés ou recyclés. Le prix dépend de l'évaluation.",
        },
        {
          question: "Quel inventaire faut-il fournir ?",
          answer:
            "Idéalement les modèles, les configurations (processeurs, mémoire, disques), les quantités et les numéros de série si vous les avez. Une liste simple ou quelques photos suffisent toutefois pour recevoir une offre en 24 h.",
        },
        {
          question: "Qu'advient-il des données sur les disques ?",
          answer:
            "Tous les supports de stockage sont effacés de manière sécurisée. Nous vous remettons un certificat de destruction des données, sans frais.",
        },
        {
          question: "Comment le paiement fonctionne-t-il ?",
          answer: PAYMENT_ANSWER,
        },
      ],
    },
    cta: {
      title: "Vous videz une salle de serveurs ?",
      text: "Envoyez-nous votre inventaire : notre offre vous parvient en 24 h.",
    },
    service: {
      name: "Rachat de serveurs, de stockage et de matériel de centre de données",
      description:
        "Rachat en lot des serveurs, serveurs lames, baies de stockage, disques et composants des entreprises du Québec : offre en 24 h, ramassage planifié sans frais, effacement sécurisé des disques avec certificat.",
    },
  },

  reseau: {
    frPath: "/rachat-equipements-reseau-telecom",
    label: "Équipements réseau et télécom",
    hero: {
      title: "Rachat de switchs, routeurs, pare-feu et équipements de télécommunication",
      intro:
        "Vous remplacez votre réseau ou votre système téléphonique ? Techno Lot rachète les équipements réseau et télécom des entreprises, en lot, neufs, usagés ou partiellement fonctionnels. Notre offre vous parvient en 24 h.",
      image: { src: "/images/palette/obj-commutateur.webp", alt: "Commutateur réseau", width: 86 },
    },
    items: {
      title: "Ce que nous rachetons",
      intro: "Le matériel réseau et télécom de vos bureaux et de vos salles techniques. Le prix dépend de l'évaluation du lot.",
      items: [
        {
          title: "Commutateurs (switchs)",
          text: "Switchs d'accès, de distribution ou de cœur de réseau, gérés ou non.",
        },
        {
          title: "Routeurs",
          text: "Routeurs d'entreprise et de succursale, avec leurs modules d'interface.",
        },
        {
          title: "Pare-feu",
          text: "Appareils de sécurité réseau retirés lors d'une mise à niveau ou d'un changement de fournisseur.",
        },
        {
          title: "Points d'accès sans fil",
          text: "Bornes Wi-Fi de plafond ou murales, avec ou sans leurs supports de fixation.",
        },
        {
          title: "Téléphones IP et systèmes téléphoniques",
          text: "Appareils de bureau, consoles de réception et équipements des anciens systèmes téléphoniques.",
        },
        {
          title: "Autres équipements de télécommunication",
          text: "Passerelles, modules, panneaux et autre matériel de télécommunication d'entreprise.",
        },
      ],
    },
    factors: {
      title: "Ce qui influence l'offre",
      intro: "Chaque lot est évalué au cas par cas. Voici, à titre de repères généraux, ce qui compte le plus :",
      items: [
        {
          title: "Modèle et génération",
          text: "Les équipements récents trouvent plus facilement preneur sur le marché du réemploi.",
        },
        {
          title: "État",
          text: "Fonctionnement, ports, boîtier : l'état est vérifié à l'inspection.",
        },
        {
          title: "Quantité",
          text: "Un lot de plusieurs appareils identiques se valorise plus facilement qu'une pièce isolée.",
        },
        {
          title: "Modules et accessoires",
          text: "Alimentations, modules optiques et supports livrés avec les appareils comptent dans l'offre.",
        },
      ],
      note: "Une liste du matériel ou quelques photos suffisent pour recevoir une offre en 24 h.",
    },
    prepare: {
      title: "Préparer votre lot",
      intro: "Quelques gestes simples accélèrent l'évaluation de votre matériel réseau.",
      items: [
        {
          title: "Dressez un inventaire",
          text: "Notez les modèles, les quantités et l'état général de chaque type d'équipement.",
        },
        {
          title: "Réinitialisez les configurations",
          text: "Si possible, remettez les appareils aux paramètres d'usine. Sinon, signalez-le simplement dans votre demande.",
        },
        {
          title: "Regroupez alimentations et modules",
          text: "Rassemblez les alimentations, les modules optiques et les supports avec les appareils correspondants.",
        },
        {
          title: "Signalez le matériel non fonctionnel",
          text: "Indiquez dans votre demande les appareils en panne ou incomplets.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes",
      items: [
        {
          question: "Mes équipements sont encore configurés. Est-ce un problème ?",
          answer:
            "Non. Réinitialisez-les aux paramètres d'usine si vous le pouvez ; sinon, indiquez-le dans votre demande et nous en tiendrons compte.",
        },
        {
          question: "Rachetez-vous les vieux téléphones IP ?",
          answer:
            "Oui. Nous rachetons le matériel neuf, usagé ou partiellement fonctionnel. Le prix dépend de l'évaluation ; le matériel qui ne peut pas être réemployé est recyclé.",
        },
        {
          question: "Qu'en est-il des licences associées aux équipements ?",
          answer: "Les licences se discutent au cas par cas : mentionnez-les dans votre demande.",
        },
        {
          question: "En combien de temps recevrai-je une offre ?",
          answer:
            "En 24 h. Envoyez-nous la liste de votre matériel ou quelques photos par le formulaire de soumission ou par téléphone.",
        },
        {
          question: "Comment le paiement fonctionne-t-il ?",
          answer: PAYMENT_ANSWER,
        },
      ],
    },
    cta: {
      title: "Vous remplacez votre réseau ?",
      text: "Décrivez vos équipements : notre offre vous parvient en 24 h.",
    },
    service: {
      name: "Rachat d'équipements réseau et télécom",
      description:
        "Rachat en lot des switchs, routeurs, pare-feu, points d'accès sans fil et téléphones IP des entreprises du Québec : offre en 24 h, ramassage sans frais et sans minimum.",
    },
  },
};

/** Ordre d'affichage des catégories dans le maillage. */
export const CATEGORY_PAGE_IDS: readonly CategoryPageId[] = ["portables", "serveurs", "reseau"];
