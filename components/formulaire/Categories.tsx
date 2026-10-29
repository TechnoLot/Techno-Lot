"use client";

import { memo, useId, useRef } from "react";
import {
  Boxes,
  Check,
  HardDrive,
  Laptop,
  Minus,
  Monitor,
  Network,
  PcCase,
  Plus,
  Printer,
  Server,
  TabletSmartphone,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  AUTRE_NOM_MAX,
  AUTRES_MAX,
  CATEGORIES,
  QTE_MAX,
  type Autre,
  type CategorieId,
  type Quantites,
  type TextesFormulaire,
} from "./textes";

export const ICONES_CATEGORIES: Record<CategorieId, LucideIcon> = {
  portables: Laptop,
  bureau: PcCase,
  ecrans: Monitor,
  serveurs: Server,
  reseau: Network,
  stockage: HardDrive,
  mobiles: TabletSmartphone,
  imprimantes: Printer,
  autre: Boxes,
};

type Props = {
  t: TextesFormulaire;
  quantites: Quantites;
  /** Mise à jour fonctionnelle (setState) : aucun clic rapide n'est perdu. */
  onChange: (update: (prev: Quantites) => Quantites) => void;
  /** Lignes « Autre » : matériel écrit par le client, autant de lignes qu'il faut. */
  autres: Autre[];
  onAutresChange: (update: (prev: Autre[]) => Autre[]) => void;
  onAnnounce: (message: string) => void;
};

const borne = (v: number) => Math.min(QTE_MAX, Math.max(1, v));

/** Champ de quantité avec boutons –/+ (vide = quantité à préciser). */
function Stepper({
  value,
  label,
  decrease,
  increase,
  onSet,
  onStep,
}: {
  value: number | null;
  label: string;
  decrease: string;
  increase: string;
  onSet: (value: number | null) => void;
  onStep: (delta: 1 | -1) => void;
}) {
  return (
    <span className="tlf-stepper">
      <button type="button" aria-label={decrease} disabled={!value || value <= 1} onClick={() => onStep(-1)}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={5}
        aria-label={label}
        placeholder="?"
        value={value ?? ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onSet(digits ? parseInt(digits, 10) : null);
        }}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          // Entrée ne doit pas faire passer à l'étape suivante.
          if (e.key === "Enter") e.preventDefault();
        }}
      />
      <button type="button" aria-label={increase} disabled={(value ?? 0) >= QTE_MAX} onClick={() => onStep(1)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </span>
  );
}

/**
 * Pastilles de catégories (bascule) + liste des quantités avec boutons –/+.
 * La pastille « Autre » ajoute à chaque clic une ligne où le client écrit lui-même
 * le matériel (ex. processeurs, cartes graphiques), avec sa propre quantité.
 * Mémorisé : rendu de nouveau seulement quand ses quantités ou lignes changent.
 */
