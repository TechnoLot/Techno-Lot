/**
 * Détection des appareils lents (ordinateurs anciens, processeur bridé) pour
 * alléger les effets coûteux sur le fil principal (ex. défilement lissé).
 *
 * Deux sources :
 *  - indices statiques : peu de cœurs (`hardwareConcurrency` ≤ 4), peu de
 *    mémoire (`deviceMemory` ≤ 4 Go, Chrome seulement), économiseur de données ;
 *  - un court test de vitesse du processeur, lancé au repos
 *    (requestIdleCallback), car un vieux processeur ou un ralentissement émulé
 *    ne se voit pas dans le nombre de cœurs. La charge est découpée en petits
 *    morceaux (≈ 1,5 ms chacun) espacés d'au moins 20 ms, et l'on additionne
 *    leurs durées : le ralentissement émulé des outils de mesure procède par
 *    à-coups (des dizaines de ms à pleine vitesse, puis des pauses), une
 *    mesure d'un seul tenant peut tomber dans un creux et passer pour rapide.
 *
 * Le verdict est mémorisé (localStorage `tl_appareil`) : le test ne tourne qu'une
 * fois par navigateur. Module sans dépendance, à n'appeler que côté client.
 */

const CLE = "tl_appareil";
/** À incrémenter si le test ou le seuil change : les verdicts mémorisés sont alors refaits. */
const VERSION = 1;
/** Itérations d'un morceau de charge : ≈ 1,5 ms sur un i7-9700 (CPU 1×). */
const ITERATIONS = 100_000;
const MORCEAUX = 10;
/** Écart minimal entre deux morceaux (ms), pour échantillonner le ralentissement sur ≈ 300 ms. */
const ECART_MS = 20;
/**
 * Au-delà de cette somme (ms), l'appareil est lent. Calibré sur un i7-9700 :
 * 12,6 à 25 ms à 1×, 34 à 74 ms en ralentissement émulé 2×, 49 à 150 ms à 4×,
 * 38 à 1100 ms à 6× ; le seuil tombe vers un processeur deux fois plus lent.
 */
const SEUIL_MS = 32;

type Verdict = { v: number; lent: boolean; ms: number | null };

let verdict: Promise<boolean> | null = null;

function lireMemoire(): Verdict | null {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (!brut) return null;
    const v = JSON.parse(brut) as Verdict;
    return v && v.v === VERSION && typeof v.lent === "boolean" ? v : null;
  } catch {
    return null;
  }
}

function memoriser(lent: boolean, ms: number | null) {
  try {
    window.localStorage.setItem(CLE, JSON.stringify({ v: VERSION, lent, ms } satisfies Verdict));
  } catch {
    /* stockage indisponible (navigation privée…) : le test sera refait */
  }
}

function indicesStatiques(): boolean {
  const n = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (n.connection?.saveData) return true;
  if (n.hardwareConcurrency && n.hardwareConcurrency <= 4) return true;
  return typeof n.deviceMemory === "number" && n.deviceMemory <= 4;
}

/** Charge de calcul fixe ; le résultat est renvoyé pour qu'elle ne soit pas éliminée. */
function charge(n: number): number {
  let x = 0;
  for (let i = 0; i < n; i++) x = (x + Math.sqrt(i) * 1.0001) % 1e6;
  return x;
}

/** Attend `ECART_MS`, puis un moment de repos du fil principal. */
function auRepos(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout: 2000 });
      else resolve();
    }, ECART_MS);
  });
}

async function mesurer(): Promise<number> {
  let somme = 0;
  let puits = 0;
  for (let morceau = 0; morceau < MORCEAUX; morceau++) {
    await auRepos();
    if (morceau === 0) puits += charge(ITERATIONS / 4); // mise en route du compilateur
    const t0 = performance.now();
    puits += charge(ITERATIONS);
    somme += performance.now() - t0;
  }
  return puits < 0 ? Infinity : Math.round(somme * 10) / 10;
}

/**
 * Vrai si l'appareil est jugé lent. Le premier appel lance la détection (test
 * au repos si aucun verdict n'est mémorisé) ; les suivants partagent le résultat.
 */
export function appareilLent(): Promise<boolean> {
  if (verdict) return verdict;
  const connu = lireMemoire();
  if (connu) verdict = Promise.resolve(connu.lent);
  else if (indicesStatiques()) {
    memoriser(true, null);
    verdict = Promise.resolve(true);
  } else {
    verdict = mesurer().then((ms) => {
      const lent = ms > SEUIL_MS;
      memoriser(lent, ms);
      return lent;
    });
  }
  return verdict;
}
