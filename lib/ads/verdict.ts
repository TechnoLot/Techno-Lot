/**
 * Verdict d'une pub : « Rentable », « Prometteuse », « À surveiller »,
 * « Trop tôt » ou « À couper ». Fonctions pures, sans dépendance (partagées
 * serveur + client, testées par `node lib/ads/verdict.check.mjs`).
 *
 * Règles (évaluées dans cet ordre, la première qui s'applique gagne) :
 *   CPL_moy = dépenses totales ÷ leads totaux de la période (plateforme filtrée)
 *   1. Rentable    : clients ≥ 1 et profit ≥ dépenses
 *   2. Prometteuse : leads ≥ 2 et coût par lead ≤ 0,75 × CPL_moy
 *   3. À couper    : (leads = 0 et dépenses ≥ max(50 $, 2 × CPL_moy))
 *                    ou (coût par lead ≥ 2 × CPL_moy et clients = 0)
 *   4. Trop tôt    : dépenses < 25 $ et leads = 0
 *   5. À surveiller: tout le reste
 *
 * Sans dépense connue (Meta pas encore synchronisé), le coût par lead
 * n'existe pas : les règles qui en dépendent ne s'appliquent pas.
 */

export const VERDICT_RULES = {
  /** Prometteuse : nombre minimal de leads */
  promisingMinLeads: 2,
  /** Prometteuse : coût par lead ≤ ce ratio × CPL_moy */
  promisingMaxCplRatio: 0.75,
  /** À couper (aucun lead) : dépense minimale, en $ */
  cutNoLeadMinSpend: 50,
  /** À couper (aucun lead) : ou ce multiple de CPL_moy, si plus élevé */
  cutNoLeadCplMultiple: 2,
  /** À couper (sans client) : coût par lead ≥ ce ratio × CPL_moy */
  cutCplRatio: 2,
  /** Trop tôt : dépense sous ce montant, en $, et aucun lead */
  tooEarlyMaxSpend: 25,
} as const;

export type Verdict = "rentable" | "prometteuse" | "surveiller" | "trop_tot" | "couper";

/** Ordre d'affichage : du meilleur au pire. */
export const VERDICT_ORDER: Verdict[] = ["rentable", "prometteuse", "surveiller", "trop_tot", "couper"];

export const VERDICT_LABELS: Record<Verdict, string> = {
  rentable: "Rentable",
  prometteuse: "Prometteuse",
  surveiller: "À surveiller",
  trop_tot: "Trop tôt",
  couper: "À couper",
};

export type JudgeInput = {
  spend: number;
  leads: number;
  clients: number;
  profit: number;
};

export type Judgement = {
  verdict: Verdict;
  /** Raison en une phrase, en français */
  reason: string;
  /** Coût par lead de la pub (null si aucun lead ou aucune dépense) */
  cpl: number | null;
};

const EPS = 1e-9;

/** CPL moyen de la période ; null sans lead ou sans dépense connue. */
export function averageCpl(totalSpend: number, totalLeads: number): number | null {
  return totalLeads > 0 && totalSpend > 0 ? totalSpend / totalLeads : null;
}

/** Coût par lead d'une pub ; null sans lead ou sans dépense connue. */
export function costPerLead(spend: number, leads: number): number | null {
  return leads > 0 && spend > 0 ? spend / leads : null;
}

/** Seuil de dépense « À couper » quand la pub n'a aucun lead. */
export function cutNoLeadThreshold(avgCpl: number | null): number {
  const r = VERDICT_RULES;
  return Math.max(r.cutNoLeadMinSpend, r.cutNoLeadCplMultiple * (avgCpl ?? 0));
}

/** 30 $ ; 31,50 $ (cents seulement sous 100 $ et si non ronds). */
const money = (v: number) => {
  const cents = Math.round(v * 100) / 100;
  const decimals = Math.abs(cents) < 100 && !Number.isInteger(cents) ? 2 : 0;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(cents);
};

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** « 1 lead à 95 $ » ou « 4 leads à 30 $ chacun » */
const leadsAt = (n: number, cpl: number) => (n > 1 ? `${n} leads à ${money(cpl)} chacun` : `1 lead à ${money(cpl)}`);

