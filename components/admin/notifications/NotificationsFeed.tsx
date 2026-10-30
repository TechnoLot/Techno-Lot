"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ExternalLink,
  Package,
  Phone,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { WEBMAIL_URL } from "@/lib/admin/config";
import { formatCount, formatMoney } from "@/lib/admin/format";
import {
  FILTRES_NOTIFICATIONS,
  SOURCE_LABELS,
  countByFiltre,
  matchesFiltre,
  type FiltreNotifications,
  type NotifCounts,
  type NotifSoumission,
  type NotifVenteEbay,
  type NotificationItem,
} from "@/lib/admin/notifications-types";
import { PERIODES_NOTIFICATIONS, estRetiree, sansRetirees } from "@/lib/admin/notifications-regles";
import { libellePeriode, type PeriodeKey } from "@/lib/admin/periodes";
import { paginer } from "@/lib/admin/pagination";
import { PlatformIcon } from "@/components/admin/ads/PlatformBadge";
import PeriodeSelect from "@/components/admin/PeriodeSelect";
import Pagination from "@/components/admin/Pagination";
import { PastilleIcone } from "./apparence";
import { useNotifications } from "./NotificationsProvider";
import { messageErreurApi } from "@/lib/admin/message-erreur";

const TZ = "America/Toronto";
/** Recalcul des « il y a X min ». */
const TICK_MS = 30_000;
/** Notifications par page, dans le filtre choisi. */
const PAR_PAGE = 20;
/** « Tout effacer » se ré-arme après 4 s sans confirmation. */
const CONFIRMATION_MS = 4000;

const ONGLETS: Record<FiltreNotifications, string> = {
  tout: "Tout",
  ebay: "Ventes eBay",
  soumissions: "Soumissions",
  pubs: "Leads des pubs",
};

const VIDE: Record<FiltreNotifications, string> = {
  tout: "Rien sur cette période. Les ventes eBay, les soumissions et les leads des pubs arriveront ici tout seuls.",
  ebay: "Aucune vente eBay sur cette période.",
  soumissions: "Aucune soumission sur cette période.",
  pubs: "Aucun lead venu d’une pub Meta ou Google sur cette période.",
};
const VIDE_EFFACE = "Rien de nouveau pour l’instant. Les prochaines ventes et demandes apparaîtront ici.";

const STATUT: Record<NotifVenteEbay["status"]["tone"], string> = {
  ok: "bg-admin-tint-green text-admin-tint-green-ink",
  warn: "bg-admin-tint-amber text-admin-tint-amber-ink",
  bad: "bg-admin-tint-red-strong text-admin-danger",
  neutral: "bg-admin-tint-gray text-admin-muted",
};

const jourFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const heureFmt = new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const jourLongFmt = new Intl.DateTimeFormat("fr-CA", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});
const completFmt = new Intl.DateTimeFormat("fr-CA", { dateStyle: "long", timeStyle: "short", timeZone: TZ });

