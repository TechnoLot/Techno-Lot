"use client";

import { useId } from "react";
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
import { CATEGORIES, QTE_MAX, type CategorieId, type Quantites, type TextesFormulaire } from "./textes";

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
  onAnnounce: (message: string) => void;
};

/** Pastilles de catégories (bascule) + liste des quantités avec boutons –/+. */
export function Categories({ t, quantites, onChange, onAnnounce }: Props) {
  const legendId = useId();
  const listTitleId = useId();
  const choisies = CATEGORIES.filter((id) => quantites[id] !== undefined);

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
    onChange((prev) => ({ ...prev, [id]: value === null ? null : Math.min(QTE_MAX, Math.max(1, value)) }));
  }

  function pas(id: CategorieId, delta: 1 | -1) {
    onChange((prev) => ({ ...prev, [id]: Math.min(QTE_MAX, Math.max(1, (prev[id] ?? (delta > 0 ? 0 : 1)) + delta)) }));
  }

  return (
    <div className="space-y-4">
      <div role="group" aria-labelledby={legendId}>
        <p id={legendId} className="sr-only">
          {t.categoriesLegend}
        </p>
        <div className="tlf-chips">
          {CATEGORIES.map((id) => {
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

      {choisies.length > 0 && (
        <div>
          <p id={listTitleId} className="tlf-label">
            {t.quantitiesTitle}
          </p>
          <ul className="tlf-qty-list" aria-labelledby={listTitleId}>
            {choisies.map((id) => {
              const Icon = ICONES_CATEGORIES[id];
              const nom = t.categories[id];
              const q = quantites[id] ?? null;
              return (
                <li key={id} className="tlf-qty-row">
                  <span className="tlf-qty-name">
                    <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
                    <span className="min-w-0">{nom}</span>
                  </span>
                  <span className="tlf-stepper">
                    <button
                      type="button"
                      aria-label={t.decrease(nom)}
                      disabled={!q || q <= 1}
                      onClick={() => pas(id, -1)}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      maxLength={5}
                      aria-label={t.quantityLabel(nom)}
                      placeholder="?"
                      value={q ?? ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        regler(id, digits ? parseInt(digits, 10) : null);
                      }}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => {
                        // Entrée ne doit pas faire passer à l'étape suivante.
                        if (e.key === "Enter") e.preventDefault();
                      }}
                    />
                    <button
                      type="button"
                      aria-label={t.increase(nom)}
                      disabled={(q ?? 0) >= QTE_MAX}
                      onClick={() => pas(id, 1)}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </span>
                  <button
                    type="button"
                    className="tlf-icon-btn"
                    aria-label={t.removeCategory(nom)}
                    onClick={() => retirer(id)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
