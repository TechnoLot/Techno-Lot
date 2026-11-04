import { z } from "zod";
import { courrielValide, normaliserCourriel } from "@/lib/crm/envoi-en-gros";
import {
  CONFIANCES,
  LIMITES,
  type AcheteurFamille,
  type AcheteurLu,
  type Confiance,
  type Courriel,
  type FamilleResultat,
  type LigneResultat,
  type Refus,
  type ResultatRecherche,
} from "@/lib/acheteurs/types";

/*
 * Lecture de la réponse de Claude, renvoyée par l'agent de l'ordinateur de
 * l'utilisateur (logique pure). Le texte vient d'une IA qui a lu des pages Web : il est traité
 * comme NON FIABLE. Chaque valeur est bornée et validée ; les liens doivent
 * être https ; les courriels suivent la règle de l'Envoi en gros ; les
 * brouillons de courriel perdent tout lien. Une compagnie sans site, sans
 * page de preuve ou sans moyen de la joindre est refusée, avec sa raison.
 */

export type LectureReponse =
  | { ok: true; resultat: ResultatRecherche; acheteurs: AcheteurLu[]; refus: Refus[] }
  | { ok: false; erreur: string };

type Objet = Record<string, unknown>;

function estObjet(v: unknown): v is Objet {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const CONTROLES = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}]+`, "g");
const CONTROLES_SAUF_SAUT = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(0x09)}${String.fromCharCode(0x0b)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}]+`,
  "g",
);

/** Texte d'une ligne : contrôles retirés, espaces réduits, `max` caractères ; vide → null. */
export function texte(v: unknown, max: number): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const t = String(v).replace(CONTROLES, " ").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max).trim() : null;
}

/** Texte sur plusieurs lignes (courriel) : sauts de ligne gardés, le reste nettoyé. */
function texteLong(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v
    .replace(/\r\n?/g, "\n")
    .replace(CONTROLES_SAUF_SAUT, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return t ? t.slice(0, max).trim() : null;
}

/** Retire tout lien d'un brouillon de courriel (la demande les interdit déjà). */
function sansLiens(t: string | null): string | null {
  if (!t) return null;
  const propre = t
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return propre || null;
}

/** Nombre positif (« 1 083,00 », « US$ 175 » acceptés) ; 0 ou illisible → null. */
function nombre(v: unknown): number | null {
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string") {
    const t = v
      .replace(/\s|\$|€|£|CAD|USD/gi, "")
      .replace(/,(\d{1,2})$/, ".$1")
      .replace(/,/g, "");
    if (!/^\d+(\.\d+)?$/.test(t)) return null;
    n = Number(t);
  } else return null;
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return Math.round(n * 100) / 100;
}

const HOTE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/** Adresse https valide (http devient https) ; autre protocole ou adresse factice → null. */
export function urlSure(v: unknown): string | null {
  const t = texte(v, 500);
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
  if (u.protocol === "http:") u.protocol = "https:";
  if (u.protocol !== "https:" || u.username || u.password || !HOTE.test(u.hostname)) return null;
  return u.toString();
}

/** Domaine d'une adresse, sans « www. ». */
export function domaineDe(adresse: string): string {
  return new URL(adresse).hostname.toLowerCase().replace(/^www\./, "");
}

function listeUrls(v: unknown): string[] {
  const valeurs = Array.isArray(v) ? v : v == null ? [] : [v];
  return valeurs.map(urlSure).filter((u): u is string => u !== null);
}

const PAYS_NOMMES: Record<string, string> = {
  canada: "CA",
  "états-unis": "US",
  "etats-unis": "US",
  usa: "US",
  "u.s.": "US",
  "u.s.a.": "US",
  "united states": "US",
  "royaume-uni": "GB",
  "united kingdom": "GB",
  uk: "GB",
};

function pays(v: unknown): string | null {
  const t = texte(v, 40)?.toLowerCase();
  if (!t) return null;
  if (PAYS_NOMMES[t]) return PAYS_NOMMES[t];
  return /^[a-z]{2}$/.test(t) ? t.toUpperCase() : null;
}

/** Téléphone lisible (7 chiffres au moins), 40 caractères au plus. */
function telephone(v: unknown): string | null {
  const t = texte(v, 40);
  if (!t) return null;
  const propre = t.replace(/[^\d+()\-.\s]|(?<=\s)\s+/g, "").trim();
  return (propre.match(/\d/g)?.length ?? 0) >= 7 ? propre : null;
}

function confiance(v: unknown): Confiance {
  return CONFIANCES.includes(v as Confiance) ? (v as Confiance) : "a_sonder";
}