export function judgeAd(ad: JudgeInput, avgCpl: number | null): Judgement {
  const r = VERDICT_RULES;
  const cpl = costPerLead(ad.spend, ad.leads);
  const avg = avgCpl != null && avgCpl > 0 ? avgCpl : null;

  // 1. Rentable
  if (ad.clients >= 1 && ad.profit >= ad.spend - EPS) {
    const clients = plural(ad.clients, "client", "clients");
    return {
      verdict: "rentable",
      cpl,
      reason:
        ad.spend > 0
          ? `${ad.clients > 1 ? `Ses ${clients} ont rapporté` : "Son client a rapporté"} ${money(ad.profit)} de profit pour ${money(ad.spend)} dépensés.`
          : `Elle a amené ${clients} (${money(ad.profit)} de profit) sans dépense enregistrée.`,
    };
  }

  // 2. Prometteuse
  if (ad.leads >= r.promisingMinLeads && cpl != null && avg != null && cpl <= r.promisingMaxCplRatio * avg + EPS) {
    return {
      verdict: "prometteuse",
      cpl,
      reason: `${leadsAt(ad.leads, cpl)}, bien moins que la moyenne de ${money(avg)}${
        ad.clients === 0 ? ", mais aucun client pour l'instant." : ", mais pas encore rentable."
      }`,
    };
  }

  // 3. À couper
  const threshold = cutNoLeadThreshold(avg);
  if (ad.leads === 0 && ad.spend >= threshold - EPS) {
    return {
      verdict: "couper",
      cpl,
      reason: `${money(ad.spend)} dépensés sans un seul lead (seuil : ${money(threshold)}).`,
    };
  }
  if (cpl != null && avg != null && ad.clients === 0 && cpl >= r.cutCplRatio * avg - EPS) {
    return {
      verdict: "couper",
      cpl,
      reason: `${money(cpl)} par lead, au moins ${r.cutCplRatio} fois la moyenne de ${money(avg)}, et aucun client.`,
    };
  }

  // 4. Trop tôt
  if (ad.spend < r.tooEarlyMaxSpend && ad.leads === 0) {
    return {
      verdict: "trop_tot",
      cpl,
      reason:
        ad.spend > 0
          ? `Seulement ${money(ad.spend)} dépensés et aucun lead : trop peu de données pour juger.`
          : "Aucune dépense ni aucun lead sur la période : rien à juger pour l'instant.",
    };
  }

  // 5. À surveiller
  let reason: string;
  if (ad.leads === 0) {
    reason = `${money(ad.spend)} dépensés sans lead : à couper si rien n'arrive avant ${money(threshold)}.`;
  } else if (ad.clients >= 1) {
    reason = `${plural(ad.clients, "client", "clients")} mais ${money(ad.profit)} de profit pour ${money(ad.spend)} dépensés : pas encore rentable.`;
  } else if (cpl != null && avg != null && cpl > avg + EPS) {
    reason = `${leadsAt(ad.leads, cpl)}, plus cher que la moyenne de ${money(avg)}, sans client pour l'instant.`;
  } else if (cpl != null && avg != null && ad.leads < r.promisingMinLeads) {
    reason = `${leadsAt(ad.leads, cpl)}, sous la moyenne de ${money(avg)} : à confirmer avec d'autres leads.`;
  } else if (cpl != null && avg != null) {
    reason = `${leadsAt(ad.leads, cpl)}, dans la moyenne de ${money(avg)}, sans client pour l'instant.`;
  } else {
    reason = `${plural(ad.leads, "lead", "leads")}, sans client pour l'instant et sans dépense connue pour calculer le coût par lead.`;
  }
  return { verdict: "surveiller", cpl, reason };
}

/**
 * Juge et trie des pubs du meilleur au pire : ordre des verdicts, puis
 * (rentables) le gain net, puis le coût par lead le plus bas, le plus de
 * leads et enfin la plus petite dépense.
 */
export function rankAds<T extends JudgeInput>(ads: T[], avgCpl: number | null): (T & Judgement)[] {
  return ads
    .map((a) => ({ ...a, ...judgeAd(a, avgCpl) }))
    .sort((x, y) => compareJudged(x, y));
}

export function compareJudged(x: JudgeInput & Judgement, y: JudgeInput & Judgement): number {
  const rank = VERDICT_ORDER.indexOf(x.verdict) - VERDICT_ORDER.indexOf(y.verdict);
  if (rank !== 0) return rank;
  if (x.verdict === "rentable") {
    const net = y.profit - y.spend - (x.profit - x.spend);
    if (Math.abs(net) > EPS) return net;
  }
  if (x.cpl != null && y.cpl == null) return -1;
  if (x.cpl == null && y.cpl != null) return 1;
  if (x.cpl != null && y.cpl != null && Math.abs(x.cpl - y.cpl) > EPS) return x.cpl - y.cpl;
  if (x.leads !== y.leads) return y.leads - x.leads;
  return x.spend - y.spend;
}
