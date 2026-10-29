/**
 * Graphique « Évolution » des Chiffres de l'accueil, façon bourse : le profit
 * cumulé de la période, regroupé en jours, semaines ou mois, avec ouverture,
 * clôture, plus bas et plus haut de chaque regroupement. Module pur (serveur
 * et client). Mêmes règles que les tuiles : un lot compte à sa date d'achat
 * (achat et vente), une vente manuelle à sa date de vente, une commande eBay
 * à son jour de création, heure de Toronto (montant et frais de `sumEbayOrders`).
 */

import { addDays, sumEbayOrders, torontoDay, type EbayCountable } from "@/lib/ebay/totaux";
import { debutMois, lundi } from "@/lib/admin/periodes";

export type Granularite = "jour" | "semaine" | "mois";

/** Argent entré et sorti un jour donné. */
export type Mouvement = { ventes: number; achats: number; frais: number };

export type PointEvolution = {
  /** Premier et dernier jour du regroupement (« YYYY-MM-DD », inclusifs) */
  debut: string;
  fin: string;
  ventes: number;
  achats: number;
  /** Frais eBay connus */
  frais: number;
  /** ventes − achats − frais */
  net: number;
  /** Profit cumulé au début et à la fin du regroupement */
  ouverture: number;
  cloture: number;
  /** Plus bas : achats et frais payés avant de revendre */
  bas: number;
  haut: number;
  /** Profit cumulé de la période de comparaison au même rang de jour ; null sans comparaison */
  precedent: number | null;
};

export type SerieEvolution = {
  granularite: Granularite;
  points: PointEvolution[];
  /** Profit de la période de comparaison (même portion) ; null sans comparaison */
  totalPrecedent: number | null;
};

type LotLigne = { purchase_price: number | string; sale_price: number | string | null; purchased_at: string };
type VenteLigne = { sale_price: number | string; sold_at: string };
type EbayLigne = EbayCountable & { created_at: string };

/** Arrondi au cent, sans « -0 » (qui s'afficherait « -0 $ »). */
const round2 = (n: number) => Math.round(n * 100) / 100 || 0;

/** Garde-fou des boucles sur les jours : un peu plus de 10 ans. */
const MAX_JOURS = 4000;

/** Lots, ventes manuelles et commandes eBay additionnés par jour. */
export function mouvementsParJour(lots: LotLigne[], ventes: VenteLigne[], ebay: EbayLigne[]): Map<string, Mouvement> {
  const jours = new Map<string, Mouvement>();
  const du = (jour: string): Mouvement => {
    let m = jours.get(jour);
    if (!m) jours.set(jour, (m = { ventes: 0, achats: 0, frais: 0 }));
    return m;
  };
  for (const l of lots) {
    const m = du(l.purchased_at.slice(0, 10));
    m.achats += Number(l.purchase_price) || 0;
    if (l.sale_price != null) m.ventes += Number(l.sale_price) || 0;
  }
  for (const v of ventes) du(v.sold_at.slice(0, 10)).ventes += Number(v.sale_price) || 0;

  const ebayParJour = new Map<string, EbayLigne[]>();
  for (const r of ebay) {
    const jour = torontoDay(r.created_at);
    const liste = ebayParJour.get(jour);
    if (liste) liste.push(r);
    else ebayParJour.set(jour, [r]);
  }
  ebayParJour.forEach((rows, jour) => {
    const s = sumEbayOrders(rows);
    const m = du(jour);
    m.ventes += s.revenue;
    m.frais += s.fees ?? 0;
  });
  return jours;
}

function aDuMouvement(m: Mouvement): boolean {
  return m.ventes !== 0 || m.achats !== 0 || m.frais !== 0;
}