/** « Aujourd’hui », « Hier », sinon « Mardi 27 octobre ». */
function libelleJour(jour: string, now: number): string {
  if (jour === jourFmt.format(new Date(now))) return "Aujourd’hui";
  if (jour === jourFmt.format(new Date(now - 86_400_000))) return "Hier";
  const texte = jourLongFmt.format(new Date(`${jour}T12:00:00Z`));
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** « à l’instant », « il y a 12 min », sinon l’heure. */
function moment(iso: string, now: number): string {
  const min = Math.floor((now - Date.parse(iso)) / 60_000);
  if (min < 1) return "à l’instant";
  if (min < 60) return `il y a ${min} min`;
  return heureFmt.format(new Date(iso));
}

/** Regroupe par jour (le fil arrive déjà trié, plus récent d’abord). */
function parJour(items: NotificationItem[]): { jour: string; items: NotificationItem[] }[] {
  const groupes: { jour: string; items: NotificationItem[] }[] = [];
  for (const it of items) {
    const jour = jourFmt.format(new Date(it.at));
    const dernier = groupes[groupes.length - 1];
    if (dernier?.jour === jour) dernier.items.push(it);
    else groupes.push({ jour, items: [it] });
  }
  return groupes;
}

async function poster(body: unknown): Promise<void> {
  const r = await fetch("/api/admin/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    throw new Error(messageErreurApi(await r.json().catch(() => ({})), r.status));
  }
}

/**
 * Fil des notifications : période, filtres, regroupement par jour, 20 par
 * page, nouveautés mises en avant. Ouvrir l’onglet marque tout comme vu (la
 * pastille du menu retombe à zéro) mais les nouveautés restent en vert
 * pendant la visite ; le fil se recharge dès que la pastille voit arriver
 * quelque chose. Retirer une notification ne touche pas à la vente ou à la
 * demande, qui reste dans son onglet.
 */
export default function NotificationsFeed({
  items,
  counts,
  latest,
  renderedAt,
  clearedAt,
  periode,
  filtreInitial,
  courrielApi,
}: {
  items: NotificationItem[];
  counts: NotifCounts;
  /** Arrivée la plus récente du fil affiché */
  latest: string | null;
  /** Instant du rendu serveur (ISO) */
  renderedAt: string;
  /** Dernier « Tout effacer » (ISO), null : jamais */
  clearedAt: string | null;
  periode: PeriodeKey;
  filtreInitial: FiltreNotifications;
  /** Mail API Hostinger branchée : « Ouvrir dans Hostinger » arrive sur le courriel de la demande */
  courrielApi: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const { summary, markSeen, refresh } = useNotifications();
  const [filtre, setFiltre] = useState<FiltreNotifications>(filtreInitial);
  const [page, setPage] = useState(1);
  // Même valeur au rendu serveur et à l’hydratation, puis l’heure du navigateur.
  const [now, setNow] = useState(() => Date.parse(renderedAt));
  const layoutId = `notif-filtre-${useId()}`;
  const haut = useRef<HTMLDivElement>(null);

  // Retraits optimistes : la carte part tout de suite, revient si le serveur refuse.
  const [retirees, setRetirees] = useState<Set<string>>(() => new Set());
  const [effaceJusqua, setEffaceJusqua] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const rearme = useRef<number | null>(null);

  // Nouveautés en vert pendant toute la visite, même une fois marquées comme vues.
  const [enAvant, setEnAvant] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.isNew).map((i) => i.key)),
  );
  useEffect(() => {
    setEnAvant((prev) => {
      const ajout = items.filter((i) => i.isNew && !prev.has(i.key));
      if (ajout.length === 0) return prev;
      const next = new Set(prev);
      for (const i of ajout) next.add(i.key);
      return next;
    });
  }, [items]);

  // Onglet visible : tout ce qui est affiché est vu.
  const marque = useRef<string | null>(null);
  useEffect(() => {
    const marquer = () => {
      if (document.visibilityState !== "visible" || marque.current === renderedAt) return;
      marque.current = renderedAt;
      void markSeen(renderedAt);
    };
    marquer();
    document.addEventListener("visibilitychange", marquer);
    return () => document.removeEventListener("visibilitychange", marquer);
  }, [renderedAt, markSeen]);

  // Arrivée plus récente que le fil affiché : on le recharge (une fois par arrivée).
  const rechargePour = useRef<string | null>(null);
  useEffect(() => {
    const l = summary?.latest;
    if (!l || rechargePour.current === l) return;
    if (latest && Date.parse(l) <= Date.parse(latest)) return;
    rechargePour.current = l;
    router.refresh();
  }, [summary?.latest, latest, router]);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Nouvelle période : retour à la première page.
  useEffect(() => {
    setPage(1);
  }, [periode]);

  useEffect(
    () => () => {
      if (rearme.current !== null) window.clearTimeout(rearme.current);
    },
    [],
  );

  function choisir(f: FiltreNotifications) {
    setFiltre(f);
    setPage(1);
    const params = new URLSearchParams(window.location.search);
    if (f === "tout") params.delete("filtre");
    else params.set("filtre", f);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  function changerPage(n: number) {
    setPage(n);
    haut.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  async function retirer(it: NotificationItem) {
    setErreur(null);
    setRetirees((prev) => new Set(prev).add(it.key));
    try {
      await poster({ action: "retirer", keys: [it.key] });
      void refresh();
    } catch (e) {
      setRetirees((prev) => {
        const next = new Set(prev);
        next.delete(it.key);
        return next;
      });
      setErreur(
        `La notification n’a pas pu être retirée${e instanceof Error ? ` (${e.message})` : ""}. Réessaie.`,
      );
    }
  }

  async function toutEffacer() {
    setErreur(null);
    const avant = effaceJusqua;
    setEffaceJusqua(renderedAt);
    try {
      await poster({ action: "effacer", upTo: renderedAt });
      void refresh();
    } catch (e) {
      setEffaceJusqua(avant);
      setErreur(`Le fil n’a pas pu être effacé${e instanceof Error ? ` (${e.message})` : ""}. Réessaie.`);
    }
  }

  function clicEffacer() {
    if (rearme.current !== null) window.clearTimeout(rearme.current);
    rearme.current = null;
    if (!confirmer) {
      setConfirmer(true);
      rearme.current = window.setTimeout(() => {
        rearme.current = null;
        setConfirmer(false);
      }, CONFIRMATION_MS);
      return;
    }
    setConfirmer(false);
    void toutEffacer();
  }

  const restants = useMemo(() => sansRetirees(items, retirees, effaceJusqua), [items, retirees, effaceJusqua]);
  // Comptes du serveur, moins ce qui vient d’être retiré ici.
  const comptes = useMemo(() => {
    const partis = countByFiltre(items.filter((i) => estRetiree(i, retirees, effaceJusqua)));
    const out = { ...counts };
    for (const f of FILTRES_NOTIFICATIONS) out[f] = Math.max(0, counts[f] - partis[f]);
    return out;
  }, [items, counts, retirees, effaceJusqua]);
  const visibles = useMemo(() => restants.filter((i) => matchesFiltre(i, filtre)), [restants, filtre]);
  const pagee = paginer(visibles, page, PAR_PAGE);
  const nouveautes = restants.filter((i) => enAvant.has(i.key)).length;
  const legende = libellePeriode(periode);
  const vide =
    restants.length === 0 && (effaceJusqua !== null || clearedAt !== null) ? VIDE_EFFACE : VIDE[filtre];

  const sortie = reduce
    ? { opacity: 0, transition: { duration: 0 } }
    : { opacity: 0, height: 0, paddingTop: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } };

  return (
    <div ref={haut} className="scroll-mt-20 lg:scroll-mt-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <PeriodeSelect current={periode} options={PERIODES_NOTIFICATIONS} />
        <p className="text-[13px] text-admin-muted">{legende.charAt(0).toUpperCase() + legende.slice(1)}</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-admin-muted" aria-live="polite">
          {nouveautes > 0 ? (
            <>
              <span className="font-semibold text-admin-ink">
                {formatCount(nouveautes)} nouveauté{nouveautes > 1 ? "s" : ""}
              </span>{" "}
              depuis ta dernière visite
            </>
          ) : (
            "Rien de nouveau depuis ta dernière visite."
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Filtrer les notifications" className="admin-segment">
            {FILTRES_NOTIFICATIONS.map((f) => {
              const active = filtre === f;
              const aDuNouveau = restants.some((i) => enAvant.has(i.key) && matchesFiltre(i, f));
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => choisir(f)}
                  className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card ${
                    active ? "text-admin-ink" : "text-admin-muted hover:text-admin-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={layoutId}
                      aria-hidden
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      className="absolute inset-0 rounded-full bg-[#6bd63b]"
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    {ONGLETS[f]}
                    <span className="tabular-nums opacity-70">{formatCount(comptes[f])}</span>
                    {aDuNouveau && !active && (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4fae2a]" aria-hidden />
                        <span className="sr-only">, nouveautés</span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={clicEffacer}
            title="Retire toutes les notifications actuelles du fil ; les ventes, soumissions et leads restent dans leurs onglets"
            className={`admin-focus inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              confirmer
                ? "border-admin-tint-red-line bg-admin-tint-red-strong text-admin-danger"
                : "border-admin-line bg-admin-card text-admin-muted hover:border-admin-tint-red-line hover:text-admin-danger"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {confirmer ? "Confirmer" : "Tout effacer"}
          </button>
        </div>
      </div>

      {erreur && (
        <p
          role="alert"
          className="mb-6 flex gap-2 rounded-2xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{erreur}</span>
        </p>
      )}

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-admin-line bg-admin-card px-5 py-12 text-center">
          <Bell className="mx-auto h-7 w-7 text-admin-faint" aria-hidden />
          <p className="mx-auto mt-2 max-w-sm text-sm text-admin-muted">{vide}</p>
        </div>
      ) : (
        <>
          {/* Nouvelle page ou nouveau filtre : liste neuve, sans animation de sortie. */}
          <div key={`${periode}-${filtre}-${pagee.page}`} className="flex flex-col">
            <AnimatePresence initial={false}>
              {parJour(pagee.items).map((g) => {
                const titre = libelleJour(g.jour, now);
                return (
                  <motion.section
                    key={g.jour}
                    aria-label={titre}
                    exit={sortie}
                    className="overflow-hidden pt-8 first:pt-0"
                  >
                    <h2 className="mb-3 flex items-baseline gap-2 font-display text-lg font-semibold tracking-tight text-admin-ink">
                      {titre}
                      <span className="text-[13px] font-normal tabular-nums text-admin-muted">
                        {formatCount(g.items.length)}
                      </span>
                    </h2>
                    <ul className="flex flex-col">
                      <AnimatePresence initial={false}>
                        {g.items.map((it) => (
                          <motion.li key={it.key} exit={sortie} className="overflow-hidden pt-3 first:pt-0">
                            {it.kind === "vente-ebay" ? (
                              <Vente
                                v={it}
                                nouveau={enAvant.has(it.key)}
                                now={now}
                                onRetirer={() => void retirer(it)}
                              />
                            ) : (
                              <Soumission
                                s={it}
                                nouveau={enAvant.has(it.key)}
                                now={now}
                                courrielApi={courrielApi}
                                onRetirer={() => void retirer(it)}
                              />
                            )}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </motion.section>
                );
              })}
            </AnimatePresence>
          </div>
          {pagee.pageCount > 1 && (
            <div className="mt-8">
              <Pagination
                page={pagee.page}
                pageCount={pagee.pageCount}
                onChange={changerPage}
                label="Pages des notifications"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Carte d’une notification : pastille d’icône, liseré vert si nouvelle. */
function Carte({
  item,
  nouveau,
  children,
}: {
  item: NotificationItem;
  nouveau: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`relative flex gap-3.5 overflow-hidden rounded-2xl border bg-admin-card p-4 sm:gap-4 sm:p-5 ${
        nouveau ? "border-admin-tint-green-line" : "border-admin-line"
      }`}
    >
      {nouveau && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[#6bd63b]" />}
      <PastilleIcone item={item} />
      <div className="min-w-0 flex-1">{children}</div>
    </article>
  );
}

/** Ligne du haut : type et provenance à gauche ; « Nouveau », l’heure et le retrait à droite. */
function EnTete({
  label,
  at,
  now,
  nouveau,
  onRetirer,
}: {
  label: React.ReactNode;
  at: string;
  now: number;
  nouveau: boolean;
  onRetirer: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-medium text-admin-muted">
        {label}
      </div>
      <div className="-my-1 flex shrink-0 items-center gap-2">
        {nouveau && (
          <span className="rounded-full bg-[#6bd63b] px-2 py-0.5 text-[11px] font-semibold text-[#0a0a0a]">
            Nouveau
          </span>
        )}
        <time
          dateTime={at}
          title={completFmt.format(new Date(at))}
          className="whitespace-nowrap text-[12.5px] tabular-nums text-admin-muted"
        >
          {moment(at, now)}
        </time>
        <button
          type="button"
          onClick={onRetirer}
          aria-label="Retirer cette notification"
          title="Retirer du fil (la vente ou la demande reste dans son onglet)"
          className="admin-focus -mr-1.5 flex h-7 w-7 items-center justify-center rounded-full text-admin-muted transition-colors hover:bg-admin-page hover:text-admin-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Vente({
  v,
  nouveau,
  now,
  onRetirer,
}: {
  v: NotifVenteEbay;
  nouveau: boolean;
  now: number;
  onRetirer: () => void;
}) {
  const montant = `${formatMoney(v.total, true)}${v.currency !== "CAD" ? ` ${v.currency}` : ""}`;
  const details = [
    v.others > 0
      ? `+ ${v.others} autre${v.others > 1 ? "s" : ""} article${v.others > 1 ? "s" : ""}`
      : v.quantity > 1
        ? `Quantité : ${v.quantity}`
        : null,
    v.buyer ? `Acheteur : ${v.buyer}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Carte item={v} nouveau={nouveau}>
      <EnTete
        at={v.at}
        now={now}
        nouveau={nouveau}
        onRetirer={onRetirer}
        label={
          <>
            <span>Vente eBay</span>
            <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${STATUT[v.status.tone]}`}>
              {v.status.label}
            </span>
          </>
        }
      />
      <p className="mt-1 break-words text-[15.5px] font-semibold leading-snug text-admin-ink">
        <span className={`tabular-nums ${v.counted ? "text-admin-green" : "text-admin-muted line-through"}`}>
          {montant}
        </span>
        <span className="font-normal text-admin-faint"> · </span>
        {v.title}
      </p>
      {details && <p className="mt-0.5 text-[13.5px] text-admin-muted">{details}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/admin/ventes-ebay" className="admin-btn">
          Ventes eBay
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        {v.itemUrl && (
          <a href={v.itemUrl} target="_blank" rel="noopener noreferrer" className="admin-btn">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Voir l’annonce
          </a>
        )}
      </div>
    </Carte>
  );
}

function Soumission({
  s,
  nouveau,
  now,
  courrielApi,
  onRetirer,
}: {
  s: NotifSoumission;
  nouveau: boolean;
  now: number;
  courrielApi: boolean;
  onRetirer: () => void;
}) {
  const pub = s.pub;
  const sousTitre = [s.entreprise, s.ville].filter(Boolean).join(" · ");
  const contact = [s.courriel, s.telephone].filter(Boolean).join(" · ");

  return (
    <Carte item={s} nouveau={nouveau}>
      <EnTete
        at={s.at}
        now={now}
        nouveau={nouveau}
        onRetirer={onRetirer}
        label={
          <>
            <span>Soumission</span>
            {pub ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-admin-tint-violet px-2 py-0.5 text-[11.5px] font-semibold text-admin-tint-violet-ink">
                <PlatformIcon platform={pub.platform} className="h-3 w-3" />
                Pub {pub.platform === "meta" ? "Meta" : "Google"}
                {pub.network ? ` · ${pub.network}` : ""}
              </span>
            ) : s.source ? (
              <span className="rounded-full bg-admin-tint-gray px-2 py-0.5 text-[11.5px] font-medium text-admin-muted">
                {SOURCE_LABELS[s.source]}
              </span>
            ) : null}
          </>
        }
      />
      <p className="mt-1 break-words text-[15.5px] font-semibold leading-snug text-admin-ink">{s.nom}</p>
      {sousTitre && <p className="mt-0.5 text-[13.5px] text-admin-muted">{sousTitre}</p>}
      {contact && <p className="mt-0.5 break-all text-[13px] text-admin-muted">{contact}</p>}
      {pub && (
        <p className="mt-1 text-[13px] text-admin-muted">
          Pub :{" "}
          <Link
            href={pub.href}
            className="admin-focus rounded font-medium text-admin-ink hover:text-admin-green hover:underline"
          >
            {pub.name ? `« ${pub.name} »` : "voir ses résultats"}
          </Link>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {s.telephone && (
          <a href={`tel:${s.telephone.replace(/[^\d+]/g, "")}`} className="admin-btn">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Appeler
          </a>
        )}
        {(s.soumissionId || s.courriel) && (
          <a
            href={
              courrielApi && s.soumissionId
                ? `/api/admin/soumissions/${s.soumissionId}/courriel/hostinger`
                : WEBMAIL_URL
            }
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn"
            title="Ouvre le courriel dans le webmail Hostinger (info@technolot.ca), dans un nouvel onglet"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Ouvrir dans Hostinger
          </a>
        )}
        {s.soumissionId &&
          (s.lotId ? (
            <Link href={`/admin/lots/${s.lotId}`} className="admin-btn">
              <Package className="h-3.5 w-3.5" aria-hidden />
              Voir le lot
            </Link>
          ) : (
            <Link href={`/admin/lots/nouveau?soumission=${s.soumissionId}`} className="admin-btn-accent">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Créer le lot
            </Link>
          ))}
        {s.soumissionId && (
          <Link
            href={`/admin/soumissions?q=${encodeURIComponent(s.courriel ?? s.nom)}`}
            className="admin-btn"
          >
            Voir la demande
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </Carte>
  );
}
