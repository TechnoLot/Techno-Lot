import type { LocalCityContent } from "@/lib/seo/local-pages";

/** Lanaudière : pages en français seulement. Règles de contenu : docs/SEO-LOCAL.md. */
export const lanaudierePages = {
  repentigny: {
    frPath: "/rachat-materiel-informatique-repentigny",
    city: "Repentigny",
    hero: {
      title: "Matériel informatique à vendre à Repentigny ? Nous rachetons le lot",
      intro:
        "Commerces du boulevard Brien, bureaux, cliniques ou PME de Le Gardeur : Techno Lot rachète le matériel informatique dont votre entreprise n'a plus l'usage. Vous recevez notre offre en 24 h, et le ramassage se fait sans frais.",
      cta: "Obtenir une offre",
      call: "Appeler",
      imageAlt: "Pile d'ordinateurs portables d'entreprise",
    },
    local: {
      title: "De Le Gardeur aux rives du Saint-Laurent, partout à Repentigny",
      paragraphs: [
        "Dans la MRC de L'Assomption, au sud de Lanaudière, Repentigny s'étend là où la rivière L'Assomption rejoint le fleuve Saint-Laurent. Depuis 2002, la ville réunit l'ancien Repentigny et Le Gardeur, sur la rive ouest de la rivière. Elle est desservie par les autoroutes 40 et 640 et par la route 138, et le boulevard Brien en est l'un des principaux axes commerciaux. Commerces de détail, bureaux professionnels, cliniques et entreprises de services y côtoient de petites entreprises de fabrication et de distribution.",
        "Un magasin qui change ses caisses et ses terminaux, une clinique qui remplace ses postes, un bureau comptable qui passe aux portables : chaque renouvellement laisse derrière lui des appareils qui s'empilent dans une arrière-boutique. Les vendre en lot vous permet d'en tirer une partie de leur valeur et de dégager de la place pour vos activités. Le matériel encore fonctionnel est remis en circulation, et le reste est dirigé vers le recyclage des composants. Qu'il soit neuf, usagé ou partiellement fonctionnel, chaque appareil est évalué, et le prix offert dépend de cette évaluation.",
        "Dans un local commercial, le ramassage se planifie souvent en dehors des heures d'affluence. Indiquez-nous si l'accès se fait par l'arrière, par une porte de service ou par l'entrée principale, et à quel moment votre équipe est disponible. Nous convenons ensemble de la date, puis notre équipe se déplace chez vous pour emballer, charger et transporter le matériel, sans que vous ayez à le déplacer.",
        "Nous rachetons aussi le matériel des entreprises de Charlemagne, de L'Assomption et de Saint-Sulpice, ainsi que de Lachenaie, à Terrebonne.",
      ],
      areasTitle: "Secteurs desservis",
      areas: [
        {
          label: "Repentigny",
          list: "Les secteurs Repentigny et Le Gardeur, dont les commerces du boulevard Brien et les zones d'affaires le long des autoroutes 40 et 640.",
        },
        {
          label: "Villes voisines",
          list: "Charlemagne, L'Assomption, Saint-Sulpice et le secteur Lachenaie de Terrebonne.",
        },
      ],
    },
    faq: {
      title: "Questions fréquentes sur le rachat à Repentigny",
      items: [
        {
          question: "Desservez-vous le secteur Le Gardeur aussi bien que Repentigny ?",
          answer:
            "Oui. Les deux secteurs de la ville sont desservis, de part et d'autre de la rivière L'Assomption. Le ramassage est sans frais et sans minimum, partout au Québec.",
        },
        {
          question: "Notre commerce est ouvert au public. Le ramassage peut-il se faire sans déranger la clientèle ?",
          answer:
            "Oui. Dites-nous quels moments conviennent, par exemple avant l'ouverture ou pendant une période plus calme, et quelle entrée utiliser. Le ramassage est planifié selon vos contraintes.",
        },
        {
          question: "Rachetez-vous les terminaux de point de vente et les imprimantes de reçus ?",
          answer:
            "Oui, avec le reste du matériel : postes, portables, écrans, imprimantes, téléphones ou équipements réseau. Joignez la liste ou quelques photos à votre demande, et nous évaluons le tout en un seul lot.",
        },
        {
          question: "Combien de temps avant de recevoir votre offre ?",
          answer:
            "Notre offre vous parvient en 24 h après réception de la liste ou des photos de votre matériel.",
        },
        {
          question: "Nos postes contiennent des dossiers de clients. Que faites-vous des données ?",
          answer:
            "Les supports de stockage sont effacés de manière sécurisée. Nous vous remettons ensuite un certificat de destruction des données, sans frais.",
        },
        {
          question: "Comment le paiement nous est-il versé ?",
          answer:
            "Une moitié au ramassage, l'autre après l'inspection du matériel, effectuée en 15 jours ouvrables au maximum. Nous évaluons aussi le matériel usagé ou partiellement fonctionnel ; si son état diffère de la description, l'offre est ajustée.",
        },
      ],
    },
    nearby: {
      title: "Ailleurs dans la région",
      items: [
        { frPath: "/rachat-materiel-informatique-terrebonne-mascouche", label: "Terrebonne et Mascouche" },
        { frPath: "/rachat-materiel-informatique-rive-nord", label: "Rive-Nord" },
        { frPath: "/rachat-materiel-informatique-laval", label: "Laval" },
        { frPath: "/rachat-materiel-informatique-montreal", label: "Montréal" },
      ],
    },
    cta: {
      title: "Votre entreprise de Repentigny a du matériel à vendre ?",
      text: "Décrivez-nous votre lot en quelques lignes ou en photos : notre offre suit en 24 h.",
    },
    service: {
      name: "Rachat de matériel informatique à Repentigny",
      description:
        "Commerces, bureaux et PME de Repentigny et Le Gardeur : Techno Lot rachète votre matériel informatique en lot. Offre en 24 h, ramassage sans frais.",
    },
  },
} satisfies Record<string, LocalCityContent>;