export const Categories = memo(function Categories({ t, quantites, onChange, autres, onAutresChange, onAnnounce }: Props) {
  const legendId = useId();
  const listTitleId = useId();
  const seq = useRef(0);
  const choisies = CATEGORIES.filter((id) => id !== "autre" && quantites[id] !== undefined);
  const autreChipId = `${legendId}-autre`;
  const autreInputId = (aid: string) => `${legendId}-autre-${aid}`;

  function sans(prev: Quantites, id: CategorieId): Quantites {
    const next = { ...prev };
    delete next[id];
    return next;
  }

  function basculer(id: CategorieId) {
    const on = quantites[id] !== undefined;
    onChange((prev) => (on ? sans(prev, id) : { ...prev, [id]: prev[id] ?? 1 }));
    onAnnounce(on ? t.categoryRemoved(t.categories[id]) : t.categoryAdded(t.categories[id]));
  }

  function retirer(id: CategorieId) {
    onChange((prev) => sans(prev, id));
    onAnnounce(t.categoryRemoved(t.categories[id]));
    // Le bouton disparaît : on rend le focus à la pastille correspondante.
    requestAnimationFrame(() => document.getElementById(`${legendId}-${id}`)?.focus());
  }

  function regler(id: CategorieId, value: number | null) {
    onChange((prev) => ({ ...prev, [id]: value === null ? null : borne(value) }));
  }

  function pas(id: CategorieId, delta: 1 | -1) {
    onChange((prev) => ({ ...prev, [id]: borne((prev[id] ?? (delta > 0 ? 0 : 1)) + delta) }));
  }

  // ------------------------------ « Autre » ------------------------------

  function ajouterAutre() {
    if (autres.length >= AUTRES_MAX) return;
    const aid = `a${Date.now().toString(36)}${++seq.current}`;
    onAutresChange((prev) => (prev.length >= AUTRES_MAX ? prev : [...prev, { id: aid, nom: "", qte: 1 }]));
    onAnnounce(t.otherAdded);
    // Focus dans le champ du nom : le client écrit tout de suite ce que c'est.
    requestAnimationFrame(() => document.getElementById(autreInputId(aid))?.focus());
  }

  function modifierAutre(aid: string, patch: Partial<Omit<Autre, "id">>) {
    onAutresChange((prev) => prev.map((a) => (a.id === aid ? { ...a, ...patch } : a)));
  }

  function pasAutre(aid: string, delta: 1 | -1) {
    onAutresChange((prev) =>
      prev.map((a) => (a.id === aid ? { ...a, qte: borne((a.qte ?? (delta > 0 ? 0 : 1)) + delta) } : a)),
    );
  }

  function retirerAutre(aid: string) {
    onAutresChange((prev) => prev.filter((a) => a.id !== aid));
    onAnnounce(t.otherRemoved);
    requestAnimationFrame(() => document.getElementById(autreChipId)?.focus());
  }

  const AutreIcon = ICONES_CATEGORIES.autre;

  return (
    <div className="space-y-4">
      <div role="group" aria-labelledby={legendId}>
        <p id={legendId} className="sr-only">
          {t.categoriesLegend}
        </p>
        <div className="tlf-chips">
          {CATEGORIES.map((id) => {
            if (id === "autre") {
              return (
                <button
                  key={id}
                  id={autreChipId}
                  type="button"
                  className="tlf-chip tlf-chip--ajout"
                  disabled={autres.length >= AUTRES_MAX}
                  onClick={ajouterAutre}
                >
                  <span className="tlf-chip-mark" aria-hidden="true">
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  {t.otherChip}
                </button>
              );
            }
            const Icon = ICONES_CATEGORIES[id];
            const on = quantites[id] !== undefined;
            return (
              <button
                key={id}
                id={`${legendId}-${id}`}
                type="button"
                className="tlf-chip"
                aria-pressed={on}
                onClick={() => basculer(id)}
              >
                <span className="tlf-chip-mark" aria-hidden="true">
                  {on ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                </span>
                {t.categories[id]}
              </button>
            );
          })}
        </div>
      </div>

      {(choisies.length > 0 || autres.length > 0) && (
        <div>
          <p id={listTitleId} className="tlf-label">
            {t.quantitiesTitle}
          </p>
          <ul className="tlf-qty-list" aria-labelledby={listTitleId}>
            {choisies.map((id) => {
              const Icon = ICONES_CATEGORIES[id];
              const nom = t.categories[id];
              return (
                <li key={id} className="tlf-qty-row">
                  <span className="tlf-qty-name">
                    <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
                    <span className="min-w-0">{nom}</span>
                  </span>
                  <Stepper
                    value={quantites[id] ?? null}
                    label={t.quantityLabel(nom)}
                    decrease={t.decrease(nom)}
                    increase={t.increase(nom)}
                    onSet={(v) => regler(id, v)}
                    onStep={(d) => pas(id, d)}
                  />
                  <button type="button" className="tlf-icon-btn" aria-label={t.removeCategory(nom)} onClick={() => retirer(id)}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}

            {autres.map((a, i) => {
              const nom = a.nom.trim() || t.otherFallback(i + 1);
              return (
                <li key={a.id} className="tlf-qty-row tlf-qty-row--autre">
                  <span className="tlf-qty-name">
                    <AutreIcon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
                    <input
                      id={autreInputId(a.id)}
                      type="text"
                      className="tlf-autre-input"
                      autoComplete="off"
                      maxLength={AUTRE_NOM_MAX}
                      aria-label={t.otherNameLabel(i + 1)}
                      placeholder={t.otherPlaceholder}
                      value={a.nom}
                      onChange={(e) => modifierAutre(a.id, { nom: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                    />
                  </span>
                  <Stepper
                    value={a.qte}
                    label={t.quantityLabel(nom)}
                    decrease={t.decrease(nom)}
                    increase={t.increase(nom)}
                    onSet={(v) => modifierAutre(a.id, { qte: v === null ? null : borne(v) })}
                    onStep={(d) => pasAutre(a.id, d)}
                  />
                  <button type="button" className="tlf-icon-btn" aria-label={t.removeCategory(nom)} onClick={() => retirerAutre(a.id)}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>

          {autres.length > 0 && autres.length < AUTRES_MAX && (
            <button type="button" className="tlf-ajout-autre" onClick={ajouterAutre}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.otherAdd}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
