"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import EbayAutoSync from "@/components/admin/ebay/EbayAutoSync";
import { formatCount, formatMoney } from "@/lib/admin/format";
import type { BarreEbay, CleOngletEbay, VentesEbayAccueil } from "@/lib/admin/accueil";

/** Focus visible sur l'aplat lime (l'anneau lime habituel y serait invisible). */
const FOCUS_LIME =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#6bd63b]";

/**
 * Hauteur de la zone des barres, en pixels : 72 au moins ; à côté de la liste
 * « À faire » (carte étirée), la zone prend la place libre, jusqu'à 180.
 */
const HAUTEUR_MIN = 72;
/** La plus haute barre s'arrête à 90 % de la zone (place pour l'infobulle). */
const REMPLISSAGE = 0.9;

const commandes = (n: number) => `${formatCount(n)} commande${n > 1 ? "s" : ""}`;

/**
 * « Ventes eBay » de l'accueil : carte lime à onglets (aujourd’hui, semaine,
 * mois, année fiscale), grand chiffre, commandes et net, petit graphique de
 * barres par jour (ou par mois pour l'année). Périodes calculées dans
 * lib/admin/accueil.ts ; la synchro eBay continue en fond (variante
 * « silencieux » : rien d'affiché sauf en cas d'échec).
 */
