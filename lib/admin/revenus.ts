/**
 * Graphique « Revenus journaliers » des Chiffres de l'accueil : les ventes de
 * la tuile, jour par jour. Mêmes règles : un lot compte à sa date d'achat,
 * une vente manuelle à sa date de vente, une commande eBay à son jour de
 * création à l'heure de Toronto (montant de `sumEbayOrders`). Module pur.
 */

import { addDays, sumEbayOrders, torontoDay, type EbayCountable } from "@/lib/ebay/totaux";

export type RevenuJour = { day: string; total: number };

type LotLigne = { sale_price: number | string | null; purchased_at: string };
type VenteLigne = { sale_price: number | string; sold_at: string };
type EbayLigne = EbayCountable & { created_at: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Revenus de chaque jour, de `from` à `to` inclus (0 les jours sans vente).
 * `from` null (« Tout ») : dès la première vente. null s'il n'y a qu'un jour.
 */
export function revenusJournaliers(
  from: string | null,
  to: string,
  lots: LotLigne[],
  ventes: VenteLigne[],
  ebay: EbayLigne[],
): RevenuJour[] | null {
  const parJour = new Map<string, number>();
  const ajouter = (jour: string, montant: number) => parJour.set(jour, (parJour.get(jour) ?? 0) + montant);
  for (const l of lots) if (l.sale_price != null) ajouter(l.purchased_at.slice(0, 10), Number(l.sale_price) || 0);
  for (const v of ventes) ajouter(v.sold_at.slice(0, 10), Number(v.sale_price) || 0);

  const ebayParJour = new Map<string, EbayLigne[]>();
  for (const r of ebay) {
    const jour = torontoDay(r.created_at);
    const liste = ebayParJour.get(jour);
    if (liste) liste.push(r);
    else ebayParJour.set(jour, [r]);
  }
  ebayParJour.forEach((rows, jour) => ajouter(jour, sumEbayOrders(rows).revenue));

  let debut = from;
  if (!debut) {
    parJour.forEach((montant, jour) => {
      if (montant !== 0 && (!debut || jour < debut)) debut = jour;
    });
  }
  if (!debut || debut >= to) return null;

  const out: RevenuJour[] = [];
  // Garde-fou : au plus ~10 ans de jours.
  for (let jour = debut, i = 0; jour <= to && i < 3700; jour = addDays(jour, 1), i++) {
    out.push({ day: jour, total: round2(parJour.get(jour) ?? 0) });
  }
  return out;
}
