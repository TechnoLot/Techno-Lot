"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Calculator,
  ChevronDown,
  LayoutDashboard,
  Mail,
  Megaphone,
  Package,
  Plus,
  Send,
  ShoppingBag,
  TrendingUp,
  Target,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OPEN_CALCULATRICE_EVENT } from "@/components/admin/CalculatriceOverlay";

type LeafItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  action?: "open-calculatrice";
};

type NavItem = LeafItem & { children?: LeafItem[] };

type NavSection = { title: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    title: "Vue d'ensemble",
    items: [{ href: "/admin", label: "Tableau de bord", icon: LayoutDashboard }],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/pubs", label: "Publicités", icon: Megaphone },
      { href: "/admin/ebay", label: "Description eBay", icon: ShoppingBag },
    ],
  },
  {
    title: "Achats & ventes",
    items: [
      { href: "/admin/lots", label: "Lots", icon: Package },
      { href: "/admin/lots/nouveau", label: "Nouveau lot", icon: Plus },
      {
        href: "#calculatrice",
        label: "Calculatrice",
        icon: Calculator,
        action: "open-calculatrice",
      },
      { href: "/admin/ventes-ebay", label: "Ventes eBay", icon: TrendingUp },
    ],
  },
  {
    title: "Prospection",
    items: [
      {
        href: "/admin/crm",
        label: "Prospection",
        icon: Target,
        children: [
          { href: "/admin/crm/suivis", label: "Suivis à faire", icon: BellRing },
          { href: "/admin/crm/relances", label: "Relances", icon: Send },
          { href: "/admin/crm/modeles", label: "Modèles courriel", icon: Mail },
        ],
      },
      { href: "/admin/crm/clients", label: "Clients", icon: Trophy },
    ],
  },
];

const allItems = sections.flatMap((s) => s.items);

/**
 * Liste à plat de toutes les destinations (utilisée par la palette de
 * navigation ⌘K dans AdminShell).
 */
export const ADMIN_ROUTES: {
  href: string;
  label: string;
  section: string;
  icon: LucideIcon;
  action?: "open-calculatrice";
}[] = sections.flatMap((s) =>
  s.items.flatMap((it) => [
    { href: it.href, label: it.label, section: s.title, icon: it.icon, action: it.action },
    ...(it.children ?? []).map((c) => ({
      href: c.href,
      label: c.label,
      section: s.title,
      icon: c.icon,
    })),
  ]),
);

// Toutes les routes (parents + enfants) — sert au calcul du « lien le
// plus spécifique qui correspond au chemin » (évite que Prospection reste
// actif sur /admin/crm/suivis).
const allLinkHrefs = allItems.flatMap((it) =>
  it.action ? [] : [it.href, ...(it.children?.map((c) => c.href) ?? [])],
);

const spring = { type: "spring", stiffness: 480, damping: 38 } as const;

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  // Un layoutId unique par instance : la sidebar desktop et le drawer
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
    <nav className="flex flex-col gap-5 px-3" aria-label="Navigation admin">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 font-display text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            {section.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              if (item.action === "open-calculatrice") {
                return (
                  <li key={item.href}>
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
                  <li key={item.href}>
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

              const active = bestMatch === item.href;
              return (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={active}
                    onNavigate={onNavigate}
                    indicatorId={indicatorId}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function rowClass(active: boolean, nested = false) {
  return `admin-focus group relative flex w-full items-center gap-3 rounded-lg ${
    nested ? "px-3 py-[7px] text-[13px]" : "px-3 py-2 text-[13.5px]"
  } text-left font-medium transition-colors duration-150 ${
    active ? "text-white" : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-100"
  }`;
}

function iconClass(active: boolean) {
  return `relative h-[17px] w-[17px] shrink-0 transition-colors duration-150 ${
    active ? "text-accent" : "text-slate-500 group-hover:text-slate-300"
  }`;
}

function ActiveIndicator({ id }: { id: string }) {
  return (
    <motion.span
      layoutId={id}
      transition={spring}
      aria-hidden
      className="absolute inset-0 rounded-lg border border-white/[0.06] bg-white/[0.06]"
    >
      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-x-[3px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_rgba(94,203,51,0.7)]" />
    </motion.span>
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
      <item.icon className={iconClass(active)} aria-hidden />
      <span className="relative truncate">{item.label}</span>
    </Link>
  );
}

/**
 * Entrée de menu pliable : parent avec chevron, enfants indentés qui
 * apparaissent au clic. Se déplie automatiquement quand un enfant (ou le
 * parent lui-même) est la page active.
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
  const parentActive = bestMatch === item.href;
  const childActive = item.children!.some((c) => bestMatch === c.href);
  const inActiveTree =
    matches(item.href) || item.children!.some((c) => matches(c.href));

  const [open, setOpen] = useState(inActiveTree);
  useEffect(() => {
    if (inActiveTree) setOpen(true);
  }, [inActiveTree]);

  const panelId = `${indicatorId}-${item.href}`.replace(/[^a-zA-Z0-9-_]/g, "");

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <NavLink
          item={item}
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
          className={`admin-focus inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            childActive
              ? "text-accent-bright hover:bg-white/[0.04]"
              : "text-slate-500 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              open ? "" : "-rotate-90"
            }`}
            aria-hidden
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={panelId}
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="ml-[21px] flex flex-col gap-0.5 overflow-hidden border-l border-white/[0.07] pl-2"
          >
            {item.children!.map((child, i) => (
              <li key={child.href} className={i === 0 ? "pt-0.5" : ""}>
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
