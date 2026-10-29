import type { LocalCityContent } from "@/lib/seo/local-pages";

/** Villes de l'île de Montréal : pages en français seulement. Règles de contenu : docs/SEO-LOCAL.md. */
export const villesIlePages = {
  dorval: {
    frPath: "/rachat-materiel-informatique-dorval",
    city: "Dorval",
    hero: {
      title: "Rachat de matériel informatique à Dorval",
      intro:
        "Votre entreprise de Dorval change ses ordinateurs, déménage ses bureaux ou réduit sa salle de serveurs ? Techno Lot achète le matériel en lot après l'avoir évalué : vous recevez notre offre en 24 h, et le ramassage ne vous coûte rien.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "Du secteur de l'aéroport au bord du lac Saint-Louis",
      paragraphs: [
        "À Dorval, l'aéroport international Montréal-Trudeau occupe une large part du territoire, et une bonne partie de l'activité économique s'organise autour de lui. Aux abords de l'aéroport et le long des autoroutes 520 (Côte-de-Liesse) et 20, on trouve des entrepôts, des entreprises de transport et de logistique, des bureaux et des sièges sociaux. La ville s'étend ensuite jusqu'aux rives du lac Saint-Louis, avec ses commerces et ses quartiers résidentiels.",
        "Dans ces organisations, le matériel informatique travaille fort : postes de répartition, portables des équipes sur la route, serveurs, commutateurs, imprimantes d'étiquettes. Un renouvellement de flotte, la consolidation de deux bureaux ou la migration des serveurs vers le nuage laisse vite des appareils inutilisés. En les vendant en un seul lot, vous récupérez une partie de leur valeur et libérez de l'espace dans l'entrepôt ou la salle technique. Le matériel encore utile est remis en circulation pour une seconde vie ; le reste prend le chemin du recyclage des composants.",
        "Les bâtiments industriels du secteur ont souvent un quai de chargement ou une porte de garage, alors que certains immeubles de bureaux exigent de réserver le monte-charge ou une plage horaire de livraison. Précisez ces contraintes dans votre demande, avec la liste du matériel ou quelques photos : nous fixons ensemble une date de ramassage qui respecte l'horaire de vos opérations. Le jour convenu, notre équipe se déplace chez vous, emballe le matériel, le charge et le transporte.",
        "Nous desservons aussi les entreprises de Pointe-Claire, de Lachine et de Saint-Laurent, de même que le reste de l'île. Le ramassage est sans frais et sans minimum, partout au Québec.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Dorval",
          list: "Le secteur de l'aéroport, les abords des autoroutes 20 et 520, ainsi que les quartiers commerciaux et résidentiels qui bordent le lac Saint-Louis.",
        },
        {
          label: "Autour de Dorval",
          list: "Pointe-Claire, Lachine, Saint-Laurent et le reste de l'Ouest-de-l'Île.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Dorval",
      items: [
        {
          question: "Notre entreprise est dans le secteur de l'aéroport. Pouvez-vous venir chercher le matériel ?",
          answer:
            "Oui. Notre équipe se déplace chez vous partout à Dorval, y compris dans les zones d'affaires autour de l'aéroport et le long des autoroutes 20 et 520. Le ramassage ne coûte rien et ne demande aucune quantité minimale.",
        },
        {
          question: "Notre centre de distribution fonctionne selon des horaires serrés. Comment planifier le ramassage ?",
          answer:
            "Indiquez dans votre demande les heures de réception, le quai à utiliser et toute consigne d'accès au bâtiment. Nous convenons avec vous d'une date et d'un moment qui dérangent le moins possible vos opérations.",
        },
        {
          question: "Nous remplaçons les portables et les tablettes de nos équipes sur la route. Les rachetez-vous ?",
          answer:
            "Oui. Portables, tablettes, téléphones d'entreprise, stations d'accueil et accessoires peuvent faire partie du même lot. Joignez une liste ou quelques photos : nous évaluons l'ensemble et vous transmettons une seule offre.",
        },
        {
          question: "Combien de temps faut-il pour obtenir une offre ?",
          answer:
            "Vous recevez notre offre en 24 h. Pour la préparer, il nous suffit d'une liste du matériel, avec les modèles et les quantités, ou de quelques photos.",
        },
        {
          question: "Nos serveurs contiennent des données sur nos expéditions et nos clients. Comment sont-elles protégées ?",
          answer:
            "Chaque disque dur, SSD ou autre support de stockage est effacé de manière sécurisée. Vous recevez ensuite un certificat de destruction des données, sans frais.",
        },
        {
          question: "Quand recevons-nous l'argent ?",
          answer:
            "Une première moitié vous est versée au moment du ramassage. Le solde suit l'inspection, faite en 15 jours ouvrables au maximum. Si l'état d'un appareil ne correspond pas à sa description, l'offre est ajustée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur l'île et autour",
      items: [
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
        { frPath: "/rachat-materiel-informatique-kirkland", label: "Kirkland" },
        { frPath: "/rachat-materiel-informatique-lachine", label: "Lachine" },
        { frPath: "/rachat-materiel-informatique-saint-laurent", label: "Saint-Laurent" },
      ],
    },
    cta: {
      title: "Du matériel à vendre à Dorval ?",
      text: "Envoyez-nous la liste ou quelques photos de votre lot, et notre offre suit en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Dorval",
      description:
        "Entreprises de Dorval et du secteur de l'aéroport : Techno Lot rachète vos ordinateurs, serveurs et équipements réseau. Offre en 24 h, ramassage gratuit.",
    },
  },

  kirkland: {
    frPath: "/rachat-materiel-informatique-kirkland",
    city: "Kirkland",
    hero: {
      title: "Rachat de matériel informatique pour les entreprises de Kirkland",
      intro:
        "Bureaux le long de l'autoroute 40 ou commerces du boulevard Saint-Charles : si votre entreprise de Kirkland a du matériel informatique dont elle n'a plus besoin, Techno Lot le rachète en lot. Notre offre vous arrive en 24 h, et nous venons le chercher sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "De l'autoroute 40 au boulevard Saint-Charles",
      paragraphs: [
        "Kirkland, dans l'Ouest-de-l'Île, s'étend de part et d'autre de l'autoroute 40, la Transcanadienne. Le long de cet axe se succèdent des immeubles de bureaux, des sièges sociaux et des installations d'entreprises des sciences de la vie, notamment du secteur pharmaceutique. Le boulevard Saint-Charles, qui traverse la ville, réunit pour sa part des commerces et des bureaux de services ; la station Kirkland du Réseau express métropolitain a été aménagée à proximité, au nord de l'autoroute.",
        "Dans un siège social ou un laboratoire, l'informatique se renouvelle par vagues : remplacement des portables de tout un service, réaménagement d'étages, regroupement de salles de serveurs ou départ vers d'autres locaux. Les appareils retirés s'empilent alors dans une salle de rangement en attendant une décision. Les vendre en lot vous permet d'en récupérer une partie de la valeur, de libérer cet espace et de redonner une seconde vie à ce qui fonctionne encore. Les pièces qui ne peuvent plus servir sont orientées vers le recyclage des composants.",
        "Les grands immeubles de bureaux ont leurs règles : passage par le quai de chargement, réservation du monte-charge, accompagnement par le service de sécurité ou plage horaire imposée par la gestion de l'immeuble. Faites-nous part de ces consignes dès votre demande ; nous planifions le ramassage avec votre équipe des TI ou des installations. Notre équipe se déplace chez vous et s'occupe de l'emballage, du chargement et du transport, étage par étage s'il le faut.",
        "Nous rachetons également le matériel des entreprises de Pointe-Claire, de Beaconsfield, de Dollard-Des Ormeaux, de Pierrefonds-Roxboro et de Sainte-Anne-de-Bellevue, ainsi que de Dorval et du reste de l'île.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Kirkland",
          list: "Les abords de l'autoroute 40, le boulevard Saint-Charles et l'ensemble des secteurs résidentiels et commerciaux de la ville.",
        },
        {
          label: "Ouest-de-l'Île",
          list: "Pointe-Claire, Beaconsfield, Dollard-Des Ormeaux, Pierrefonds-Roxboro, Sainte-Anne-de-Bellevue et Dorval.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Kirkland",
      items: [
        {
          question: "Notre entreprise occupe un immeuble le long de l'autoroute 40. Le ramassage est-il possible ?",
          answer:
            "Oui. Que votre immeuble borde la Transcanadienne, donne sur le boulevard Saint-Charles ou se trouve ailleurs à Kirkland, notre équipe se déplace chez vous, sans frais et sans minimum de quantité.",
        },
        {
          question: "Notre entreprise pharmaceutique remplace les ordinateurs de ses laboratoires. Les rachetez-vous ?",
          answer:
            "Oui, pour la partie informatique et électronique : postes de travail, portables, serveurs, supports de stockage, équipements réseau et écrans. Envoyez-nous la liste ou quelques photos, et nous évaluons le tout.",
        },
        {
          question: "La gestion de notre immeuble impose des règles d'accès. En tenez-vous compte ?",
          answer:
            "Oui. Mentionnez dans votre demande la réservation du monte-charge, l'accès au quai, les heures permises ou l'accompagnement requis. Nous planifions le ramassage avec vous en fonction de ces consignes.",
        },
        {
          question: "Nos postes contiennent des données de recherche confidentielles. Que faites-vous des disques ?",
          answer:
            "Tous les supports de stockage sont effacés de manière sécurisée, puis nous vous remettons un certificat de destruction des données. Ce service est offert sans frais.",
        },
        {
          question: "Acceptez-vous des appareils en panne ?",
          answer:
            "Oui. Ils sont évalués au même titre que le matériel neuf ou usagé, et le prix tient compte de leur état. Ceux qui ne peuvent pas reprendre du service vont au recyclage des composants.",
        },
        {
          question: "Comment se déroulent l'offre et le paiement ?",
          answer:
            "Notre offre vous parvient en 24 h. Au ramassage, nous versons la moitié du montant convenu ; le solde est payé après l'inspection, réalisée en 15 jours ouvrables au maximum. L'offre est ajustée si l'état du matériel diffère de la description.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur l'île et autour",
      items: [
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
        { frPath: "/rachat-materiel-informatique-dorval", label: "Dorval" },
        { frPath: "/rachat-materiel-informatique-saint-laurent", label: "Saint-Laurent" },
        { frPath: "/rachat-materiel-informatique-lachine", label: "Lachine" },
      ],
    },
    cta: {
      title: "Votre entreprise de Kirkland a du matériel à vendre ?",
      text: "Décrivez votre lot en quelques lignes ou en photos : notre offre vous arrive en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Kirkland",
      description:
        "Bureaux et sièges sociaux de Kirkland, le long de la 40 : Techno Lot rachète vos lots informatiques, avec une offre en 24 h et un ramassage sans frais.",
    },
  },

  "cote-saint-luc": {
    frPath: "/rachat-materiel-informatique-cote-saint-luc",
    city: "Côte-Saint-Luc",
    hero: {
      title: "Vendez le matériel informatique de votre entreprise à Côte-Saint-Luc",
      intro:
        "Cabinet, clinique, commerce ou organisme de Côte-Saint-Luc, vous avez quelques ordinateurs ou un serveur de bureau à remplacer ? Techno Lot rachète aussi les petits lots : notre offre vous parvient en 24 h, et le ramassage est sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "Du boulevard Cavendish au chemin de la Côte-Saint-Luc",
      paragraphs: [
        "Côte-Saint-Luc est d'abord une ville résidentielle. Son activité économique repose surtout sur des commerces, des bureaux professionnels, des cliniques, des écoles et des organismes, dont plusieurs bordent le boulevard Cavendish et le chemin de la Côte-Saint-Luc. Une grande cour de triage ferroviaire occupe aussi une partie de son territoire.",
        "Dans ces organisations, les lots sont souvent modestes : quelques postes de travail, un ou deux portables, un serveur de bureau, une imprimante multifonction. Il n'y a aucun minimum, et un petit lot est évalué avec le même soin qu'un parc complet. Le vendre vous évite de le garder dans un placard, vous permet d'en récupérer une partie de la valeur et lui donne une seconde vie ; ce qui ne peut plus servir est dirigé vers le recyclage des composants.",
        "Un cabinet, une clinique ou un organisme conserve souvent des dossiers de clients ou de patients sur ses ordinateurs. Avant de laisser partir ces appareils, vous voulez savoir ce que deviennent les données. Les disques durs, les SSD et les autres supports sont effacés de manière sécurisée, et vous recevez un certificat de destruction des données, sans frais, à conserver avec vos documents.",
        "Pour le ramassage, indiquez-nous simplement l'entrée à utiliser, l'étage et le moment qui dérange le moins votre clientèle. Un petit immeuble de bureaux ou un local commercial n'a souvent ni quai ni monte-charge, et ce n'est pas un obstacle : notre équipe se déplace chez vous, emballe elle-même le matériel, le charge et le transporte, quelle que soit la configuration des lieux. Nous desservons aussi Hampstead, Montréal-Ouest, Notre-Dame-de-Grâce et le reste de l'île.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Côte-Saint-Luc",
          list: "Les commerces et les bureaux du boulevard Cavendish et du chemin de la Côte-Saint-Luc, ainsi que tous les autres secteurs de la ville.",
        },
        {
          label: "Autour de Côte-Saint-Luc",
          list: "Hampstead, Montréal-Ouest, Notre-Dame-de-Grâce et les autres secteurs de l'île de Montréal.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Côte-Saint-Luc",
      items: [
        {
          question: "Nous n'avons que trois ordinateurs et une imprimante. Est-ce assez pour un ramassage ?",
          answer:
            "Oui. Aucune quantité minimale n'est exigée, et le ramassage reste sans frais même pour quelques appareils. Envoyez-nous la liste ou une photo : nous vous faisons une offre.",
        },
        {
          question: "Notre clinique garde des dossiers de patients sur ses postes. Comment les données sont-elles traitées ?",
          answer:
            "Chaque disque dur, SSD ou autre support de stockage est effacé de manière sécurisée. Nous vous remettons ensuite un certificat de destruction des données, sans frais, que vous pouvez conserver avec vos documents administratifs.",
        },
        {
          question: "Pouvons-nous vendre seulement le serveur de notre bureau ?",
          answer:
            "Oui. Un seul serveur, une baie de stockage ou un commutateur peut faire l'objet d'une offre. Indiquez le modèle et son état, ou joignez quelques photos à votre demande.",
        },
        {
          question: "Le ramassage peut-il se faire sans déranger notre clientèle ?",
          answer:
            "Dites-nous quelle entrée utiliser et quel moment de la journée vous convient ; nous planifions le ramassage avec vous. Notre équipe s'occupe de l'emballage et du transport.",
        },
        {
          question: "Que se passe-t-il si un ordinateur ne démarre plus ?",
          answer:
            "Il est évalué comme les autres : nous examinons le matériel neuf, usagé ou partiellement fonctionnel, et c'est cette évaluation qui détermine le prix. Ce qui ne peut pas être réutilisé va au recyclage des composants.",
        },
        {
          question: "Quand l'offre et le paiement arrivent-ils ?",
          answer:
            "L'offre vous parvient en 24 h. La moitié du paiement vous est remise au ramassage, et le solde après l'inspection, qui dure 15 jours ouvrables au maximum. Si l'état du matériel ne correspond pas à la description, l'offre est révisée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur l'île et autour",
      items: [
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
        { frPath: "/rachat-materiel-informatique-saint-laurent", label: "Saint-Laurent" },
        { frPath: "/rachat-materiel-informatique-lasalle", label: "LaSalle" },
        { frPath: "/rachat-materiel-informatique-lachine", label: "Lachine" },
      ],
    },
    cta: {
      title: "Quelques appareils à vendre à Côte-Saint-Luc ?",
      text: "Petit lot ou plus gros, décrivez-le-nous : notre offre vous parvient en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Côte-Saint-Luc",
      description:
        "Commerces, cliniques et bureaux de Côte-Saint-Luc : Techno Lot rachète aussi les petits lots informatiques. Offre en 24 h, données effacées, aucun minimum.",
    },
  },
} satisfies Record<string, LocalCityContent>;
