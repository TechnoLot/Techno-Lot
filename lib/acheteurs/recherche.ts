import { z } from "zod";
import {
  DELAI_REPRISE_MS,
  LIMITES,
  type Article,
  type FamilleResultat,
  type LigneResultat,
  type ResultatRecherche,
  type StatutLecture,
  type StatutRecherche,
} from "@/lib/acheteurs/types";

/*
 * File des recherches d'acheteurs (logique pure, serveur et navigateur) :
 * quelle recherche l'agent de l'ordinateur prend, ce qu'on relit de la base,
 * et comment les compagnies d'une recherche « d'autres acheteurs » s'ajoutent
 * aux résultats précédents.
 */

/** Ligne d'une file (recherche ou lecture) telle que la lisent les routes de l'agent. */
export type LigneFile = {
  id: string;
  statut: StatutRecherche | StatutLecture;
  demande_le: string;
  pris_le: string | null;
  jeton: string | null;
};

/**
 * Prochaine recherche à prendre : la plus ancienne demande en attente, ou une
 * recherche « en cours » abandonnée (prise il y a plus de 30 minutes :
 * ordinateur éteint en pleine recherche). null : rien à faire.
 */
export function choisirRecherche(lignes: LigneFile[], maintenant: number): LigneFile | null {
  const abandonnee = (l: LigneFile) => !l.pris_le || maintenant - Date.parse(l.pris_le) > DELAI_REPRISE_MS;
  const candidates = lignes.filter((l) => l.statut === "en_attente" || (l.statut === "en_cours" && abandonnee(l)));
  candidates.sort((a, b) => Date.parse(a.demande_le) - Date.parse(b.demande_le));
  return candidates[0] ?? null;
}

/** Résultats gardés en base (jsonb), ou null s'ils sont absents ou illisibles. */
export function lireResultats(valeur: unknown): ResultatRecherche | null {
  if (!valeur || typeof valeur !== "object") return null;
  const r = valeur as Partial<ResultatRecherche>;
  if (!Array.isArray(r.familles) || !r.courriels || typeof r.courriels !== "object") return null;
  return r as ResultatRecherche;
}

/** Domaines des compagnies trouvées, une fois chacun, dans l'ordre des familles. */
export function domainesDe(resultat: ResultatRecherche | null): string[] {
  if (!resultat) return [];
  return [...new Set(resultat.familles.flatMap((f) => f.acheteurs.map((a) => a.domaine)))];
}

const articleStocke = z.object({
  quantite: z.number().int().min(0).max(10_000_000).nullable(),
  description: z.string().min(1).max(LIMITES.ligne),
});

/** Articles gardés avec la recherche (jsonb) ; les lignes illisibles sont ignorées. */
export function lireArticlesStockes(valeur: unknown): Article[] {
  if (!Array.isArray(valeur)) return [];
  const articles: Article[] = [];
  for (const v of valeur.slice(0, LIMITES.articles)) {
    const a = articleStocke.safeParse(v);
    if (a.success) articles.push(a.data);
  }
  return articles;
}

/** Nom comparable : minuscules, sans accents ni espaces doublés. */
function cleNom(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Même article, même état : la même ligne du lot. */
function cleLigne(l: LigneResultat): string {
  return cleNom(`${l.article} ${l.etat ?? ""}`);
}

/**
 * « Chercher d'autres acheteurs » : les compagnies trouvées s'ajoutent aux
 * précédentes. Même famille (même nom) : acheteurs ajoutés à la suite (une
 * fois chacun), prix précédents gardés, ou repris de la nouvelle recherche
 * s'il n'y en avait pas ; nouvelle famille : ajoutée à la fin, sans ses lignes
 * déjà présentes ailleurs (Claude peut renommer une famille : une ligne ne
 * compte jamais deux fois dans la valeur du lot). Les nouveaux brouillons de
 * courriel remplacent les anciens.
 */
export function fusionResultats(ancien: ResultatRecherche, nouveau: ResultatRecherche): ResultatRecherche {
  const familles: FamilleResultat[] = ancien.familles.map((f) => ({
    ...f,
    lignes: [...f.lignes],
    acheteurs: [...f.acheteurs],
  }));
  for (const n of nouveau.familles) {
    const meme = familles.find((f) => cleNom(f.nom) === cleNom(n.nom));
    if (!meme) {
      if (familles.length < LIMITES.familles) {
        const deja = new Set(familles.flatMap((f) => f.lignes.map(cleLigne)));
        familles.push({ ...n, lignes: n.lignes.filter((l) => !deja.has(cleLigne(l))) });
      }
      continue;
    }
    const deja = new Set(meme.acheteurs.map((a) => a.domaine));
    for (const a of n.acheteurs) {
      if (deja.has(a.domaine) || meme.acheteurs.length >= LIMITES.acheteursParFamille) continue;
      meme.acheteurs.push(a);
      deja.add(a.domaine);
    }
    const sansPrix = meme.lignes.every((l) => l.prix.bas == null && l.prix.haut == null);
    if (sansPrix && n.lignes.length > 0) meme.lignes = n.lignes;
    meme.rare ||= n.rare;
  }
  return {
    familles,
    courriels: {
      fr: nouveau.courriels.fr ?? ancien.courriels.fr,
      en: nouveau.courriels.en ?? ancien.courriels.en,
    },
  };
}
