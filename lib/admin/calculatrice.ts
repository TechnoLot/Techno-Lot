/**
 * Lots de la calculatrice (table saved_lots, colonne `data`) lus côté serveur :
 * pages Lots enregistrés et Nouveau lot. Module pur, sans accès à la base.
 *
 * Forme écrite par assets/outils/calculatrice.html (donneesLot) : items
 * { desc, qte, cat, prix, bas }, `offre` (prix à payer décidé par l'admin),
 * `soumissionId`. Les lots d'avant le 2026-11-03 n'ont que `bas` (prix le plus
 * bas) et `moyen` : leur prix est `bas`, sinon `moyen`, et ils n'ont pas
 * d'offre (l'ancienne offre « valeur ÷ 2,5 » n'existe plus).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Montant ≥ 0 fini, sinon null. */
function montant(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function objet(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Prix de vente unitaire d'un item : `prix` ; anciens lots : le plus bas, sinon le moyen. */
export function prixItemCalculatrice(item: unknown): number | null {
  const it = objet(item);
  return montant(it.prix) ?? montant(it.bas) ?? montant(it.moyen);
}

export type ResumeLotCalculatrice = {
  /** Valeur du lot en $ CA (prix × quantité, converti si les prix sont en USD), au cent près. */
  valeur: number;
  /** Prix à payer décidé dans la calculatrice, ou null. */
  offre: number | null;
  items: number;
  unites: number;
  soumissionId: string | null;
  /** « 10x Dell Latitude 5420, 2x Dell R740 » (description d'un lot créé depuis la calculatrice). */
  description: string;
};

/** Résumé d'un lot enregistré, quelle que soit sa version (données incomplètes tolérées). */
export function resumeLotCalculatrice(data: unknown): ResumeLotCalculatrice {
  const d = objet(data);
  const items = Array.isArray(d.items) ? d.items : [];
  const taux = d.usd === true ? (montant(d.taux) || 1.37) : 1;
  let valeur = 0;
  let unites = 0;
  const morceaux: string[] = [];
  for (const brut of items) {
    const it = objet(brut);
    const qte = Number.isInteger(it.qte) && (it.qte as number) > 0 ? (it.qte as number) : 0;
    unites += qte;
    const prix = prixItemCalculatrice(it);
    if (prix !== null) valeur += prix * qte * taux;
    const desc = typeof it.desc === "string" ? it.desc.trim() : "";
    if (desc) morceaux.push(`${qte || 1}x ${desc}`);
  }
  const offre = montant(d.offre);
  const sid = typeof d.soumissionId === "string" && UUID_RE.test(d.soumissionId) ? d.soumissionId.toLowerCase() : null;
  return {
    valeur: Math.round(valeur * 100) / 100,
    offre: offre === null ? null : Math.round(offre * 100) / 100,
    items: items.length,
    unites,
    soumissionId: sid,
    description: morceaux.join(", "),
  };
}