const racineSchema = z.object({
  familles: z.array(z.unknown()).optional(),
  articles: z.array(z.unknown()).optional(),
  courriel_fr: z.unknown().optional(),
  courriel_en: z.unknown().optional(),
});

/** Bloc JSON de la réponse : entre ```json … ```, sinon du premier « { » au dernier « } ». */
export function extraireJson(t: string): unknown {
  const bloc = /```(?:json)?\s*([\s\S]*?)```/i.exec(t)?.[1];
  const debut = t.indexOf("{");
  const fin = t.lastIndexOf("}");
  const candidats = [bloc, debut >= 0 && fin > debut ? t.slice(debut, fin + 1) : undefined];
  for (const c of candidats) {
    if (!c || !c.trim().startsWith("{")) continue;
    try {
      return JSON.parse(c);
    } catch {
      // candidat suivant
    }
  }
  return undefined;
}

function lireLigne(b: unknown, ou: string, refus: Refus[]): LigneResultat | null {
  if (!estObjet(b)) {
    refus.push({ ou, raison: "Ligne illisible." });
    return null;
  }
  const article = texte(b.article ?? b.description, LIMITES.ligne);
  if (!article) {
    refus.push({ ou, raison: "Ligne sans article." });
    return null;
  }
  const q = nombre(b.quantite);
  const prix = estObjet(b.prix) ? b.prix : {};
  let bas = nombre(prix.bas);
  let haut = nombre(prix.haut);
  if (bas != null && haut != null && bas > haut) [bas, haut] = [haut, bas];
  const devise = texte(prix.devise, 5)?.toUpperCase() ?? null;
  return {
    article,
    quantite: q != null ? Math.round(q) : null,
    etat: texte(b.etat, 40),
    prix: {
      bas,
      haut,
      devise: devise && /^[A-Z]{3}$/.test(devise) ? devise : null,
      base: texte(prix.base, 300),
      sources: [...new Set([...listeUrls(prix.sources), ...listeUrls(prix.source)])].slice(0, 5),
    },
  };
}

function lireAcheteur(
  b: unknown,
  categorie: string,
  modeles: string[],
  ou: string,
  refus: Refus[],
): { lu: AcheteurLu; famille: AcheteurFamille } | null {
  if (!estObjet(b)) {
    refus.push({ ou, raison: "Compagnie illisible." });
    return null;
  }
  const nom = texte(b.compagnie ?? b.nom, 160);
  if (!nom) {
    refus.push({ ou, raison: "Compagnie sans nom." });
    return null;
  }
  const site = urlSure(b.site);
  const preuve = urlSure(b.preuve);
  if (!preuve) {
    refus.push({ ou, raison: `${nom} : aucune page de preuve valide.` });
    return null;
  }
  const domaine = domaineDe(site ?? preuve);

  let courriel: string | null = null;
  const brut = texte(b.courriel, 254);
  if (brut) {
    const c = normaliserCourriel(brut.replace(/^mailto:/i, ""));
    if (courrielValide(c)) courriel = c;
    else refus.push({ ou, raison: `${nom} : courriel invalide ignoré.` });
  }
  const tel = telephone(b.telephone);
  const formulaire = urlSure(b.formulaire);
  if (!courriel && !tel && !formulaire) {
    refus.push({ ou, raison: `${nom} : aucun moyen de la joindre.` });
    return null;
  }

  const niveau = confiance(b.confiance);
  return {
    lu: {
      nom,
      domaine,
      site: site ?? `https://${domaine}/`,
      ville: texte(b.ville, 80),
      region: texte(b.region, 80),
      pays: pays(b.pays),
      courriel,
      telephone: tel,
      formulaire,
      sources: [preuve],
      confiance: niveau,
      categories: [categorie],
      modeles,
      notes: texte(b.notes, 300),
    },
    famille: { domaine, raison: texte(b.raison, 300), preuve, confiance: niveau },
  };
}

/** Une compagnie trouvée dans plusieurs familles : une seule fiche, listes réunies. */
function fusionner(a: AcheteurLu, b: AcheteurLu): AcheteurLu {
  return {
    ...a,
    ville: a.ville ?? b.ville,
    region: a.region ?? b.region,
    pays: a.pays ?? b.pays,
    courriel: a.courriel ?? b.courriel,
    telephone: a.telephone ?? b.telephone,
    formulaire: a.formulaire ?? b.formulaire,
    notes: a.notes ?? b.notes,
    confiance: a.confiance === "achete_surplus" || b.confiance === "achete_surplus" ? "achete_surplus" : "a_sonder",
    sources: [...new Set([...a.sources, ...b.sources])].slice(0, 10),
    categories: [...new Set([...a.categories, ...b.categories])].slice(0, 20),
    modeles: [...new Set([...a.modeles, ...b.modeles])].slice(0, 20),
  };
}

