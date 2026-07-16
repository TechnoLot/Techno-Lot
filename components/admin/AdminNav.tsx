"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BellRing,
  Calculator,
  ChevronRight,
  LayoutDashboard,
  Mail,
  Package,
  Plus,
  Send,
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

const items: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/lots", label: "Lots", icon: Package },
  { href: "/admin/lots/nouveau", label: "Nouveau lot", icon: Plus },
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
      { href: "/admin/crm/modeles", label: "Modèles courriel", icon: Mail },
    ],
  },
  { href: "/admin/crm/clients", label: "Clients", icon: Trophy },
];

// Toutes les routes (parents + enfants) — sert au calcul du « lien le
// plus spécifique qui correspond au chemin » (évite que Prospection reste
// actif sur /admin/crm/suivis).
const allLinkHrefs = items.flatMap((it) =>
  it.action ? [] : [it.href, ...(it.children?.map((c) => c.href) ?? [])],
);

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  const matches = (h: string) =>
    h === "/admin"
      ? pathname === "/admin"
      : pathname === h || pathname.startsWith(h + "/");

  const bestMatch = allLinkHrefs
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];

  const classNameFor = (active: boolean, nested = false) =>
    `group flex w-full items-center gap-3 rounded-xl ${nested ? "px-3 py-2 text-[13px]" : "px-3 py-2.5 text-sm"} text-left font-medium transition-colors ${
      active
        ? "bg-accent/15 text-accent-bright"
        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
    }`;

  const iconClass = (active: boolean) =>
    `h-4 w-4 transition-colors ${
      active ? "text-accent" : "text-slate-500 group-hover:text-slate-300"
    }`;

  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Navigation admin">
      {items.map((item) => {
        if (item.action === "open-calculatrice") {
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event(OPEN_CALCULATRICE_EVENT));
                onNavigate?.();
              }}
              className={classNameFor(false)}
            >
              <item.icon className={iconClass(false)} aria-hidden />
              {item.label}
            </button>
          );
        }

        if (item.children) {
          return (
            <NavGroup
              key={item.href}
              item={item}
              bestMatch={bestMatch}
              matches={matches}
              onNavigate={onNavigate}
              classNameFor={classNameFor}
              iconClass={iconClass}
            />
          );
        }

        const active = bestMatch === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={classNameFor(active)}
          >
            <item.icon className={iconClass(active)} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
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
  classNameFor,
  iconClass,
}: {
  item: NavItem;
  bestMatch: string | undefined;
  matches: (h: string) => boolean;
  onNavigate?: () => void;
  classNameFor: (active: boolean, nested?: boolean) => string;
  iconClass: (active: boolean) => string;
}) {
  const parentActive = bestMatch === item.href;
  const childActive = item.children!.some((c) => bestMatch === c.href);
  const inActiveTree =
    matches(item.href) || item.children!.some((c) => matches(c.href));

  const [open, setOpen] = useState(inActiveTree);
  useEffect(() => {
    if (inActiveTree) setOpen(true);
  }, [inActiveTree]);

  return (
    <div>
      <div className="flex items-center gap-1">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={parentActive ? "page" : undefined}
          className={`${classNameFor(parentActive)} flex-1`}
        >
          <item.icon className={iconClass(parentActive)} aria-hidden />
          {item.label}
        </Link>
        <button
          type="button"
          aria-label={open ? `Réduire ${item.label}` : `Développer ${item.label}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            childActive
              ? "text-accent-bright hover:bg-white/[0.04]"
              : "text-slate-500 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-white/5 pl-2">
          {item.children!.map((child) => {
            const active = bestMatch === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={classNameFor(active, true)}
              >
                <child.icon className={iconClass(active)} aria-hidden />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
