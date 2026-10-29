import { site } from "@/lib/site";

/**
 * Certificats de destruction des données (admin → eBay → Destruction des
 * données) : types, mentions fixes du certificat et petits calculs partagés
 * serveur/client (fichier sans "use client").
 */

/** Ligne de la table certificats_destruction (+ la fiche client liée, si demandée). */
export type CertificatDestruction = {
  id: string;
  numero: string;
  compagnie: string;
  adresse: string | null;
  materiel: string | null;
  nb_appareils: number;
  /** AAAA-MM-JJ */
  date_destruction: string;
  /** AAAA-MM-JJ */
  date_emission: string;
  created_at: string;
  /** Fiche client (companies) : /admin/crm/[id] */
  company_id: string | null;
  companies?: { id: string; name: string } | null;
};

export const COLONNES_CERTIFICAT =
  "id, numero, compagnie, adresse, materiel, nb_appareils, date_destruction, date_emission, created_at, company_id, companies(id, name)";

/** Compagnie du CRM proposée dans le formulaire (remplit le nom et l'adresse). */
export type ClientCertificat = {
  id: string;
  nom: string;
  adresse: string;
  /** Compagnie convertie en client (sinon : prospect du CRM). */
  client: boolean;
};

/** Valeurs saisies dans le formulaire, affichées sur le certificat. */
export type ValeursCertificat = {
  numero: string;
  compagnie: string;
  adresse: string;
  materiel: string;
  nbAppareils: number;
  /** AAAA-MM-JJ */
  dateDestruction: string;
  /** AAAA-MM-JJ */
  dateEmission: string;
};

/** Mentions fixes : les données sont détruites et certifiées avec KillDisk, rien de physique. */
export const MENTIONS_CERTIFICAT = {
  logiciel: "Active@ KillDisk",
  signataire: site.president.name,
  fonction: "Président, Techno Lot",
  role: "Responsable de la protection des renseignements personnels",
} as const;

export const LIMITES_CERTIFICAT = {
  compagnie: 160,
  adresse: 200,
  materiel: 200,
  nbAppareils: 100_000,
} as const;

/**
 * Numéro affiché pour un nouveau certificat : TL-AAAA-NNNN suivant le compteur
 * de l'année (certificats_destruction_compteurs). La base attribue le vrai
 * numéro à l'enregistrement (fonction prochain_numero_certificat) : jamais
 * deux fois le même, même après une suppression.
 */
export function prochainNumero(annee: string, dernier: number | null, numeros: string[] = []): string {
  const prefixe = `TL-${annee}-`;
  let max = dernier ?? 0;
  for (const numero of numeros) {
    if (!numero.startsWith(prefixe)) continue;
    const suite = Number(numero.slice(prefixe.length));
    if (Number.isInteger(suite) && suite > max) max = suite;
  }
  return `${prefixe}${String(max + 1).padStart(4, "0")}`;
}

/** Texte cherché tel quel dans un filtre ilike (%, _ et \ ne sont plus des jokers). */
export function echapperLike(texte: string): string {
  return texte.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Dates AAAA-MM-JJ lues en UTC : pas de décalage d'un jour selon le fuseau de l'appareil.
const fmtJour = new Intl.DateTimeFormat("fr-CA", { weekday: "long", timeZone: "UTC" });
const fmtDate = new Intl.DateTimeFormat("fr-CA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function estDateValide(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}

/** « Mercredi » */
export function jourSemaine(iso: string): string {
  if (!estDateValide(iso)) return "";
  const jour = fmtJour.format(new Date(`${iso}T00:00:00Z`));
  return jour.charAt(0).toUpperCase() + jour.slice(1);
}

/** « 28 octobre 2026 », « 1er octobre 2026 » */
export function dateLongue(iso: string): string {
  if (!estDateValide(iso)) return "";
  return fmtDate.format(new Date(`${iso}T00:00:00Z`)).replace(/^1 /, "1er ");
}

const espaces = (s: string) => s.replace(/\s+/g, " ").trim();

/** Valeurs nettoyées (espaces en trop retirés), telles qu'imprimées sur le certificat. */
export function nettoyerCertificat(v: ValeursCertificat): ValeursCertificat {
  return {
    numero: espaces(v.numero),
    compagnie: espaces(v.compagnie),
    adresse: espaces(v.adresse),
    materiel: espaces(v.materiel),
    nbAppareils: v.nbAppareils,
    dateDestruction: v.dateDestruction.trim(),
    dateEmission: v.dateEmission.trim(),
  };
}

/** Vérifie les valeurs (formulaire et action serveur) ; renvoie la première erreur. */
export function validerCertificat(
  brut: ValeursCertificat,
): { ok: true; valeurs: ValeursCertificat } | { ok: false; error: string } {
  const v = nettoyerCertificat(brut);
  const L = LIMITES_CERTIFICAT;
  if (!v.compagnie) return { ok: false, error: "Indique le nom de la compagnie." };
  if (v.compagnie.length > L.compagnie) {
    return { ok: false, error: `Le nom de la compagnie dépasse ${L.compagnie} caractères.` };
  }
  if (v.adresse.length > L.adresse) return { ok: false, error: `L’adresse dépasse ${L.adresse} caractères.` };
  if (v.materiel.length > L.materiel) {
    return { ok: false, error: `La description du matériel dépasse ${L.materiel} caractères.` };
  }
  if (!Number.isInteger(v.nbAppareils) || v.nbAppareils < 1 || v.nbAppareils > L.nbAppareils) {
    return { ok: false, error: "Indique le nombre d’appareils (un nombre entier, au moins 1)." };
  }
  if (!estDateValide(v.dateDestruction)) return { ok: false, error: "Indique la date de la destruction." };
  if (!estDateValide(v.dateEmission)) return { ok: false, error: "Indique la date d’émission du certificat." };
  return { ok: true, valeurs: v };
}

/** certificat-destruction-TL-2026-0001-entreprise-exemple-inc.pdf */
export function nomFichierCertificat(numero: string, compagnie: string, extension: "pdf" | "png"): string {
  const propre = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const nom = propre(compagnie).toLowerCase().slice(0, 60).replace(/-+$/, "");
  return `certificat-destruction-${propre(numero) || "sans-numero"}${nom ? `-${nom}` : ""}.${extension}`;
}
