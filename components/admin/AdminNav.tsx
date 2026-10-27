"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Calculator,
  ChevronDown,
  House,
  ListOrdered,
  Mail,
  Megaphone,
  Package,
  Plus,
  Send,
  ShoppingBag,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OPEN_CALCULATRICE_EVENT } from "@/components/admin/CalculatriceOverlay";

type LeafItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  action?: "open-calculatrice";
};

/**
 * Entrée du menu. Avec `children`, c'est un groupe pliable ; `href: null`
 * = le parent ne mène nulle part par lui-même (il ne fait que déplier).
 */
type NavItem = Omit<LeafItem, "href"> & {
  href: string | null;
  children?: LeafItem[];
};

/** Menu principal : 7 entrées (version B « plus simple »). */
const items: NavItem[] = [
  { href: "/admin", label: "Accueil", icon: House },
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

const spring = { type: "spring", stiffness: 480, damping: 38 } as const;

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  // Un layoutId unique par instance : la barre latérale et le tiroir
  // mobile ont chacun leur propre indicateur animé.
  const indicatorId = `nav-indicator-${useId()}`;

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
                  <item.icon className={iconClass(false)} aria-hidden />
                  <span className="relative">{item.label}</span>
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
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function rowClass(active: boolean, nested = false) {
  return `nav-focus group relative flex w-full items-center gap-3 rounded-[10px] ${
    nested ? "px-3 py-2 text-[13.5px]" : "px-3 py-2.5 text-[14.5px]"
  } text-left font-medium transition-colors duration-150 ${
    active ? "text-[#0a0a0a]" : "text-[#cbd5e1] hover:bg-white/[0.06] hover:text-white"
  }`;
}

function iconClass(active: boolean, nested = false) {
  return `relative ${nested ? "h-4 w-4" : "h-[18px] w-[18px]"} shrink-0 transition-colors duration-150 ${
    active ? "text-[#0a0a0a]" : "text-[#94a3b8] group-hover:text-white"
  }`;
}

function ActiveIndicator({ id }: { id: string }) {
  return (
    <motion.span
      layoutId={id}
      transition={spring}
      aria-hidden
      className="absolute inset-0 rounded-[10px] bg-[#6bd63b]"
    />
  );
}

function NavLink({
  item,
  active,
  nested = false,
  onNavigate,
  indicatorId,
  className = "",
}: {
  item: LeafItem;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
  indicatorId: string;
  className?: string;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${rowClass(active, nested)} ${className}`}
    >
      {active && <ActiveIndicator id={indicatorId} />}
      <item.icon className={iconClass(active, nested)} aria-hidden />
      <span className="relative truncate">{item.label}</span>
    </Link>
  );
}

/**
 * Entrée pliable : parent (lien ou simple bouton) avec chevron, enfants
 * indentés. Se déplie automatiquement quand un enfant (ou le parent) est
 * la page active.
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
        <div className="flex items-center gap-0.5">
          <NavLink
            item={{ ...item, href: item.href }}
            active={parentActive}
            onNavigate={onNavigate}
            indicatorId={indicatorId}
            className="flex-1"
          />
          <button
            type="button"
            aria-label={open ? `Réduire ${item.label}` : `Développer ${item.label}`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className={`nav-focus inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors hover:bg-white/[0.06] ${
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
          <item.icon
            className={`relative h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
              childActive ? "text-[#6bd63b]" : "text-[#94a3b8] group-hover:text-white"
            }`}
            aria-hidden
          />
          <span className="relative flex-1 truncate">{item.label}</span>
          <span className={childActive ? "text-[#6bd63b]" : "text-[#94a3b8]"}>{chevron}</span>
        </button>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={panelId}
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="ml-[21px] flex flex-col gap-0.5 overflow-hidden border-l border-white/10 pl-2"
          >
            {children.map((child, i) => (
              <li key={child.href} className={i === 0 ? "pt-1" : ""}>
                <NavLink
                  item={child}
                  nested
                  active={bestMatch === child.href}
                  onNavigate={onNavigate}
                  indicatorId={indicatorId}
                />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
