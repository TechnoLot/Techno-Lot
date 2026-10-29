import type { LocalCityContent } from "@/lib/seo/local-pages";

/** Thérèse-De Blainville : pages en français seulement. Règles de contenu : docs/SEO-LOCAL.md. */
export const thereseDeBlainvillePages = {
  blainville: {
    frPath: "/rachat-materiel-informatique-blainville",
    city: "Blainville",
    hero: {
      title: "Rachat de matériel informatique à Blainville",
      intro:
        "Votre entreprise de Blainville a des postes, des serveurs ou des équipements réseau qui ne servent plus ? Techno Lot les rachète en lot : vous recevez notre offre en 24 h, et le ramassage se fait sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "De Fontainebleau au Plan-Bouchard, partout à Blainville",
      paragraphs: [
        "Blainville fait partie de la MRC Thérèse-De Blainville. L'autoroute 15 la traverse du sud au nord, le boulevard du Curé-Labelle (route 117) en est l'artère commerciale, et la gare de Blainville la relie à la ligne exo de Saint-Jérôme. Autour des quartiers comme Fontainebleau, Chambéry ou la Côte-Saint-Louis, l'activité économique se concentre le long du boulevard Michèle-Bohec, où s'alignent des bâtiments industriels, et sur le Curé-Labelle, bordé de commerces et de bureaux. PME manufacturières, entreprises de services, commerces et cabinets professionnels y travaillent tous avec du matériel informatique.",
        "Une usine qui modernise ses postes de production, un bureau qui passe aux portables, une entreprise qui emménage dans un bâtiment plus récent : chaque fois, d'anciens ordinateurs, écrans, serveurs et commutateurs restent derrière. Vendus en un seul lot, ils libèrent l'entrepôt ou la salle technique et vous rapportent une partie de leur valeur. Nous évaluons tout le matériel, qu'il soit neuf, usagé ou partiellement fonctionnel. Ce qui a encore une utilité trouve une seconde vie ; le reste part au recyclage des composants.",
        "Dans un bâtiment industriel du boulevard Michèle-Bohec, le matériel sort souvent par un quai de chargement ou une porte de garage. Dans un commerce du Curé-Labelle, il faut parfois composer avec un stationnement partagé ou des heures d'ouverture. Décrivez ces contraintes dans votre demande, avec la liste du matériel ou quelques photos, et nous fixons ensemble la date du ramassage. Notre équipe se déplace chez vous : elle emballe le matériel, le charge et le transporte.",
        "Votre entreprise a aussi des locaux ailleurs dans la région ? Notre équipe se rend à Sainte-Thérèse, à Boisbriand, à Rosemère, à Lorraine et à Mirabel, avec les mêmes conditions : ramassage sans frais et sans minimum.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Secteurs de Blainville",
          list: "Fontainebleau, Chambéry, la Côte-Saint-Louis, le Plan-Bouchard, Chante-Bois et les abords de la gare de Blainville.",
        },
        {
          label: "Milieux d'affaires",
          list: "Bâtiments industriels du boulevard Michèle-Bohec, commerces et bureaux du boulevard du Curé-Labelle, entreprises établies le long de l'autoroute 15.",
        },
        {
          label: "Villes voisines",
          list: "Sainte-Thérèse, Boisbriand, Rosemère, Lorraine, Bois-des-Filion et Mirabel.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Blainville",
      items: [
        {
          question: "Notre entreprise occupe un bâtiment du boulevard Michèle-Bohec. Pouvez-vous ramasser par le quai de chargement ?",
          answer:
            "Oui. Précisez l'accès à utiliser, quai, porte de garage ou entrée de service, ainsi que vos heures de réception. Nous planifions le ramassage avec vous, et notre équipe s'occupe d'emballer et de charger le matériel.",
        },
        {
          question: "Nous travaillons à domicile, dans un quartier comme Fontainebleau ou Chambéry. Vous déplacez-vous quand même ?",
          answer:
            "Oui. Que votre matériel soit dans un bureau à la maison, un petit local ou un sous-sol, notre équipe se déplace chez vous, partout à Blainville. Le ramassage est sans frais, même pour quelques appareils.",
        },
        {
          question: "Nous déménageons dans un autre local de Blainville. Pouvez-vous reprendre ce que nous ne gardons pas ?",
          answer:
            "Oui. Dressez la liste du matériel qui ne suivra pas, ou prenez-en quelques photos, et indiquez la date du déménagement dans votre demande. Nous en tenons compte pour planifier le ramassage avec vous.",
        },
        {
          question: "Combien de temps faut-il pour obtenir une offre ?",
          answer:
            "Vous recevez notre offre en 24 h. Il suffit de décrire le matériel dans le formulaire de soumission, avec une liste ou des photos.",
        },
        {
          question: "Nos anciens serveurs ne démarrent plus. Les rachetez-vous quand même ?",
          answer:
            "Ils sont évalués comme le reste du lot : neuf, usagé ou partiellement fonctionnel, tout le matériel est examiné, et le prix dépend de cette évaluation. Les pièces qui ne peuvent pas resservir vont au recyclage des composants.",
        },
        {
          question: "Quand recevons-nous l'argent ?",
          answer:
            "Une première moitié vous est versée au moment du ramassage. Le solde suit l'inspection, faite en 15 jours ouvrables au maximum ; si l'état réel du matériel ne correspond pas à la description, l'offre est ajustée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur la Rive-Nord",
      items: [
        { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        { frPath: "/rachat-materiel-informatique-sainte-therese", label: "Sainte-Thérèse" },
        { frPath: "/rachat-materiel-informatique-boisbriand", label: "Boisbriand" },
        { frPath: "/rachat-materiel-informatique-mirabel", label: "Mirabel" },
        { frPath: "/rachat-materiel-informatique-terrebonne-mascouche", label: "Terrebonne et Mascouche" },
      ],
    },
    cta: {
      title: "Votre lot de Blainville est prêt à partir ?",
      text: "Remplissez la demande de soumission et recevez notre offre en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Blainville",
      description:
        "Entreprise de Blainville avec des ordinateurs ou des serveurs en trop ? Techno Lot rachète votre lot : offre en 24 h et ramassage sans frais.",
    },
  },

  boisbriand: {
    frPath: "/rachat-materiel-informatique-boisbriand",
    city: "Boisbriand",
    hero: {
      title: "Rachat de matériel informatique pour les entreprises de Boisbriand",
      intro:
        "Bureaux du Faubourg, ateliers des parcs industriels ou commerce de quartier : si votre entreprise de Boisbriand a du matériel informatique qui dort, Techno Lot le rachète en lot. Vous avez notre offre en 24 h, et nous ramassons le tout sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "Du Faubourg Boisbriand aux rives des Mille Îles",
      paragraphs: [
        "Boisbriand est un carrefour : les autoroutes 13, 15 et 640 s'y rejoignent, et la rivière des Mille Îles la sépare de Laval. Ses entreprises se répartissent entre des parcs industriels, dont celui du Curé-Boivin et le secteur du boulevard des Entreprises, et le Faubourg Boisbriand, un pôle commercial et de bureaux aménagé sur le site d'une ancienne usine d'assemblage automobile. Fabricants, entreprises agroalimentaires, distributeurs, commerces de détail et bureaux de services s'y côtoient.",
        "Dans ces milieux, le matériel informatique se renouvelle au rythme des projets : un nouveau logiciel de production qui exige des postes plus récents, une succursale qui revoit son aménagement, un passage au nuage qui rend la salle de serveurs inutile. Plutôt que de laisser ces appareils s'empiler, vendez-les en un seul lot. Vous récupérez une partie de leur valeur et vous dégagez de l'espace ; l'équipement qui fonctionne encore repart pour une seconde vie, et ce qui ne peut plus servir est confié au recyclage des composants.",
        "Les bâtiments multilocataires des parcs industriels ont souvent une porte de garage par unité, tandis que les bureaux du Faubourg occupent parfois un étage, avec un stationnement commun. Dites-nous comment accéder au matériel et à quelles heures, et la date du ramassage est fixée avec vous. Notre équipe se déplace chez vous et prend en charge l'emballage, le chargement et le transport.",
        "Votre entreprise a aussi un local à Laval, à Sainte-Thérèse ou à Rosemère ? Une seule demande peut regrouper toutes vos adresses de la région : nous évaluons l'ensemble et planifions avec vous le passage de notre équipe à chacune.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Boisbriand",
          list: "Tous les secteurs résidentiels et commerciaux de Boisbriand, jusqu'aux abords de la rivière des Mille Îles.",
        },
        {
          label: "Milieux d'affaires",
          list: "Faubourg Boisbriand, parc industriel du Curé-Boivin, boulevard des Entreprises et secteurs bordant les autoroutes 13, 15 et 640.",
        },
        {
          label: "Villes voisines",
          list: "Sainte-Thérèse, Rosemère, Blainville, Saint-Eustache, Mirabel et, de l'autre côté de la rivière des Mille Îles, Laval.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Boisbriand",
      items: [
        {
          question: "Nos bureaux sont au Faubourg Boisbriand, à l'étage. Comment se passe le ramassage ?",
          answer:
            "Indiquez l'étage, la présence d'un ascenseur et l'endroit où le camion peut se garer. Notre équipe emballe le matériel dans vos bureaux et le descend elle-même ; vous n'avez rien à transporter.",
        },
        {
          question: "Nous louons une unité dans un parc industriel de Boisbriand. Que faut-il prévoir pour l'accès ?",
          answer:
            "Il suffit de nous dire quel accès utiliser, quai, porte de garage ou entrée principale, et à quelles heures. Nous planifions le ramassage pour qu'il dérange le moins possible vos activités et celles des autres locataires.",
        },
        {
          question: "Notre entreprise a un site à Boisbriand et un autre à Laval. Pouvons-nous tout vendre ensemble ?",
          answer:
            "Oui. Énumérez les deux adresses et le matériel qui se trouve à chacune dans une même demande. Nous évaluons le tout et vous faisons une seule offre ; le ramassage est ensuite organisé à chaque adresse.",
        },
        {
          question: "Que faites-vous des disques durs qui contiennent des données de clients ?",
          answer:
            "Chaque support de stockage est effacé selon une méthode sécurisée. Vous recevez ensuite un certificat de destruction des données, sans frais.",
        },
        {
          question: "Y a-t-il un volume minimum pour que vous vous déplaciez ?",
          answer:
            "Aucun. Trois portables ou un entrepôt plein : le ramassage est sans frais, à Boisbriand comme ailleurs au Québec.",
        },
        {
          question: "Et si l'état du matériel ne correspond pas à notre description ?",
          answer:
            "L'offre est alors ajustée après l'inspection, qui se fait en 15 jours ouvrables au maximum. La moitié du paiement vous est versée au ramassage, et le solde une fois l'inspection terminée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur la Rive-Nord",
      items: [
        { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        { frPath: "/rachat-materiel-informatique-sainte-therese", label: "Sainte-Thérèse" },
        { frPath: "/rachat-materiel-informatique-blainville", label: "Blainville" },
        { frPath: "/rachat-materiel-informatique-saint-eustache", label: "Saint-Eustache" },
        { frPath: "/rachat-materiel-informatique-laval", label: "Laval" },
      ],
    },
    cta: {
      title: "Du matériel à vendre à Boisbriand ?",
      text: "Décrivez votre lot dans le formulaire et vous aurez notre offre en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Boisbriand",
      description:
        "Faubourg Boisbriand, parcs industriels : Techno Lot rachète les ordinateurs, serveurs et équipements réseau des entreprises. Offre en 24 h.",
    },
  },

  "sainte-therese": {
    frPath: "/rachat-materiel-informatique-sainte-therese",
    city: "Sainte-Thérèse",
    hero: {
      title: "Vendez le matériel informatique de votre entreprise à Sainte-Thérèse",
      intro:
        "Bureau professionnel du centre-ville, commerce de la rue Turgeon ou entreprise de services : Techno Lot rachète en lot le matériel informatique dont vous n'avez plus l'usage. Notre offre vous arrive en 24 h, et le ramassage ne vous coûte rien.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "De la rue Turgeon au boulevard du Curé-Labelle",
      paragraphs: [
        "Au cœur de la MRC Thérèse-De Blainville, Sainte-Thérèse a un centre-ville vivant autour de la rue Turgeon, où boutiques, restaurants, cabinets et bureaux professionnels se partagent les façades. Le boulevard du Curé-Labelle la traverse avec ses commerces et ses immeubles de bureaux, et les autoroutes 15 et 640 donnent accès au reste de la Rive-Nord. La gare de Sainte-Thérèse, sur la ligne exo de Saint-Jérôme, et le Cégep Lionel-Groulx amènent chaque jour travailleurs et étudiants vers le centre.",
        "Les cabinets comptables, juridiques ou de santé, les agences et les commerces du centre-ville changent régulièrement de postes, d'écrans et d'imprimantes. Un cabinet qui fusionne avec un autre, une clinique qui revoit ses outils, un commerce qui remplace son système de caisse : l'ancien matériel finit dans un placard. Le vendre en lot vous rend de l'espace et une partie de sa valeur. Nous évaluons chaque appareil, neuf, usagé ou partiellement fonctionnel ; ce qui peut resservir est remis en circulation, et le reste suit la voie du recyclage des composants. Pour un cabinet, l'effacement sécurisé des supports compte beaucoup : il est inclus, avec un certificat de destruction des données, sans frais.",
        "Au centre-ville, les bureaux occupent souvent l'étage d'un immeuble plus ancien, parfois sans ascenseur, et le stationnement de la rue Turgeon se partage avec les clients des commerces. Signalez-nous ces détails, ainsi que les heures où le passage est le plus facile, et nous fixons le ramassage avec vous. Notre équipe se déplace chez vous, descend le matériel, l'emballe et le charge.",
        "Les entreprises de Rosemère, de Lorraine et de Bois-des-Filion peuvent aussi nous confier leur matériel, tout comme celles de Blainville et de Boisbriand, qui ont leur propre page.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Sainte-Thérèse",
          list: "Le centre-ville et la rue Turgeon, les abords de la gare, le boulevard du Curé-Labelle et tous les autres secteurs de la ville.",
        },
        {
          label: "Milieux d'affaires",
          list: "Bureaux professionnels et commerces du centre-ville, commerces et immeubles de bureaux du boulevard du Curé-Labelle, entreprises de services de toute la ville.",
        },
        {
          label: "Villes voisines",
          list: "Rosemère, Lorraine, Bois-des-Filion, Blainville et Boisbriand.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Sainte-Thérèse",
      items: [
        {
          question: "Notre cabinet du centre-ville est à l'étage, sans ascenseur. Pouvez-vous quand même venir ?",
          answer:
            "Oui. Précisez-le dans votre demande : notre équipe prévoit ce qu'il faut pour descendre le matériel par l'escalier. Vous n'avez rien à porter.",
        },
        {
          question: "Nous sommes un petit bureau de la rue Turgeon avec quelques postes seulement. Est-ce assez ?",
          answer:
            "Oui, aucun minimum n'est exigé. Quelques ordinateurs, une imprimante et un téléphone suffisent pour faire une demande, et le ramassage reste sans frais.",
        },
        {
          question: "Nos dossiers sont confidentiels. Que deviennent les données de nos postes ?",
          answer:
            "Les disques durs et les SSD sont effacés de façon sécurisée avant que le matériel soit remis en circulation ou recyclé. Un certificat de destruction des données vous est remis, sans frais.",
        },
        {
          question: "Notre organisme a des locaux près de la gare et un autre point de service à Blainville. Une seule demande suffit-elle ?",
          answer:
            "Oui. Indiquez chaque adresse et le matériel qui s'y trouve ; nous évaluons le tout ensemble et planifions avec vous le ramassage à chaque endroit.",
        },
        {
          question: "Quand recevrons-nous votre offre ?",
          answer:
            "Dans les 24 h suivant votre demande. Une liste ou quelques photos du matériel nous permettent de l'évaluer.",
        },
        {
          question: "Comment le paiement est-il versé ?",
          answer:
            "En deux temps : la moitié au ramassage, le solde à la fin de l'inspection, qui dure 15 jours ouvrables au maximum. Si le matériel diffère de ce qui a été décrit, nous ajustons l'offre en conséquence.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs sur la Rive-Nord",
      items: [
        { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        { frPath: "/rachat-materiel-informatique-blainville", label: "Blainville" },
        { frPath: "/rachat-materiel-informatique-boisbriand", label: "Boisbriand" },
        { frPath: "/rachat-materiel-informatique-mirabel", label: "Mirabel" },
      ],
    },
    cta: {
      title: "Votre bureau de Sainte-Thérèse a du matériel à vendre ?",
      text: "Faites votre demande en ligne : vous aurez notre offre en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Sainte-Thérèse",
      description:
        "Cabinets, commerces et bureaux de Sainte-Thérèse : Techno Lot rachète votre matériel informatique en lot. Offre en 24 h, ramassage sans frais.",
    },
  },
} satisfies Record<string, LocalCityContent>;
