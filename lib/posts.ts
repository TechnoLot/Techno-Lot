export type PostSection = {
  heading?: string;
  level?: 2 | 3;
  paragraphs?: string[];
  list?: { title: string; text: string }[];
};

export type Post = {
  slug: string;
  title: string;
  date: string; // ISO
  dateLabel: string;
  excerpt: string;
  readingTime: string;
  sections: PostSection[];
};

/**
 * Pour ajouter un article : ajoutez simplement un nouvel objet `Post`
 * dans le tableau ci-dessous. Il apparaîtra automatiquement sur /blog,
 * dans le sitemap et aura sa propre page /blog/[slug].
 */
export const posts: Post[] = [
  {
    slug: "l-impact-ecologique",
    title: "L'impact écologique",
    date: "2024-10-22",
    dateLabel: "22 octobre 2024",
    excerpt:
      "Le rachat de matériel informatique joue un rôle clé dans la réduction de l'empreinte écologique des entreprises. Découvrez pourquoi revendre votre matériel TI plutôt que de le jeter change la donne.",
    readingTime: "6 min de lecture",
    sections: [
      {
        paragraphs: [
          "Le rachat de matériel informatique joue un rôle clé dans la réduction de l'empreinte écologique des entreprises.",
          "En effet, l'industrie technologique génère une quantité importante de déchets électroniques, souvent difficiles à recycler et polluants pour l'environnement. En revendant votre matériel TI plutôt que de le jeter, vous contribuez à la diminution de ces déchets, en prolongeant la durée de vie des équipements via leur réutilisation ou leur reconditionnement.",
          "Le rachat de matériel informatique s'inscrit dans une logique d'économie circulaire, où les équipements ne sont pas simplement utilisés puis jetés, mais réintégrés dans le cycle de consommation. Cela réduit la demande de production de nouveaux équipements, ce qui implique une baisse de la consommation de ressources naturelles et d'énergie pour la fabrication de nouveaux produits.",
          "Fabriquer de nouveaux équipements informatiques requiert des matières premières (métaux rares, plastiques, etc.) et consomme une quantité importante d'énergie, entraînant des émissions de CO2. En optant pour le rachat et la revente, vous évitez d'alimenter cette chaîne de production intensive et limitez ainsi votre contribution aux émissions de gaz à effet de serre.",
          "L'exploitation minière pour l'extraction de métaux rares, nécessaires à la production des composants électroniques, a un fort impact environnemental. En prolongeant la durée de vie des équipements grâce au rachat et à la revente, vous réduisez indirectement la demande pour ces matières premières, contribuant ainsi à la préservation des écosystèmes.",
        ],
      },
      {
        heading: "Les points négatifs",
        level: 2,
        paragraphs: [
          "Bien que le rachat de matériel informatique présente de nombreux avantages, il existe quelques aspects à considérer avant de s'engager dans ce processus. Voici certains des points négatifs potentiels :",
        ],
        list: [
          {
            title: "Valorisation inférieure aux attentes",
            text: "Le prix de rachat de votre matériel informatique peut être en dessous de vos prévisions, notamment si l'équipement est trop ancien, en mauvais état ou si la demande pour ce type d'appareil est faible. Il est possible que le montant récupéré ne corresponde pas à la valeur initiale ou à l'investissement réalisé.",
          },
          {
            title: "Processus parfois complexe",
            text: "La gestion du rachat de matériel peut impliquer un certain nombre de démarches, notamment en termes de tri, d'audit et d'effacement sécurisé des données. Ce processus peut être chronophage pour les entreprises qui ne sont pas équipées ou qui manquent d'expertise pour gérer efficacement cette opération.",
          },
          {
            title: "Risques liés à la sécurité des données",
            text: "Si le matériel n'est pas correctement traité avant d'être vendu, il existe un risque que des données sensibles puissent être récupérées. Les entreprises doivent veiller à ce que leurs prestataires procèdent à des méthodes fiables de suppression des données, ce qui peut ajouter un coût ou une complexité supplémentaire au processus.",
          },
          {
            title: "Rachat limité à certains types d'équipements",
            text: "Tous les équipements informatiques ne sont pas éligibles au rachat. Certains matériels trop obsolètes, endommagés ou spécifiques à certaines configurations peuvent ne pas intéresser les acheteurs, limitant ainsi le nombre d'équipements que vous pouvez valoriser.",
          },
        ],
      },
      {
        heading:
          "Pourquoi choisir Techno Lot pour le rachat de votre matériel électronique ?",
        level: 2,
        paragraphs: [
          "Techno Lot est un acteur incontournable dans la gestion du cycle de vie des infrastructures TI, offrant une solution complète et fiable pour le rachat de matériel informatique.",
          "Nous disposons d'une connaissance approfondie des infrastructures technologiques et des besoins spécifiques des entreprises. Nous offrons une évaluation précise de vos équipements, vous garantissant un prix juste et compétitif pour le rachat de votre matériel.",
          "Techno Lot propose un service complet qui inclut l'audit de vos équipements, la collecte, l'effacement sécurisé des données et la revalorisation des actifs. Nous facilitons ainsi la gestion de votre parc informatique sans ajouter de complexité à vos opérations.",
          "Nous nous engageons à promouvoir une économie circulaire en reconditionnant et en revalorisant vos équipements TI. Cela contribue non seulement à réduire les déchets électroniques, mais aussi à minimiser l'empreinte carbone de votre entreprise, tout en respectant les normes environnementales les plus strictes.",
          "La protection de vos données est notre priorité. Techno Lot offre des services d'effacement certifié des données, vous garantissant que toutes les informations sensibles sont supprimées de façon définitive avant la revente ou le recyclage de votre matériel.",
          "Nous sommes en mesure de gérer les projets de rachat pour des entreprises de toutes tailles, partout au Québec.",
        ],
      },
      {
        heading: "Les bonnes pratiques pour optimiser son équipement TI",
        level: 2,
        paragraphs: [
          "Pour tirer pleinement parti du rachat de matériel informatique et optimiser ses avantages, il est essentiel de suivre certaines bonnes pratiques.",
        ],
      },
      {
        heading: "Faire un audit de vos équipements",
        level: 3,
        paragraphs: [
          "Avant de vendre vos équipements TI, réalisez un inventaire détaillé de votre parc informatique. Identifiez quels appareils peuvent être revendus, reconditionnés ou recyclés. Cela vous permet de maximiser la valeur des actifs et d'éviter de vendre des équipements qui pourraient encore être utiles.",
        ],
      },
      {
        heading: "Effacer les données de manière sécurisée",
        level: 3,
        paragraphs: [
          "Assurez-vous que toutes les informations sensibles stockées sur vos appareils sont définitivement supprimées grâce à des méthodes d'effacement certifié. Cela vous protège des violations de données et garantit la confidentialité des informations de votre entreprise et de vos clients.",
        ],
      },
      {
        heading: "Choisir un prestataire de qualité",
        level: 3,
        paragraphs: [
          "Choisir un partenaire de confiance pour le rachat de votre matériel est crucial. Assurez-vous que l'entreprise possède les certifications nécessaires pour le traitement sécurisé des équipements, le recyclage responsable et l'effacement des données. Un prestataire expérimenté, comme Techno Lot, peut vous offrir un service complet et fiable.",
        ],
      },
      {
        heading: "Préparer vos équipements pour la revente",
        level: 3,
        paragraphs: [
          "Si possible, veillez à ce que vos équipements soient dans un état optimal avant de les proposer au rachat. Nettoyez les appareils, retirez tout accessoire inutile et veillez à leur bon fonctionnement. Des équipements bien entretenus auront une meilleure valeur de revente.",
        ],
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