export default function VentesEbayCarte({
  configured,
  ventes,
  lastSync,
}: {
  configured: boolean;
  ventes: VentesEbayAccueil;
  /** Dernière synchro réussie telle que rendue par le serveur */
  lastSync: string | null;
}) {
  const [actif, setActif] = useState<CleOngletEbay>("semaine");
  const uid = useId();
  const reduire = useReducedMotion();
  const onglets = useRef<Partial<Record<CleOngletEbay, HTMLButtonElement | null>>>({});

  if (!configured) {
    return (
      <section
        aria-labelledby="ventes-ebay-titre"
        className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-admin-line bg-admin-card p-5 sm:p-6"
      >
        <div>
          <h2
            id="ventes-ebay-titre"
            className="font-display text-lg font-semibold tracking-tight text-admin-ink"
          >
            Ventes eBay
          </h2>
          <p className="mt-1 text-[15px] text-admin-muted">eBay n’est pas encore connecté.</p>
        </div>
        <Link
          href="/admin/ventes-ebay"
          className="admin-focus inline-flex items-center gap-1 self-start rounded-md text-[13px] font-semibold text-admin-green hover:underline"
        >
          Connecter eBay
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>
    );
  }

  const periodes = ventes.periodes;
  const p = periodes.find((x) => x.cle === actif) ?? periodes[0];
  const idOnglet = (cle: CleOngletEbay) => `${uid}-onglet-${cle}`;
  const idPanneau = `${uid}-panneau`;

  // Motif ARIA des onglets : flèches en boucle, Début/Fin ; sélection + focus
  function clavier(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const n = periodes.length;
    let cible: number | null = null;
    if (e.key === "ArrowRight") cible = (index + 1) % n;
    else if (e.key === "ArrowLeft") cible = (index - 1 + n) % n;
    else if (e.key === "Home") cible = 0;
    else if (e.key === "End") cible = n - 1;
    if (cible === null) return;
    e.preventDefault();
    const cle = periodes[cible].cle;
    setActif(cle);
    onglets.current[cle]?.focus();
  }

  return (
    <section
      aria-labelledby="ventes-ebay-titre"
      className="flex h-full min-w-0 flex-col rounded-2xl bg-[#6bd63b] p-5 text-admin-ink sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ventes-ebay-titre" className="font-display text-lg font-semibold tracking-tight">
          Ventes eBay
        </h2>
        <div
          role="tablist"
          aria-label="Période des ventes eBay"
          className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-[#0a0a0a]/[0.08] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {periodes.map((o, i) => {
            const estActif = p ? o.cle === p.cle : false;
            return (
              <button
                key={o.cle}
                ref={(el) => {
                  onglets.current[o.cle] = el;
                }}
                type="button"
                role="tab"
                id={idOnglet(o.cle)}
                aria-selected={estActif}
                aria-controls={idPanneau}
                tabIndex={estActif ? 0 : -1}
                onClick={() => setActif(o.cle)}
                onKeyDown={(e) => clavier(e, i)}
                className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${FOCUS_LIME} ${
                  estActif ? "text-[#0a0a0a]" : "text-[#0a0a0a]/70 hover:text-[#0a0a0a]"
                }`}
              >
                {estActif && (
                  <motion.span
                    layoutId={`ventes-ebay-${uid}`}
                    aria-hidden
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    className="absolute inset-0 rounded-full bg-white"
                  />
                )}
                <span className="relative">{o.onglet}</span>
              </button>
            );
          })}
        </div>
      </div>

      {p && (
        <div
          role="tabpanel"
          id={idPanneau}
          aria-labelledby={idOnglet(p.cle)}
          className="mt-4 flex flex-1 flex-col"
        >
          <p className="text-[13px] font-medium text-admin-muted">{p.dates}</p>
          <motion.p
            key={`chiffre-${p.cle}`}
            initial={reduire ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-1 font-display text-[44px] font-semibold leading-none tracking-tight sm:text-[52px]"
          >
            {formatMoney(p.revenu)}
          </motion.p>
          <p className="mt-2 text-[14px] font-medium">
            {commandes(p.commandes)}
            {p.frais !== null ? ` · net ${formatMoney(p.revenu - p.frais)}` : ""}
          </p>
          {p.cle === "aujourdhui" && (
            <p className="mt-1 text-[13px] text-admin-muted">
              Hier : {formatMoney(ventes.hier.revenu)} · {commandes(ventes.hier.commandes)}
            </p>
          )}
          <Barres
            key={`barres-${p.cle}`}
            barres={p.barres}
            libelle={p.cle === "aujourdhui" ? "des 7 derniers jours" : p.libelle}
            reduire={Boolean(reduire)}
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link
          href={p?.href ?? "/admin/ventes-ebay"}
          className={`inline-flex items-center gap-1 rounded-md text-[13px] font-semibold hover:underline ${FOCUS_LIME}`}
        >
          Voir les ventes eBay
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <EbayAutoSync variant="silencieux" configured lastSync={lastSync} />
      </div>
    </section>
  );
}

/** Petit histogramme sans axes : une barre par jour (ou par mois). */
function Barres({
  barres,
  libelle,
  reduire,
}: {
  barres: BarreEbay[];
  /** « cette semaine », « ce mois-ci »… */
  libelle: string;
  /** Mouvement réduit : aucune animation d'entrée */
  reduire: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const [hauteurZone, setHauteurZone] = useState(HAUTEUR_MIN);
  const n = barres.length;
  const gap = n <= 8 ? "gap-2" : n <= 20 ? "gap-1" : "gap-[2px]";

  // Hauteur réelle de la zone (elle s'étire à côté de la liste « À faire »)
  useEffect(() => {
    const el = zone.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setHauteurZone(Math.max(HAUTEUR_MIN, Math.round(e.contentRect.height))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Indices des barres passées ou courantes (les futures ne s'activent pas)
  const passees = barres.flatMap((b, i) => (b.futur ? [] : [i]));
  const max = Math.max(0, ...passees.map((i) => barres[i].total));
  const hauteur = (b: BarreEbay) =>
    b.futur || max <= 0 ? 0 : Math.max(b.total > 0 ? 4 : 0, Math.round((b.total / max) * hauteurZone * REMPLISSAGE));

  const parDefaut = () => {
    const courant = passees.find((i) => barres[i].courant);
    return courant ?? (passees.length ? passees[passees.length - 1] : null);
  };

  function clavier(e: KeyboardEvent<HTMLDivElement>) {
    if (!passees.length) return;
    const depart = active ?? parDefaut();
    const pos = depart === null ? -1 : passees.indexOf(depart);
    let cible: number | null | undefined;
    if (e.key === "ArrowLeft") cible = passees[Math.max(0, pos - 1)];
    else if (e.key === "ArrowRight") cible = passees[Math.min(passees.length - 1, pos + 1)];
    else if (e.key === "Home") cible = passees[0];
    else if (e.key === "End") cible = passees[passees.length - 1];
    else if (e.key === "Escape") cible = null;
    else return;
    e.preventDefault();
    setActive(cible ?? null);
  }

  const activer = (i: number) => setActive(barres[i].futur ? null : i);

  return (
    // Prend la place libre du panneau ; le graphique reste collé en bas
    <div className="flex flex-1 flex-col justify-end pt-5">
      <div
        ref={zone}
        role="group"
        tabIndex={0}
        aria-label={`Ventes eBay ${libelle}, par ${n === 12 ? "mois" : "jour"}`}
        onFocus={() => setActive((a) => a ?? parDefaut())}
        onBlur={() => setActive(null)}
        onKeyDown={clavier}
        // Au toucher, pointerleave suit le lever du doigt : l'infobulle reste
        // alors jusqu'à la perte du focus (toucher ailleurs)
        onPointerLeave={(e) => {
          if (e.pointerType !== "touch") setActive(null);
        }}
        className={`relative flex min-h-[72px] max-h-[180px] flex-1 items-end rounded-md ${gap} ${FOCUS_LIME}`}
      >
        {barres.map((b, i) => {
          const h = hauteur(b);
          const estActive = active === i && !b.futur;
          const position = i < 2 ? "left-0" : i >= n - 2 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <div
              key={b.cle}
              onPointerEnter={() => activer(i)}
              onPointerDown={() => activer(i)}
              className="relative flex min-w-0 flex-1 items-end justify-center self-stretch"
            >
              {h > 0 ? (
                <motion.div
                  initial={reduire ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.02, 0.3), ease: "easeOut" }}
                  style={{ height: h, transformOrigin: "bottom" }}
                  className={`w-full max-w-[24px] rounded-t-[4px] transition-[height,background-color] duration-300 motion-reduce:transition-none ${
                    b.courant ? "bg-[#0a0a0a]" : estActive ? "bg-[#0a0a0a]/50" : "bg-[#0a0a0a]/30"
                  }`}
                />
              ) : (
                <div
                  className={`h-[2px] w-full max-w-[24px] rounded-full ${
                    b.futur ? "bg-[#0a0a0a]/[0.08]" : "bg-[#0a0a0a]/20"
                  }`}
                />
              )}
              {estActive && (
                <div
                  aria-hidden
                  className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-[#0a0a0a] px-2.5 py-1.5 text-[12px] leading-tight text-white shadow-lg ${position}`}
                >
                  <p className="font-semibold">
                    {formatMoney(b.total, true)}
                    <span className="font-normal text-white/70"> · {commandes(b.commandes)}</span>
                  </p>
                  <p className="text-white/70">{b.titre}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div aria-hidden className={`mt-1.5 flex ${gap}`}>
        {barres.map((b) => (
          <span
            key={b.cle}
            className={`flex min-w-0 flex-1 justify-center whitespace-nowrap text-center text-[11px] leading-none ${
              b.courant ? "font-semibold text-admin-ink" : "text-admin-muted"
            }`}
          >
            {b.etiquette}
          </span>
        ))}
      </div>

      <ul className="sr-only">
        {passees.map((i) => {
          const b = barres[i];
          return (
            <li key={b.cle}>
              {b.titre} : {formatMoney(b.total, true)}, {commandes(b.commandes)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
