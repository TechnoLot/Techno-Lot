"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Calculator,
  ChevronDown,
  House,
  Inbox,
  ListOrdered,
  Mail,
  Mails,
  Megaphone,
  Package,
  Plus,
  Send,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OPEN_CALCULATRICE_EVENT } from "@/components/admin/CalculatriceOverlay";
import {
  NotificationsCount,
  useNotifications,
} from "@/components/admin/notifications/NotificationsProvider";

type LeafItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  action?: "open-calculatrice";
  /** Pastille du nombre de nouveautés */
  badge?: "notifications";
};

/**
 * Entrée du menu. Avec `children`, c'est un groupe pliable ; `href: null`
 * = le parent ne mène nulle part par lui-même (il ne fait que déplier).
 */
type NavItem = Omit<LeafItem, "href"> & {
  href: string | null;
  children?: LeafItem[];
};

/** Menu principal : 9 entrées (version B « plus simple »). */
const items: NavItem[] = [
  { href: "/admin", label: "Accueil", icon: House },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
  { href: "/admin/soumissions", label: "Soumissions", icon: Inbox },
  { href: "/admin/lots", label: "Lots", icon: Package },
  {
    href: "#calculatrice",
    label: "Calculatrice",
    icon: Calculator,
    action: "open-calculatrice",
  },
  {
    href: "/admin/crm",
    label: "Prospection",
    icon: Target,
    children: [
      { href: "/admin/crm/suivis", label: "Suivis à faire", icon: BellRing },
      { href: "/admin/crm/relances", label: "Relances", icon: Send },
      { href: "/admin/crm/sequence", label: "En séquence", icon: ListOrdered },
      { href: "/admin/crm/envoi-en-gros", label: "Envoi en gros", icon: Mails },
      { href: "/admin/crm/modeles", label: "Modèles courriel", icon: Mail },
    ],
  },
  { href: "/admin/crm/clients", label: "Clients", icon: Trophy },
  { href: "/admin/pubs", label: "Publicités", icon: Megaphone },
  {
    href: null,
    label: "eBay",
    icon: Tag,
    children: [
      { href: "/admin/ventes-ebay", label: "Ventes eBay", icon: TrendingUp },
      { href: "/admin/destruction-donnees", label: "Destruction des données", icon: ShieldCheck },
      { href: "/admin/ebay", label: "Description eBay", icon: ShoppingBag },
    ],
  },
];

/** Destinations hors menu, accessibles par la recherche rapide (Ctrl K). */
const extraRoutes: { href: string; label: string; section: string; icon: LucideIcon }[] = [
  { href: "/admin/lots/nouveau", label: "Nouveau lot", section: "Lots", icon: Plus },
  { href: "/admin/compte", label: "Mon compte", section: "Compte", icon: UserRound },
];

/**
 * Liste à plat de toutes les destinations (utilisée par la palette de
 * navigation Ctrl K dans AdminShell).
 */
export const ADMIN_ROUTES: {
  href: string;
  label: string;
  section: string;
  icon: LucideIcon;
  action?: "open-calculatrice";
}[] = [
  ...items.flatMap((it) => [
    ...(it.href
      ? [{ href: it.href, label: it.label, section: "Menu", icon: it.icon, action: it.action }]
      : []),
    ...(it.children ?? []).map((c) => ({
      href: c.href,
      label: c.label,
      section: it.label,
      icon: c.icon,
    })),
  ]),
  ...extraRoutes,
];

// Toutes les routes (parents + enfants) — sert au calcul du « lien le
// plus spécifique qui correspond au chemin » (évite que Prospection reste
// actif sur /admin/crm/suivis, ou sur /admin/crm/clients).
const allLinkHrefs = items.flatMap((it) =>
  it.action
    ? []
    : [...(it.href ? [it.href] : []), ...(it.children?.map((c) => c.href) ?? [])],
);

