"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileDown,
  FilePlus2,
  ImageDown,
  Loader2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import CertificatDestruction from "@/components/admin/destruction/CertificatDestruction";
import { telechargerCertificat } from "@/components/admin/destruction/export";
import { enregistrerCertificat, supprimerCertificat } from "@/lib/admin/destruction-actions";
import {
  LIMITES_CERTIFICAT,
  dateLongue,
  jourSemaine,
  nettoyerCertificat,
  nomFichierCertificat,
  validerCertificat,
  type CertificatDestruction as Ligne,
} from "@/lib/admin/destruction";

type Formulaire = {
  numero: string;
  compagnie: string;
  adresse: string;
  materiel: string;
  nbAppareils: string;
  dateDestruction: string;
  dateEmission: string;
};

type Etat =
  | { type: "repos" }
  | { type: "travail"; format: "pdf" | "png" }
  | { type: "ok"; message: string }
  | { type: "erreur"; message: string };

const LARGEUR_FEUILLE = 816;

function formulaireVide(numero: string, aujourdhui: string): Formulaire {
  return {
    numero,
    compagnie: "",
    adresse: "",
    materiel: "",
    nbAppareils: "",
    dateDestruction: aujourdhui,
    dateEmission: aujourdhui,
  };
}

/** « 12 » → 12 ; tout le reste (vide, 2,5, -3) → NaN, refusé à la validation. */
function entier(texte: string): number {
  return /^\d+$/.test(texte.trim()) ? Number(texte.trim()) : Number.NaN;
}

/**
 * Onglet Destruction des données : formulaire, aperçu en direct du certificat,
 * téléchargement en PDF ou en photo (enregistré au registre à chaque fois) et
 * liste des certificats émis.
 */