/** Nombre de jours de `a` à `b` (b − a). */
function ecartJours(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Jour par jour jusqu'à ~3 mois, par semaine jusqu'à ~13 mois, par mois au-delà. */
export function granulariteEvolution(nbJours: number): Granularite {
  if (nbJours <= 92) return "jour";
  if (nbJours <= 400) return "semaine";
  return "mois";
}

/**
 * Profit cumulé du jour `from` au jour `to` inclus, regroupé selon la longueur
 * de la période (semaines du lundi, mois civils, coupés aux bornes). `from`
 * null (« Tout ») : dès le premier mouvement. null s'il n'y a qu'un jour.
 * `precedent` : période de comparaison, lue au même rang de jour (le 10e jour
 * de la période est comparé au 10e jour de la précédente).
 */
export function serieEvolution(
  from: string | null,
  to: string,
  jours: Map<string, Mouvement>,
  precedent: { from: string; to: string; jours: Map<string, Mouvement> } | null = null,
): SerieEvolution | null {
  let debut = from;
  if (!debut) {
    jours.forEach((m, jour) => {
      if (aDuMouvement(m) && (!debut || jour < debut)) debut = jour;
    });
  }
  if (!debut || debut >= to) return null;
  const depart = debut;

  const granularite = granulariteEvolution(ecartJours(depart, to) + 1);
  const cle = (jour: string) =>
    granularite === "jour" ? jour : granularite === "semaine" ? lundi(jour) : debutMois(jour);

  // Profit cumulé de la période de comparaison, jour par jour
  const cumulPrecedent: number[] = [];
  if (precedent) {
    let cumul = 0;
    for (let jour = precedent.from, i = 0; jour <= precedent.to && i < MAX_JOURS; jour = addDays(jour, 1), i++) {
      const m = precedent.jours.get(jour);
      if (m) cumul += m.ventes - m.achats - m.frais;
      cumulPrecedent.push(round2(cumul));
    }
  }
  const precedentAuRang = (jour: string): number | null =>
    cumulPrecedent.length > 0
      ? cumulPrecedent[Math.min(ecartJours(depart, jour), cumulPrecedent.length - 1)]
      : null;

  const points: PointEvolution[] = [];
  let courant: PointEvolution | null = null;
  for (let jour = depart, i = 0; jour <= to && i < MAX_JOURS; jour = addDays(jour, 1), i++) {
    if (!courant || cle(jour) !== cle(courant.debut)) {
      courant = {
        debut: jour,
        fin: jour,
        ventes: 0,
        achats: 0,
        frais: 0,
        net: 0,
        ouverture: 0,
        cloture: 0,
        bas: 0,
        haut: 0,
        precedent: null,
      };
      points.push(courant);
    }
    courant.fin = jour;
    const m = jours.get(jour);
    if (m) {
      courant.ventes += m.ventes;
      courant.achats += m.achats;
      courant.frais += m.frais;
    }
  }

  let cumul = 0;
  for (const p of points) {
    p.ventes = round2(p.ventes);
    p.achats = round2(p.achats);
    p.frais = round2(p.frais);
    p.net = round2(p.ventes - p.achats - p.frais);
    p.ouverture = round2(cumul);
    // On achète (et paie les frais) avant de revendre : le creux vient d'abord.
    p.bas = round2(cumul - p.achats - p.frais);
    cumul += p.net;
    p.cloture = round2(cumul);
    p.haut = Math.max(p.ouverture, p.cloture);
    p.precedent = precedentAuRang(p.fin);
  }

  return { granularite, points, totalPrecedent: precedentAuRang(to) };
}

export type StatsEvolution = {
  /** Regroupement au meilleur net (> 0) et au pire (< 0) ; null s'il n'y en a pas */
  meilleur: PointEvolution | null;
  pire: PointEvolution | null;
  hausses: number;
  baisses: number;
  /** Net moyen par regroupement */
  moyenne: number;
};

export function statsEvolution(points: PointEvolution[]): StatsEvolution {
  let meilleur: PointEvolution | null = null;
  let pire: PointEvolution | null = null;
  let hausses = 0;
  let baisses = 0;
  let total = 0;
  for (const p of points) {
    total += p.net;
    if (p.net > 0) {
      hausses++;
      if (!meilleur || p.net > meilleur.net) meilleur = p;
    } else if (p.net < 0) {
      baisses++;
      if (!pire || p.net < pire.net) pire = p;
    }
  }
  return { meilleur, pire, hausses, baisses, moyenne: points.length > 0 ? round2(total / points.length) : 0 };
}
