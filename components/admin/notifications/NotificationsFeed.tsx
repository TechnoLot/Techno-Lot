"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CircleDollarSign,
  ExternalLink,
  Inbox,
  Mail,
  Megaphone,
  Package,
  Phone,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { formatCount, formatMoney } from "@/lib/admin/format";
import {
  FILTRES_NOTIFICATIONS,
  SOURCE_LABELS,
  matchesFiltre,
  type FiltreNotifications,
  type NotifCounts,
  type NotifSoumission,
  type NotifVenteEbay,
  type NotificationItem,
} from "@/lib/admin/notifications-types";
import { PlatformIcon } from "@/components/admin/ads/PlatformBadge";
import { useNotifications } from "./NotificationsProvider";

const TZ = "America/Toronto";
/** Recalcul des « il y a X min ». */
const TICK_MS = 30_000;

const ONGLETS: Record<FiltreNotifications, string> = {
  tout: "Tout",
  ebay: "Ventes eBay",
  soumissions: "Soumissions",
  pubs: "Leads des pubs",
};

const VIDE: Record<FiltreNotifications, string> = {
  tout: "Rien depuis 30 jours. Les ventes eBay, les soumissions et les leads des pubs arriveront ici tout seuls.",
  ebay: "Aucune vente eBay depuis 30 jours.",
  soumissions: "Aucune soumission depuis 30 jours.",
  pubs: "Aucun lead venu d’une pub Meta ou Google depuis 30 jours.",
};

const SUJET = "Votre demande de soumission — Techno Lot";

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

/**
 * Fil des notifications : filtres, regroupement par jour, nouveautés mises
 * en avant. Ouvrir l’onglet marque tout comme vu (la pastille du menu
 * retombe à zéro) mais les nouveautés restent en vert pendant la visite ; le
 * fil se recharge dès que la pastille voit arriver quelque chose.
 */
export default function NotificationsFeed({
  items,
  counts,
  latest,
  renderedAt,
  filtreInitial,
}: {
  items: NotificationItem[];
  counts: NotifCounts;
  /** Arrivée la plus récente du fil affiché */
  latest: string | null;
  /** Instant du rendu serveur (ISO) */
  renderedAt: string;
  filtreInitial: FiltreNotifications;
}) {
  const router = useRouter();
  const { summary, markSeen } = useNotifications();
  const [filtre, setFiltre] = useState<FiltreNotifications>(filtreInitial);
  // Même valeur au rendu serveur et à l’hydratation, puis l’heure du navigateur.
  const [now, setNow] = useState(() => Date.parse(renderedAt));
  const layoutId = `notif-filtre-${useId()}`;

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

  function choisir(f: FiltreNotifications) {
    setFiltre(f);
    const params = new URLSearchParams(window.location.search);
    if (f === "tout") params.delete("filtre");
    else params.set("filtre", f);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  const visibles = useMemo(() => items.filter((i) => matchesFiltre(i, filtre)), [items, filtre]);
  const nouveautes = items.filter((i) => enAvant.has(i.key)).length;

  return (
    <div>
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
        <div role="tablist" aria-label="Filtrer les notifications" className="admin-segment">
          {FILTRES_NOTIFICATIONS.map((f) => {
            const active = filtre === f;
            const aDuNouveau = items.some((i) => enAvant.has(i.key) && matchesFiltre(i, f));
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
                  <span className="tabular-nums opacity-70">{formatCount(counts[f])}</span>
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
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-admin-line bg-admin-card px-5 py-12 text-center">
          <Bell className="mx-auto h-7 w-7 text-admin-faint" aria-hidden />
          <p className="mx-auto mt-2 max-w-sm text-sm text-admin-muted">{VIDE[filtre]}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {parJour(visibles).map((g) => {
            const titre = libelleJour(g.jour, now);
            return (
              <section key={g.jour} aria-label={titre}>
                <h2 className="mb-3 flex items-baseline gap-2 font-display text-lg font-semibold tracking-tight text-admin-ink">
                  {titre}
                  <span className="text-[13px] font-normal tabular-nums text-admin-muted">
                    {formatCount(g.items.length)}
                  </span>
                </h2>
                <ul className="flex flex-col gap-3">
                  {g.items.map((it) => (
                    <li key={it.key}>
                      {it.kind === "vente-ebay" ? (
                        <Vente v={it} nouveau={enAvant.has(it.key)} now={now} />
                      ) : (
                        <Soumission s={it} nouveau={enAvant.has(it.key)} now={now} />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Carte d’une notification : pastille d’icône, liseré vert si nouvelle. */
function Carte({
  nouveau,
  tint,
  icon: Icon,
  children,
}: {
  nouveau: boolean;
  tint: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`relative flex gap-3.5 overflow-hidden rounded-2xl border bg-admin-card p-4 sm:gap-4 sm:p-5 ${
        nouveau ? "border-admin-tint-green-line" : "border-admin-line"
      }`}
    >
      {nouveau && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[#6bd63b]" />}
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </article>
  );
}

/** Ligne du haut : type et provenance à gauche, « Nouveau » et l’heure à droite. */
function EnTete({
  label,
  at,
  now,
  nouveau,
}: {
  label: React.ReactNode;
  at: string;
  now: number;
  nouveau: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-medium text-admin-muted">
        {label}
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
      </div>
    </div>
  );
}

function Vente({ v, nouveau, now }: { v: NotifVenteEbay; nouveau: boolean; now: number }) {
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
    <Carte nouveau={nouveau} tint="bg-admin-tint-green text-admin-tint-green-ink" icon={CircleDollarSign}>
      <EnTete
        at={v.at}
        now={now}
        nouveau={nouveau}
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

function Soumission({ s, nouveau, now }: { s: NotifSoumission; nouveau: boolean; now: number }) {
  const pub = s.pub;
  const sousTitre = [s.entreprise, s.ville].filter(Boolean).join(" · ");
  const contact = [s.courriel, s.telephone].filter(Boolean).join(" · ");

  return (
    <Carte
      nouveau={nouveau}
      tint={pub ? "bg-admin-tint-violet text-admin-tint-violet-ink" : "bg-admin-tint-blue text-admin-tint-blue-ink"}
      icon={pub ? Megaphone : Inbox}
    >
      <EnTete
        at={s.at}
        now={now}
        nouveau={nouveau}
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
        {s.courriel && (
          <a href={`mailto:${s.courriel}?subject=${encodeURIComponent(SUJET)}`} className="admin-btn">
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Écrire
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
