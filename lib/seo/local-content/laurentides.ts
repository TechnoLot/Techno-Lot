import type { LocalCityContent } from "@/lib/seo/local-pages";

/** Laurentides : pages en français seulement. Règles de contenu : docs/SEO-LOCAL.md. */
export const laurentidesPages = {
  "saint-eustache": {
    frPath: "/rachat-materiel-informatique-saint-eustache",
    city: "Saint-Eustache",
    hero: {
      title: "Vendez le matériel informatique de votre entreprise à Saint-Eustache",
      intro:
        "Des postes de travail inutilisés, un vieux serveur ou une pile d'écrans encombrent vos locaux de Saint-Eustache ? Décrivez-nous le lot : notre offre vous parvient en 24 h, et notre équipe vient le chercher sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "Du parc industriel aux rives des Mille Îles, partout à Saint-Eustache",
      paragraphs: [
        "Chef-lieu de la MRC de Deux-Montagnes, Saint-Eustache s'étend le long de la rivière des Mille Îles et se trouve au croisement de l'autoroute 640 et des routes 148 et 344. Son parc industriel, accessible par l'autoroute 640, regroupe des fabricants, des distributeurs et des entreprises de services, tandis que les bureaux professionnels, les cliniques et les commerces se répartissent dans le reste de la ville.",
        "Dans ces entreprises, le matériel informatique se libère au fil des projets : remplacement des postes à la fin d'un contrat de location, passage d'un serveur local à une solution infonuagique, réaménagement d'un entrepôt ou fermeture d'un point de service. Vendre l'ancien matériel en un seul lot vous permet d'en récupérer une partie de la valeur et de retrouver l'espace qu'il occupait. Ce qui fonctionne encore est remis en circulation pour une seconde vie, et le reste est dirigé vers le recyclage des composants. Nous évaluons tout, du portable récent au commutateur réseau hors service, et le prix dépend de cette évaluation.",
        "Les bâtiments industriels du secteur ont souvent une porte de garage ou un quai, alors que les bureaux du centre-ville se trouvent parfois à l'étage, sans ascenseur de service. Précisez ces détails dans votre demande, ainsi que les heures où l'accès est possible, et le ramassage est planifié avec vous à une date qui convient à votre équipe. Le moment venu, notre équipe se déplace chez vous : elle emballe, charge et transporte tout le matériel.",
        "Notre équipe se rend aussi chez les entreprises des autres municipalités de la MRC de Deux-Montagnes, comme Deux-Montagnes, Sainte-Marthe-sur-le-Lac, Pointe-Calumet, Saint-Joseph-du-Lac, Oka et Saint-Placide.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Saint-Eustache",
          list: "Tous les secteurs de la ville, dont le parc industriel le long de l'autoroute 640 et les zones commerciales des routes 148 et 344.",
        },
        {
          label: "MRC de Deux-Montagnes",
          list: "Deux-Montagnes, Sainte-Marthe-sur-le-Lac, Pointe-Calumet, Saint-Joseph-du-Lac, Oka et Saint-Placide.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Saint-Eustache",
      items: [
        {
          question: "Notre entreprise est dans le parc industriel de Saint-Eustache. Pouvez-vous utiliser notre quai de chargement ?",
          answer:
            "Oui. Indiquez dans votre demande s'il y a un quai, une porte de garage ou une entrée de livraison, et à quelles heures elle est accessible. Nous en tenons compte pour planifier le ramassage, qui est sans frais.",
        },
        {
          question: "Desservez-vous aussi Deux-Montagnes, Sainte-Marthe-sur-le-Lac et Saint-Joseph-du-Lac ?",
          answer:
            "Oui, comme toutes les municipalités de la MRC de Deux-Montagnes. Le ramassage est sans frais et sans minimum de quantité, partout au Québec.",
        },
        {
          question: "Nos bureaux sont à l'étage, sans monte-charge. Devons-nous descendre le matériel nous-mêmes ?",
          answer:
            "Non. Signalez simplement l'étage et l'accès dans votre demande. Notre équipe emballe le matériel, le descend, le charge et le transporte ; vous n'avez rien à déplacer.",
        },
        {
          question: "Que faut-il nous envoyer pour obtenir une offre ?",
          answer:
            "Une liste du matériel, avec les modèles si vous les connaissez, ou simplement quelques photos. Nous évaluons le lot à partir de ces renseignements et notre offre vous parvient en 24 h.",
        },
        {
          question: "Nos disques contiennent des renseignements sur nos clients. Comment sont-ils traités ?",
          answer:
            "Chaque support de stockage est effacé de manière sécurisée. Vous recevez ensuite un certificat de destruction des données, sans frais.",
        },
        {
          question: "À quel moment sommes-nous payés ?",
          answer:
            "Une première moitié est versée au ramassage. Le solde suit l'inspection du matériel, qui se fait en 15 jours ouvrables au maximum. Si l'état constaté diffère de la description reçue, l'offre est ajustée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur la Rive-Nord",
      items: [
        { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        { frPath: "/rachat-materiel-informatique-boisbriand", label: "Boisbriand" },
        { frPath: "/rachat-materiel-informatique-mirabel", label: "Mirabel" },
        { frPath: "/rachat-materiel-informatique-sainte-therese", label: "Sainte-Thérèse" },
        { frPath: "/rachat-materiel-informatique-laval", label: "Laval" },
      ],
    },
    cta: {
      title: "Votre lot de Saint-Eustache est prêt à partir ?",
      text: "Envoyez-nous une liste ou quelques photos de votre matériel, et notre offre vous parvient en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Saint-Eustache",
      description:
        "Ordinateurs, serveurs ou écrans en trop à Saint-Eustache ou dans Deux-Montagnes ? Techno Lot rachète votre lot : offre en 24 h, ramassage sans frais.",
    },
  },

  mirabel: {
    frPath: "/rachat-materiel-informatique-mirabel",
    city: "Mirabel",
    hero: {
      title: "Rachat de matériel informatique à Mirabel",
      intro:
        "De Saint-Janvier à Saint-Benoît, les entreprises de Mirabel peuvent vendre en lot les ordinateurs, les serveurs et les équipements réseau dont elles n'ont plus besoin. Notre offre vous parvient en 24 h et le ramassage est sans frais, peu importe le secteur.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "De Saint-Janvier à Saint-Hermas, dans tous les secteurs de Mirabel",
      paragraphs: [
        "Mirabel forme une seule ville, mais son vaste territoire se divise en secteurs bien distincts : Saint-Janvier, où se concentre une grande part de l'activité commerciale, Saint-Augustin, Saint-Canut, Sainte-Scholastique, Sainte-Monique, Saint-Benoît, Saint-Hermas, Saint-Jérusalem, Saint-Antoine, Petit-Saint-Charles, Domaine-Vert Nord, Domaine-Vert Sud et Mirabel-en-Haut. Autour de l'aéroport international de Mirabel s'est développé un pôle industriel tourné vers l'aéronautique et le fret, et les parcs d'affaires profitent de l'accès aux autoroutes 15 et 50 ainsi qu'aux routes 117, 148 et 158.",
        "Usines, ateliers, entreprises de transport, bureaux ou exploitations agricoles : partout, les ordinateurs, les postes de contrôle, les écrans et les équipements réseau finissent par être remplacés. Lors d'une mise à niveau ou d'un réaménagement, l'ancien matériel reste souvent entreposé faute de solution simple. Vendu en lot, il vous rapporte une partie de sa valeur et libère de l'espace utile. Ce qui peut encore servir est remis en circulation, et ce qui ne le peut plus est dirigé vers le recyclage des composants. Quant aux disques et aux autres supports de stockage, ils sont effacés de manière sécurisée, et un certificat de destruction des données vous est remis sans frais.",
        "À Mirabel, la distance entre deux secteurs peut être importante, et une même entreprise a parfois un bâtiment près de l'aéroport et un autre à Saint-Janvier. Indiquez toutes vos adresses dans une seule demande, avec le matériel qui se trouve à chacune : nous évaluons l'ensemble et le ramassage est organisé avec vous, adresse par adresse. Signalez aussi les accès particuliers, comme une guérite, un quai ou une zone à accès contrôlé. Notre équipe se déplace chez vous, emballe, charge et transporte le matériel.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Secteurs de Mirabel",
          list: "Saint-Janvier, Saint-Augustin, Saint-Canut, Sainte-Scholastique, Sainte-Monique, Saint-Benoît, Saint-Hermas, Saint-Jérusalem, Saint-Antoine, Petit-Saint-Charles, Domaine-Vert Nord, Domaine-Vert Sud et Mirabel-en-Haut.",
        },
        {
          label: "Milieux d'affaires",
          list: "Pôle industriel de l'aéroport international de Mirabel, parcs d'affaires desservis par les autoroutes 15 et 50 et commerces des routes 117, 148 et 158.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Mirabel",
      items: [
        {
          question: "Vous déplacez-vous dans les secteurs plus éloignés, comme Saint-Hermas ou Saint-Benoît ?",
          answer:
            "Oui. Tous les secteurs de Mirabel sont desservis, des plus urbains aux plus ruraux. Le ramassage reste sans frais et sans minimum de quantité, partout au Québec.",
        },
        {
          question: "Notre matériel est réparti entre plusieurs secteurs de Mirabel. Faut-il une demande pour chacun ?",
          answer:
            "Non. Une seule demande suffit : précisez chaque adresse et le matériel qui s'y trouve. Nous vous faisons une offre pour l'ensemble, puis le ramassage est planifié avec vous.",
        },
        {
          question: "Notre bâtiment près de l'aéroport a un accès contrôlé. Comment se passe le ramassage ?",
          answer:
            "Décrivez dans votre demande la marche à suivre : guérite, enregistrement des visiteurs, quai ou heures permises. Nous organisons le ramassage selon ces consignes, avec la personne responsable chez vous.",
        },
        {
          question: "Combien de temps faut-il attendre pour connaître votre offre ?",
          answer:
            "Notre offre vous parvient en 24 h. Il suffit de nous transmettre la liste de votre matériel ou quelques photos.",
        },
        {
          question: "Achetez-vous aussi les appareils en panne ou incomplets ?",
          answer:
            "Nous évaluons tout le matériel, qu'il soit neuf, usagé ou partiellement fonctionnel ; le prix tient compte de cette évaluation. Les pièces qui ne peuvent pas être réemployées sont dirigées vers le recyclage des composants.",
        },
        {
          question: "Comment nos données sont-elles protégées et comment le paiement est-il versé ?",
          answer:
            "Les supports de stockage sont effacés de manière sécurisée et vous recevez un certificat de destruction des données, sans frais. La moitié du paiement est versée au ramassage, le solde après l'inspection, en 15 jours ouvrables au maximum ; si l'état du matériel diffère de la description, l'offre est ajustée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur la Rive-Nord",
      items: [
        { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        { frPath: "/rachat-materiel-informatique-saint-jerome", label: "Saint-Jérôme" },
        { frPath: "/rachat-materiel-informatique-saint-eustache", label: "Saint-Eustache" },
        { frPath: "/rachat-materiel-informatique-blainville", label: "Blainville" },
        { frPath: "/rachat-materiel-informatique-boisbriand", label: "Boisbriand" },
      ],
    },
    cta: {
      title: "Prêt à vendre votre lot à Mirabel ?",
      text: "Une adresse ou plusieurs secteurs : décrivez votre matériel et recevez notre offre en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Mirabel",
      description:
        "Techno Lot rachète les ordinateurs, serveurs et équipements réseau des entreprises de tous les secteurs de Mirabel. Offre en 24 h, ramassage sans frais.",
    },
  },

  "saint-jerome": {
    frPath: "/rachat-materiel-informatique-saint-jerome",
    city: "Saint-Jérôme",
    hero: {
      title: "Rachat de matériel informatique pour les entreprises de Saint-Jérôme",
      intro:
        "Votre organisation de Saint-Jérôme renouvelle ses postes, déménage ou range enfin sa salle technique ? Techno Lot rachète le matériel en lot, avec une offre qui vous parvient en 24 h et un ramassage sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "De Bellefeuille à Lafontaine, partout à Saint-Jérôme",
      paragraphs: [
        "Chef-lieu de la MRC de La Rivière-du-Nord, Saint-Jérôme réunit depuis 2002 les anciens secteurs de Saint-Antoine, Bellefeuille et Lafontaine. La ville est traversée par l'autoroute 15 et les routes 117 et 158, et sa gare, au point de départ du parc linéaire Le P'tit Train du Nord, est aussi le terminus de la ligne de train de banlieue d'exo. On y trouve des parcs industriels, des commerces, des bureaux professionnels, des services publics et le Cégep de Saint-Jérôme.",
        "Dans un milieu aussi varié, les occasions de se départir de matériel ne manquent pas : un cabinet qui modernise ses postes, un fabricant qui remplace ses ordinateurs d'atelier, une entreprise qui ferme une succursale ou regroupe ses services au centre-ville. Plutôt que de garder ces appareils dans une salle de rangement, vous pouvez les vendre en un seul lot et en récupérer une partie de la valeur. Le matériel encore utile est remis en circulation pour une seconde vie ; le reste prend le chemin du recyclage des composants.",
        "Au centre-ville, le stationnement et l'accès aux immeubles demandent parfois un peu d'organisation, alors que les bâtiments des parcs industriels disposent souvent d'un quai ou d'une porte de garage. Dites-nous où le camion peut se garer, quelle entrée utiliser et à quelles heures, et nous planifions le ramassage avec vous. Notre équipe se déplace chez vous, emballe le matériel, le charge et le transporte : vous n'avez rien à manipuler.",
        "Notre équipe se rend également chez les entreprises des autres municipalités de la MRC de La Rivière-du-Nord, ainsi qu'à Mirabel et dans le reste des Laurentides : le ramassage est sans frais et sans minimum, partout au Québec.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Saint-Jérôme",
          list: "Le centre-ville et les secteurs Saint-Antoine, Bellefeuille et Lafontaine.",
        },
        {
          label: "Milieux d'affaires",
          list: "Parcs industriels, commerces et bureaux le long de l'autoroute 15 et des routes 117 et 158.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Saint-Jérôme",
      items: [
        {
          question: "Couvrez-vous les secteurs de Bellefeuille, Lafontaine et Saint-Antoine ?",
          answer:
            "Oui. Ces trois secteurs font partie de Saint-Jérôme depuis 2002, et nous y ramassons le matériel comme au centre-ville. Le ramassage est sans frais et sans minimum, partout au Québec.",
        },
        {
          question: "Nos bureaux sont au centre-ville, où le stationnement est limité. Est-ce un problème ?",
          answer:
            "Non. Indiquez-nous l'endroit où le camion peut s'arrêter, l'entrée à utiliser et les heures où l'accès est le plus simple. Nous planifions le ramassage selon ces contraintes.",
        },
        {
          question: "Rachetez-vous le matériel d'un établissement d'enseignement ou d'un organisme ?",
          answer:
            "Oui. Écoles, organismes et entreprises peuvent tous nous vendre leur matériel : postes de laboratoire, portables, projecteurs, serveurs ou équipements réseau. Nous évaluons le lot et vous faisons une offre.",
        },
        {
          question: "Quels renseignements faut-il fournir pour recevoir une offre ?",
          answer:
            "Une liste du matériel ou quelques photos suffisent. Notre offre vous parvient en 24 h.",
        },
        {
          question: "Certains de nos appareils ne s'allument plus. Les prenez-vous quand même ?",
          answer:
            "Oui, nous évaluons aussi le matériel partiellement fonctionnel, tout comme le neuf et l'usagé, et le prix dépend de cette évaluation. Ce qui ne peut pas être réemployé est dirigé vers le recyclage des composants.",
        },
        {
          question: "Comment se déroulent l'effacement des données et le paiement ?",
          answer:
            "Les supports de stockage sont effacés de manière sécurisée, et un certificat de destruction des données vous est remis sans frais. Vous recevez la moitié du paiement au ramassage, puis le solde après l'inspection, qui prend 15 jours ouvrables au maximum. Si l'état du matériel diffère de la description, l'offre est ajustée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur la Rive-Nord",
      items: [
        { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        { frPath: "/rachat-materiel-informatique-mirabel", label: "Mirabel" },
        { frPath: "/rachat-materiel-informatique-blainville", label: "Blainville" },
      ],
    },
    cta: {
      title: "Du matériel à vendre à Saint-Jérôme ?",
      text: "Faites-nous parvenir la liste ou des photos de votre lot : vous aurez notre offre en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Saint-Jérôme",
      description:
        "Entreprises et organismes de Saint-Jérôme : Techno Lot rachète vos ordinateurs, serveurs et équipements réseau en lot. Offre en 24 h, ramassage sans frais.",
    },
  },
} satisfies Record<string, LocalCityContent>;
