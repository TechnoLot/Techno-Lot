// Instants clés, tirés des minutages réels de la voix (voice/timings.json).
// Toute l'animation et tout le son se calent sur ces valeurs.
export const BPM = 110;
export const BEAT = 60 / BPM;

// Registre d'inventaire de l'ouverture (src/inventory.js, 2 × 32 lignes) : déjà rempli
// aux trois quarts à la 1re image (miniature), le reste s'écrit en expoOut sur fillDur s.
export const INV = { fill0: 0.78, fillDur: 2.4, rows: 64 };
// Instant où chaque ligne encore vide à la 1re image commence à s'écrire (tics de données)
export function invRowTimes() {
  const out = [];
  for (let r = Math.ceil(INV.fill0 * INV.rows); r < INV.rows; r++) {
    const p = (r / INV.rows - INV.fill0) / (1 - INV.fill0);
    out.push((INV.fillDur * -Math.log2(1 - p)) / 10);
  }
  return out;
}

export function makeTimeline(timings) {
  const S = Object.fromEntries(timings.sentences.map((s) => [s.id, s]));
  const norm = (s) => s.normalize("NFC").toLowerCase();
  const w = (sid, word, which = "start") => {
    const x = S[sid].words.find((v) => norm(v.text) === norm(word));
    if (!x) throw new Error(`mot introuvable : ${sid}/${word}`);
    return x[which];
  };
  const K = {
    // 1 · le parc informatique (inventaire) — « Votre entreprise renouvelle son parc informatique? »
    votre: w("parc", "Votre"),
    entreprise: w("parc", "entreprise"),
    parc: w("parc", "parc"),
    informatique1: w("parc", "informatique"),
    parcEnd: S.parc.end,
    // « On rachète votre équipement en lot, neuf ou usagé. »
    onRachete: w("lot", "On"),
    rachete: w("lot", "rachète"),
    enLot: w("lot", "en"),
    lot: w("lot", "lot"),
    neuf: w("lot", "neuf"),
    usage: w("lot", "usagé"),
    lotEnd: S.lot.end,
    // 2 · tout (blanc) — « Chez Technolot, on achète tout ce qui est informatique ou électronique. »
    chez: w("tout", "Chez"),
    technolot: w("tout", "Technolot"),
    achete: w("tout", "achète"),
    tout: w("tout", "tout"),
    informatique: w("tout", "informatique"),
    electronique: w("tout", "électronique"),
    toutEnd: S.tout.end,
    // 3 · trois temps
    evaluation: w("evaluation", "Évaluation"),
    gratuite: w("evaluation", "gratuite"),
    evaluationEnd: S.evaluation.end,
    offre: w("offre", "offre"),
    rapide: w("offre", "rapide"),
    offreEnd: S.offre.end,
    cueillette: w("cueillette", "cueillette"),
    partout: w("cueillette", "partout"),
    au: w("cueillette", "au"),
    quebec: w("cueillette", "Québec"),
    cueilletteEnd: S.cueillette.end,
    // 4 · données (rapide)
    donnees: w("donnees", "Et"),
    donneesEnd: S.donnees.end,
    onLes: w("detruit", "On"),
    detruit: w("detruit", "détruit"),
    gratuitement: w("detruit", "gratuitement"),
    securisee: w("detruit", "de"),
    detruitEnd: S.detruit.end,
    // 5 · paiement · fin
    paiement: w("paiement", "Paiement"),
    rapide2: w("paiement", "rapide"),
    garanti: w("paiement", "garanti"),
    paiementEnd: S.paiement.end,
    slogan: w("slogan", "Technolot"),
    point: w("slogan", "point"),
    occupe: w("slogan", "on"),
    tout2: w("slogan", "tout"),
    sloganEnd: S.slogan.end,
  };
  // La compression en cube tombe juste avant « On les détruit » : c'est le drop.
  K.impact = +(K.onLes - 0.1).toFixed(3);
  // Grille musicale (110 BPM) ancrée sur l'impact ; la coupe au noir tombe sur le
  // dernier temps qui laisse au moins 1,5 s de carton complet.
  K.beat = (n) => K.impact + n * BEAT;
  K.endBuilt = +(K.sloganEnd + 0.06).toFixed(3); // carton complet (dernière ligne tapée)
  let n = 0;
  while (K.beat(n + 1) <= 29.8) n++;
  K.cut = K.beat(n);
  // Raccords
  K.hookOut = K.lotEnd + 0.12; // plongée dans le « O » de « LOT. » (iris)
  K.toutIn = K.hookOut + 0.3;
  K.toutOut = K.toutEnd + 0.12; // plongée dans le « O » de « TOUT » (iris)
  K.scanIn = K.toutOut + 0.3;
  K.dollarZoom = K.evaluationEnd + 0.12; // les valeurs convergent en « $ », on y plonge
  K.counterIn = K.offre - 0.3;
  K.irisMap = K.cueillette - 0.45;
  K.mapIn = K.irisMap + 0.24;
  K.irisDisk = K.donnees - 0.32;
  K.diskIn = K.irisDisk + 0.2;
  K.crush = K.impact - 0.36; // l'éclatement, puis l'écrasement sec
  K.pivot = K.detruitEnd + 0.4;
  K.white2 = K.paiement - 0.12;
  K.check = K.garanti;
  K.flash = K.paiementEnd + 0.42;
  K.end = K.flash + 0.12;
  return K;
}
