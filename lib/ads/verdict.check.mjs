// Vérification des règles de verdict des pubs (cas limites).
// Lancer : node lib/ads/verdict.check.mjs   (Node ≥ 23.6, types TS retirés à la volée)
import assert from "node:assert/strict";
import { averageCpl, judgeAd, rankAds } from "./verdict.ts";

const ad = (spend, leads, clients = 0, profit = 0) => ({ spend, leads, clients, profit });
const v = (a, avg) => judgeAd(a, avg).verdict;
let n = 0;
const check = (label, got, want) => {
  n += 1;
  assert.equal(got, want, `${label} : obtenu « ${got} », attendu « ${want} »`);
};

// CPL moyen
check("CPL moyen sans lead", averageCpl(100, 0), null);
check("CPL moyen sans dépense", averageCpl(0, 5), null);
check("CPL moyen normal", averageCpl(400, 10), 40);

const AVG = 40; // seuils : prometteuse ≤ 30 $, à couper ≥ 80 $ par lead, sans lead ≥ max(50, 80) = 80 $

// 1. Rentable
check("rentable : profit > dépenses", v(ad(300, 4, 1, 500), AVG), "rentable");
check("rentable : profit = dépenses (limite)", v(ad(300, 4, 1, 300), AVG), "rentable");
check("pas rentable : profit 1 ¢ sous les dépenses", v(ad(300, 5, 1, 299.99), AVG), "surveiller");
check("rentable prime sur à couper (CPL énorme)", v(ad(500, 1, 1, 1000), AVG), "rentable");
check("rentable sans dépense connue", v(ad(0, 1, 1, 0), null), "rentable");

// 2. Prometteuse
check("prometteuse : CPL = 0,75 × moyenne (limite)", v(ad(60, 2), AVG), "prometteuse");
check("pas prometteuse : CPL 1 ¢ au-dessus", v(ad(60.02, 2), AVG), "surveiller");
check("pas prometteuse : 1 seul lead pas cher", v(ad(10, 1), AVG), "surveiller");
check("pas prometteuse sans CPL moyen", v(ad(0, 3), null), "surveiller");

// 3. À couper — sans lead
check("à couper : 0 lead, dépenses = 2 × moyenne (limite)", v(ad(80, 0), AVG), "couper");
check("pas à couper : 0 lead, 1 ¢ sous le seuil", v(ad(79.99, 0), AVG), "surveiller");
check("à couper : 0 lead, plancher 50 $ (moyenne 20)", v(ad(50, 0), 20), "couper");
check("pas à couper : 49,99 $ (moyenne 20)", v(ad(49.99, 0), 20), "surveiller");
check("à couper : 0 lead, 50 $, sans moyenne", v(ad(50, 0), null), "couper");

// 3. À couper — CPL trop élevé sans client
check("à couper : CPL = 2 × moyenne (limite), 0 client", v(ad(160, 2), AVG), "couper");
check("pas à couper : CPL 2 × moyenne mais 1 client", v(ad(160, 2, 1, 10), AVG), "surveiller");
check("pas à couper : CPL juste sous 2 × moyenne", v(ad(159.98, 2), AVG), "surveiller");

// 4. Trop tôt
check("trop tôt : rien du tout", v(ad(0, 0), AVG), "trop_tot");
check("trop tôt : 24,99 $ sans lead", v(ad(24.99, 0), AVG), "trop_tot");
check("pas trop tôt : 25 $ sans lead", v(ad(25, 0), AVG), "surveiller");
check("trop tôt sans moyenne", v(ad(24.99, 0), null), "trop_tot");

// 5. À surveiller
check("à surveiller : CPL dans la moyenne", v(ad(200, 5), AVG), "surveiller");

// Tri du meilleur au pire
const ranked = rankAds(
  [
    { id: "coupe", ...ad(120, 0) },
    { id: "tot", ...ad(10, 0) },
    { id: "surv", ...ad(200, 5) },
    { id: "prom", ...ad(50, 2) },
    { id: "rent-petit", ...ad(300, 3, 1, 400) },
    { id: "rent-gros", ...ad(300, 3, 2, 2000) },
    { id: "coupe-cher", ...ad(400, 0) },
  ],
  AVG,
);
check(
  "ordre du tri",
  ranked.map((a) => a.id).join(","),
  "rent-gros,rent-petit,prom,surv,tot,coupe,coupe-cher",
);

// Les raisons sont toujours une phrase non vide
for (const a of ranked) assert.ok(a.reason.length > 10 && a.reason.endsWith("."), `raison invalide : ${a.reason}`);

console.log(`Verdicts : ${n} vérifications OK`);
