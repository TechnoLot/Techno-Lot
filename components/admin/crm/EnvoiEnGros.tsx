"use client";

import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import {
  CircleAlert,
  CircleCheck,
  FileUp,
  ListChecks,
  Loader2,
  MailCheck,
  Mails,
  Send,
  TriangleAlert,
} from "lucide-react";
import {
  envoyerLotEnGros,
  envoyerTestEnGros,
  verifierEnvoiEnGros,
  type ResultatLotEnGros,
  type ResultatVerification,
} from "@/lib/crm/envoi-en-gros-actions";
import {
  analyserListe,
  formaterNombre,
  MAX_CORPS,
  MAX_DESTINATAIRES,
  MAX_OBJET,
  nombreDeLots,
  problemeBloquant,
  TAILLE_LOT,
  type ChampListe,
} from "@/lib/crm/envoi-en-gros";

/** Modèle actif proposé au départ (cold outreach, intro post-appel). */
export type ModeleDepart = { id: string; libelle: string; objet: string; corps: string };

type Arret = NonNullable<ResultatLotEnGros["arret"]>;

/** Ce qui a été vérifié : l'envoi n'est permis que pour ces valeurs exactes. */
type Verification = ResultatVerification & { texte: string; objet: string; corps: string };

type Progression = { envoyes: number; lot: number; lots: number; total: number };

type Bilan = {
  envoyes: number;
  echecs: number;
  /** Prêts non envoyés (lot refusé ou lots jamais tentés). */
  restants: number;
  exclus: number;
  arret: Arret | null;
  erreur: string | null;
};

/** Résultat du bouton « M'envoyer un test ». */
type EtatTest = { ok: true; a: string } | { ok: false; error: string };

/** Fichier importé : 400 Ko au plus (100 000 caractères, accents compris). */
const TAILLE_FICHIER_MAX = 400_000;

const VARIABLES = ["{{prenom}}", "{{nom}}", "{{compagnie}}", "{{titre}}"] as const;

const LIBELLES_COLONNES: Record<ChampListe, string> = {
  email: "courriel",
  prenom: "prénom",
  nom: "nom",
  compagnie: "compagnie",
  titre: "titre",
};

const LIBELLES_SEPARATEURS: Record<string, string> = {
  ",": "virgule",
  ";": "point-virgule",
  "\t": "tabulation",
};

const nombre = formaterNombre;
const pluriel = (n: number, mot: string, motPluriel = `${mot}s`) => `${nombre(n)} ${n > 1 ? motPluriel : mot}`;

/**
 * Texte d'un fichier importé, lu dans le navigateur : UTF-8 (avec ou sans
 * BOM), UTF-16 (« Texte Unicode » d'Excel, tabulations) ou, à défaut,
 * Windows-1252 (CSV « point-virgule » d'Excel en français).
 */
function decoderFichier(octets: Uint8Array): string {
  if (octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(octets.subarray(3));
  }
  if (octets[0] === 0xff && octets[1] === 0xfe) return new TextDecoder("utf-16le").decode(octets.subarray(2));
  if (octets[0] === 0xfe && octets[1] === 0xff) return new TextDecoder("utf-16be").decode(octets.subarray(2));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(octets);
  } catch {
    return new TextDecoder("windows-1252").decode(octets);
  }
}

/**
 * Onglet « Envoi en gros » du CRM : liste → résumé en direct → message →
 * vérification (serveur, lecture seule) → confirmation → envoi lot par lot.
 * Le navigateur ne fait qu'enchaîner les lots : le serveur revalide toute la
 * liste, les désabonnements, les envois déjà faits et le nombre confirmé à
 * chaque lot.
 */
