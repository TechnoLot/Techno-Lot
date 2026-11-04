import type { Company, Contact } from "@/lib/crm/types";

/*
 * Liste des compagnies de /admin/crm (module pur). Toutes les compagnies sont
 * lues avec COLONNES_LISTE pour filtrer, trier et compter ; seules celles de
 * la page affichée sont ensuite lues au complet.
 */

export const PAR_PAGE = 10;

/** Ce qu'il faut pour filtrer, trier et calculer les indicateurs. */
export const COLONNES_LISTE =
  "id, name, domain, industry, fit_score, region, research_status, lead_status, lead_status_changed_at, next_followup_on, is_partner_not_client";

export type CompagnieListe = Pick<
  Company,
  | "id"
  | "name"
  | "domain"
  | "industry"
  | "fit_score"
  | "region"
  | "research_status"
  | "lead_status"
  | "lead_status_changed_at"
  | "next_followup_on"
  | "is_partner_not_client"
>;

export type ContactListe = Pick<Contact, "id" | "company_id" | "stage">;

/** Paramètres d'URL de la liste. */
export type FiltresCompagnies = {
  q?: string;
  score?: string;
  region?: string;
  status?: string;
  suivi?: string;
  partenaires?: string;
  appel?: string;
};

/** Compagnies avec au moins un contact `call_done` (= appel noté). */
export function compagniesAvecAppel(contacts: readonly ContactListe[]): Set<string> {
  return new Set(
    contacts.filter((ct) => ct.stage === "call_done" && ct.company_id).map((ct) => ct.company_id!),
  );
}

export function filtrerCompagnies<T extends CompagnieListe>(
  compagnies: readonly T[],
  filtres: FiltresCompagnies,
  avecAppel: ReadonlySet<string>,
): T[] {
  const q = filtres.q?.toLowerCase().trim();
  const minScore = Number(filtres.score) || null;
  const { region, status, suivi, appel } = filtres;
  const includePartners = filtres.partenaires === "1";

  return compagnies.filter((c) => {
    if (!includePartners && c.is_partner_not_client) return false;
    if (q && !`${c.name} ${c.domain ?? ""} ${c.industry ?? ""}`.toLowerCase().includes(q))
      return false;
    if (minScore && (c.fit_score ?? 0) < minScore) return false;
    if (region && c.region !== region) return false;
    if (status && c.research_status !== status) return false;
    if (suivi && c.lead_status !== suivi) return false;
    if (appel === "oui" && !avecAppel.has(c.id)) return false;
    if (appel === "non" && avecAppel.has(c.id)) return false;
    return true;
  });
}

/**
 * Mélange déterministe (Fisher-Yates + PRNG mulberry32 dérivé du seed) :
 * l'ordre reste le même tant qu'on ne relance pas le mélange, même si la
 * page se rafraîchit après une action.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Remet les lignes dans l'ordre de `ids` ; une ligne disparue entre-temps est sautée. */
export function dansOrdreDesIds<T extends { id: string }>(
  ids: readonly string[],
  lignes: readonly T[],
): T[] {
  const parId = new Map(lignes.map((l) => [l.id, l]));
  return ids.flatMap((id) => parId.get(id) ?? []);
}