export default function DestructionDonnees({
  certificats,
  prochainNumero,
  aujourdhui,
  erreurListe,
}: {
  certificats: Ligne[];
  prochainNumero: string;
  aujourdhui: string;
  erreurListe: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Formulaire>(() => formulaireVide(prochainNumero, aujourdhui));
  const [idOuvert, setIdOuvert] = useState<string | null>(null);
  const [etat, setEtat] = useState<Etat>({ type: "repos" });
  const certificatRef = useRef<HTMLDivElement>(null);
  const hautRef = useRef<HTMLDivElement>(null);

  const valeurs = useMemo(
    () => nettoyerCertificat({ ...form, nbAppareils: entier(form.nbAppareils) }),
    [form],
  );
  const ouvert = idOuvert ? certificats.find((c) => c.id === idOuvert) : undefined;
  const occupe = etat.type === "travail";

  function modifier<K extends keyof Formulaire>(cle: K, valeur: Formulaire[K]) {
    setForm((f) => ({ ...f, [cle]: valeur }));
    if (etat.type !== "travail") setEtat({ type: "repos" });
  }

  function nouveau() {
    setIdOuvert(null);
    setForm(formulaireVide(prochainNumero, aujourdhui));
    setEtat({ type: "repos" });
  }

  function ouvrir(c: Ligne) {
    setIdOuvert(c.id);
    setForm({
      numero: c.numero,
      compagnie: c.compagnie,
      adresse: c.adresse ?? "",
      materiel: c.materiel ?? "",
      nbAppareils: String(c.nb_appareils),
      dateDestruction: c.date_destruction,
      dateEmission: c.date_emission,
    });
    setEtat({ type: "repos" });
    hautRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function telecharger(format: "pdf" | "png") {
    const verif = validerCertificat(valeurs);
    if (!verif.ok) {
      setEtat({ type: "erreur", message: verif.error });
      return;
    }
    const noeud = certificatRef.current;
    if (!noeud) return;
    const v = verif.valeurs;
    setEtat({ type: "travail", format });

    let id: string;
    try {
      const res = await enregistrerCertificat(idOuvert, v);
      if (!res.ok) {
        setEtat({ type: "erreur", message: res.error });
        return;
      }
      id = res.id;
    } catch {
      setEtat({ type: "erreur", message: "Connexion perdue : le certificat n’a pas été enregistré. Réessaie." });
      return;
    }
    setIdOuvert(id);

    try {
      await telechargerCertificat(
        noeud,
        format,
        nomFichierCertificat(v.numero, v.compagnie, format),
        `Certificat de destruction des données ${v.numero} — ${v.compagnie}`,
      );
      setEtat({
        type: "ok",
        message: `Certificat ${v.numero} enregistré. ${format === "pdf" ? "Le PDF est téléchargé." : "La photo est téléchargée."}`,
      });
    } catch (e) {
      setEtat({
        type: "erreur",
        message: `Certificat ${v.numero} enregistré, mais le fichier n’a pas pu être créé (${
          e instanceof Error ? e.message : "erreur inconnue"
        }). Réessaie.`,
      });
    }
    router.refresh();
  }

  const jour = jourSemaine(form.dateDestruction);

  return (
    <>
      <div ref={hautRef} className="grid scroll-mt-6 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void telecharger("pdf");
          }}
          className="admin-card space-y-5 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="admin-card-title">
                {idOuvert ? `Certificat ${ouvert?.numero ?? form.numero}` : "Nouveau certificat"}
              </h2>
              <p className="mt-1 text-sm text-admin-muted">
                {idOuvert
                  ? "Enregistré dans la liste. Tes changements remplacent ce certificat au prochain téléchargement."
                  : "Remplis les champs : l’aperçu se met à jour. Le certificat est enregistré au téléchargement."}
              </p>
            </div>
            {idOuvert && (
              <button type="button" onClick={nouveau} disabled={occupe} className="admin-btn">
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden />
                Nouveau certificat
              </button>
            )}
          </div>

          <Champ id="cert-numero" label="Numéro du certificat" aide="Rempli tout seul (suite de l’année) ; tu peux le changer.">
            <input
              id="cert-numero"
              type="text"
              value={form.numero}
              maxLength={LIMITES_CERTIFICAT.numero}
              onChange={(e) => modifier("numero", e.target.value)}
              aria-describedby="cert-numero-aide"
              className="field font-display tracking-wide"
            />
          </Champ>

          <Champ id="cert-compagnie" label="Nom de la compagnie">
            <input
              id="cert-compagnie"
              type="text"
              required
              autoComplete="organization"
              value={form.compagnie}
              maxLength={LIMITES_CERTIFICAT.compagnie}
              onChange={(e) => modifier("compagnie", e.target.value)}
              placeholder="Ex. : Entreprise Exemple inc."
              className="field"
            />
          </Champ>

          <Champ id="cert-adresse" label="Adresse du client" facultatif>
            <input
              id="cert-adresse"
              type="text"
              autoComplete="street-address"
              value={form.adresse}
              maxLength={LIMITES_CERTIFICAT.adresse}
              onChange={(e) => modifier("adresse", e.target.value)}
              placeholder="Ex. : 1000, rue Exemple, Montréal (Québec)"
              className="field"
            />
          </Champ>

          <Champ id="cert-materiel" label="Matériel reçu" facultatif>
            <input
              id="cert-materiel"
              type="text"
              value={form.materiel}
              maxLength={LIMITES_CERTIFICAT.materiel}
              onChange={(e) => modifier("materiel", e.target.value)}
              placeholder="Ex. : 16 ordinateurs portables et de bureau"
              className="field"
            />
          </Champ>

          <Champ
            id="cert-nombre"
            label="Nombre d’appareils dont les données ont été détruites"
            aide="Données détruites et certifiées avec KillDisk."
          >
            <input
              id="cert-nombre"
              type="number"
              required
              min={1}
              max={LIMITES_CERTIFICAT.nbAppareils}
              step={1}
              inputMode="numeric"
              value={form.nbAppareils}
              onChange={(e) => modifier("nbAppareils", e.target.value)}
              aria-describedby="cert-nombre-aide"
              className="field sm:max-w-[180px]"
            />
          </Champ>

          <div className="grid gap-5 sm:grid-cols-2">
            <Champ
              id="cert-date-destruction"
              label="Date de la destruction"
              aide={jour ? `${jour} ${dateLongue(form.dateDestruction)}` : "Le jour s’écrit tout seul."}
            >
              <input
                id="cert-date-destruction"
                type="date"
                required
                value={form.dateDestruction}
                onChange={(e) => modifier("dateDestruction", e.target.value)}
                aria-describedby="cert-date-destruction-aide"
                className="field"
              />
            </Champ>
            <Champ id="cert-date-emission" label="Date d’émission" aide="Par défaut : aujourd’hui.">
              <input
                id="cert-date-emission"
                type="date"
                required
                value={form.dateEmission}
                onChange={(e) => modifier("dateEmission", e.target.value)}
                aria-describedby="cert-date-emission-aide"
                className="field"
              />
            </Champ>
          </div>

          {etat.type === "erreur" && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{etat.message}</span>
            </div>
          )}
          {etat.type === "ok" && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-admin-tint-green-line bg-admin-tint-green px-4 py-3 text-sm text-admin-green"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{etat.message}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-admin-line pt-5">
            <button type="submit" disabled={occupe} className="btn-primary">
              {etat.type === "travail" && etat.format === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden />
              )}
              Télécharger le PDF
            </button>
            <button
              type="button"
              disabled={occupe}
              onClick={() => void telecharger("png")}
              className="btn-secondary"
            >
              {etat.type === "travail" && etat.format === "png" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ImageDown className="h-4 w-4" aria-hidden />
              )}
              Télécharger la photo
            </button>
          </div>
          {occupe && (
            <p role="status" className="-mt-2 text-xs text-admin-muted">
              Création du fichier en haute qualité…
            </p>
          )}
        </form>

        <div className="mx-auto w-full max-w-[560px] xl:sticky xl:top-6">
          <p className="admin-eyebrow mb-3">Aperçu : ce que le client recevra</p>
          <Apercu>
            <CertificatDestruction ref={certificatRef} valeurs={valeurs} />
          </Apercu>
        </div>
      </div>

      <section className="mt-10" aria-labelledby="certificats-emis">
        <div className="mb-4">
          <h2 id="certificats-emis" className="font-display text-lg font-semibold text-admin-ink">
            Certificats émis
            {certificats.length > 0 && (
              <span className="ml-2 text-sm font-medium text-admin-muted">{certificats.length}</span>
            )}
          </h2>
          <p className="mt-1 text-sm text-admin-muted">
            Chaque téléchargement enregistre le certificat ici. Ouvre-le pour le retélécharger ou le corriger.
          </p>
        </div>

        {erreurListe && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
          >
            Liste indisponible : {erreurListe}
          </p>
        )}

        {certificats.length === 0 ? (
          <p className="admin-card px-5 py-8 text-center text-sm text-admin-muted">
            Aucun certificat pour l’instant. Le premier sera enregistré à son premier téléchargement.
          </p>
        ) : (
          <ul className="admin-card divide-y divide-admin-line overflow-hidden">
            {certificats.map((c) => (
              <li
                key={c.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5 ${
                  c.id === idOuvert ? "bg-admin-tint-green" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-sm font-semibold text-admin-ink">{c.numero}</span>
                    <span className="min-w-0 truncate text-sm text-admin-ink">{c.compagnie}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-admin-muted">
                    {c.nb_appareils} appareil{c.nb_appareils > 1 ? "s" : ""} · données détruites le{" "}
                    {dateLongue(c.date_destruction)} · émis le {dateLongue(c.date_emission)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => ouvrir(c)} disabled={occupe} className="admin-btn">
                    Ouvrir
                  </button>
                  <BoutonSupprimer
                    id={c.id}
                    numero={c.numero}
                    onSupprime={() => {
                      if (c.id === idOuvert) nouveau();
                      router.refresh();
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Champ({
  id,
  label,
  aide,
  facultatif = false,
  children,
}: {
  id: string;
  label: string;
  aide?: string;
  facultatif?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-admin-ink">
        {label}
        {facultatif && <span className="ml-1.5 font-normal text-admin-faint">(facultatif)</span>}
      </label>
      {children}
      {aide && (
        <p id={`${id}-aide`} className="mt-1.5 text-xs text-admin-muted">
          {aide}
        </p>
      )}
    </div>
  );
}

/** La feuille 816 × 1056 px, réduite à la largeur de la colonne (le nœud exporté garde sa taille réelle). */
function Apercu({ children }: { children: React.ReactNode }) {
  const boite = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState<number | null>(null);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const mesurer = () => setEchelle(el.clientWidth / LARGEUR_FEUILLE);
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  return (
    <div
      ref={boite}
      className="relative aspect-[816/1056] w-full overflow-hidden rounded-[4px] bg-white shadow-[0_24px_60px_-30px_rgba(2,6,16,0.55),0_2px_8px_rgba(2,6,16,0.12)] ring-1 ring-black/5"
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `scale(${echelle ?? 0})`, visibility: echelle ? "visible" : "hidden" }}
      >
        {children}
      </div>
    </div>
  );
}

/** Supprimer en deux clics (comme pour les lots) : « Supprimer », puis « Confirmer » dans les 3 s. */
function BoutonSupprimer({
  id,
  numero,
  onSupprime,
}: {
  id: string;
  numero: string;
  onSupprime: () => void;
}) {
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    if (!confirmer) return;
    const minuterie = setTimeout(() => setConfirmer(false), 3000);
    return () => clearTimeout(minuterie);
  }, [confirmer]);

  function clic() {
    if (!confirmer) {
      setConfirmer(true);
      return;
    }
    setErreur(null);
    demarrer(async () => {
      const res = await supprimerCertificat(id);
      if (res.ok) onSupprime();
      else setErreur(res.error);
      setConfirmer(false);
    });
  }

  return (
    <span className="flex items-center gap-2">
      {erreur && (
        <span role="alert" className="text-xs text-admin-danger">
          {erreur}
        </span>
      )}
      <button
        type="button"
        onClick={clic}
        disabled={enCours}
        aria-label={confirmer ? `Confirmer la suppression de ${numero}` : `Supprimer ${numero}`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-70 ${
          confirmer
            ? "border-admin-tint-red-line bg-admin-tint-red-strong text-admin-danger"
            : "border-admin-line-strong bg-admin-card text-admin-ink hover:border-admin-tint-red-line hover:text-admin-danger"
        }`}
      >
        {enCours ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        )}
        {confirmer ? "Confirmer" : "Supprimer"}
      </button>
    </span>
  );
}