export default function EnvoiEnGros({ modeles }: { modeles: ModeleDepart[] }) {
  const [texte, setTexte] = useState("");
  const [objet, setObjet] = useState("");
  const [corps, setCorps] = useState("");
  const [erreurImport, setErreurImport] = useState<string | null>(null);

  const [verification, setVerification] = useState<Verification | null>(null);
  const [erreurVerification, setErreurVerification] = useState<string | null>(null);
  const [verificationEnCours, demarrerVerification] = useTransition();

  const [confirme, setConfirme] = useState(false);
  const [nombreSaisi, setNombreSaisi] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  /** Garde contre le double clic : posée avant le premier rendu qui désactive le bouton. */
  const envoiLance = useRef(false);

  const [test, setTest] = useState<EtatTest | null>(null);
  const [testEnCours, demarrerTest] = useTransition();

  const fichierRef = useRef<HTMLInputElement>(null);
  const corpsRef = useRef<HTMLTextAreaElement>(null);

  // Résumé en direct, calculé dans le navigateur (aucun appel serveur).
  const texteDiffere = useDeferredValue(texte);
  const analyse = useMemo(() => analyserListe(texteDiffere), [texteDiffere]);
  const probleme = texteDiffere.trim() === "" ? null : problemeBloquant(analyse);

  const verificationAJour =
    verification !== null &&
    verification.texte === texte &&
    verification.objet === objet &&
    verification.corps === corps;
  const verrouille = envoiEnCours;
  const peutVerifier =
    !verrouille &&
    !verificationEnCours &&
    texte.trim() !== "" &&
    texte === texteDiffere &&
    probleme === null &&
    objet.trim() !== "" &&
    corps.trim() !== "";
  const prets = verification?.prets ?? 0;
  const peutEnvoyer =
    verificationAJour &&
    bilan === null &&
    !envoiEnCours &&
    prets > 0 &&
    confirme &&
    nombreSaisi.trim() === String(prets);

  /** Toute modification après la vérification l'annule (il faudra revérifier). */
  function apresModification() {
    setConfirme(false);
    setNombreSaisi("");
    setBilan(null);
    setProgression(null);
    setTest(null);
  }

  function changerTexte(valeur: string) {
    setTexte(valeur);
    apresModification();
  }

  async function importerFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setErreurImport(null);
    if (/\.(xlsx|xlsm|xls|ods)$/i.test(fichier.name)) {
      setErreurImport(
        "Les fichiers Excel ne sont pas lus directement : dans Excel, fais Fichier → Enregistrer sous → CSV, puis importe ce fichier.",
      );
      return;
    }
    if (fichier.size > TAILLE_FICHIER_MAX) {
      setErreurImport("Fichier trop gros (400 Ko au plus) : découpe la liste en plusieurs envois.");
      return;
    }
    if (texte.trim() !== "" && !window.confirm("Remplacer la liste actuelle par le contenu du fichier ?")) return;
    try {
      const contenu = decoderFichier(new Uint8Array(await fichier.arrayBuffer()));
      changerTexte(contenu);
    } catch {
      setErreurImport("Lecture du fichier impossible. Enregistre-le en CSV (UTF-8) et réessaie.");
    }
  }

  function appliquerModele(id: string) {
    const modele = modeles.find((m) => m.id === id);
    if (!modele) return;
    const dejaEcrit = (objet.trim() !== "" || corps.trim() !== "") && (objet !== modele.objet || corps !== modele.corps);
    if (dejaEcrit && !window.confirm("Remplacer l'objet et le message actuels par ce modèle ?")) return;
    setObjet(modele.objet.slice(0, MAX_OBJET));
    setCorps(modele.corps.slice(0, MAX_CORPS));
    apresModification();
  }

  function insererVariable(variable: string) {
    const zone = corpsRef.current;
    const debut = zone?.selectionStart ?? corps.length;
    const fin = zone?.selectionEnd ?? corps.length;
    const suivant = `${corps.slice(0, debut)}${variable}${corps.slice(fin)}`.slice(0, MAX_CORPS);
    setCorps(suivant);
    apresModification();
    requestAnimationFrame(() => {
      if (!zone) return;
      zone.focus();
      zone.setSelectionRange(debut + variable.length, debut + variable.length);
    });
  }

  function verifier() {
    if (!peutVerifier) return;
    const valeurs = { destinataires: texte, objet, corps };
    setErreurVerification(null);
    apresModification();
    demarrerVerification(async () => {
      try {
        const r = await verifierEnvoiEnGros(valeurs);
        if (!r.ok) {
          setVerification(null);
          setErreurVerification(r.error);
          return;
        }
        setVerification({ ...r, texte: valeurs.destinataires, objet: valeurs.objet, corps: valeurs.corps });
      } catch {
        setVerification(null);
        setErreurVerification("Vérification impossible (connexion interrompue). Réessaie.");
      }
    });
  }

  /** Courriel du premier destinataire, à l'admin seulement (le serveur refait tout le rendu). */
  function envoyerTest() {
    if (!verification || !verificationAJour || testEnCours || envoiEnCours) return;
    const valeurs = { destinataires: verification.texte, objet: verification.objet, corps: verification.corps };
    setTest(null);
    demarrerTest(async () => {
      try {
        const r = await envoyerTestEnGros(valeurs);
        setTest(r.ok ? { ok: true, a: r.a } : { ok: false, error: r.error });
      } catch {
        setTest({ ok: false, error: "Envoi du test impossible (connexion interrompue). Réessaie." });
      }
    });
  }

  async function envoyer() {
    if (envoiLance.current || !peutEnvoyer || !verification) return;
    envoiLance.current = true;
    setEnvoiEnCours(true);

    const v = verification;
    const total = v.prets;
    const lots = nombreDeLots(total);
    let envoyes = 0;
    let echecs = 0;
    let arret: Arret | null = null;
    let erreur: string | null = null;
    setProgression({ envoyes: 0, lot: 1, lots, total });

    try {
      // Borne de sécurité : jamais plus de tours que de lots prévus (+1).
      for (let tour = 0; tour <= lots; tour++) {
        const r = await envoyerLotEnGros({
          destinataires: v.texte,
          objet: v.objet,
          corps: v.corps,
          confirme,
          nombre: total,
          dejaEnvoyes: envoyes,
        });
        if (!r.ok) {
          erreur = r.error;
          break;
        }
        envoyes += r.envoyes;
        echecs += r.echecs;
        setProgression({ envoyes, lot: Math.min(lots, tour + 2), lots, total });
        if (r.arret) {
          arret = r.arret;
          break;
        }
        if (r.termine || r.envoyes === 0) break;
      }
    } catch {
      erreur =
        "Connexion interrompue pendant l'envoi. Vérifie la liste de nouveau : les courriels déjà envoyés seront exclus automatiquement.";
    }

    setBilan({
      envoyes,
      echecs,
      restants: Math.max(0, total - envoyes),
      exclus: v.desabonnes.nombre + v.dejaRecus.nombre,
      arret,
      erreur,
    });
    setEnvoiEnCours(false);
    envoiLance.current = false;
  }

  const colonnes = analyse.colonnes
    ? (Object.entries(analyse.colonnes) as [ChampListe, number][])
        .sort((a, b) => a[1] - b[1])
        .map(([champ, i]) => `${LIBELLES_COLONNES[champ]} (col. ${i + 1})`)
        .join(", ")
    : null;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {/* 1. Destinataires */}
      <Etape
        n={1}
        titre="Destinataires"
        description="Une adresse par ligne, ou des colonnes séparées par virgule, point-virgule ou tabulation (export Excel)."
        action={
          <>
            <input
              ref={fichierRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={importerFichier}
            />
            <button
              type="button"
              className="btn-secondary !px-4 !py-2"
              disabled={verrouille}
              onClick={() => fichierRef.current?.click()}
            >
              <FileUp className="h-4 w-4" aria-hidden />
              Importer un CSV
            </button>
          </>
        }
      >
        <label htmlFor="envoi-destinataires" className="sr-only">
          Liste des destinataires
        </label>
        <textarea
          id="envoi-destinataires"
          value={texte}
          onChange={(e) => changerTexte(e.target.value)}
          readOnly={verrouille}
          rows={9}
          spellCheck={false}
          autoComplete="off"
          aria-describedby="envoi-destinataires-aide"
          placeholder={
            "jean.tremblay@exemple.ca\nmarie.roy@exemple.com\n\nou avec un en-tête (facultatif) :\nPrénom;Nom;Courriel;Compagnie;Titre\nJean;Tremblay;jean.tremblay@exemple.ca;Exemple inc.;Directeur TI"
          }
          className="field font-mono text-[13px] leading-relaxed"
        />
        <p id="envoi-destinataires-aide" className="mt-2 text-xs text-admin-muted">
          En-tête reconnu : courriel (ou email), prénom, nom, compagnie (ou entreprise), titre. Sans
          en-tête, la colonne qui contient des @ est prise. {MAX_DESTINATAIRES} destinataires au plus par
          envoi ; les doublons sont retirés. Fichier Excel : enregistre-le d&apos;abord en CSV.
        </p>
        {erreurImport && <Alerte ton="rouge">{erreurImport}</Alerte>}

        {texteDiffere.trim() !== "" && (
          <div className="mt-4 border-t border-admin-line-soft pt-4">
            <p className="admin-eyebrow mb-2">Résumé de la liste</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Tuile libelle="Adresses valides" valeur={analyse.destinataires.length} ton="vert" />
              <Tuile libelle="Invalides" valeur={analyse.invalides.length} ton={analyse.invalides.length > 0 ? "rouge" : "neutre"} />
              <Tuile libelle="Doublons retirés" valeur={analyse.doublons.length} ton="neutre" />
            </div>
            <p className="mt-2 text-xs text-admin-muted">
              {analyse.separateur ? `Séparateur : ${LIBELLES_SEPARATEURS[analyse.separateur]}. ` : ""}
              {colonnes ? `En-tête reconnu : ${colonnes}.` : "Aucun en-tête : les prénoms et compagnies ne sont pas repris."}
              {analyse.destinataires.length > 0 &&
                ` ${pluriel(nombreDeLots(Math.min(analyse.destinataires.length, MAX_DESTINATAIRES)), "lot")} de ${TAILLE_LOT} au plus.`}
            </p>
            {analyse.invalides.length > 0 && (
              <ListeLignes
                titre={`${pluriel(analyse.invalides.length, "ligne invalide", "lignes invalides")} (ignorées)`}
                lignes={analyse.invalides.map((l) => `Ligne ${l.ligne} : ${l.valeur}`)}
              />
            )}
            {analyse.doublons.length > 0 && (
              <ListeLignes
                titre={`${pluriel(analyse.doublons.length, "doublon retiré", "doublons retirés")}`}
                lignes={analyse.doublons.map((d) => `Ligne ${d.ligne} : ${d.email} (déjà à la ligne ${d.premiereLigne})`)}
              />
            )}
            {probleme && <Alerte ton="rouge">{probleme}</Alerte>}
          </div>
        )}
      </Etape>

      {/* 2. Message */}
      <Etape n={2} titre="Message" description="Texte brut. La signature Techno Lot et la mention de désabonnement (LCAP) sont ajoutées automatiquement.">
        {modeles.length > 0 ? (
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-admin-ink">Partir d&apos;un modèle</span>
            <select
              className="field !py-2.5 text-sm"
              value=""
              disabled={verrouille}
              onChange={(e) => appliquerModele(e.target.value)}
            >
              <option value="">Choisir un modèle actif…</option>
              {modeles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.libelle}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="mb-4 text-xs text-admin-muted">
            Aucun modèle actif de départ (Cold outreach ou Intro post-appel) : écris le message ci-dessous ou
            active un modèle dans Modèles courriel.
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium text-admin-ink">
            Objet
            <span className="text-xs font-normal tabular-nums text-admin-faint">
              {objet.length}/{MAX_OBJET}
            </span>
          </span>
          <input
            type="text"
            value={objet}
            maxLength={MAX_OBJET}
            readOnly={verrouille}
            onChange={(e) => {
              setObjet(e.target.value);
              apresModification();
            }}
            className="field !py-2.5 text-sm"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium text-admin-ink">
            Message
            <span className="text-xs font-normal tabular-nums text-admin-faint">
              {nombre(corps.length)}/{nombre(MAX_CORPS)}
            </span>
          </span>
          <textarea
            ref={corpsRef}
            value={corps}
            maxLength={MAX_CORPS}
            readOnly={verrouille}
            onChange={(e) => {
              setCorps(e.target.value);
              apresModification();
            }}
            rows={12}
            className="field text-sm leading-relaxed"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-admin-muted">
          <span>Insérer :</span>
          {VARIABLES.map((variable) => (
            <button
              key={variable}
              type="button"
              disabled={verrouille}
              onClick={() => insererVariable(variable)}
              className="rounded-md border border-admin-line bg-admin-subtle px-1.5 py-0.5 font-mono text-[12px] text-admin-ink transition-colors hover:border-admin-line-strong disabled:opacity-50"
            >
              {variable}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-admin-muted">
          Sans prénom : « bonjour ». Sans compagnie : celle de la fiche du CRM, sinon « votre entreprise ».
          Nom et titre absents : laissés vides. Les valeurs de la liste passent avant celles du CRM.
        </p>
      </Etape>

      {/* 3. Vérification */}
      <Etape
        n={3}
        titre="Vérification"
        description="Contrôle côté serveur, sans rien envoyer : désabonnements, adresses qui ont déjà reçu cet objet, aperçu. Tu pourras ensuite t'envoyer un test."
      >
        <button type="button" className="btn-secondary" disabled={!peutVerifier} onClick={verifier}>
          {verificationEnCours ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ListChecks className="h-4 w-4" aria-hidden />
          )}
          Vérifier la liste
        </button>
        {erreurVerification && <Alerte ton="rouge">{erreurVerification}</Alerte>}

        {verification && (
          <div className="mt-4" aria-live="polite">
            {!verificationAJour && (
              <Alerte ton="ambre">La liste ou le message a changé depuis la vérification : vérifie de nouveau avant d&apos;envoyer.</Alerte>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Tuile libelle="Prêts à recevoir" valeur={verification.prets} ton="vert" />
              <Tuile
                libelle="Exclus"
                valeur={verification.desabonnes.nombre + verification.dejaRecus.nombre}
                ton={verification.desabonnes.nombre + verification.dejaRecus.nombre > 0 ? "ambre" : "neutre"}
              />
              <Tuile libelle="Fiches à créer" valeur={verification.nouvellesFiches} ton="neutre" />
              <Tuile libelle={`Lots de ${TAILLE_LOT}`} valeur={verification.lots} ton="neutre" />
            </div>
            <ul className="mt-3 space-y-1 text-xs text-admin-muted">
              <li>
                Désabonnés (LCAP) : {nombre(verification.desabonnes.nombre)}
                {verification.desabonnes.exemples.length > 0 && <Exemples liste={verification.desabonnes.exemples} total={verification.desabonnes.nombre} />}
              </li>
              <li>
                Ont déjà reçu cet objet par l&apos;envoi en gros : {nombre(verification.dejaRecus.nombre)}
                {verification.dejaRecus.exemples.length > 0 && <Exemples liste={verification.dejaRecus.exemples} total={verification.dejaRecus.nombre} />}
              </li>
              {verification.nouvellesFiches > 0 && (
                <li>Les adresses inconnues du CRM y deviendront des contacts (étape « Contacté » après l&apos;envoi).</li>
              )}
            </ul>

            {verification.apercu ? (
              <div className="mt-4 rounded-xl border border-admin-line bg-admin-subtle p-4">
                <p className="admin-eyebrow">Aperçu pour le premier destinataire</p>
                <dl className="mt-2 grid gap-1 text-sm">
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-admin-muted">À :</dt>
                    <dd className="min-w-0 break-all text-admin-ink">{verification.apercu.a}</dd>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-admin-muted">Objet :</dt>
                    <dd className="min-w-0 break-words font-medium text-admin-ink">{verification.apercu.objet}</dd>
                  </div>
                </dl>
                <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-admin-line bg-admin-card p-3 font-sans text-[13px] leading-relaxed text-admin-ink">
                  {verification.apercu.texte}
                </pre>
                {verificationAJour && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <button
                      type="button"
                      className="btn-secondary !px-4 !py-2"
                      disabled={testEnCours || envoiEnCours}
                      onClick={envoyerTest}
                    >
                      {testEnCours ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <MailCheck className="h-4 w-4" aria-hidden />
                      )}
                      M&apos;envoyer un test
                    </button>
                    <span className="min-w-0 text-xs text-admin-muted">
                      Ce courriel, à ton adresse seulement, avec « [Test] » devant l&apos;objet. Rien n&apos;est écrit
                      dans le CRM ; compte pour un envoi dans le quota de Resend.
                    </span>
                  </div>
                )}
                {test && test.ok && (
                  <p className="mt-2 flex items-start gap-2 text-sm text-admin-green">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0 break-words">
                      Test envoyé à {test.a}. Regarde ta boîte de réception (et les indésirables).
                    </span>
                  </p>
                )}
                {test && !test.ok && <Alerte ton="rouge">{test.error}</Alerte>}
              </div>
            ) : (
              <Alerte ton="ambre">Aucun destinataire à servir : tous sont exclus.</Alerte>
            )}
          </div>
        )}
      </Etape>

      {/* 4. Envoi */}
      {verification && verificationAJour && prets > 0 && (
        <Etape n={4} titre="Envoi" description="Les courriels partent aussitôt, lot par lot : impossible de les rappeler.">
          <label className="flex items-start gap-3 text-sm text-admin-ink">
            <input
              type="checkbox"
              checked={confirme}
              disabled={envoiEnCours || bilan !== null}
              onChange={(e) => setConfirme(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-admin-green"
            />
            <span>Je confirme que ces destinataires sont des contacts d&apos;affaires et que le message est exact.</span>
          </label>

          <label className="mt-4 block max-w-xs">
            <span className="mb-1.5 block text-sm font-medium text-admin-ink">
              Tape le nombre exact de destinataires ({nombre(prets)})
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={nombreSaisi}
              disabled={envoiEnCours || bilan !== null}
              onChange={(e) => setNombreSaisi(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="field !py-2.5 text-sm tabular-nums"
            />
          </label>

          <p className="mt-3 text-xs text-admin-muted">
            Chaque destinataire compte pour un envoi dans le quota de Resend (aucune copie à la boîte générale :
            l&apos;envoi reste noté dans la fiche du CRM de chaque contact). Si le quota du jour est atteint,
            l&apos;envoi s&apos;arrête proprement et reprend le lendemain avec la même liste.
          </p>

          <button type="button" className="btn-primary mt-4" disabled={!peutEnvoyer} onClick={envoyer}>
            {envoiEnCours ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            Envoyer à {pluriel(prets, "destinataire")}
          </button>

          <div aria-live="polite">
            {progression && envoiEnCours && (
              <div className="mt-4">
                <p className="text-sm text-admin-ink">
                  Lot {nombre(progression.lot)} sur {nombre(progression.lots)} — {nombre(progression.envoyes)} envoyé
                  {progression.envoyes > 1 ? "s" : ""} sur {nombre(progression.total)}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-admin-subtle" aria-hidden>
                  <div
                    className="h-full rounded-full bg-[#257a10] transition-[width] duration-300"
                    style={{ width: `${progression.total > 0 ? Math.round((progression.envoyes / progression.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}

            {bilan && (
              <div className="mt-4 rounded-xl border border-admin-line bg-admin-subtle p-4">
                <p className="flex items-center gap-2 font-display text-base font-semibold text-admin-ink">
                  <Mails className="h-4 w-4 text-admin-green" aria-hidden />
                  Bilan de l&apos;envoi
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                  <Tuile libelle="Envoyés" valeur={bilan.envoyes} ton="vert" />
                  <Tuile libelle="Échecs" valeur={bilan.echecs} ton={bilan.echecs > 0 ? "rouge" : "neutre"} />
                  <Tuile libelle="Exclus" valeur={bilan.exclus} ton="neutre" />
                </div>
                {bilan.restants > 0 && (
                  <p className="mt-3 text-sm text-admin-ink">
                    {pluriel(bilan.restants, "destinataire n'a pas", "destinataires n'ont pas")} encore reçu le courriel.
                  </p>
                )}
                {bilan.arret && (
                  <Alerte ton={bilan.arret.motif === "quota_quotidien" || bilan.arret.motif === "quota_mensuel" || bilan.arret.motif === "debit" ? "ambre" : "rouge"}>
                    {bilan.arret.message}
                  </Alerte>
                )}
                {bilan.erreur && <Alerte ton="rouge">{bilan.erreur}</Alerte>}
                {!bilan.arret && !bilan.erreur && bilan.restants === 0 && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-admin-green">
                    <CircleCheck className="h-4 w-4" aria-hidden />
                    Envoi terminé.
                  </p>
                )}
                <button type="button" className="btn-secondary mt-4" disabled={!peutVerifier} onClick={verifier}>
                  <ListChecks className="h-4 w-4" aria-hidden />
                  Vérifier de nouveau
                </button>
              </div>
            )}
          </div>
        </Etape>
      )}
    </div>
  );
}

function Etape({
  n,
  titre,
  description,
  action,
  children,
}: {
  n: number;
  titre: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass min-w-0 p-4 sm:p-6" aria-labelledby={`envoi-etape-${n}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-admin-tint-green text-sm font-bold text-admin-green">
            {n}
          </span>
          <div className="min-w-0">
            <h2 id={`envoi-etape-${n}`} className="font-display text-lg font-semibold text-admin-ink">
              {titre}
            </h2>
            {description && <p className="mt-0.5 text-sm text-admin-muted">{description}</p>}
          </div>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

const TONS = {
  vert: "text-admin-green",
  rouge: "text-admin-danger",
  ambre: "text-admin-warning",
  neutre: "text-admin-ink",
} as const;

function Tuile({ libelle, valeur, ton }: { libelle: string; valeur: number; ton: keyof typeof TONS }) {
  return (
    <div className="flex min-w-0 flex-col justify-between rounded-xl border border-admin-line bg-admin-card px-3 py-2.5">
      <p className="text-[12px] font-medium leading-snug text-admin-muted">{libelle}</p>
      <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${TONS[ton]}`}>{nombre(valeur)}</p>
    </div>
  );
}

function Alerte({ ton, children }: { ton: "rouge" | "ambre"; children: React.ReactNode }) {
  const styles =
    ton === "rouge"
      ? "border-admin-tint-red-line bg-admin-tint-red text-admin-danger"
      : "border-admin-tint-amber-line bg-admin-tint-amber text-admin-tint-amber-ink";
  const Icone = ton === "rouge" ? CircleAlert : TriangleAlert;
  return (
    <p role={ton === "rouge" ? "alert" : "status"} className={`mt-3 flex gap-2 rounded-lg border px-3 py-2 text-sm ${styles}`}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

/** Lignes repliables (invalides, doublons) : les 50 premières, puis le compte du reste. */
function ListeLignes({ titre, lignes }: { titre: string; lignes: string[] }) {
  const visibles = lignes.slice(0, 50);
  return (
    <details className="mt-3 rounded-lg border border-admin-line bg-admin-card px-3 py-2 text-xs text-admin-muted">
      <summary className="cursor-pointer select-none font-medium text-admin-ink">{titre}</summary>
      <ul className="mt-2 space-y-0.5 break-all font-mono text-[12px]">
        {visibles.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
        {lignes.length > visibles.length && <li>… et {nombre(lignes.length - visibles.length)} autres</li>}
      </ul>
    </details>
  );
}

function Exemples({ liste, total }: { liste: string[]; total: number }) {
  return (
    <span className="break-all">
      {" "}— {liste.join(", ")}
      {total > liste.length ? `, … (+${nombre(total - liste.length)})` : ""}
    </span>
  );
}