const spring = { type: "spring", stiffness: 420, damping: 36 } as const;

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  // Un layoutId unique par instance : la barre latérale et le tiroir
  // mobile ont chacun leur propre indicateur animé.
  const indicatorId = `nav-indicator-${useId()}`;
  const unseen = useNotifications().summary?.unseen.tout ?? 0;

  const matches = (h: string) =>
    h === "/admin"
      ? pathname === "/admin"
      : pathname === h || pathname.startsWith(h + "/");

  const bestMatch = allLinkHrefs
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label="Navigation admin" className="px-3">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          if (item.action === "open-calculatrice") {
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event(OPEN_CALCULATRICE_EVENT));
                    onNavigate?.();
                  }}
                  className={rowClass(false)}
                >
                  <RowInner icon={item.icon} label={item.label} active={false} />
                </button>
              </li>
            );
          }

          if (item.children) {
            return (
              <li key={item.label}>
                <NavGroup
                  item={item}
                  bestMatch={bestMatch}
                  matches={matches}
                  onNavigate={onNavigate}
                  indicatorId={indicatorId}
                />
              </li>
            );
          }

          const href = item.href as string;
          return (
            <li key={href}>
              <NavLink
                item={{ ...item, href }}
                active={bestMatch === href}
                onNavigate={onNavigate}
                indicatorId={indicatorId}
                trailing={
                  item.badge === "notifications" && unseen > 0 ? (
                    <>
                      <NotificationsCount count={unseen} tone={bestMatch === href ? "onGreen" : "default"} />
                      <span className="sr-only">
                        {` (${unseen} nouvelle${unseen > 1 ? "s" : ""})`}
                      </span>
                    </>
                  ) : undefined
                }
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function rowClass(active: boolean, nested = false) {
  return `nav-focus group relative flex w-full items-center rounded-[12px] text-left font-medium transition-colors duration-150 ${
    nested ? "h-9 gap-2 px-2 text-[14px]" : "h-11 gap-3 px-1.5 text-[15px]"
  } ${active ? "text-[#0a0a0a]" : "text-[#cbd5e1] hover:bg-white/[0.05] hover:text-white"}`;
}

/**
 * Icône dans sa pastille + libellé. Au survol, la pastille s'éclaire et
 * l'ensemble glisse légèrement vers la droite (désactivé si mouvement réduit).
 * `tone` « lit » : un enfant du groupe est la page active.
 */
function RowInner({
  icon: Icon,
  label,
  active,
  nested = false,
  tone = "default",
  trailing,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  nested?: boolean;
  tone?: "default" | "lit";
  trailing?: React.ReactNode;
}) {
  const shift = active
    ? ""
    : "motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-[3px]";
  if (nested) {
    return (
      <span className={`relative flex min-w-0 flex-1 items-center gap-2 ${shift}`}>
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
            active ? "text-[#0a0a0a]" : "text-[#7c8aa3] group-hover:text-[#6bd63b]"
          }`}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </span>
    );
  }
  const chip = active
    ? "bg-[#0a0a0a]/[0.12] text-[#0a0a0a]"
    : tone === "lit"
      ? "bg-[#6bd63b]/15 text-[#6bd63b] ring-1 ring-inset ring-[#6bd63b]/25"
      : "bg-white/[0.06] text-[#94a3b8] ring-1 ring-inset ring-white/[0.06] group-hover:bg-[#6bd63b]/15 group-hover:text-[#6bd63b] group-hover:ring-[#6bd63b]/30";
  return (
    <span className={`relative flex min-w-0 flex-1 items-center gap-3 ${shift}`}>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors duration-150 ${chip}`}
      >
        <Icon className="h-[17px] w-[17px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </span>
  );
}

function ActiveIndicator({ id }: { id: string }) {
  return (
    <motion.span
      layoutId={id}
      transition={spring}
      aria-hidden
      className="absolute inset-0 rounded-[12px] bg-[#6bd63b] shadow-[0_6px_20px_-8px_rgba(107,214,59,0.6)]"
    />
  );
}

function NavLink({
  item,
  active,
  nested = false,
  onNavigate,
  indicatorId,
  tone = "default",
  className = "",
  trailing,
}: {
  item: LeafItem;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
  indicatorId: string;
  tone?: "default" | "lit";
  className?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${rowClass(active, nested)} ${className}`}
    >
      {active && <ActiveIndicator id={indicatorId} />}
      <RowInner
        icon={item.icon}
        label={item.label}
        active={active}
        nested={nested}
        tone={tone}
        trailing={trailing}
      />
    </Link>
  );
}

/**
 * Entrée pliable : parent (lien ou simple bouton) avec chevron, enfants
 * indentés le long d'un fil vertical discret. Se déplie automatiquement
 * quand un enfant (ou le parent) est la page active.
 */
function NavGroup({
  item,
  bestMatch,
  matches,
  onNavigate,
  indicatorId,
}: {
  item: NavItem;
  bestMatch: string | undefined;
  matches: (h: string) => boolean;
  onNavigate?: () => void;
  indicatorId: string;
}) {
  const children = item.children ?? [];
  const parentActive = item.href !== null && bestMatch === item.href;
  const childActive = children.some((c) => bestMatch === c.href);
  const inActiveTree =
    (item.href !== null && matches(item.href)) || children.some((c) => matches(c.href));

  const [open, setOpen] = useState(inActiveTree);
  useEffect(() => {
    if (inActiveTree) setOpen(true);
  }, [inActiveTree]);

  const panelId = `${indicatorId}-${item.label}`.replace(/[^a-zA-Z0-9-_]/g, "");

  const chevron = (
    <ChevronDown
      className={`h-4 w-4 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
      aria-hidden
    />
  );

  return (
    <div>
      {item.href !== null ? (
        <div className="flex items-center gap-1">
          <NavLink
            item={{ ...item, href: item.href }}
            active={parentActive}
            onNavigate={onNavigate}
            indicatorId={indicatorId}
            tone={childActive ? "lit" : "default"}
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            aria-label={open ? `Réduire ${item.label}` : `Développer ${item.label}`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className={`nav-focus inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-[12px] transition-colors hover:bg-white/[0.06] ${
              childActive ? "text-[#6bd63b]" : "text-[#94a3b8] hover:text-white"
            }`}
          >
            {chevron}
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={rowClass(false)}
        >
          <RowInner
            icon={item.icon}
            label={item.label}
            active={false}
            tone={childActive ? "lit" : "default"}
            trailing={
              <span className={`pr-1.5 ${childActive ? "text-[#6bd63b]" : "text-[#94a3b8]"}`}>
                {chevron}
              </span>
            }
          />
        </button>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="overflow-hidden"
          >
            <ul className="relative ml-[21px] flex flex-col gap-0.5 py-1 pl-2 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-px before:rounded-full before:bg-gradient-to-b before:from-white/15 before:via-white/10 before:to-transparent">
              {children.map((child) => (
                <li key={child.href}>
                  <NavLink
                    item={child}
                    nested
                    active={bestMatch === child.href}
                    onNavigate={onNavigate}
                    indicatorId={indicatorId}
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
