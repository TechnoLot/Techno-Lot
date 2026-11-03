import { formaterArticle } from "@/lib/acheteurs/articles";
import { LIMITES, type Article } from "@/lib/acheteurs/types";
import { masquerDonneesSensibles } from "@/lib/securite/masquage";

/*
 * Demande à coller dans l'app Claude de l'admin (logique pure). Elle ne
 * contient que les lignes d'articles confirmées, masquées (cartes, NAS), et
 * les sites des compagnies déjà trouvées : jamais le nom, les coordonnées,
 * l'entreprise ou la ville du client (Loi 25, EFVP : compte grand public).
 * Le format de réponse est celui que lit lib/acheteurs/reponse.ts ; il tient
 * compte de l'essai du 2026-11-03 (prix inconnu = null, sources en liste,
 * confiance et notes par compagnie).
 */

const FORMAT_REPONSE = `{
  "familles": [
    {
      "famille": "",
      "rare": true,
      "lignes": [
        {
          "article": "",
          "quantite": 0,
          "etat": "neuf",
          "prix": { "bas": 0, "haut": 0, "devise": "CAD", "base": "ventes eBay conclues", "sources": ["https://..."] }
        }
      ],
      "acheteurs": [
        {
          "compagnie": "",
          "site": "https://...",
          "ville": "",
          "region": "",
          "pays": "CA",
          "confiance": "achete_surplus",
          "raison": "",
          "preuve": "https://...",
          "courriel": "",
          "telephone": "",
          "formulaire": "",
          "notes": ""
        }
      ]
    }
  ],
  "courriel_fr": { "objet": "", "message": "" },
  "courriel_en": { "subject": "", "message": "" }
}`;

/** Ligne d'article telle qu'elle part dans la demande (masquée, une ligne). */
function ligneDemande(a: Article): string {
  return `- ${masquerDonneesSensibles(formaterArticle(a)).texte.replace(/\s+/g, " ").trim()}`;
}

/**
 * Texte complet de la demande. `domainesExclus` : compagnies déjà trouvées
 * pour cette soumission (une nouvelle recherche en cherche d'autres).
 */
export function construireDemande({
  articles,
  domainesExclus = [],
}: {
  articles: Article[];
  domainesExclus?: string[];
}): string {
  const lignes = articles.slice(0, LIMITES.articles).map(ligneDemande).join("\n");
  const exclus = domainesExclus.slice(0, LIMITES.domainesExclus);
  const exclusion =
    exclus.length > 0 ? `\n   - N'inclus pas ces compagnies, déjà trouvées : ${exclus.join(", ")}.` : "";

  return `Tu aides Techno Lot, une entreprise du Québec qui rachète des lots d'équipement informatique et électronique d'entreprises. On nous offre le lot ci-dessous. Avant de l'acheter, nous voulons savoir à quelles compagnies nous pourrions le revendre en gros, et à quel prix. Utilise la recherche Web et visite les sites avant de répondre.

POUR CHAQUE FAMILLE D'ARTICLES (même marque et même série) :

1. À qui la vendre : jusqu'à 8 compagnies sérieuses qui achèteraient ces articles en gros pour les revendre (magasins, revendeurs, distributeurs de surplus, reconditionneurs, courtiers). Mieux vaut 3 bonnes compagnies que 8 douteuses : n'ajoute pas une compagnie qui n'achèterait probablement pas ce type d'article.
   - Les meilleures vendent le modèle exact (page produit), ou cette famille d'articles neufs ou usagés, ou ont une page « Nous achetons » ou « We buy surplus ».
   - Cherche d'abord au Québec, puis dans le reste du Canada. Va aux États-Unis ou ailleurs seulement si l'article est rare ou si tu trouves peu de compagnies au Canada.
   - « confiance » : "achete_surplus" seulement si une page dit que la compagnie rachète du surplus ou des lots ; sinon "a_sonder" (elle vend l'article, à sonder). Au Québec, peu de compagnies l'affichent : une compagnie qui vend la marque ou le modèle peut être ajoutée en "a_sonder".
   - Pour chaque compagnie, donne l'adresse exacte de la page qui le prouve.
   - Nous écrivons par courriel : ouvre aussi la page Contact de chaque compagnie (ou le bas de son site) pour y trouver un courriel général (info@, sales@, ventes@…). Sans courriel, donne le téléphone ou la page de formulaire. Ne devine jamais un courriel.
   - N'invente rien : si tu n'as pas vu la page, n'ajoute pas la compagnie. Si une page n'a pas pu s'ouvrir, dis-le dans « notes ». Pas de particuliers ni de sites d'annonces (Kijiji, Marketplace, eBay).${exclusion}
2. À combien, pour chaque ligne : une fourchette de prix de revente à l'unité, avec la devise et d'où elle vient. Privilégie les ventes conclues sur eBay (filtres « Vendus » et « Terminés »), puis les prix affichés chez des revendeurs. Mets les adresses des pages dans « sources ». Prix inconnu : null.
3. Rare ou courant : dis si la famille est rare (peu de vendeurs, modèle précis) ou courante.

ENSUITE, écris deux courriels courts et professionnels : un en français, pour les compagnies du Québec, et un en anglais, pour les autres. Ils proposent le lot (articles, quantités, état), qui sera disponible sous peu, demandent si la compagnie serait intéressée à racheter tout ou partie du lot, et quelle serait sa meilleure offre. Tu peux dire que le lot est au Québec. Pas de lien, pas de prix, pas de signature (nous ajoutons la nôtre), et aucun nom de client.

RÉPONDS avec un seul bloc de code JSON, sans texte avant ni après, exactement dans ce format. Mets "" quand un texte manque et null quand un prix manque.

${FORMAT_REPONSE}

LE LOT :
${lignes}
`;
}
