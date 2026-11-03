"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Link2, Loader2, Repeat, Trash2, X } from "lucide-react";
import { chercherPourRamassage, enregistrerRamassage, supprimerRamassage } from "@/lib/ramassages/actions";
import {
  formulaireDe,
  formulaireNouveau,
  jourComplet,
  nomRamassage,
  plageHoraire,
  surPlusieursJours,
  uneHeurePlusTard,
  type FormulaireRamassage,
  type Ramassage,
  type SuggestionRamassage,
} from "@/lib/ramassages/ramassages";

/** Panneau ouvert : nouveau ramassage (jour choisi, heure si connue) ou ramassage existant ; null = fermé. */
export type Panneau =
  | { mode: "nouveau"; jour: string; heure?: string }
  | { mode: "modifier"; ramassage: Ramassage }
  | null;

type Fiche = { type: "compagnie" | "lot"; id: string; nom: string };

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Panneau latéral du formulaire (plein écran sur téléphone) : créer, modifier
 * ou supprimer un ramassage, écrit directement dans Google Agenda.
 */
export default function PanneauRamassage({
  panneau,
  onFermer,
  onTermine,
}: {
  panneau: Panneau;
  onFermer: () => void;
  /** Après un enregistrement ou une suppression réussie (message de confirmation) */
  onTermine: (message: string) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const panneauRef = useRef<HTMLDivElement>(null);
  const declencheur = useRef<HTMLElement | null>(null);
  const fermer = useRef(onFermer);
  const titreId = useId();
  const ouvert = panneau !== null;

  useEffect(() => {
    fermer.current = onFermer;
  }, [onFermer]);

  // Focus : premier champ à l'ouverture, retour à l'élément d'origine à la fermeture.
  useEffect(() => {
    if (ouvert) {
      declencheur.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const image = window.requestAnimationFrame(() =>
        panneauRef.current?.querySelector<HTMLElement>("[data-premier-champ]")?.focus(),
      );
      return () => window.cancelAnimationFrame(image);
    }
    declencheur.current?.focus();
    declencheur.current = null;
  }, [ouvert]);

  // Échap ferme + défilement de la page bloqué derrière.
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") fermer.current();
    };
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = avant;
      window.removeEventListener("keydown", onKey);
    };
  }, [ouvert]);

  /** Tab reste dans le panneau tant qu'il est ouvert. */
  function garderFocus(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !panneauRef.current) return;
    const elements = Array.from(panneauRef.current.querySelectorAll<HTMLElement>(FOCUSABLES));
    if (elements.length === 0) return;
    const premier = elements[0];
    const dernier = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === premier) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault();
      premier.focus();
    }
  }

  return (
    <AnimatePresence>
      {panneau && (
        <>
          <motion.div
            key="fond"
            aria-hidden
            onClick={onFermer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-[#0a0a0a]/40"
          />
          <motion.div
            key="panneau"
            ref={panneauRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titreId}
            onKeyDown={garderFocus}
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: reduce ? 0.15 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[80] flex flex-col bg-admin-card text-admin-ink shadow-[0_16px_40px_-16px_rgba(10,10,10,0.35)] sm:left-auto sm:w-[480px] sm:max-w-full sm:border-l sm:border-admin-line"
          >
            <Formulaire
              key={panneau.mode === "nouveau" ? `nouveau-${panneau.jour}-${panneau.heure ?? ""}` : `ramassage-${panneau.ramassage.id}`}
              panneau={panneau}
              titreId={titreId}
              onFermer={onFermer}
              onTermine={onTermine}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Formulaire({
  panneau,
  titreId,
  onFermer,
  onTermine,
}: {
  panneau: NonNullable<Panneau>;
  titreId: string;
  onFermer: () => void;
  onTermine: (message: string) => void;
}) {
  const existant = panneau.mode === "modifier" ? panneau.ramassage : null;
  const [form, setForm] = useState<FormulaireRamassage>(() =>
    existant
      ? formulaireDe(existant)
      : formulaireNouveau(panneau.mode === "nouveau" ? panneau.jour : "", panneau.mode === "nouveau" ? panneau.heure : undefined),
  );
  const [fiche, setFiche] = useState<Fiche | null>(() =>
    existant?.companyId
      ? { type: "compagnie", id: existant.companyId, nom: "" }
      : existant?.lotId
        ? { type: "lot", id: existant.lotId, nom: "" }
        : null,
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [champs, setChamps] = useState<Record<string, string>>({});
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, startTransition] = useTransition();
  const id = useId();
  // Plusieurs jours : dates modifiables seulement dans Google Agenda.
  const plusieursJours = existant ? surPlusieursJours(existant) : false;

  function maj<K extends keyof FormulaireRamassage>(cle: K, valeur: FormulaireRamassage[K]) {
    setForm((f) => ({ ...f, [cle]: valeur }));
  }

  // Une fin avant le nouveau début recule d'une heure après lui.
  function changerDebut(debut: string) {
    setForm((f) => ({ ...f, debut, fin: f.fin && f.fin > debut ? f.fin : uneHeurePlusTard(debut) }));
  }

  function choisir(s: SuggestionRamassage) {
    setFiche({ type: s.type, id: s.id, nom: s.nom });
    setForm((f) => ({
      ...f,
      client: s.nom,
      companyId: s.type === "compagnie" ? s.id : null,
      lotId: s.type === "lot" ? s.id : null,
      adresse: f.adresse.trim() ? f.adresse : s.adresse,
    }));
  }

  function retirerFiche() {
    setFiche(null);
    setForm((f) => ({ ...f, companyId: null, lotId: null }));
  }

  function enregistrer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setChamps({});
    startTransition(async () => {
      const cible = existant ? { id: existant.id, etag: existant.etag ?? "" } : null;
      const res = await enregistrerRamassage(cible, form, plusieursJours);
      if (!res.ok) {
        setErreur(res.error);
        setChamps(res.champs ?? {});
        return;
      }
      onTermine(existant ? "Ramassage modifié dans Google Agenda." : "Ramassage ajouté à Google Agenda.");
    });
  }

  function supprimer() {
    if (!existant) return;
    setErreur(null);
    startTransition(async () => {
      const res = await supprimerRamassage(existant.id, existant.etag ?? "");
      if (!res.ok) {
        setErreur(res.error);
        setConfirmer(false);
        return;
      }
      onTermine("Ramassage retiré de Google Agenda.");
    });
  }

  const lienFiche = fiche ? (fiche.type === "compagnie" ? `/admin/crm/${fiche.id}` : `/admin/lots/${fiche.id}`) : null;

  return (
    <form onSubmit={enregistrer} noValidate className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-3 border-b border-admin-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-admin-muted">{existant ? "Ramassage" : "Nouveau ramassage"}</p>
          <h2 id={titreId} className="break-words text-[16px] font-semibold text-admin-ink">
            {existant ? nomRamassage(existant) : jourComplet(form.date || (panneau.mode === "nouveau" ? panneau.jour : ""))}
          </h2>
          {existant && (
            <p className="mt-0.5 text-[13px] text-admin-muted">
              {jourComplet(existant.jour)} · {plageHoraire(existant)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="admin-focus flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-admin-muted transition-colors hover:bg-admin-page hover:text-admin-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div>
          <ChampClient
            id={`${id}-client`}
            valeur={form.client}
            erreur={champs.client}
            onSaisie={(texte) => maj("client", texte)}
            onChoix={choisir}
          />
          <p className="mt-1.5 text-xs text-admin-muted">
            {fiche && lienFiche ? (
              <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-admin-green">
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                {fiche.type === "compagnie" ? "Lié à la fiche client" : "Lié au lot"}
                {fiche.nom && <span className="font-semibold">{fiche.nom}</span>}
                <Link href={lienFiche} className="admin-focus rounded font-semibold underline-offset-2 hover:underline">
                  Ouvrir
                </Link>
                <button
                  type="button"
                  onClick={retirerFiche}
                  className="admin-focus rounded text-admin-muted underline-offset-2 hover:text-admin-ink hover:underline"
                >
                  Retirer le lien
                </button>
              </span>
            ) : (
              "Choisis un client du CRM ou un lot : l’adresse se remplit et le lien est gardé."
            )}
          </p>
        </div>

        <Champ id={`${id}-adresse`} libelle="Adresse" erreur={champs.adresse}>
          <input
            id={`${id}-adresse`}
            type="text"
            autoComplete="off"
            maxLength={300}
            value={form.adresse}
            onChange={(e) => maj("adresse", e.target.value)}
            placeholder="123 rue Principale, Laval"
            aria-invalid={champs.adresse ? true : undefined}
            className={`field ${champs.adresse ? "field-error" : ""}`}
          />
        </Champ>

        {plusieursJours && existant ? (
          <p className="rounded-xl bg-admin-subtle px-3.5 py-2.5 text-[13px] text-admin-muted">
            Ce ramassage s’étend sur plusieurs jours ({plageHoraire(existant)}) : change ses dates dans Google Agenda.
          </p>
        ) : (
          <div className="space-y-3">
            <Champ id={`${id}-date`} libelle="Date" erreur={champs.date}>
              <input
                id={`${id}-date`}
                type="date"
                required
                value={form.date}
                onChange={(e) => maj("date", e.target.value)}
                aria-invalid={champs.date ? true : undefined}
                className={`field ${champs.date ? "field-error" : ""}`}
              />
            </Champ>
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-admin-ink">
              <input
                type="checkbox"
                checked={form.journee}
                onChange={(e) => maj("journee", e.target.checked)}
                className="h-4 w-4 rounded border-admin-line-strong accent-[#257a10]"
              />
              Toute la journée (heure à confirmer)
            </label>
            {!form.journee && (
              <div className="grid grid-cols-2 gap-3">
                <Champ id={`${id}-debut`} libelle="Début" erreur={champs.debut}>
                  <input
                    id={`${id}-debut`}
                    type="time"
                    step={300}
                    required
                    value={form.debut}
                    onChange={(e) => changerDebut(e.target.value)}
                    aria-invalid={champs.debut ? true : undefined}
                    className={`field ${champs.debut ? "field-error" : ""}`}
                  />
                </Champ>
                <Champ id={`${id}-fin`} libelle="Fin" erreur={champs.fin}>
                  <input
                    id={`${id}-fin`}
                    type="time"
                    step={300}
                    required
                    value={form.fin}
                    onChange={(e) => maj("fin", e.target.value)}
                    aria-invalid={champs.fin ? true : undefined}
                    className={`field ${champs.fin ? "field-error" : ""}`}
                  />
                </Champ>
              </div>
            )}
          </div>
        )}

        {existant?.repete && (
          <p className="flex items-center gap-1.5 text-[13px] text-admin-muted">
            <Repeat className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Ramassage répété : seule cette date est modifiée.
          </p>
        )}

        <Champ
          id={`${id}-notes`}
          libelle="Notes"
          erreur={champs.notes}
          aide="Visibles dans Google Agenda : pas de renseignements personnels inutiles."
        >
          <textarea
            id={`${id}-notes`}
            rows={4}
            maxLength={2000}
            value={form.notes}
            onChange={(e) => maj("notes", e.target.value)}
            placeholder="Quantité, accès au quai, personne à demander…"
            aria-invalid={champs.notes ? true : undefined}
            aria-describedby={`${id}-notes-aide`}
            className={`field resize-y ${champs.notes ? "field-error" : ""}`}
          />
        </Champ>

        {existant?.lienGoogle && (
          <a
            href={existant.lienGoogle}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-focus inline-flex items-center gap-1.5 rounded text-[13px] font-semibold text-admin-green hover:underline"
          >
            Ouvrir dans Google Agenda
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
          </a>
        )}

        {erreur && (
          <p
            role="alert"
            className="rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-3.5 py-2.5 text-[13px] text-admin-danger"
          >
            {erreur}
          </p>
        )}
      </div>

      <footer className="border-t border-admin-line px-5 py-3">
        {confirmer ? (
          <div>
            <p className="text-[13px] font-medium text-admin-ink">Retirer ce ramassage de Google Agenda ?</p>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmer(false)} disabled={enCours} className="admin-btn">
                Annuler
              </button>
              <button
                type="button"
                onClick={supprimer}
                disabled={enCours}
                className="admin-focus inline-flex items-center gap-1.5 rounded-full border border-admin-tint-red-line bg-admin-tint-red-strong px-3.5 py-2 text-xs font-semibold text-admin-danger transition-colors disabled:opacity-70"
              >
                {enCours ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
                Oui, supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {existant && (
              <button
                type="button"
                onClick={() => setConfirmer(true)}
                disabled={enCours}
                className="admin-focus mr-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-admin-danger transition-colors hover:bg-admin-tint-red disabled:opacity-70"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Supprimer
              </button>
            )}
            <button type="button" onClick={onFermer} className="btn-secondary ml-auto !px-4 !py-2">
              Annuler
            </button>
            <button type="submit" disabled={enCours} className="btn-primary !px-4 !py-2">
              {enCours && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Enregistrer
            </button>
          </div>
        )}
      </footer>
    </form>
  );
}

/** Libellé, champ, aide et message d'erreur. */
function Champ({
  id,
  libelle,
  erreur,
  aide,
  children,
}: {
  id: string;
  libelle: string;
  erreur?: string;
  aide?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-admin-ink">
        {libelle}
      </label>
      {children}
      {aide && (
        <p id={`${id}-aide`} className="mt-1.5 text-xs text-admin-muted">
          {aide}
        </p>
      )}
      {erreur && <p className="mt-1 text-xs font-medium text-admin-danger">{erreur}</p>}
    </div>
  );
}

/**
 * Client, avec suggestions du CRM (clients d'abord) et des lots : en choisir un
 * remplit le nom (et l'adresse vide) et garde le lien vers sa fiche.
 */
function ChampClient({
  id,
  valeur,
  erreur,
  onSaisie,
  onChoix,
}: {
  id: string;
  valeur: string;
  erreur?: string;
  onSaisie: (texte: string) => void;
  onChoix: (s: SuggestionRamassage) => void;
}) {
  const [suggestions, setSuggestions] = useState<SuggestionRamassage[]>([]);
  const [ouverte, setOuverte] = useState(false);
  const [actif, setActif] = useState(-1);
  const derniereRecherche = useRef(0);
  const minuterie = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(minuterie.current), []);

  function saisir(texte: string) {
    onSaisie(texte);
    window.clearTimeout(minuterie.current);
    const recherche = texte.trim();
    const numero = ++derniereRecherche.current;
    if (recherche.length < 2) {
      setSuggestions([]);
      setOuverte(false);
      return;
    }
    minuterie.current = window.setTimeout(async () => {
      try {
        const res = await chercherPourRamassage(recherche);
        if (numero !== derniereRecherche.current) return; // une saisie plus récente a pris le relais
        setSuggestions(res);
        setActif(-1);
        setOuverte(res.length > 0);
      } catch {
        setOuverte(false);
      }
    }, 220);
  }

  function choisir(s: SuggestionRamassage) {
    derniereRecherche.current++;
    setOuverte(false);
    setSuggestions([]);
    onChoix(s);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-admin-ink">
        Client
      </label>
      <div className="relative">
        <input
          id={id}
          data-premier-champ
          type="text"
          required
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={ouverte}
          aria-controls={`${id}-liste`}
          aria-activedescendant={ouverte && actif >= 0 ? `${id}-option-${actif}` : undefined}
          aria-invalid={erreur ? true : undefined}
          value={valeur}
          maxLength={120}
          onChange={(e) => saisir(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOuverte(true);
          }}
          onBlur={() => setOuverte(false)}
          onKeyDown={(e) => {
            if (!ouverte || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActif((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActif((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
            } else if (e.key === "Enter" && actif >= 0) {
              e.preventDefault();
              choisir(suggestions[actif]);
            } else if (e.key === "Escape") {
              // Ferme la liste seulement, pas le panneau
              e.stopPropagation();
              setOuverte(false);
            }
          }}
          placeholder="Tape le nom : les clients et les lots s’affichent"
          className={`field ${erreur ? "field-error" : ""}`}
        />
        {ouverte && (
          <ul
            id={`${id}-liste`}
            role="listbox"
            aria-label="Clients et lots"
            className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-80 overflow-auto rounded-xl border border-admin-line bg-admin-card py-1 shadow-admin-pop"
          >
            {suggestions.map((s, i) => (
              <li
                key={`${s.type}-${s.id}`}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === actif}
                // mousedown : le choix passe avant que le champ perde le focus
                onMouseDown={(e) => {
                  e.preventDefault();
                  choisir(s);
                }}
                onMouseEnter={() => setActif(i)}
                className={`cursor-pointer px-3.5 py-2.5 ${i === actif ? "bg-admin-hover" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-admin-ink">{s.nom}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      s.etiquette === "Client"
                        ? "bg-admin-tint-green text-admin-green"
                        : s.type === "lot"
                          ? "bg-admin-tint-blue text-admin-tint-blue-ink"
                          : "bg-admin-tint-gray text-admin-muted"
                    }`}
                  >
                    {s.etiquette}
                  </span>
                </span>
                {s.type === "compagnie" && (
                  <span className="mt-0.5 block truncate text-xs text-admin-muted">{s.adresse || "Adresse inconnue"}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {erreur && <p className="mt-1 text-xs font-medium text-admin-danger">{erreur}</p>}
    </div>
  );
}
