/*
 * Analyseur de la calculatrice de lot (assets/outils/calculatrice.html).
 *
 * Transforme une liste collée (courriel, Excel, tableau Markdown, message
 * d'une soumission du site) en items { desc, qte, cat, prix }. Les titres de
 * section (« Carte graphique », « Serveurs Dell : », « **Écrans** ») donnent
 * la catégorie (ou la marque) des items qui suivent au lieu de compter comme
 * des items. Salutations, signature, coordonnées, totaux et phrases sont mis
 * de côté dans `ignorees` : la page les affiche avec un bouton pour les
 * rajouter, rien ne se perd en silence.
 *
 * Script classique, sans dépendance ni accès au DOM : lib/admin/outils.ts
 * l'insère dans la page à l'envoi (marqueur data-inclure) et
 * tests/admin/calculatrice-analyse.test.ts l'exécute dans un contexte isolé.
 * Expose globalThis.AnalyseLot. Pas de lookbehind (vieux Safari) ni de \b
 * collé à une lettre accentuée (\b ne connaît que l'ASCII) : les motifs
 * accentués travaillent sur du texte normalisé ou finissent par (?![a-zà-ÿ]).
 */
(function (racine) {
  "use strict";

  /** Quantité la plus grande lue dans une liste (5 chiffres). */
  const QTE_MAX = 99999;
  /** Prix le plus élevé accepté (le serveur refuse au-delà de 10 000 000). */
  const PRIX_MAX = 9999999;

  /* ------------------------------------------------------------------ */
  /* Texte                                                               */
  /* ------------------------------------------------------------------ */

  /** Espaces simples (insécables compris), bords retirés. */
  function espaces(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  }

  /** Sans accents ni ligatures, casse conservée. */
  function sansAccents(s) {
    return String(s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/œ/g, "oe")
      .replace(/Œ/g, "OE")
      .replace(/æ/g, "ae")
      .replace(/[’‘`´]/g, "'");
  }

  /** Minuscules sans accents, apostrophes droites, espaces simples. */
  function norm(s) {
    return espaces(sansAccents(s)).toLowerCase();
  }

  /** Singulier approximatif d'un mot normalisé (écrans → ecran, switches → switch, souris → souri). */
  function racineMot(m) {
    if (m.length > 4 && /(?:ch|sh|ss|x)es$/.test(m)) return m.slice(0, -2);
    if (m.length > 3 && /[sx]$/.test(m) && !/ss$/.test(m)) return m.slice(0, -1);
    return m;
  }

  /** Mots normalisés d'un texte, au singulier ; `orig` garde l'écriture d'origine. */
  function jetons(texte) {
    const out = [];
    const re = /[\p{L}\p{N}'’&+-]+/gu;
    let m;
    while ((m = re.exec(String(texte)))) {
      const orig = m[0].replace(/^[-+']+|[-+']+$/g, "");
      if (!orig) continue;
      out.push({ orig, n: racineMot(norm(orig)) });
    }
    return out;
  }

  /** Expressions → suites de jetons normalisés, les plus longues d'abord. */
  function compiler(table) {
    const out = [];
    for (const id of Object.keys(table)) {
      for (const expr of table[id]) out.push({ id, mots: jetons(expr).map((j) => j.n) });
    }
    return out.sort((a, b) => b.mots.length - a.mots.length);
  }

  /** Plus longue expression de `liste` qui commence au jeton `i`, ou null. */
  function correspondance(toks, i, liste) {
    for (const e of liste) {
      if (i + e.mots.length > toks.length) continue;
      let ok = true;
      for (let k = 0; k < e.mots.length; k++) {
        if (toks[i + k].n !== e.mots[k]) {
          ok = false;
          break;
        }
      }
      if (ok) return e;
    }
    return null;
  }

  function capitaliser(s) {
    const t = espaces(s);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  }

  /** Titre écrit en majuscules → « Cartes graphiques ». */
  function casseTitre(s) {
    const t = espaces(s);
    return /\p{Ll}/u.test(t) ? t : capitaliser(t.toLowerCase());
  }

  /* ------------------------------------------------------------------ */
  /* Vocabulaire                                                         */
  /* ------------------------------------------------------------------ */

  /** Catégories de matériel (FR et EN) ; les synonymes partagent un identifiant. */
  const CATEGORIES = compiler({
    portable: ["portable", "ordinateur portable", "pc portable", "portatif", "laptop", "notebook", "ultrabook", "chromebook", "macbook"],
    bureau: [
      "ordinateur de bureau", "pc de bureau", "ordinateur", "desktop", "tour", "tower", "pc", "pcs",
      "poste de travail", "station de travail", "workstation", "mini pc", "tout-en-un", "all-in-one",
      "unite centrale", "computer",
    ],
    ecran: ["ecran", "moniteur", "monitor", "display", "televiseur", "tele", "tv", "television"],
    serveur: ["serveur", "server", "lame", "blade"],
    reseau: ["reseau", "network", "networking", "equipement reseau"],
    switch: ["switch", "commutateur"],
    routeur: ["routeur", "router"],
    parefeu: ["pare-feu", "firewall"],
    wifi: ["point d'acces", "access point", "borne wifi", "borne", "wifi", "wi-fi", "sans-fil", "wireless"],
    modem: ["modem"],
    stockage: ["stockage", "storage", "unite de stockage", "baie de stockage", "nas", "san"],
    disque: ["disque", "disque dur", "disque ssd", "hard drive", "hdd", "ssd"],
    memoire: ["memoire", "memoire vive", "ram", "memory", "barrette", "barrette de memoire"],
    processeur: ["processeur", "cpu", "processor"],
    gpu: ["carte graphique", "carte video", "gpu", "graphics card", "video card"],
    cartemere: ["carte mere", "motherboard", "mainboard"],
    alimentation: ["bloc d'alimentation", "bloc alimentation", "alimentation", "power supply", "psu"],
    composante: ["composante", "composant", "component", "piece", "piece detachee", "part"],
    telephone: [
      "telephone", "telephone ip", "telephone de bureau", "telephone cellulaire", "telephone intelligent",
      "cellulaire", "cell", "smartphone", "mobile", "phone", "ip phone", "office phone",
    ],
    tablette: ["tablette", "tablet"],
    imprimante: ["imprimante", "imprimante multifonction", "multifonction", "printer", "copieur", "photocopieur", "photocopieuse", "traceur", "plotter"],
    numeriseur: ["numeriseur", "scanner", "scanneur"],
    toner: ["toner", "cartouche", "cartouche d'encre", "encre", "ink"],
    clavier: ["clavier", "keyboard"],
    souris: ["souris", "mouse", "mice"],
    casque: ["casque", "casque d'ecoute", "ecouteur", "headset", "headphone"],
    camera: ["webcam", "camera", "camera web"],
    hautparleur: ["haut-parleur", "enceinte", "speaker"],
    projecteur: ["projecteur", "projector"],
    dock: ["station d'accueil", "dock", "docking station", "replicateur de port"],
    chargeur: ["chargeur", "charger", "adaptateur", "adaptateur secteur", "adapter"],
    cable: ["cable", "fil", "cordon", "cord", "rallonge"],
    ups: ["ups", "onduleur", "batterie de secours", "pdu", "barre d'alimentation", "power bar"],
    batterie: ["batterie", "battery", "batteries", "pile"],
    accessoire: ["accessoire", "accessory", "accessories", "peripherique", "peripheral"],
    rack: ["rack", "armoire", "armoire reseau", "cabinet", "baie"],
    divers: ["divers", "misc", "miscellaneous", "autre", "other", "varia", "melange", "mixed", "assortiment", "variety"],
  });

  /** Marques courantes (titres « Dell », « Serveurs HP », colonne Marque d'Excel). */
  const MARQUES = compiler({
    m: [
      "dell", "dell emc", "hp", "hpe", "hewlett packard", "hewlett-packard", "lenovo", "ibm", "apple", "microsoft", "asus", "acer", "msi",
      "gigabyte", "samsung", "lg", "sony", "toshiba", "dynabook", "fujitsu", "panasonic", "cisco", "meraki", "juniper", "aruba",
      "ubiquiti", "unifi", "netgear", "tp-link", "tplink", "d-link", "dlink", "fortinet", "fortigate", "palo alto", "sonicwall",
      "watchguard", "mikrotik", "linksys", "avaya", "polycom", "poly", "yealink", "mitel", "aastra", "nortel", "grandstream", "snom",
      "brother", "canon", "epson", "xerox", "lexmark", "ricoh", "kyocera", "sharp", "konica", "konica minolta", "oki", "zebra",
      "honeywell", "apc", "eaton", "cyberpower", "tripp lite", "vertiv", "liebert", "intel", "amd", "nvidia", "kingston", "crucial",
      "corsair", "seagate", "western digital", "wd", "hgst", "hitachi", "sandisk", "synology", "qnap", "netapp", "emc", "supermicro",
      "viewsonic", "benq", "aoc", "philips", "iiyama", "nec", "logitech", "plantronics", "jabra", "bose", "google", "huawei", "xiaomi",
      "motorola", "nokia", "blackberry", "zte", "oneplus", "startech", "belkin", "targus", "kensington",
    ],
  });

  /** Mots sans poids dans un titre (« IT », « Lot de », « les »…). */
  const REMPLISSAGE = new Set(
    ["it", "ti", "lot", "lots", "de", "des", "du", "d'", "la", "le", "les", "l'", "nos", "vos", "mes", "notre", "votre", "section",
      "categorie", "et", "and", "&", "+", "/", "-", "en", "a", "au", "aux", "of", "the", "our", "your", "pour", "for", "type", "varie",
      "variee", "usage", "usagee", "usagees", "usages", "usagé"].map((m) => racineMot(norm(m))),
  );

  /** Titres qui annoncent la liste sans être une catégorie (« Matériel : », « Description »). */
  const GENERIQUES = new Set(
    ["materiel", "equipement", "equipment", "inventaire", "inventory", "liste", "list", "item", "items", "article", "produit",
      "product", "description", "detail", "contenu", "content", "informatique", "electronique", "vendre", "sale", "voici", "ci-dessous",
      "suivant", "suivante"].map((m) => racineMot(norm(m))),
  );

  /** Sections à ignorer jusqu'à la prochaine ligne vide (« Notes : », « Ramassage : »). */
  const SECTIONS_BRUIT = new Set(
    ["note", "notes", "remarque", "commentaire", "comment", "condition", "information", "info", "ramassage", "cueillette", "pickup",
      "adresse", "address", "coordonnee", "contact", "livraison", "delivery", "disponibilite", "horaire", "paiement", "payment"].map(
      (m) => racineMot(norm(m)),
    ),
  );

  /** Mots d'une ligne d'en-tête de colonnes écrite sans tabulations (« Description Qté Prix »). */
  const MOTS_ENTETE = new Set(
    ["description", "desc", "qte", "qty", "quantite", "quantity", "item", "items", "produit", "product", "modele", "model", "marque",
      "brand", "categorie", "category", "type", "prix", "price", "total", "unitaire", "unit", "etat", "condition", "serie", "serial",
      "sn", "s/n", "no", "numero", "number", "#", "valeur", "value", "cout", "cost", "note", "notes", "commentaire", "comment",
      "emplacement", "location", "fabricant", "manufacturer", "nb", "nombre", "sku", "pn", "part", "asset", "tag", "article"].map(
      (m) => racineMot(norm(m)),
    ),
  );

  /* ------------------------------------------------------------------ */
  /* Quantités et montants                                               */
  /* ------------------------------------------------------------------ */

  const UNITES = "(?:unit[eé]s?|units?|pcs?|pi[eè]ces?|morceaux|items?|exemplaires?|ea|each)";
  /** Après un nombre de tête : une mesure (« 24 po », « 16 Go », « 48 ports »), pas une quantité. */
  const MESURE_APRES =
    /^(?:go|gb|to|tb|mo|mb|ko|kb|ghz|mhz|hz|po|pouces?|in|inch(?:es)?|w|watts?|v|volts?|mm|cm|m|pi|ft|lbs?|kg|ports?|c(?:oe|œ)urs?|cores?|threads?|e|er|re|eme|ème|th|nd|rd|st|bits?|rpm|u|ans?|years?|mois|months?|jours?|days?|h|heures?|hours?)(?![a-zà-ÿ0-9])|^(?:"|''|%|\$|x\d)/i;

  function estAnnee(n) {
    return /^(?:19[89]\d|20[0-3]\d)$/.test(String(n));
  }

  /** Description nettoyée : ponctuation et guillemets de bord, « de » d'un « 10 unités de… ». */
  function nettoyerDesc(d) {
    let s = espaces(d);
    s = s.replace(/^(?:de\s+|d['’]\s*|of\s+)/i, "");
    s = s.replace(/\s+(?:[àa]\s+vendre|for\s+sale)\s*[.!]*$/i, "");
    s = s.replace(/^[\s\-–—:;,.=*•·|]+/, "").replace(/[\s\-–—:;,=*•·|]+$/, "");
    s = s.replace(/^["«“']+(.*?)["»”']+$/, "$1");
    return espaces(s.replace(/\.$/, ""));
  }

  /**
   * Quantité et description d'un bout de texte : « 15x Lenovo T480 »,
   * « Dell x10 », « Dell (12) », « Qté : 4 OptiPlex », « Lot de 25 claviers »,
   * « Dell - 12 unités ». `explicite` : la quantité est écrite (sinon 1).
   * « ThinkPad X280 », « PC3L-10600 », « 24 po », « 2019 MacBook » ne sont pas des quantités.
   */
  function lireQuantite(texte) {
    const s = espaces(texte);
    const res = (desc, q) => {
      const n = parseInt(q, 10);
      const d = nettoyerDesc(desc);
      return n >= 1 && n <= QTE_MAX && d ? { qte: n, desc: d, explicite: true } : null;
    };
    const essais = [
      () => s.match(/^(?:qt[eé]s?|qty|quantit[eé]s?|nb|nbr|nombre)\s*[:=.]?\s*(\d{1,5})(?!\d)\s*[-–:,.]?\s*(.+)$/i),
      () => s.match(/^(\d{1,5})\s*[x×*](?!\d)\s*(.+)$/i),
      () => s.match(new RegExp("^lot\\s+de\\s+(\\d{1,5})\\s+(?:" + UNITES + "\\s+)?(.+)$", "i")),
      () => s.match(new RegExp("^(\\d{1,5})\\s+" + UNITES + "(?![a-zà-ÿ])\\s*(.+)$", "i")),
      () => s.match(/^(\d{1,5})\s*[-–—:]\s+(.+)$/),
      () => {
        const m = s.match(/^(\d{1,5})\s+(.+)$/);
        return m && !MESURE_APRES.test(m[2]) && !estAnnee(m[1]) ? m : null;
      },
    ];
    for (const essai of essais) {
      const m = essai();
      if (!m) continue;
      const r = res(m[2], m[1]);
      if (r) return r;
    }
    const fins = [
      // « Dell (10) », « Dell (x10) », « Dell (10 unités) », « Dell (qté : 10) » — pas « MacBook (2019) »
      () => {
        const m = s.match(
          new RegExp("^(.+?)\\s*\\(\\s*(?:x|×|qt[eé]\\s*:?|qty\\s*:?|quantit[eé]\\s*:?)?\\s*(\\d{1,5})\\s*(?:x|×|" + UNITES + ")?\\s*\\)$", "i"),
        );
        return m && !estAnnee(m[2]) ? m : null;
      },
      // « Dell x10 », « Dell × 3 », « Dell X 2 » — pas « ThinkPad X280 » (X majuscule collé = modèle)
      () => s.match(/^(.+?)\s+(?:×\s*|x\s*|X\s+)(\d{1,5})$/),
      // « Dell - 10 », « Dell : 10 », « Dell = 10 », « Dell, 10 », « Dell – qté 10 unités » — pas « PC3L-10600 »
      () => s.match(new RegExp("^(.+?)(?:\\s[-–—]|\\s*[:=,])\\s*(?:qt[eé]s?|qty|quantit[eé]s?)?\\s*[:=]?\\s*(\\d{1,5})\\s*(?:" + UNITES + "|x)?\\.?$", "i")),
      // « Dell qté 10 », « Dell qty: 10 »
      () => s.match(/^(.+?)\s+(?:qt[eé]s?|qty|quantit[eé]s?)\s*[:=]?\s*(\d{1,5})$/i),
      // « Dell Latitude 5420 10 unités », « Dell 10 pcs »
      () => s.match(new RegExp("^(.+?)\\s+(\\d{1,5})\\s*" + UNITES + "\\.?$", "i")),
    ];
    for (const essai of fins) {
      const m = essai();
      if (!m) continue;
      const r = res(m[1], m[2]);
      if (r) return r;
    }
    return { qte: 1, desc: nettoyerDesc(s), explicite: false };
  }

  /** Entier positif d'une cellule « 10 », « 10 unités », « x10 » ; null sinon. */
  function lireEntier(v) {
    const m = espaces(v).match(new RegExp("^(?:x|×)?\\s*(\\d{1,6})\\s*(?:" + UNITES + "|x)?$", "i"));
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return n >= 1 && n <= 1000000 ? n : null;
  }

  /**
   * Montant écrit à la main ou dans un tableau : « 180 », « 1 500,50 $ »,
   * « $1,234.56 », « 1.234,56 ». Un séparateur suivi de 3 chiffres est un
   * séparateur de milliers, sauf après « 0 ». Null si illisible, négatif ou
   * au-delà de PRIX_MAX.
   */
  function lireMontant(v) {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) && v >= 0 && v <= PRIX_MAX ? Math.round(v * 100) / 100 : null;
    const s = String(v)
      .replace(/\s+/g, "")
      .replace(/^(?:CA|C|US|CAD|USD)?\$|\$(?:CA|CAD|US|USD)?$|(?:CAD|USD)$/gi, "");
    if (!/^\d[\d.,]*$/.test(s)) return null;
    let entier = s;
    let dec = "";
    const i = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
    if (i >= 0) {
      const avant = s.slice(0, i);
      const apres = s.slice(i + 1);
      const decimal = apres.length !== 3 || /^0*$/.test(avant.replace(/[.,]/g, ""));
      entier = (decimal ? avant : s).replace(/[.,]/g, "");
      dec = decimal ? apres : "";
    }
    const n = Number((entier || "0") + (dec ? "." + dec : ""));
    return Number.isFinite(n) && n >= 0 && n <= PRIX_MAX ? Math.round(n * 100) / 100 : null;
  }

  /* ------------------------------------------------------------------ */
  /* Lignes : nettoyage et reconnaissance                                */
  /* ------------------------------------------------------------------ */

  const PUCE = /^(?:[-–—•●◦▪▫■□►▶→⇒*·+>✓✔☐☑❖◆◇]+|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)])\s+/;
  const RE_COURRIEL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i;
  const RE_URL = /(?:https?:\/\/|www\.)\S+/i;
  const RE_TELEPHONE = /^(?:t[eé]l[eé]?(?:phone)?|cell(?:ulaire)?|phone|bureau|fax)?\s*[:.]?\s*\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?:\s*(?:poste|ext\.?|x|#)\s*\d{1,6})?$/i;
  const RE_TOTAL = /^(?:grand[\s-]+)?(?:total|sous-total|subtotal|somme|sum)(?![a-zà-ÿ])/i;
  const RE_SALUTATION =
    /^(?:bonjour|bonsoir|salut|allo|allô|hello|hi|hey|dear|cher|ch[eè]re|madame|monsieur|merci|thanks?|thank you|cordialement|salutations|sinc[eè]rement|regards|best regards|kind regards|bien [àa] vous|au plaisir|bonne (?:journ[eé]e|soir[eé]e|semaine|fin de semaine)|[àa] bient[ôo]t|voici|voil[àa]|ci-joint|ci-dessous|veuillez|svp|s'il vous pla[iî]t|pourriez-vous|pouvez-vous|est-ce que|j'esp[eè]re|n'h[eé]sitez|en attente|dans l'attente|ramassage|cueillette|pick-?up|livraison|delivery|disponibles?|disponibilit[eé]|adresse|situ[eé]e?s?|rendez-vous|horaire|urgent|asap|budget|paiement|payment|facture|envoy[eé] (?:de|depuis)|sent from|get outlook)(?![a-zà-ÿ])/i;
  /** Ligne de politesse seule (« Merci », « Cordialement, Jean ») : la signature suit. */
  const RE_FORMULE_FIN =
    /^(?:merci(?: (?:beaucoup|encore|bien|à l'avance|a l'avance|de votre (?:aide|temps|attention)))?|thanks?(?: you)?(?: in advance)?|cordialement|salutations(?: distingu[eé]es)?|sinc[eè]rement|regards|best regards|kind regards|bien [àa] vous|au plaisir|bonne (?:journ[eé]e|soir[eé]e|semaine|fin de semaine)|[àa] bient[ôo]t|bien cordialement)\s*[,.!]*(?:\s*[\p{L}][\p{L} .'-]{0,40})?$/iu;
  /** Début d'un courriel transféré : ce qui suit n'est plus une signature. */
  const RE_TRANSFERT = /message d'origine|message d’origine|original message|forwarded message|message transf[eé]r[eé]/i;
  const RE_LIB_COURRIEL = /^(?:de|from|objet|subject|envoy[eé]|sent|[aà]|to|date)$/;
  /** Libellés de coordonnées ou d'en-tête de courriel (« Entreprise : », « De : »). */
  const RE_LIB_META =
    /^(?:entreprise|compagnie|soci[eé]t[eé]|company|organisation|organization|ville|city|province|pays|country|nom|name|pr[eé]nom|first name|last name|contact|personne|courriel|e-?mail|adresse courriel|t[eé]l[eé]?(?:phone)?|tel|cell(?:ulaire)?|phone|mobile|fax|adresse|address|code postal|postal code|zip|date|objet|subject|de|from|[aà]|to|cc|cci|bcc|envoy[eé]|sent|re|tr|fw|fwd|r[eé]f(?:[eé]rence)?|site|site web|web|website|poste|ext|titre|title|fonction|r[eé]gion|secteur|signature)$/;
  const RE_LIB_QTE = /^(?:qt[eé]s?|qty|quantit[eé]s?|quantity|nombre|nb|nbr|unit[eé]s?)$/;
  const RE_LIB_DESC = /^(?:mod[eè]les?|models?|description|desc|items?|produits?|products?|articles?|[eé]quipements?|equipment|appareils?|devices?|d[eé]signation|mat[eé]riel)$/;
  const RE_LIB_CAT = /^(?:cat[eé]gories?|category|categories|types?|familles?|family|groupes?|group|section)$/;
  const RE_LIB_AUTRE =
    /^(?:[eé]tat|condition|notes?|remarques?|commentaires?|comments?|prix|price|valeur|value|co[uû]t|cost|total|s\/?n|num[eé]ro de s[eé]rie|n[o°] de s[eé]rie|s[eé]rie|serial(?: number)?|asset(?: tag)?|service tag|emplacement|location|lieu|ann[eé]e|year|couleur|color|poids|weight|dimensions?|garantie|warranty|statut|status|specs?|sp[eé]cifications?|processeur|cpu|ram|m[eé]moire|disque|stockage|os|syst[eè]me)$/;
  /** Mots d'une phrase (« sont », « nous », « je ») : une ligne sans quantité ni modèle qui en contient n'est pas un item. */
  const RE_PHRASE =
    /(?:^|\s)(?:je|j'|nous|vous|ils|elles|il|on|sont|est|sera|seront|serait|avons|avez|ont|ai|peut|peuvent|pouvons|pouvez|voulons|voulez|aimerions|aimerais|souhaitons|souhaitez|cherchons|cherche|merci|we|they|you|are|is|was|were|have|has|will|would|could|please|veuillez)(?=\s|$|[,.!?])/i;
  /** Début de message à retirer avant de lire les items : « J'ai 10 portables… ». */
  const RE_INTRO =
    /^(?:(?:voici|voil[àa]|nous avons|on a|j'ai|j’ai|il y a|we have|i have|there (?:is|are)|ci-joint|ci-dessous)\s*(?:(?:la|une|notre|ma|the|our|a)\s+liste\s*(?:de|du|des|d'|of)?\s*)?:?\s*)/i;

  /** Nombre suivi d'une unité collé (« 144 Hz » → « 144hz ») avant de chercher un modèle. */
  function collerUnites(s) {
    return s.replace(/(\d)\s+(ghz|mhz|hz|w|v|mm|cm|p|k|ans?|ports?|cores?|go|gb|to|tb|mo|mb|po)(?![a-z])/gi, "$1$2");
  }

  /** Vrai si le texte contient un numéro de modèle (P2419H, R740, T480, 5420) et pas seulement une mesure (16GB, 24, 2019). */
  function aUnModele(texte) {
    return collerUnites(norm(texte))
      .split(/[\s,;:()[\]/+]+/)
      .some((brut) => {
        const m = brut.replace(/^[-.]+|[-.]+$/g, "");
        if (m.length < 3 || !/\d/.test(m)) return false;
        if (/^\d+$/.test(m)) return !estAnnee(m);
        if (!/[a-z]/.test(m)) return false;
        return !/^\d+(?:[.,]\d+)?(?:gb|tb|mb|kb|go|to|mo|ko|ghz|mhz|hz|w|v|mm|cm|m|p|k|e|er|re|eme|th|st|nd|rd|x|u|po|in|pcs?|ans?|ports?|cores?)$/.test(m);
      });
  }

  /** Marque présente dans un texte (« Dell », « Western Digital »). */
  function contientMarque(texte) {
    const toks = jetons(texte);
    for (let i = 0; i < toks.length; i++) if (correspondance(toks, i, MARQUES)) return true;
    return false;
  }

  /** Un mot de matériel (« écran », « disque dur ») quelque part dans le texte ? */
  function contientCategorie(texte) {
    const toks = jetons(texte);
    for (let i = 0; i < toks.length; i++) if (correspondance(toks, i, CATEGORIES)) return true;
    return false;
  }

  /**
   * Rien d'un item : ni chiffre, ni marque, ni mot de matériel, ni gamme connue
   * (« Tout fonctionne, ramassage au quai »). « iPhone 12 », « Chromebook »,
   * « Câbles et chargeurs » restent des items.
   */
  function sansIndiceDItem(texte) {
    if (/\d/.test(texte) || contientMarque(texte) || contientCategorie(texte)) return false;
    const n = norm(texte);
    return !Object.keys(FAMILLES).some((k) => FAMILLES[k].test(n)) && !RE_GAMMES.test(n);
  }

  /** Catégorie du nom en tête d'un item (« Souris Logitech » → souris), sinon null. */
  function categorieEnTete(texte) {
    const toks = jetons(texte);
    let i = 0;
    while (i < toks.length && (REMPLISSAGE.has(toks[i].n) || /^\d+$/.test(toks[i].n))) i++;
    const c = i < toks.length ? correspondance(toks, i, CATEGORIES) : null;
    return c ? c.id : null;
  }

  /**
   * Un titre de section ? « Cartes graphiques » → catégorie, « Dell » →
   * marque, « Serveurs Dell » → les deux, « Matériel » → générique (remet la
   * catégorie à zéro), « Notes » → section à ignorer. Null si le texte
   * contient autre chose (un modèle, un mot inconnu).
   */
  function analyserTitre(texte) {
    const toks = jetons(texte);
    if (!toks.length || toks.length > 7) return null;
    const ids = [];
    const marques = [];
    let generique = 0;
    let bruit = 0;
    for (let i = 0; i < toks.length; ) {
      const c = correspondance(toks, i, CATEGORIES);
      if (c) {
        ids.push(c.id);
        i += c.mots.length;
        continue;
      }
      const m = correspondance(toks, i, MARQUES);
      if (m) {
        marques.push(toks.slice(i, i + m.mots.length).map((t) => t.orig).join(" "));
        i += m.mots.length;
        continue;
      }
      const n = toks[i].n;
      if (SECTIONS_BRUIT.has(n)) bruit++;
      else if (GENERIQUES.has(n)) generique++;
      else if (!REMPLISSAGE.has(n)) return null;
      i++;
    }
    if (bruit) return { genre: "bruit", ids: [], cat: "", marque: "" };
    if (ids.length) {
      // Une seule marque : elle préfixe les items (« Serveurs Dell » → « Dell R740 », catégorie « Serveurs »).
      if (marques.length === 1) {
        const sans = espaces(String(texte).replace(new RegExp("(^|\\s)" + echapperRegex(marques[0]) + "(?=\\s|$)", "i"), " "));
        return { genre: "categorie", ids, cat: casseTitre(sans.replace(/^[-–—&+/,\s]+|[-–—&+/,\s]+$/g, "")), marque: marques[0] };
      }
      return { genre: "categorie", ids, cat: casseTitre(texte), marque: "" };
    }
    if (marques.length === 1) return { genre: "marque", ids: [], cat: "", marque: marques[0] };
    if (marques.length > 1) return { genre: "categorie", ids: [], cat: casseTitre(texte), marque: "" };
    if (generique) return { genre: "generique", ids: [], cat: "", marque: "" };
    return null;
  }

  function echapperRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Ligne nettoyée : puces, numéros, gras Markdown, « # Titre »,
   * « === Titre === », deux-points final. `puce` : la ligne commençait par
   * une puce, un numéro ou un retrait.
   */
  function nettoyerLigne(brut) {
    const retrait = /^[ \t]+\S/.test(String(brut));
    let s = espaces(String(brut).replace(/\t/g, " "));
    s = s.replace(/^["«“]+|["»”]+$/g, "").trim();
    if (!s || /^[-=_*~#.·•\s]+$/.test(s)) return { texte: "", deco: false, deuxPoints: false, puce: false };
    if (RE_TRANSFERT.test(s)) return { texte: s, deco: false, deuxPoints: false, puce: false, transfert: true };
    let deco = false;
    let puce = retrait;
    let m;
    for (let k = 0; k < 3; k++) {
      if ((m = s.match(/^#{1,6}\s+(.+?)\s*#*$/))) {
        s = m[1];
        deco = true;
      } else if ((m = s.match(/^(?:\*\*|__)(.+?)(?:\*\*|__)\s*(:?)\s*$/))) {
        s = m[1] + m[2];
        deco = true;
      } else if ((m = s.match(/^[=\-_*~]{2,}\s*(.+?)\s*[=\-_*~]{2,}$/))) {
        s = m[1];
        deco = true;
      } else if ((m = s.match(/^\[([^\]]+)\]\s*(:?)$/))) {
        s = m[1] + m[2];
        deco = true;
      } else if ((m = s.match(PUCE))) {
        s = s.slice(m[0].length);
        puce = true;
      } else break;
      s = s.trim();
    }
    s = espaces(s.replace(/\*\*|__/g, ""));
    let deuxPoints = false;
    if (/:\s*$/.test(s)) {
      deuxPoints = true;
      s = s.replace(/\s*:\s*$/, "");
    }
    return { texte: s, deco, deuxPoints, puce };
  }

  /* ------------------------------------------------------------------ */
  /* Plusieurs items sur une ligne                                       */
  /* ------------------------------------------------------------------ */

  const SEPARATEURS = /(\s*;\s*|\s+\/\s+|\s+\+\s+|\s+&\s+|\s+et\s+|\s+and\s+|,\s+|,(?=[^\d\s])|\.\s+(?=\S))/i;

  /**
   * « 10 Dell Latitude, 5 écrans P2419H et 2 serveurs R740 » → 3 items. On
   * coupe seulement si un morceau a une quantité écrite ; un morceau sans
   * quantité (« i5 », « 16 Go », « bon état ») reste collé au précédent, sauf
   * une nouvelle phrase (« … 24 pouces. Tout fonctionne. ») mise de côté dans
   * `restes`.
   */
  function decouper(texte) {
    const seul = () => ({ items: [lireQuantite(texte)], restes: [] });
    const parts = String(texte).split(SEPARATEURS);
    if (parts.length < 3) return seul();
    const morceaux = [];
    const restes = [];
    for (let i = 0; i < parts.length; i += 2) {
      const bout = parts[i];
      const sep = i > 0 ? parts[i - 1] : "";
      const q = espaces(bout) ? lireQuantite(bout) : null;
      if (q && q.explicite) morceaux.push({ texte: bout });
      else if (morceaux.length && !morceaux[0].enAttente && /^\.\s+$/.test(sep) && espaces(bout)) restes.push(espaces(bout));
      else if (morceaux.length) morceaux[morceaux.length - 1].texte += sep + bout;
      else morceaux.push({ texte: bout, enAttente: true });
    }
    // Début sans quantité (« Dell Inc. Latitude 5420 x10 ») : collé au premier morceau qui en a une.
    if (morceaux.length > 1 && morceaux[0].enAttente) {
      const tete = morceaux.shift();
      morceaux[0].texte = tete.texte + " " + morceaux[0].texte;
    }
    const avecQte = morceaux.filter((m) => !m.enAttente);
    if (!avecQte.length || (avecQte.length < 2 && !restes.length)) return seul();
    return { items: avecQte.map((m) => lireQuantite(espaces(m.texte))), restes };
  }

  /* ------------------------------------------------------------------ */
  /* Classement d'une ligne                                              */
  /* ------------------------------------------------------------------ */

  function bruit() {
    return { type: "bruit" };
  }

  /** Items d'un texte libre, après le retrait d'une intro (« Voici », « J'ai ») et d'un « environ ». */
  function itemsDuTexte(texte) {
    const sansIntro = espaces(
      texte.replace(RE_INTRO, "").replace(/(^|\s)(?:env(?:iron)?\.?|approx(?:imativement)?\.?|about|around|~|±|\+\/-)\s*(?=\d)/gi, "$1"),
    );
    const r = decouper(sansIntro || texte);
    return { items: r.items.filter((it) => it.desc), restes: r.restes };
  }

  /** Classement « items » d'un résultat d'itemsDuTexte, avec les phrases mises de côté. */
  function enItems(r, extra) {
    return Object.assign({ type: "items", items: r.items, restes: r.restes }, extra || {});
  }

  /** Ligne d'en-tête de colonnes écrite à la main (« Description  Qté  Prix »). */
  function estLigneEntete(texte) {
    const toks = jetons(texte);
    return toks.length >= 1 && toks.every((t) => MOTS_ENTETE.has(t.n));
  }

  /**
   * Classe une ligne de texte libre : vide, bruit, titre (sûr ou possible),
   * quantité de l'item précédent (« Quantité : 10 ») ou items.
   * `majusculesTitres` : les lignes en majuscules sont des titres (le texte
   * n'est pas tout en majuscules).
   */
  function classer(l, majusculesTitres) {
    const c = classerTexte(l, majusculesTitres);
    c.puce = !!l.puce;
    return c;
  }

  function classerTexte(l, majusculesTitres) {
    const t = l.texte;
    if (!t) return { type: "vide" };
    if (l.transfert) return { type: "entete" };
    if (!/[\p{L}]/u.test(t)) return bruit();

    // « Libellé : valeur »
    const lv = t.match(/^([^:]{1,40}?)\s*:\s*(.+)$/);
    if (lv && !/\d/.test(lv[1]) && RE_LIB_COURRIEL.test(norm(lv[1]))) return { type: "entete" };
    if (RE_COURRIEL.test(t) || RE_URL.test(t) || RE_TELEPHONE.test(t) || RE_TOTAL.test(t)) return bruit();
    if (lv && !/\d/.test(lv[1])) {
      const lib = norm(lv[1]);
      const val = espaces(lv[2]);
      if (RE_LIB_META.test(lib) || RE_LIB_AUTRE.test(lib)) return bruit();
      if (RE_LIB_QTE.test(lib)) {
        // « Quantité : 10 » sous un item ; « Qté : 4 Dell OptiPlex » est un item.
        const n = lireEntier(val);
        if (n) return { type: "qte", qte: n };
        const r = itemsDuTexte(t);
        return r.items.some((it) => it.explicite) ? enItems(r) : bruit();
      }
      if (RE_LIB_CAT.test(lib)) {
        const titre = analyserTitre(val) || { genre: "libre", ids: [], cat: casseTitre(val), marque: "" };
        return { type: "titre", force: true, titre };
      }
      if (RE_LIB_DESC.test(lib)) {
        const r = itemsDuTexte(val);
        return r.items.length ? enItems(r) : bruit();
      }
      const titre = analyserTitre(lv[1]);
      if (titre && titre.genre === "bruit") return bruit();
      if (titre && titre.genre === "generique") {
        const r = itemsDuTexte(val);
        return r.items.length ? enItems(r) : bruit();
      }
      if (lv[1].split(/\s+/).length <= 4) {
        // « Portables : 10 », « Écrans : quantité à préciser »
        const n = lireEntier(val);
        if (n) return { type: "items", items: [{ desc: nettoyerDesc(lv[1]), qte: n, explicite: true }] };
        if (/^(?:quantit[eé] )?[àa] pr[eé]ciser$|^inconnue?s?$|^n\/?a$|^\?+$/i.test(val)) {
          return { type: "items", items: [{ desc: nettoyerDesc(lv[1]), qte: 1, explicite: false }] };
        }
        // « Serveurs : 2x Dell R740, 1x HP DL380 », « Serveurs : Dell R740 » (pas « Switch Cisco : 48 ports »)
        if (titre && (titre.genre === "categorie" || titre.genre === "marque")) {
          const r = itemsDuTexte(val);
          if (r.items.length && (r.items.some((it) => it.explicite) || aUnModele(val))) return enItems(r, { titreLigne: titre });
        }
      }
    }

    if (l.deuxPoints) {
      const titre = analyserTitre(t);
      if (titre) return { type: "titre", force: true, titre };
      if (RE_SALUTATION.test(t) || RE_PHRASE.test(" " + t + " ")) return bruit();
      // « Dell Latitude 5420 : » suivi de ses caractéristiques en puces : un item, pas un titre.
      if (aUnModele(t)) {
        const r = itemsDuTexte(t);
        if (r.items.length) return enItems(r, { details: true });
      }
      if (t.split(/\s+/).length <= 6) return { type: "titre", force: true, titre: { genre: "libre", ids: [], cat: casseTitre(t), marque: "" } };
    }

    if (estLigneEntete(t)) return { type: "rien" };

    const r = itemsDuTexte(t);
    const qteEcrite = r.items.some((it) => it.explicite);
    const modele = aUnModele(t);

    if (RE_FORMULE_FIN.test(t)) return { type: "fin" };
    if (!qteEcrite && !modele && RE_SALUTATION.test(t)) return bruit();
    if (!qteEcrite && !modele && t.split(/\s+/).length >= 2 && RE_PHRASE.test(" " + t + " ")) return bruit();
    if (!qteEcrite && t.split(/\s+/).length >= 3 && sansIndiceDItem(t)) return bruit();

    const titre = !qteEcrite && !/\d/.test(t) ? analyserTitre(t) : null;
    if (titre) {
      if (titre.genre === "bruit" || titre.genre === "generique") return { type: "titre", force: true, titre };
      const fort = l.deco || (majusculesTitres && !/\p{Ll}/u.test(t) && /\p{Lu}.*\p{Lu}/u.test(t));
      return { type: "titre", force: fort, titre, sinon: r.items };
    }
    if (l.deco && !qteEcrite && t.split(/\s+/).length <= 6) {
      return { type: "titre", force: true, titre: { genre: "libre", ids: [], cat: casseTitre(t), marque: "" } };
    }
    if (majusculesTitres && !qteEcrite && !/\d/.test(t) && !/\p{Ll}/u.test(t) && /\p{Lu}.*\p{Lu}/u.test(t) && t.split(/\s+/).length <= 5) {
      return { type: "titre", force: false, titre: { genre: "libre", ids: [], cat: casseTitre(t), marque: "" }, sinon: r.items };
    }
    return r.items.length ? enItems(r) : bruit();
  }

  /* ------------------------------------------------------------------ */
  /* Tableaux (Excel, Google Sheets, Markdown)                           */
  /* ------------------------------------------------------------------ */

  function roleColonne(c) {
    const n = norm(c).replace(/[.:#*()]+/g, " ").trim();
    if (!n) return null;
    if (/ebay|vendu|sold|revente|resale|prix de vente|selling price/.test(n)) return "prix";
    if (/^(?:qte?s?|qty|quantites?|quantity|nb|nbr|nombre|count|units?|unites?|q)$/.test(n)) return "qte";
    if (/^(?:marques?|fabricants?|manufacturiers?|brands?|manufacturers?|make|mfr|mfg)$/.test(n)) return "marque";
    if (/^(?:modeles?|models?|(?:no|numero|n°) (?:de )?modele|model (?:no|number)|part (?:no|number)|p\/n|pn|sku|numero de piece|no de piece)$/.test(n)) return "modele";
    if (/^(?:descriptions?|desc|items?|articles?|produits?|products?|noms?|names?|designations?|equipements?|equipment|materiels?|libelles?|appareils?|devices?)$/.test(n)) return "desc";
    if (/^(?:categories?|category|types?|familles?|family|classes?|groupes?|groups?|sections?|sous-categories?)$/.test(n)) return "cat";
    if (
      /^(?:etat|condition|notes?|remarques?|commentaires?|comments?|emplacements?|locations?|localisation|lieu|series?|(?:numeros?|no) (?:de )?serie|serial(?: number| no)?|s\/n|sn|asset(?: tag)?|tags?|service tag|etiquettes?|dates?|date .*|annees?|years?|prix|prix .*|price|price .*|couts?|cost|valeurs?|values?|totals?|montants?|amount|poids|weight|utilisateurs?|users?|departements?|department|statut|status|garantie|warranty|specs?|specifications?|processeurs?|cpu|ram|memoire|disques?|stockage|storage|ecran|os|systeme|couleur|color|code|codes|id|no|numero|#)$/.test(n)
    )
      return "ignorer";
    return null;
  }

  /** Ligne d'en-tête du tableau parmi les 5 premières : au moins 2 cellules reconnues, aucune donnée chiffrée. */
  function trouverEntete(rangees) {
    for (let r = 0; r < Math.min(5, rangees.length); r++) {
      const cells = rangees[r];
      const pleines = cells.filter(Boolean);
      if (pleines.length < 2) continue;
      if (pleines.some((c) => /^\$?\s*\d[\d\s.,]*\s*\$?$/.test(c))) continue;
      const roles = cells.map((c) => (c ? roleColonne(c) : null));
      const reconnus = roles.filter(Boolean).length;
      if (reconnus >= 2 && reconnus >= pleines.length * 0.6) {
        if (!roles.some((x) => x === "desc" || x === "modele" || x === "marque")) continue;
        return { index: r, roles: roles.map((x) => x || "ignorer") };
      }
    }
    return null;
  }

  /** Rôles des colonnes d'un tableau sans en-tête : quantité, description, marque, catégorie. */
  function rolesDevines(rangees) {
    const nb = Math.max(0, ...rangees.map((r) => r.length));
    const stats = [];
    for (let c = 0; c < nb; c++) {
      const st = { pleines: 0, entiers: 0, valeurs: [], lettres: 0, sansChiffre: 0, marques: 0, montants: 0 };
      for (const r of rangees) {
        const v = r[c] || "";
        if (!v) continue;
        st.pleines++;
        if (/^\d{1,5}$/.test(v)) {
          st.entiers++;
          st.valeurs.push(+v);
        } else if (/\$|\d[.,]\d{2}(?!\d)/.test(v) && /^[\d\s.,$]+$/.test(v.replace(/CAD|USD/gi, ""))) st.montants++;
        if (/\p{L}/u.test(v)) {
          st.lettres += v.length;
          if (!/\d/.test(v)) st.sansChiffre++;
          const toks = jetons(v);
          if (toks.length && correspondance(toks, 0, MARQUES) && correspondance(toks, 0, MARQUES).mots.length === toks.length) st.marques++;
        }
      }
      stats.push(st);
    }
    const roles = stats.map(() => "ignorer");
    let qte = -1;
    stats.forEach((st, c) => {
      if (!st.pleines || st.entiers < Math.max(1, Math.ceil(st.pleines * 0.5))) return;
      if (qte < 0 || st.entiers > stats[qte].entiers || (st.entiers === stats[qte].entiers && mediane(st.valeurs) < mediane(stats[qte].valeurs))) qte = c;
    });
    if (qte >= 0) roles[qte] = "qte";
    let desc = -1;
    stats.forEach((st, c) => {
      if (c === qte || !st.lettres) return;
      if (st.marques >= st.pleines * 0.6 && stats.some((o, k) => k !== c && k !== qte && o.lettres)) return;
      if (desc < 0 || st.lettres > stats[desc].lettres) desc = c;
    });
    if (desc >= 0) roles[desc] = "desc";
    stats.forEach((st, c) => {
      if (roles[c] !== "ignorer" || !st.pleines) return;
      if (st.marques >= st.pleines * 0.6) roles[c] = "marque";
      else if (st.sansChiffre >= st.pleines * 0.6) roles[c] = "cat";
    });
    return roles;
  }

  function mediane(v) {
    if (!v.length) return Infinity;
    const s = v.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  function cellules(ligne, sep) {
    let s = String(ligne);
    if (sep === "|") {
      s = s.trim();
      if (s.startsWith("|")) s = s.slice(1);
      if (s.endsWith("|")) s = s.slice(0, -1);
    }
    return s.split(sep).map((c) => espaces(c.replace(/^\s*"|"\s*$/g, "").replace(/\*\*|__/g, "")));
  }

  /** Description d'une rangée : marque + modèle, ou marque + description. */
  function descRangee(marque, modele, desc) {
    let d;
    let catDesc = "";
    if (modele && desc) {
      if (norm(desc).includes(norm(modele))) d = desc;
      else if (analyserTitre(desc) && analyserTitre(desc).genre === "categorie") {
        d = modele;
        catDesc = desc;
      } else d = desc + " " + modele;
    } else d = modele || desc;
    if (marque && d && !norm(d).includes(norm(marque))) d = marque + " " + d;
    if (!d) d = marque;
    return { desc: nettoyerDesc(d || ""), catDesc };
  }

  /** Rangées d'un tableau classées comme des lignes de texte (titres et bruit compris). */
  function classerTableau(lignes, sep, majusculesTitres) {
    const rangees = lignes.map((l) => (String(l).trim() ? cellules(l, sep) : []));
    const entete = trouverEntete(rangees);
    const roles = entete ? entete.roles : rolesDevines(rangees.filter((r) => r.filter(Boolean).length >= 2));
    const col = (role) => roles.map((r, i) => (r === role ? i : -1)).filter((i) => i >= 0);
    const cQte = col("qte")[0];
    const cPrix = col("prix")[0];
    const val = (r, cs) => cs.map((i) => r[i] || "").filter(Boolean).join(" ");
    return rangees.map((r, i) => {
      if (entete && i === entete.index) return { type: "rien" };
      if (sep === "|" && r.length && r.every((c) => !c || /^:?-{2,}:?$/.test(c))) return { type: "rien" };
      const pleines = r.filter(Boolean);
      if (!pleines.length) return { type: "vide" };
      const qteBrute = cQte !== undefined ? r[cQte] || "" : "";
      // Une seule cellule et pas de quantité : comme une ligne de texte (titre de section, item seul…).
      if (pleines.length === 1 && !qteBrute) return classer(nettoyerLigne(pleines[0]), majusculesTitres);
      // En-tête répété (tableau sur plusieurs pages).
      if (entete && trouverEntete([r])) return { type: "rien" };
      const { desc, catDesc } = descRangee(val(r, col("marque")), val(r, col("modele")), val(r, col("desc")));
      const n = qteBrute ? lireEntier(qteBrute) : null;
      const cat = val(r, col("cat")) || catDesc;
      if (!desc) {
        if (!cat) return bruit();
        return { type: "items", items: [{ desc: cat, qte: n || 1, explicite: !!n }] };
      }
      if (RE_TOTAL.test(desc) || estLigneEntete(desc)) return bruit();
      const prix = cPrix !== undefined ? lireMontant(r[cPrix]) : null;
      return { type: "items", items: [{ desc, qte: n || 1, explicite: !!n, prix }], catRangee: cat };
    });
  }

  /** Ligne isolée à tabulations dans un texte libre : « Dell R740 ⇥ 2 ». */
  function classerLigneTabulee(ligne, majusculesTitres) {
    const cells = ligne.split("\t").map(espaces).filter(Boolean);
    const entiers = cells.filter((c) => /^\d{1,5}$/.test(c));
    if (cells.length < 2 || entiers.length !== 1) return classer(nettoyerLigne(cells.join(" ")), majusculesTitres);
    const autres = cells.filter((c) => c !== entiers[0]);
    const desc = autres.slice().sort((a, b) => b.length - a.length)[0];
    const cat = autres.filter((c) => c !== desc && !/\d/.test(c)).join(" ");
    return { type: "items", items: [{ desc: nettoyerDesc(desc), qte: +entiers[0], explicite: true, prix: null }], catRangee: cat };
  }

  /* ------------------------------------------------------------------ */
  /* Assemblage                                                          */
  /* ------------------------------------------------------------------ */

  /** Prochaine ligne non vide après `i`, ou null. */
  function suivante(cl, i) {
    for (let j = i + 1; j < cl.length; j++) if (cl[j].type !== "vide" && cl[j].type !== "rien") return cl[j];
    return null;
  }

  /** Un titre possible (« Carte graphique » sans deux-points) est-il vraiment un titre ? */
  function estVraiTitre(c, apres) {
    if (!apres) return false;
    if (apres.type === "titre") {
      // « Serveurs » puis « Dell » puis les modèles : catégorie puis marque.
      return c.titre.genre === "categorie" && apres.titre.genre === "marque" && !apres.force;
    }
    if (apres.type !== "items") return false;
    if (c.titre.genre === "categorie" && c.titre.ids.length) {
      // « Clavier Logitech » puis « Souris Logitech x5 » : deux items, pas un titre.
      const tete = categorieEnTete(apres.items[0].desc);
      if (tete && tete !== "divers" && c.titre.ids.indexOf(tete) < 0) return false;
    }
    return true;
  }

  /** Lignes classées → items, en suivant les titres, sections et lignes vides. */
  function assembler(cl, lignesOrig) {
    const items = [];
    const ignorees = [];
    // Section en cours : { cat, marque, items, espacee (ligne vide après le titre), texte }
    let section = null;
    let titres = 0;
    let bruitSection = false;
    let signature = false;
    // Item « Dell Latitude 5420 : » dont les puces suivantes sont les caractéristiques.
    let details = null;

    const fermerSection = () => {
      if (section && !section.items && section.texte) ignorees.push(section.texte);
      if (section && section.items) titres++;
    };

    /** `cat` / `marque` null : ceux de la section. */
    const ajouter = (it, cat, marque) => {
      const m = marque || (section ? section.marque : "");
      let desc = it.desc;
      if (m && !contientMarque(desc)) desc = m + " " + desc;
      items.push({
        desc: nettoyerDesc(desc),
        qte: it.qte,
        cat: cat || (section ? section.cat : "") || "",
        prix: it.prix == null ? null : it.prix,
        explicite: !!it.explicite,
      });
      if (section) section.items++;
    };

    for (let i = 0; i < cl.length; i++) {
      const c = cl[i];
      const orig = espaces(lignesOrig[i]);
      if (c.type === "rien") continue;
      if (c.type === "vide") {
        bruitSection = false;
        details = null;
        if (section && section.items > 0 && !section.espacee) {
          fermerSection();
          section = null;
        }
        continue;
      }
      if (c.type === "entete") {
        signature = false;
        bruitSection = false;
        ignorees.push(orig);
        continue;
      }
      if (signature) {
        ignorees.push(orig);
        continue;
      }
      if (c.type === "fin") {
        signature = true;
        ignorees.push(orig);
        continue;
      }
      if (bruitSection && c.type !== "titre") {
        ignorees.push(orig);
        continue;
      }
      if (details) {
        if (c.puce && c.type === "qte") {
          details.qte = c.qte;
          details.explicite = true;
          continue;
        }
        if (c.puce && !(c.type === "items" && c.items.some((it) => it.explicite))) {
          ignorees.push(orig);
          continue;
        }
        details = null;
      }
      if (c.type === "bruit") {
        ignorees.push(orig);
        continue;
      }
      if (c.type === "qte") {
        const dernier = items[items.length - 1];
        if (dernier && !dernier.explicite) {
          dernier.qte = c.qte;
          dernier.explicite = true;
        } else ignorees.push(orig);
        continue;
      }
      if (c.type === "titre") {
        const vrai = c.force || estVraiTitre(c, suivante(cl, i));
        if (!vrai) {
          for (const it of c.sinon || []) ajouter(it, null, null);
          continue;
        }
        const g = c.titre.genre;
        if (g === "bruit") {
          bruitSection = true;
          ignorees.push(orig);
          continue;
        }
        bruitSection = false;
        // Une marque sous une catégorie garde la catégorie (« Serveurs » puis « Dell »).
        if (g === "marque" && section && section.cat && !section.marque && !section.items) {
          section.marque = c.titre.marque;
          section.texte = section.texte + " · " + orig;
          continue;
        }
        fermerSection();
        section = g === "generique" ? null : { cat: c.titre.cat, marque: c.titre.marque, items: 0, espacee: false, texte: orig };
        if (section) {
          const apres = cl[i + 1];
          section.espacee = !!apres && apres.type === "vide";
        }
        continue;
      }
      if (c.type === "items") {
        const t = c.titreLigne;
        for (const it of c.items) {
          if (t) ajouter(it, t.cat || null, t.marque || null);
          else ajouter(it, c.catRangee || null, null);
        }
        for (const reste of c.restes || []) ignorees.push(reste);
        if (c.details && items.length) details = items[items.length - 1];
      }
    }
    fermerSection();
    return {
      items: items.map((it) => ({ desc: it.desc, qte: it.qte, cat: it.cat, prix: it.prix, explicite: it.explicite })),
      ignorees: ignorees.filter(Boolean),
      titres,
    };
  }

  /**
   * Analyse une liste collée. Renvoie { items, ignorees, titres } : items
   * { desc, qte, cat, prix, explicite } dans l'ordre du texte, lignes mises de
   * côté (texte d'origine) et nombre de titres de section utilisés.
   */
  function analyserTexte(texte) {
    const lignes = String(texte == null ? "" : texte)
      .replace(/\r\n?/g, "\n")
      .split("\n");
    const nonVides = lignes.filter((l) => l.trim());
    if (!nonVides.length) return { items: [], ignorees: [], titres: 0 };

    const avecLettres = nonVides.filter((l) => /\p{L}{2}/u.test(l));
    const enMajuscules = avecLettres.filter((l) => !/\p{Ll}/u.test(l)).length;
    const majusculesTitres = enMajuscules > 0 && enMajuscules < avecLettres.length * 0.5;

    const pipes = nonVides.filter((l) => /^\s*\|.*\|\s*$/.test(l)).length;
    const tabs = nonVides.filter((l) => l.split("\t").filter((c) => c.trim()).length >= 2).length;

    let cl;
    if (pipes >= 2 && pipes >= nonVides.length * 0.5) {
      cl = lignes.map((l) => (/^\s*\|.*\|\s*$/.test(l) ? null : l));
      const indices = [];
      const tableau = [];
      lignes.forEach((l, i) => {
        if (cl[i] === null) {
          indices.push(i);
          tableau.push(l);
        }
      });
      const classees = classerTableau(tableau, "|", majusculesTitres);
      cl = lignes.map((l, i) => {
        const k = indices.indexOf(i);
        return k >= 0 ? classees[k] : classer(nettoyerLigne(l), majusculesTitres);
      });
    } else if (tabs >= 2 && tabs >= nonVides.length * 0.4) {
      cl = classerTableau(lignes, "\t", majusculesTitres);
    } else {
      cl = lignes.map((l) =>
        l.indexOf("\t") >= 0 && l.split("\t").filter((c) => c.trim()).length >= 2
          ? classerLigneTabulee(l, majusculesTitres)
          : classer(nettoyerLigne(l), majusculesTitres),
      );
    }
    return assembler(cl, lignes);
  }

  /* ------------------------------------------------------------------ */
  /* Soumission du site                                                  */
  /* ------------------------------------------------------------------ */

  /** Mots qui rattachent un item à une catégorie du formulaire (couverture du « Matériel »). */
  const FAMILLES = {
    portables: /\b(?:portables?|ordinateurs? portables?|laptops?|notebooks?|ultrabooks?|chromebooks?|macbooks?|latitude|thinkpad|elitebook|probook|zbook|ideapad|vostro|inspiron|xps|yoga|spectre|envy|pavilion|travelmate|aspire|toughbook|dynabook|surface laptop)\b/,
    bureau: /\b(?:ordinateurs?(?! portables?)|bureau|desktops?|tours?|towers?|optiplex|prodesk|elitedesk|thinkcentre|thinkstation|imac|mac mini|mac pro|nuc|mini pc|sff|usff|workstations?|stations? de travail|postes? de travail|tout-en-un|all-in-one|pc)\b/,
    ecrans: /\b(?:ecrans?|moniteurs?|monitors?|displays?|lcd|televiseurs?|tv)\b/,
    serveurs: /\b(?:serveurs?|servers?|poweredge|proliant|dl\d{3}|ml\d{3}|r\d{3}0?|supermicro|blades?|lames?|thinksystem|primergy|ucs)\b/,
    reseau: /\b(?:reseaux?|network(?:ing)?|switch(?:es|s)?|commutateurs?|routeurs?|routers?|firewalls?|pare-feux?|points? d'acces|access points?|bornes?|wifi|wi-fi|modems?|cisco|meraki|aruba|ubiquiti|unifi|juniper|fortinet|fortigate|sonicwall|netgear|catalyst|nexus|mikrotik)\b/,
    stockage: /\b(?:stockage|storage|disques?|hdd|ssd|nvme|nas|san|synology|qnap|netapp|powervault|equallogic|lto|rubans?|tapes?)\b/,
    mobiles: /\b(?:telephones?|cellulaires?|cells?|mobiles?|smartphones?|iphones?|ipads?|galaxy|pixel|tablettes?|tablets?|android|polycom|yealink|avaya|mitel|aastra|grandstream)\b/,
    imprimantes: /\b(?:imprimantes?|printers?|laserjet|officejet|deskjet|pagewide|multifonctions?|mfp|copieurs?|photocopieu(?:r|se)s?|toners?|cartouches?|xerox|lexmark|ricoh|kyocera|imagerunner|workcentre|bizhub|numeriseurs?|scanners?|traceurs?|plotters?|zebra)\b/,
  };
  /** Gammes et produits sans chiffre qui ne sont dans aucune famille (« Apple Watch », « AirPods »). */
  const RE_GAMMES =
    /\b(?:iphone|ipad|ipod|imac|airpods?|apple watch|mac|surface|kindle|xbox|playstation|nintendo|chromecast|alienware|omen|precision|optiplex|powerbook|thinkcentre|elitedesk|prodesk|poweredge|proliant)\b/;

  /** Nom français des catégories du formulaire (components/formulaire/textes.ts) → famille. */
  const FAMILLE_DU_FORMULAIRE = {
    portables: "portables",
    "ordinateurs de bureau": "bureau",
    ecrans: "ecrans",
    serveurs: "serveurs",
    reseau: "reseau",
    stockage: "stockage",
    "telephones et tablettes": "mobiles",
    imprimantes: "imprimantes",
  };

  /**
   * Un item correspond-il à une ligne « Matériel » ? Ce qui suit « avec »
   * ne compte pas (« 20 OptiPlex avec écrans » ne couvre pas les écrans).
   * « Autre (non précisé) » : la description elle-même le précise.
   */
  function couvre(item, ligne) {
    if (/^autre \(non pr[eé]cis[eé]\)$/i.test(ligne.nom)) return true;
    const principal = item.desc.split(/\s(?:avec|incluant|inclus|incluse|comprenant|with|including|\+)\s/i)[0];
    const texte = norm(principal + " " + (item.cat || ""));
    const famille = FAMILLE_DU_FORMULAIRE[norm(ligne.nom)];
    if (famille) return FAMILLES[famille].test(texte);
    // « Cartes graphiques (autre) » : même catégorie, ou un mot significatif en commun.
    const titre = analyserTitre(ligne.nom);
    if (titre && titre.ids.length) {
      const tete = categorieEnTete(item.desc) || (item.cat ? categorieEnTete(item.cat) : null);
      if (tete && titre.ids.indexOf(tete) >= 0) return true;
    }
    const mots = jetons(ligne.nom).map((t) => t.n).filter((m) => m.length >= 4 && !REMPLISSAGE.has(m));
    const itemMots = new Set(jetons(principal + " " + (item.cat || "")).map((t) => t.n));
    return mots.some((m) => itemMots.has(m));
  }

  /**
   * Message d'une soumission (composerMessage de components/formulaire/textes.ts) :
   * « Matériel : » + « - Portables : 10 »…, « Entreprise : », « Ville : »,
   * puis « Description : » et le texte libre du client. Les items viennent
   * de la description ; chaque ligne « Matériel » qu'aucun item ne couvre
   * devient un item (« Écrans » × 5). Une ligne couverte par un seul item sans
   * quantité écrite lui donne sa quantité. Les anciennes demandes (texte libre
   * seulement) passent par analyserTexte.
   */
  function analyserSoumission(message) {
    const texte = String(message == null ? "" : message).replace(/\r\n?/g, "\n");
    const marque = "\n\nDescription :\n";
    const k = texte.indexOf(marque);
    let entete = "";
    let description = texte;
    if (k >= 0) {
      entete = texte.slice(0, k);
      description = texte.slice(k + marque.length);
    } else {
      const lignes = texte.split("\n").filter((l) => l.trim());
      const estEntete = (l) => /^(?:Matériel :|- .+ : .+|Entreprise : .+|Ville : .+)$/.test(l.trim());
      if (lignes.length && lignes.every(estEntete)) {
        entete = texte;
        description = "";
      }
    }
    const materiel = [];
    for (const l of entete.split("\n")) {
      const m = l.trim().match(/^- (.+?) : (.+)$/);
      if (!m) continue;
      const nom = espaces(m[1].replace(/\s*\(autre\)$/i, ""));
      const q = /^\d{1,6}$/.test(m[2].trim()) ? parseInt(m[2], 10) : null;
      if (nom) materiel.push({ nom, qte: q });
    }
    const res = analyserTexte(description);
    const items = res.items.slice();
    for (const ligne of materiel) {
      const lies = items.filter((it) => couvre(it, ligne));
      if (!lies.length) {
        items.push({ desc: ligne.nom, qte: ligne.qte || 1, cat: "", prix: null, explicite: ligne.qte != null });
        continue;
      }
      if (ligne.qte && lies.length === 1 && !lies[0].explicite) {
        lies[0].qte = ligne.qte;
        lies[0].explicite = true;
      }
    }
    return { items, ignorees: res.ignorees, titres: res.titres, materiel };
  }

  /* ------------------------------------------------------------------ */
  /* Recherche eBay                                                      */
  /* ------------------------------------------------------------------ */

  /** État écrit dans la description : ne sert pas à la recherche. */
  const ETATS = [
    /\b(?:en\s+)?(?:tres\s+)?(?:bon(?:ne)?s?|excellent(?:e|s|es)?|parfait(?:e|s|es)?|bel)\s+etat\b/gi,
    /\betat\s+(?:neuf|impeccable|moyen|variable|inconnu|correct|general|de\s+(?:marche|fonctionnement))\b/gi,
    /\bcomme\s+neu(?:f|ve)s?\b/gi,
    /\ben\s+etat\s+de\s+(?:marche|fonctionnement)\b/gi,
    /\b(?:usage(?:e|s|es)?|utilise(?:e|s|es)?|fonctionnel(?:le)?s?|fonctionne(?:nt)?|teste(?:e|s|es)?|verifie(?:e|s|es)?|propres?|recent(?:e|s|es)?|en\s+stock|disponibles?|a\s+vendre|for\s+sale|working|tested|used|good\s+condition|great\s+condition|excellent\s+condition|fully\s+functional)\b/gi,
  ];
  /** Toujours traduits : ils changent le prix. */
  const CONDITIONS = [
    [/\b(?:pour\s+pieces|defectueu(?:x|se|ses)|brise(?:e|s|es)?|ne\s+fonctionne(?:nt)?\s+pas|hors\s+d'?\s*usage|en\s+panne|for\s+parts)\b/gi, " for parts "],
    [/\b(?:neu(?:f|ve)s?\s+)?(?:dans\s+(?:la|sa|leur)\s+boite(?:\s+d'?\s*origine)?|scelle(?:e|s|es)?|jamais\s+ouvert(?:e|s|es)?|new\s+in\s+box|sealed)\b/gi, " new "],
    [/\bneu(?:f|ve)s?\b/gi, " new "],
  ];
  /** Noms français : retirés si un modèle est écrit (P2419H suffit), sinon traduits (eBay est en anglais). */
  const NOMS = [
    [/\bdisques?\s+durs?\s+(?:externes?|portables?)\b/gi, "external hard drive"],
    [/\bdisques?\s+durs?\b/gi, "hard drive"],
    [/\bdisques?\s+ssd\b/gi, "SSD"],
    [/\bordinateurs?\s+portables?\b/gi, "laptop"],
    [/\bpc\s+portables?\b/gi, "laptop"],
    [/\bordinateurs?\s+de\s+bureau\b/gi, "desktop"],
    [/\b(?:postes?|stations?)\s+de\s+travail\b/gi, "workstation"],
    [/\bstations?\s+d'?\s*accueil\b/gi, "docking station"],
    [/\bcartes?\s+graphiques?\b/gi, "graphics card"],
    [/\bcartes?\s+videos?\b/gi, "graphics card"],
    [/\bcartes?\s+meres?\b/gi, "motherboard"],
    [/\bcartes?\s+reseau\b/gi, "network card"],
    [/\bblocs?\s+d'?\s*alimentation\b/gi, "power supply"],
    [/\bpoints?\s+d'?\s*acces\b/gi, "access point"],
    [/\btelephones?\s+ip\b/gi, "IP phone"],
    [/\btelephones?\s+(?:cellulaires?|intelligents?)\b/gi, "phone"],
    [/\bmemoires?\s+vives?\b/gi, "RAM"],
    [/\bcasques?\s+d'?\s*ecoute\b/gi, "headset"],
    [/\bcartouches?\s+d'?\s*encre\b/gi, "ink cartridge"],
    [/\bhaut-parleurs?\b/gi, "speaker"],
    [/\bpare-feux?\b/gi, "firewall"],
    [/\bportables?\b/gi, "laptop"],
    [/\bordinateurs?\b/gi, "computer"],
    [/\b(?:ecrans?|moniteurs?)\b/gi, "monitor"],
    [/\bserveurs?\b/gi, "server"],
    [/\bimprimantes?\b/gi, "printer"],
    [/\bnumeriseurs?\b/gi, "scanner"],
    [/\bphotocopieu(?:r|se)s?\b/gi, "copier"],
    [/\bprojecteurs?\b/gi, "projector"],
    [/\bclaviers?\b/gi, "keyboard"],
    [/\bsouris\b/gi, "mouse"],
    [/\bcasques?\b/gi, "headset"],
    [/\bchargeurs?\b/gi, "charger"],
    [/\badaptateurs?\b/gi, "adapter"],
    [/\bcables?\b/gi, "cable"],
    [/\bcommutateurs?\b/gi, "switch"],
    [/\brouteurs?\b/gi, "router"],
    [/\bonduleurs?\b/gi, "UPS"],
    [/\bbatteries?\b/gi, "battery"],
    [/\btablettes?\b/gi, "tablet"],
    [/\btelephones?\b/gi, "phone"],
    [/\bcellulaires?\b/gi, "phone"],
    [/\bprocesseurs?\b/gi, "CPU"],
    [/\bmemoires?\b/gi, "RAM"],
    [/\bdisques?\b/gi, "drive"],
    [/\btours?\b/gi, "tower"],
    [/\bboitiers?\b/gi, "case"],
    [/\bcartouches?\b/gi, "cartridge"],
  ];
  const UNITES_EBAY = { go: "GB", gb: "GB", to: "TB", tb: "TB", mo: "MB", mb: "MB" };

  /**
   * Recherche eBay d'un item : précisions entre parenthèses, accessoires
   * (« avec chargeur »), état (« bon état ») et petits mots retirés, Go → GB,
   * To → TB, noms français retirés ou traduits. La description affichée ne
   * change pas.
   */
  function requeteEbay(desc) {
    const brut = espaces(desc);
    let s = " " + sansAccents(brut) + " ";
    s = s.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
    s = s.replace(/\s(?:avec|incluant|inclus|incluse|comprenant|with|including|sans|without)\s.*$/i, " ");
    for (const re of ETATS) s = s.replace(re, " ");
    for (const [re, en] of CONDITIONS) s = s.replace(re, en);
    s = s.replace(/(\d+(?:[.,]\d+)?)\s*(go|gb|to|tb|mo|mb)(?![a-z])/gi, (m, n, u) => n.replace(",", ".") + UNITES_EBAY[u.toLowerCase()]);
    s = s.replace(/(\d+(?:[.,]\d+)?)\s*(?:pouces?|po|''|"|in)(?![a-z])/gi, "$1");
    const modele = aUnModele(s);
    for (const [re, en] of NOMS) s = s.replace(re, modele ? " " : " " + en + " ");
    s = s.replace(/\s[dl]'/gi, " ");
    s = s.replace(/\s(?:de|du|des|la|le|les|un|une|et|ou|en|a|au|aux|pour|sur|dans|par|chez|lot|lots|qte|quantite|unites?|x)(?=\s)/gi, " ");
    s = s.replace(/[,:;"«»“”!?*_=|]+/g, " ").replace(/\s[-–—/+&.]+(?=\s)/g, " ");
    // Mot répété (« new new »)
    s = espaces(s).replace(/\b(\w+)(?:\s+\1\b)+/gi, "$1");
    return s || brut;
  }

  /** Ventes réussies sur eBay.ca pour un item. */
  function lienEbay(desc) {
    return "https://www.ebay.ca/sch/i.html?_nkw=" + encodeURIComponent(requeteEbay(desc)) + "&LH_Sold=1&LH_Complete=1";
  }

  racine.AnalyseLot = Object.freeze({
    analyserTexte,
    analyserSoumission,
    lireQuantite,
    lireMontant,
    requeteEbay,
    lienEbay,
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
