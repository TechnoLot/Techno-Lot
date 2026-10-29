import type { LocalCityContent } from "@/lib/seo/local-pages";

/** Rive-Sud : pages en français seulement. Règles de contenu : docs/SEO-LOCAL.md. */
export const riveSudPages = {
  "rive-sud": {
    frPath: "/rachat-materiel-informatique-rive-sud",
    city: "Rive-Sud",
    hero: {
      title: "Rachat de matériel informatique sur la Rive-Sud",
      intro:
        "De Boucherville à Châteauguay, en passant par Longueuil, Brossard et la vallée du Richelieu, chaque entreprise finit par avoir du matériel informatique en trop. Techno Lot le rachète en lot : vous recevez notre offre en 24 h, et notre équipe vient le chercher sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "De Varennes à Châteauguay, toute la Rive-Sud",
      paragraphs: [
        "La Rive-Sud de Montréal réunit l'agglomération de Longueuil, avec Longueuil, Brossard, Boucherville, Saint-Bruno-de-Montarville et Saint-Lambert, les villes du Roussillon comme La Prairie, Candiac, Delson, Saint-Constant, Sainte-Catherine et Châteauguay, puis Varennes, Sainte-Julie, Chambly, Beloeil et Mont-Saint-Hilaire. Les entreprises s'y concentrent le long des autoroutes 10, 15, 20 et 30, sur le boulevard Taschereau et la route 132, ainsi que dans les parcs industriels de Boucherville, de Longueuil et de Saint-Bruno-de-Montarville.",
        "Entrepôts, ateliers de fabrication, bureaux de services, cliniques et commerces : chacun finit par remplacer ses postes, ses écrans, ses serveurs ou ses commutateurs. Une migration vers le nuage, un logiciel qui exige des appareils plus récents ou un réaménagement des locaux laisse alors du matériel de côté, souvent empilé dans une salle technique. Vendu en un seul lot, il vous rapporte une partie de sa valeur et vous redonne de l'espace. Ce qui fonctionne encore trouve une seconde vie, et le reste part vers le recyclage des composants.",
        "Bien des entreprises ont leurs bureaux à Montréal et un entrepôt sur la Rive-Sud, de l'autre côté des ponts Jacques-Cartier, Samuel-De Champlain ou Victoria, ou du pont-tunnel Louis-Hippolyte-La Fontaine. Inutile de rapatrier le matériel à une seule adresse : une seule demande couvre les deux sites. Précisez ce qui se trouve à chaque endroit, l'accès au quai de chargement ou à la porte de garage et les heures où l'on peut entrer, puis nous convenons ensemble des dates de ramassage. Notre équipe se déplace chez vous et s'occupe de l'emballage, du chargement et du transport.",
        "Longueuil et Brossard ont chacune leur propre page, accessible plus bas, avec des réponses adaptées à leurs secteurs.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Agglomération de Longueuil",
          list: "Longueuil, Brossard, Boucherville, Saint-Bruno-de-Montarville et Saint-Lambert.",
        },
        {
          label: "Roussillon",
          list: "La Prairie, Candiac, Delson, Saint-Constant, Sainte-Catherine et Châteauguay.",
        },
        {
          label: "Autres villes de la Rive-Sud",
          list: "Varennes, Sainte-Julie, Chambly, Beloeil et Mont-Saint-Hilaire.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat sur la Rive-Sud",
      items: [
        {
          question: "Jusqu'où vous déplacez-vous sur la Rive-Sud ?",
          answer:
            "Partout : de Varennes et Sainte-Julie jusqu'à Châteauguay, et de Saint-Lambert jusqu'à Beloeil et Mont-Saint-Hilaire. Le ramassage ne coûte rien et n'exige aucun minimum, où que soit votre entreprise au Québec.",
        },
        {
          question: "Nous avons des bureaux à Montréal et un entrepôt sur la Rive-Sud. Faut-il deux demandes ?",
          answer:
            "Non, une seule demande couvre les deux adresses. Indiquez le matériel présent à chaque endroit ou joignez quelques photos : nous évaluons le tout et vous transmettons une offre globale en 24 h. Les ramassages sont ensuite planifiés avec vous, site par site.",
        },
        {
          question: "Notre entreprise a un entrepôt dans un parc industriel de Boucherville ou de Saint-Bruno-de-Montarville. Que faut-il prévoir ?",
          answer:
            "Très peu de choses. Dites-nous s'il y a un quai de chargement ou une porte de garage, et à quelles heures l'accès est possible. Notre équipe s'occupe de l'emballage, du chargement et du transport ; votre personnel n'a rien à manipuler.",
        },
        {
          question: "Comment vos données sont-elles protégées ?",
          answer:
            "Chaque support de stockage, disque dur ou SSD, fait l'objet d'un effacement sécurisé. Vous recevez ensuite un certificat de destruction des données, sans frais.",
        },
        {
          question: "Le matériel en panne peut-il faire partie du lot ?",
          answer:
            "Oui, il est évalué comme le reste, du matériel neuf aux appareils usagés ou qui ne fonctionnent qu'en partie. Le prix découle de cette évaluation, et ce qui ne peut pas reprendre du service est confié au recyclage des composants.",
        },
        {
          question: "À quel moment le paiement est-il versé ?",
          answer:
            "Vous recevez la moitié du paiement au moment du ramassage. Le solde suit l'inspection, terminée en 15 jours ouvrables au plus. Si le matériel ne correspond pas à la description, l'offre est revue selon son état réel.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs dans la région",
      items: [
        { frPath: "/rachat-materiel-informatique-longueuil", label: "Longueuil" },
        { frPath: "/rachat-materiel-informatique-brossard", label: "Brossard" },
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
      ],
    },
    cta: {
      title: "Du matériel à vendre sur la Rive-Sud ?",
      text: "Une adresse ou plusieurs, de part et d'autre du fleuve : décrivez votre lot et recevez notre offre en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique sur la Rive-Sud",
      description:
        "Longueuil, Brossard, Boucherville, La Prairie, Châteauguay : Techno Lot rachète le matériel informatique des entreprises de la Rive-Sud. Offre en 24 h.",
    },
  },

  longueuil: {
    frPath: "/rachat-materiel-informatique-longueuil",
    city: "Longueuil",
    hero: {
      title: "Rachat de matériel informatique à Longueuil",
      intro:
        "Du Vieux-Longueuil à Saint-Hubert et Greenfield Park, Techno Lot rachète en lot les ordinateurs, serveurs et équipements réseau dont votre entreprise n'a plus l'usage. Notre offre vous est transmise en 24 h, et le ramassage ne vous coûte rien.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "Du Vieux-Longueuil à Saint-Hubert, en passant par Greenfield Park",
      paragraphs: [
        "Longueuil compte trois arrondissements : Le Vieux-Longueuil, qui englobe le secteur LeMoyne, Saint-Hubert et Greenfield Park. Les tours de bureaux se regroupent autour de la station de métro Longueuil–Université-de-Sherbrooke, qui dessert le campus de Longueuil de l'Université de Sherbrooke. Les entreprises industrielles et de distribution occupent plutôt les secteurs longés par les autoroutes 20 et 30, tandis que les commerces bordent le boulevard Taschereau et le chemin de Chambly.",
        "À Saint-Hubert, l'aéroport accueille le siège de l'Agence spatiale canadienne, et l'École nationale d'aérotechnique du Cégep Édouard-Montpetit y forme la relève de l'aérospatiale. Dans ce pôle, comme dans les bureaux du secteur du métro, les postes de conception, les stations de travail et les serveurs sont remplacés à mesure que les logiciels se font plus exigeants. L'ancien matériel garde pourtant une valeur : vendu en lot, il libère une salle de rangement et vous rapporte une partie de ce qu'il vaut. Les appareils encore utiles sont remis en circulation ; les autres sont confiés au recyclage des composants.",
        "Les tours du secteur du métro ont souvent un monte-charge à réserver et des heures fixes pour les déménagements ; les bâtiments industriels de Saint-Hubert disposent plutôt d'un quai ou d'une porte de garage. Décrivez ces accès dans votre demande. Nous fixons la date du ramassage en tenant compte de ces contraintes, puis notre équipe se déplace chez vous pour emballer, charger et emporter le matériel, sans que vous ayez à le préparer à l'avance.",
        "Nous desservons aussi Boucherville, Saint-Lambert et Saint-Bruno-de-Montarville, les autres villes de l'agglomération, de même que Brossard, qui a sa propre page.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Arrondissements de Longueuil",
          list: "Le Vieux-Longueuil, dont le secteur LeMoyne, Saint-Hubert et Greenfield Park.",
        },
        {
          label: "Milieux d'affaires",
          list: "Secteur du métro Longueuil–Université-de-Sherbrooke, pôle aérospatial de l'aéroport de Saint-Hubert, zones industrielles le long des autoroutes 20 et 30, commerces du boulevard Taschereau et du chemin de Chambly.",
        },
        {
          label: "Villes voisines",
          list: "Boucherville, Saint-Lambert, Saint-Bruno-de-Montarville et Brossard.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Longueuil",
      items: [
        {
          question: "Vous déplacez-vous à Saint-Hubert et à Greenfield Park, ou seulement dans le Vieux-Longueuil ?",
          answer:
            "Dans les trois arrondissements. Que votre entreprise soit dans le Vieux-Longueuil, à Saint-Hubert ou à Greenfield Park, notre équipe se déplace chez vous, sans frais et sans quantité minimale.",
        },
        {
          question: "Notre entreprise occupe un étage dans une tour près du métro. Comment se passe le ramassage ?",
          answer:
            "Indiquez-nous l'étage, l'accès au monte-charge et les plages horaires autorisées par l'immeuble. Nous fixons la date en fonction de ces règles, et notre équipe descend elle-même le matériel : vous n'avez pas à l'apporter au rez-de-chaussée.",
        },
        {
          question: "Notre entreprise travaille dans l'aérospatiale à Saint-Hubert. Évaluez-vous les stations de travail et les serveurs de calcul ?",
          answer:
            "Oui, comme tout autre matériel informatique : stations de conception, serveurs, équipements réseau et stockage. Les supports de stockage font l'objet d'un effacement sécurisé, et vous recevez un certificat de destruction des données, sans frais.",
        },
        {
          question: "Quel est le délai pour obtenir votre offre ?",
          answer:
            "Vous la recevez en 24 h. Envoyez-nous un inventaire, même sommaire, ou des photos des appareils : c'est suffisant pour évaluer le lot.",
        },
        {
          question: "Est-ce que quelques portables suffisent pour faire une demande ?",
          answer:
            "Oui. Aucune quantité minimale n'est exigée : trois portables ou une salle de serveurs complète, le ramassage reste sans frais. Le matériel neuf, usagé ou partiellement fonctionnel est évalué, et le prix dépend de cette évaluation.",
        },
        {
          question: "Quand recevons-nous le paiement ?",
          answer:
            "Une première moitié vous est versée lors du ramassage. Le reste suit l'inspection, menée en 15 jours ouvrables au maximum. Si nous constatons un écart entre l'état du matériel et sa description, nous ajustons l'offre en conséquence.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur la Rive-Sud",
      items: [
        { frPath: "/rachat-materiel-informatique-rive-sud", label: "Rive-Sud" },
        { frPath: "/rachat-materiel-informatique-brossard", label: "Brossard" },
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
      ],
    },
    cta: {
      title: "Votre lot est prêt à quitter vos locaux de Longueuil ?",
      text: "Faites-nous parvenir la liste de votre matériel : vous aurez notre offre en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Longueuil",
      description:
        "Du Vieux-Longueuil à Saint-Hubert, Techno Lot rachète les ordinateurs, serveurs et équipements réseau des entreprises. Offre en 24 h, ramassage sans frais.",
    },
  },

  brossard: {
    frPath: "/rachat-materiel-informatique-brossard",
    city: "Brossard",
    hero: {
      title: "Rachat de matériel informatique pour les entreprises de Brossard",
      intro:
        "Bureaux du Quartier DIX30, commerces du boulevard Taschereau ou entreprises de services : à Brossard, Techno Lot rachète en lot le matériel informatique qui ne vous sert plus. Vous avez notre offre en 24 h, et notre équipe passe le chercher sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "Du Quartier DIX30 au boulevard Taschereau",
      paragraphs: [
        "Brossard s'organise autour de grands axes : les autoroutes 10 et 15, qui mènent au pont Samuel-De Champlain, l'autoroute 30 et les boulevards Taschereau, de Rome et Lapinière. Au croisement des autoroutes 10 et 30, le Quartier DIX30 réunit bureaux et commerces, tandis que Solar Uniquartier, un projet mixte, ajoute des tours de bureaux au paysage. Le Mail Champlain marque l'angle des boulevards Taschereau et Lapinière, et les stations du REM Panama, Du Quartier et Brossard relient la ville au centre-ville de Montréal.",
        "Cette concentration de bureaux, de cliniques et de boutiques renouvelle son équipement à un rythme soutenu : portables en fin de bail, terminaux de caisse remplacés, écrans changés lors d'un réaménagement. Plutôt que d'accumuler ces appareils dans un placard, vendez-les en un seul lot. Vous récupérez une part de leur valeur et de la place ; le matériel en état reprend du service ailleurs, et ce qui ne peut plus servir est dirigé vers le recyclage des composants.",
        "Dans les immeubles de bureaux récents, l'accès se fait souvent par un stationnement souterrain ou une aire de livraison à réserver ; dans les centres commerciaux, il faut parfois composer avec les heures d'ouverture. Signalez-nous ces conditions en remplissant votre demande. Nous choisissons alors avec vous le moment du ramassage, et notre équipe se déplace chez vous pour emballer, charger et transporter le matériel.",
        "Nous ramassons également dans les environs de Brossard, notamment à Saint-Lambert, à Longueuil, à La Prairie et à Candiac. Votre entreprise occupe aussi des locaux à Montréal ou ailleurs sur la Rive-Sud ? Inscrivez toutes les adresses dans votre demande : nous les évaluons ensemble.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Pôles d'affaires de Brossard",
          list: "Quartier DIX30, Solar Uniquartier, secteur du Mail Champlain et abords des stations Panama, Du Quartier et Brossard du REM.",
        },
        {
          label: "Grands axes",
          list: "Boulevards Taschereau, de Rome et Lapinière, autoroutes 10, 15 et 30.",
        },
        {
          label: "Environs",
          list: "Saint-Lambert, Longueuil, La Prairie et Candiac.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Brossard",
      items: [
        {
          question: "Notre entreprise a ses bureaux au Quartier DIX30. Pouvez-vous y faire le ramassage ?",
          answer:
            "Oui. Dites-nous par où notre équipe doit entrer, quel quai ou quelle aire de livraison utiliser et à quel moment l'accès est permis. Le ramassage est planifié selon ces conditions, sans frais pour vous.",
        },
        {
          question: "Notre commerce est dans un centre commercial comme le Mail Champlain. Comment éviter de déranger la clientèle ?",
          answer:
            "Précisez les heures d'ouverture et l'entrée de service dans votre demande : nous choisissons ensemble un moment de ramassage qui convient à votre commerce. Notre équipe emballe le matériel et l'emporte sans que votre personnel ait à le transporter.",
        },
        {
          question: "Nous avons une succursale à Brossard et une autre à Montréal. Une seule demande suffit-elle ?",
          answer:
            "Oui. Regroupez les deux adresses dans la même demande et précisez ce qui se trouve à chacune. Vous recevez une offre pour l'ensemble, puis les ramassages sont organisés avec vous.",
        },
        {
          question: "Nos portables contiennent des renseignements sur nos clients. Que faites-vous des données ?",
          answer:
            "Les disques durs et les SSD sont effacés selon une méthode sécurisée. Une fois l'effacement terminé, vous obtenez un certificat de destruction des données, remis sans frais.",
        },
        {
          question: "Pouvons-nous inclure des appareils brisés ou vendre un tout petit lot ?",
          answer:
            "Oui. Il n'y a pas de minimum, et chaque appareil est évalué, qu'il soit neuf, usagé ou fonctionnel en partie. Le prix tient compte de cette évaluation ; ce qui ne peut plus être réemployé va au recyclage des composants.",
        },
        {
          question: "Comment se déroulent l'offre et le paiement ?",
          answer:
            "Nous vous transmettons notre offre en 24 h. Au ramassage, vous touchez la moitié du paiement ; le solde est versé après une inspection qui dure au plus 15 jours ouvrables. Si l'état réel du matériel ne correspond pas à ce qui était décrit, l'offre est ajustée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur la Rive-Sud",
      items: [
        { frPath: "/rachat-materiel-informatique-rive-sud", label: "Rive-Sud" },
        { frPath: "/rachat-materiel-informatique-longueuil", label: "Longueuil" },
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
      ],
    },
    cta: {
      title: "Prêt à vendre votre lot à Brossard ?",
      text: "Joignez quelques photos ou un inventaire à votre demande, et notre offre suivra en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Brossard",
      description:
        "Bureaux du DIX30, commerces de Taschereau : Techno Lot rachète le matériel informatique des entreprises de Brossard. Offre en 24 h, ramassage sans frais.",
    },
  },
} satisfies Record<string, LocalCityContent>;
