import type { AcheteurLu, Confiance } from "@/lib/acheteurs/types";

/*
 * Carnet des acheteurs (logique pure) : une compagnie trouvée de nouveau
 * enrichit sa fiche au lieu d'en créer une autre (même domaine).
 */

/** Ce que la base garde d'une fiche existante, pour la fusion. */
export type FicheExistante = Pick<
  AcheteurLu,
  "ville" | "region" | "pays" | "courriel" | "telephone" | "formulaire" | "notes" | "sources" | "categories" | "modeles"
> & { confiance: Confiance; verifie: boolean };

function union(a: string[], b: string[], max: number): string[] {
  return [...new Set([...a, ...b])].slice(0, max);
}

/**
 * Fiche à écrire : sans fiche existante, la compagnie lue telle quelle. Sinon
 * les coordonnées déjà connues sont gardées (celles d'une fiche vérifiée ne
 * changent jamais), les vides sont remplis, et catégories, modèles et pages
 * de preuve s'additionnent.
 */
export function fusionCarnet(existante: FicheExistante | undefined, lue: AcheteurLu): AcheteurLu {
  if (!existante) return lue;
  const garde = <K extends keyof FicheExistante & keyof AcheteurLu>(cle: K) =>
    existante.verifie ? existante[cle] : (existante[cle] ?? lue[cle]);
  return {
    ...lue,
    ville: garde("ville"),
    region: garde("region"),
    pays: garde("pays"),
    courriel: garde("courriel"),
    telephone: garde("telephone"),
    formulaire: garde("formulaire"),
    notes: existante.notes ?? lue.notes,
    confiance:
      existante.confiance === "achete_surplus" || lue.confiance === "achete_surplus" ? "achete_surplus" : "a_sonder",
    sources: union(existante.sources ?? [], lue.sources, 10),
    categories: union(existante.categories ?? [], lue.categories, 20),
    modeles: union(existante.modeles ?? [], lue.modeles, 40),
  };
}
