// Instants clés, tirés des minutages réels de la voix (voice/timings.json).
// Toute l'animation et tout le son se calent sur ces valeurs.
export const BPM = 110;
export const BEAT = 60 / BPM;

export function makeTimeline(timings) {
  const S = Object.fromEntries(timings.sentences.map((s) => [s.id, s]));
  const norm = (s) => s.normalize("NFC").toLowerCase();
  const w = (sid, word, which = "start") => {
    const x = S[sid].words.find((v) => norm(v.text) === norm(word));
    if (!x) throw new Error(`mot introuvable : ${sid}/${word}`);
    return x[which];
  };
  const K = {
    // 1 · placard
    door: 0.06,
    ilsIn: 0.5,
    placard: w("placard", "placard"),
    valent: w("valent", "valent"),
    argent: w("valent", "l'argent"),
    wake: 2.92,
    dive: 3.08,
    whiteout: 3.95,
    // 2 · espace blanc
    chez: w("rachete", "Chez"),
    techno: w("rachete", "Techno"),
    rachete: w("rachete", "rachète"),
    on: w("rachete", "on"),
    informatiques: w("rachete", "informatiques"),
    portables: w("liste", "portables"),
    tours: w("liste", "tours"),
    serveurs: w("liste", "serveurs"),
    ecrans: w("liste", "écrans"),
    listeEnd: S.liste.end,
    // 3 · trois temps
    evaluation: w("evaluation", "Évaluation"),
    gratuite: w("evaluation", "gratuite"),
    offre: w("offre", "offre"),
    rapide: w("offre", "rapide"),
    offreEnd: S.offre.end,
    cueillette: w("cueillette", "cueillette"),
    partout: w("cueillette", "partout"),
    au: w("cueillette", "au"),
    quebec: w("cueillette", "Québec"),
    cueilletteEnd: S.cueillette.end,
    // 4 · signature
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
    slogan: w("slogan", "Techno"),
    point: w("slogan", "point"),
    occupe: w("slogan", "on"),
    tout: w("slogan", "tout"),
    sloganEnd: S.slogan.end,
  };
  // La compression en cube tombe juste avant « On les détruit » : c'est le drop.
  K.impact = +(K.onLes - 0.1).toFixed(3);
  // Grille musicale (110 BPM) ancrée sur l'impact ; la coupe au noir tombe sur un temps.
  K.beat = (n) => K.impact + n * BEAT;
  K.cut = K.beat(19);
  K.endBuilt = K.cut - 1.5; // carton complet, maintenu 1,5 s
  // Repères des transitions
  K.lcdZoom = 11.42; // poussée dans l'écran LCD du serveur
  K.counterIn = 11.78;
  K.irisMap = 13.42;
  K.mapIn = 13.66;
  K.irisDisk = 15.86;
  K.diskIn = 16.1;
  K.explode = 18.15;
  K.cubeIn = K.impact - 0.2;
  K.pivot = 22.72;
  K.white2 = 23.05;
  K.check = K.garanti;
  K.flash = 24.68;
  K.end = 24.8;
  return K;
}