function lireCourriel(v: unknown): Courriel | null {
  if (!estObjet(v)) return null;
  const objet = sansLiens(texte(v.objet ?? v.subject, 200));
  const message = sansLiens(texteLong(v.message ?? v.body, 5_000));
  return objet && message ? { objet, message } : null;
}

/** Ancien format (« articles », un acheteur par article) : chaque article devient une famille. */
function famillesDepuisArticles(articles: unknown[]): unknown[] {
  return articles.map((a) =>
    estObjet(a)
      ? { famille: a.article, rare: a.rare, lignes: [a], acheteurs: a.acheteurs }
      : a,
  );
}

/**
 * Lit la réponse de Claude. `ok: false` seulement si rien n'est utilisable ;
 * sinon les parties refusées sont listées dans `refus`.
 */
export function lireReponse(t: string): LectureReponse {
  if (!t.trim()) return { ok: false, erreur: "Claude n'a rien répondu. Relancez la recherche." };
  if (t.length > LIMITES.reponse) {
    return { ok: false, erreur: "Réponse trop longue (200 000 caractères au plus)." };
  }
  const json = extraireJson(t);
  const racine = racineSchema.safeParse(json);
  if (json === undefined || !racine.success) {
    return {
      ok: false,
      erreur: "Claude n'a pas rendu ses résultats dans le format attendu. Relancez la recherche.",
    };
  }

  const refus: Refus[] = [];
  const bruts = racine.data.familles ?? famillesDepuisArticles(racine.data.articles ?? []);
  if (bruts.length > LIMITES.familles) {
    refus.push({ ou: "Familles", raison: `Plus de ${LIMITES.familles} familles : les suivantes sont ignorées.` });
  }

  const carnet = new Map<string, AcheteurLu>();
  const familles: FamilleResultat[] = [];

  bruts.slice(0, LIMITES.familles).forEach((brute, i) => {
    const ou = `Famille ${i + 1}`;
    if (!estObjet(brute)) {
      refus.push({ ou, raison: "Famille illisible." });
      return;
    }
    const nom = texte(brute.famille ?? brute.nom, 160) ?? ou;
    const lignesBrutes = Array.isArray(brute.lignes) ? brute.lignes : [];
    if (lignesBrutes.length > LIMITES.lignesParFamille) {
      refus.push({ ou: nom, raison: `Plus de ${LIMITES.lignesParFamille} lignes : les suivantes sont ignorées.` });
    }
    const lignes = lignesBrutes
      .slice(0, LIMITES.lignesParFamille)
      .map((l, j) => lireLigne(l, `${nom}, ligne ${j + 1}`, refus))
      .filter((l): l is LigneResultat => l !== null);
    const modeles = lignes.map((l) => l.article.slice(0, 120)).slice(0, 20);

    const acheteursBruts = Array.isArray(brute.acheteurs) ? brute.acheteurs : [];
    if (acheteursBruts.length > LIMITES.acheteursParFamille) {
      refus.push({
        ou: nom,
        raison: `Plus de ${LIMITES.acheteursParFamille} compagnies : les premières sont gardées.`,
      });
    }
    const acheteurs: AcheteurFamille[] = [];
    for (const [j, a] of acheteursBruts.slice(0, LIMITES.acheteursParFamille).entries()) {
      const lu = lireAcheteur(a, nom, modeles, `${nom}, compagnie ${j + 1}`, refus);
      if (!lu || acheteurs.some((x) => x.domaine === lu.famille.domaine)) continue;
      acheteurs.push(lu.famille);
      const deja = carnet.get(lu.lu.domaine);
      carnet.set(lu.lu.domaine, deja ? fusionner(deja, lu.lu) : lu.lu);
    }

    if (lignes.length === 0 && acheteurs.length === 0) {
      refus.push({ ou: nom, raison: "Ni ligne ni compagnie lisible." });
      return;
    }
    familles.push({ nom, rare: brute.rare === true || brute.rare === "true", lignes, acheteurs });
  });

  if (familles.length === 0) {
    return { ok: false, erreur: "La réponse ne contient aucune famille d'articles lisible." };
  }

  return {
    ok: true,
    resultat: {
      familles,
      courriels: { fr: lireCourriel(racine.data.courriel_fr), en: lireCourriel(racine.data.courriel_en) },
    },
    acheteurs: [...carnet.values()],
    refus,
  };
}
