import type { LocalCityContent } from "@/lib/seo/local-pages";

/** Arrondissements de Montréal : pages en français seulement. Règles de contenu : docs/SEO-LOCAL.md. */
export const arrondissementsPages = {
  "saint-laurent": {
    frPath: "/rachat-materiel-informatique-saint-laurent",
    city: "Saint-Laurent",
    hero: {
      title: "Rachat de matériel informatique dans Saint-Laurent",
      intro:
        "Votre entreprise de l'arrondissement de Saint-Laurent remplace des postes, réaménage un laboratoire ou libère une salle de serveurs ? Nous rachetons ce matériel en un seul lot, avec une offre en 24 h et un ramassage sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "Du Technoparc au Vieux-Saint-Laurent, tout l'arrondissement",
      paragraphs: [
        "L'arrondissement de Saint-Laurent compte parmi les grands pôles industriels et technologiques de Montréal. Ses parcs industriels s'étendent autour des autoroutes 13 et 40 et le long de l'autoroute 520, le chemin de la Côte-de-Liesse, jusqu'aux abords de l'aéroport Montréal-Trudeau. Le Technoparc Montréal y accueille des entreprises en sciences de la vie, en aérospatiale et en technologies, alors que fabricants, distributeurs et bureaux occupent le reste du territoire.",
        "Dans ces milieux, le matériel informatique tourne vite. Un laboratoire qui renouvelle ses postes d'analyse, un centre de distribution qui change ses terminaux et ses imprimantes, une équipe d'ingénierie qui passe à des stations de travail plus puissantes : chaque projet laisse des appareils en surplus. Vendus en lot, ils vous rapportent une partie de leur valeur et libèrent l'espace qu'ils occupaient dans l'entrepôt ou la salle technique. Ceux qui peuvent encore servir sont remis en circulation pour une seconde vie ; les autres prennent le chemin du recyclage des composants.",
        "Les bâtiments industriels de l'arrondissement ont souvent un quai de chargement, une réception des marchandises à heures fixes et une salle de serveurs à accès contrôlé. Précisez ces détails dans votre demande, avec le nom de la personne qui accueillera notre équipe, et nous fixons ensemble la date du ramassage. Notre équipe se déplace chez vous, emballe le matériel, le charge et le transporte. Si votre entreprise occupe plusieurs bâtiments dans Saint-Laurent, un seul formulaire suffit pour l'ensemble.",
        "Les commerces et les bureaux des quartiers résidentiels, comme Norgate, Chameran ou le Vieux-Saint-Laurent autour de l'avenue Sainte-Croix, sont servis de la même façon, tout comme les secteurs qui bordent les stations du REM, de Côte-de-Liesse à Bois-Franc. Dorval, Lachine, Côte-Saint-Luc et Laval ont chacune leur propre page.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Parcs d'affaires et industriels",
          list: "Technoparc Montréal, parcs industriels autour des autoroutes 13, 40 et 520, et abords de l'aéroport Montréal-Trudeau.",
        },
        {
          label: "Quartiers de l'arrondissement",
          list: "Vieux-Saint-Laurent, Norgate, Chameran et Bois-Franc, ainsi que les secteurs des stations du REM Côte-de-Liesse, Montpellier, Du Ruisseau et Bois-Franc.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat dans Saint-Laurent",
      items: [
        {
          question: "Notre entreprise est dans le Technoparc. Pouvez-vous y venir chercher le matériel ?",
          answer:
            "Oui. Le Technoparc, les parcs industriels de l'arrondissement de Saint-Laurent et les bureaux de ses quartiers résidentiels sont tous desservis. Notre équipe se déplace chez vous, sans frais et sans minimum de quantité.",
        },
        {
          question: "Rachetez-vous les ordinateurs et les serveurs utilisés dans un laboratoire ?",
          answer:
            "Oui. Les postes de travail, les serveurs, les écrans et les équipements réseau d'un laboratoire sont évalués comme tout autre matériel. Précisez les modèles et leur état dans votre demande ; si l'état constaté diffère de la description, l'offre est ajustée.",
        },
        {
          question:
            "Notre bâtiment de Saint-Laurent a un quai de chargement et une réception à heures fixes. Comment s'organise le ramassage ?",
          answer:
            "Indiquez-nous le quai à utiliser, les heures de réception et la personne à joindre sur les lieux. Nous convenons ensuite d'une date avec vous, et notre équipe s'occupe de l'emballage, du chargement et du transport.",
        },
        {
          question: "Nos serveurs contiennent des données confidentielles. Comment sont-elles protégées ?",
          answer:
            "Chaque support de stockage, disque dur ou SSD, est effacé de façon sécurisée. Vous recevez ensuite un certificat de destruction des données, sans frais, à verser à vos dossiers.",
        },
        {
          question: "Combien de temps faut-il pour obtenir une offre ?",
          answer:
            "Comptez 24 h après l'envoi de votre demande. Une liste des modèles ou quelques photos nous permettent d'évaluer le lot, que le matériel soit neuf, usagé ou partiellement fonctionnel.",
        },
        {
          question: "Quand le paiement est-il versé ?",
          answer:
            "Une première moitié vous est versée au ramassage. Le solde suit l'inspection, faite en 15 jours ouvrables au maximum ; si l'état réel s'écarte de la description, l'offre est ajustée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur l'île et autour",
      items: [
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
        { frPath: "/rachat-materiel-informatique-dorval", label: "Dorval" },
        { frPath: "/rachat-materiel-informatique-lachine", label: "Lachine" },
        { frPath: "/rachat-materiel-informatique-cote-saint-luc", label: "Côte-Saint-Luc" },
        { frPath: "/rachat-materiel-informatique-laval", label: "Laval" },
      ],
    },
    cta: {
      title: "Prêt à vendre le matériel de votre entreprise dans Saint-Laurent ?",
      text: "Joignez la liste de vos appareils ou quelques photos à votre demande, et notre offre suit en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique dans Saint-Laurent",
      description:
        "Entreprises de l'arrondissement de Saint-Laurent : Techno Lot rachète vos postes, serveurs et équipements réseau. Offre en 24 h, ramassage sans frais.",
    },
  },

  lachine: {
    frPath: "/rachat-materiel-informatique-lachine",
    city: "Lachine",
    hero: {
      title: "Rachat de matériel informatique pour les entreprises de Lachine",
      intro:
        "De la zone industrielle au nord de l'autoroute 20 jusqu'aux commerces du Vieux-Lachine, Techno Lot rachète le matériel informatique dont votre entreprise n'a plus besoin. Vous recevez notre offre en 24 h, et notre équipe ramasse le lot sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "Du lac Saint-Louis au nord de l'autoroute 20",
      paragraphs: [
        "L'arrondissement de Lachine s'étend du lac Saint-Louis et du canal de Lachine, au sud, jusqu'à l'autoroute 20 et au chemin de la Côte-de-Liesse, au nord. Sa plus forte concentration industrielle se trouve au nord de l'autoroute, à proximité de l'aéroport Montréal-Trudeau : entrepôts, ateliers, transporteurs et bureaux administratifs. Plus au sud, le Vieux-Lachine et le boulevard Saint-Joseph, en bordure du lac, réunissent commerces, restaurants et services professionnels.",
        "Un déménagement vers un bâtiment plus récent, la fin d'un bail ou l'arrivée d'un nouveau système de gestion d'entrepôt : autant d'occasions où des ordinateurs, des terminaux, des imprimantes et des commutateurs restent sans usage. Les garder occupe une surface qui pourrait servir à l'entreposage ou à la production. En les vendant en lot, vous en récupérez une partie de la valeur, et les appareils qui fonctionnent encore sont remis en circulation. Ce qui ne peut plus servir est dirigé vers le recyclage des composants.",
        "Dans un bâtiment industriel, le ramassage passe généralement par le quai de chargement ou la porte de garage. Dites-nous lequel utiliser, les heures où la cour est dégagée et si le matériel est réparti entre l'entrepôt, les bureaux et la salle des serveurs. Nous fixons la date ensemble, puis notre équipe se déplace chez vous pour emballer, charger et transporter le tout.",
        "Lachine-Est, ancienne friche industrielle en bordure du canal, est en pleine transformation ; si votre entreprise déménage dans ce contexte, le matériel que vous n'emportez pas peut partir en un seul lot. Duff-Court, Saint-Pierre et le reste de l'arrondissement sont desservis aussi. LaSalle, Dorval et Saint-Laurent ont leur propre page.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Quartiers de Lachine",
          list: "Vieux-Lachine, boulevard Saint-Joseph et rive du lac Saint-Louis, Lachine-Est, Duff-Court et Saint-Pierre.",
        },
        {
          label: "Zones d'affaires",
          list: "Zone industrielle au nord de l'autoroute 20, abords du canal de Lachine et secteur de l'aéroport Montréal-Trudeau.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Lachine",
      items: [
        {
          question: "Nos locaux sont dans la zone industrielle au nord de l'autoroute 20. Vous y déplacez-vous ?",
          answer:
            "Oui. Notre équipe se déplace dans toute la zone industrielle, comme dans le reste de l'arrondissement de Lachine, sans frais et sans minimum de quantité. Indiquez simplement l'adresse et l'accès à utiliser.",
        },
        {
          question: "Nous quittons nos locaux de Lachine-Est. Pouvons-nous vendre le matériel que nous n'emportons pas ?",
          answer:
            "Oui. Dressez la liste de ce qui reste, ou prenez quelques photos, et joignez-la à votre demande. Nous évaluons le lot, et le ramassage est planifié selon votre calendrier de déménagement.",
        },
        {
          question: "Notre commerce du boulevard Saint-Joseph n'a que quelques appareils. Est-ce suffisant ?",
          answer:
            "Tout à fait : aucun minimum n'est exigé. Deux portables, un terminal et une imprimante peuvent faire l'objet d'une offre, et le ramassage reste sans frais.",
        },
        {
          question: "Achetez-vous les appareils en panne ?",
          answer:
            "Ils sont évalués comme le reste, qu'ils soient neufs, usagés ou partiellement fonctionnels ; le prix offert dépend de cette évaluation. Les pièces qui ne trouvent pas de seconde vie partent au recyclage des composants.",
        },
        {
          question: "Comment savoir que nos données ont bien été effacées ?",
          answer:
            "Les disques et les autres supports passent par un effacement sécurisé, puis vous recevez un certificat de destruction des données, sans frais, qui couvre les supports de votre lot.",
        },
        {
          question: "À quel moment recevons-nous l'offre, puis le paiement ?",
          answer:
            "L'offre arrive en 24 h. La moitié du montant est versée au ramassage et le solde après l'inspection, qui dure 15 jours ouvrables au maximum ; l'offre est ajustée si l'état diffère de la description.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur l'île et autour",
      items: [
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
        { frPath: "/rachat-materiel-informatique-lasalle", label: "LaSalle" },
        { frPath: "/rachat-materiel-informatique-dorval", label: "Dorval" },
        { frPath: "/rachat-materiel-informatique-saint-laurent", label: "Saint-Laurent" },
      ],
    },
    cta: {
      title: "Votre lot est prêt à quitter Lachine ?",
      text: "Décrivez-nous votre matériel en quelques lignes : vous aurez notre offre en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Lachine",
      description:
        "Entrepôt, bureau ou commerce à Lachine ? Techno Lot rachète vos ordinateurs, serveurs et équipements réseau en lot : offre en 24 h, ramassage sans frais.",
    },
  },

  lasalle: {
    frPath: "/rachat-materiel-informatique-lasalle",
    city: "LaSalle",
    hero: {
      title: "Vendez le matériel informatique de votre entreprise à LaSalle",
      intro:
        "Commerce du boulevard Newman, PME du secteur industriel ou bureau en bordure du fleuve : votre entreprise de LaSalle peut vendre en un seul lot le matériel informatique qu'elle n'utilise plus. Notre offre vous parvient en 24 h, et notre équipe ramasse le tout sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "Entre le fleuve et le canal de l'Aqueduc",
      paragraphs: [
        "L'arrondissement de LaSalle s'étend entre le fleuve Saint-Laurent, à la hauteur des rapides de Lachine, et le canal de l'Aqueduc. C'est un important centre industriel : ateliers, entrepôts et PME se partagent son secteur industriel, notamment autour de la rue Lapierre. Le boulevard Newman en forme l'axe commercial principal, et les boulevards Shevchenko et Champlain comptent parmi ses grandes artères, jusqu'au pont Honoré-Mercier qui mène vers la Rive-Sud.",
        "Dans une PME, le matériel désuet finit souvent dans l'arrière-boutique ou au fond de l'entrepôt : ordinateurs de bureau, écrans, téléphones IP, imprimantes, routeurs remplacés lors d'un changement de fournisseur. Regroupé et vendu en lot, ce matériel vous rapporte une partie de sa valeur et vous redonne de la place pour la marchandise. Les appareils en état de servir sont remis en circulation, et les autres sont dirigés vers le recyclage des composants.",
        "Un ramassage à LaSalle se prépare selon le bâtiment : quai de chargement d'un entrepôt du secteur industriel, entrée de service à l'arrière d'un commerce, ou bureau à l'étage sans monte-charge. Précisez-le dans votre demande, avec les heures qui dérangent le moins vos activités. Nous convenons d'une date avec vous, puis notre équipe se déplace chez vous et s'occupe de l'emballage, du chargement et du transport. Si votre matériel est réparti entre plusieurs adresses de l'arrondissement, une seule demande les regroupe.",
        "Notre équipe se déplace dans tout l'arrondissement, des abords du canal de l'Aqueduc jusqu'aux rues qui longent le fleuve, sans minimum de quantité. Les entreprises de Lachine, de Côte-Saint-Luc et de Dorval ont aussi leur propre page, de même que l'ensemble de Montréal.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Zones d'affaires",
          list: "Secteur industriel autour de la rue Lapierre, boulevard Newman et grandes artères comme les boulevards Shevchenko et Champlain.",
        },
        {
          label: "Le long de l'eau",
          list: "Quartiers en bordure du fleuve et des rapides de Lachine, et abords du canal de l'Aqueduc.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à LaSalle",
      items: [
        {
          question: "Notre PME est dans le secteur industriel de LaSalle. Le ramassage est-il vraiment sans frais ?",
          answer:
            "Oui, sans frais et sans minimum, dans tout l'arrondissement de LaSalle comme partout au Québec. Notre équipe se déplace chez vous : donnez-nous l'adresse et les détails d'accès du bâtiment.",
        },
        {
          question: "Notre commerce du boulevard Newman n'a pas de quai de chargement. Est-ce un problème ?",
          answer:
            "Non. Indiquez l'entrée à utiliser et les heures où le passage est plus calme ; notre équipe emballe le matériel et le transporte jusqu'au camion.",
        },
        {
          question: "Nous avons du matériel à l'entrepôt et au bureau, à deux adresses de LaSalle. Une seule demande suffit-elle ?",
          answer:
            "Oui. Inscrivez les deux adresses dans le même formulaire, avec la liste ou des photos du matériel à chacune. Nous évaluons l'ensemble et vous faisons une seule offre.",
        },
        {
          question: "Sous quel délai l'offre arrive-t-elle ?",
          answer:
            "En 24 h. Indiquez les modèles, les quantités et l'état des appareils : ces renseignements servent à l'évaluation de votre lot.",
        },
        {
          question: "Prenez-vous aussi les appareils abîmés ou incomplets ?",
          answer:
            "Oui, ils sont évalués au même titre que le matériel neuf ou usagé, et le prix dépend de cette évaluation. Ce qui ne peut être réemployé part vers le recyclage des composants.",
        },
        {
          question: "Comment se passent l'effacement des données et le paiement ?",
          answer:
            "Les supports de stockage sont effacés de façon sécurisée, et un certificat de destruction des données vous est remis sans frais. Vous recevez la moitié du paiement au ramassage et le solde une fois l'inspection terminée, en 15 jours ouvrables au maximum ; l'offre est ajustée si l'état ne correspond pas à la description.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur l'île et autour",
      items: [
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
        { frPath: "/rachat-materiel-informatique-lachine", label: "Lachine" },
        { frPath: "/rachat-materiel-informatique-cote-saint-luc", label: "Côte-Saint-Luc" },
        { frPath: "/rachat-materiel-informatique-dorval", label: "Dorval" },
      ],
    },
    cta: {
      title: "Prêt à vendre votre lot à LaSalle ?",
      text: "Envoyez la liste de votre matériel et recevez notre offre en 24 h, avec un ramassage sans frais.",
    },
    service: {
      name: "Rachat de matériel informatique à LaSalle",
      description:
        "Commerces, entrepôts et PME de LaSalle : Techno Lot rachète votre matériel informatique en lot. Offre en 24 h, ramassage sans frais et sans minimum.",
    },
  },
} satisfies Record<string, LocalCityContent>;
