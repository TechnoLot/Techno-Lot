"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
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

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  action?: "open-calculatrice";
};

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
  { href: "/admin/crm", label: "Prospection", icon: Target },
  { href: "/admin/crm/clients", label: "Clients", icon: Trophy },
  { href: "/admin/crm/relances", label: "Relances", icon: Send },
  { href: "/admin/crm/modeles", label: "Modèles courriel", icon: Mail },
];

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  const classNameFor = (active: boolean) =>
    `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
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
      {items.map(({ href, label, icon: Icon, action }) => {
        if (action === "open-calculatrice") {
          return (
            <button
              key={href}
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event(OPEN_CALCULATRICE_EVENT));
                onNavigate?.();
              }}
              className={classNameFor(false)}
            >
              <Icon className={iconClass(false)} aria-hidden />
              {label}
            </button>
          );
        }
        // Le lien le plus spécifique qui correspond au chemin gagne
        // (évite que "Prospection" reste actif sur /admin/crm/relances).
        const matches = (h: string) =>
          h === "/admin"
            ? pathname === "/admin"
            : pathname === h || pathname.startsWith(h + "/");
        const bestMatch = items
          .filter((it) => !it.action && matches(it.href))
          .sort((a, b) => b.href.length - a.href.length)[0];
        const active = bestMatch?.href === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={classNameFor(active)}
          >
            <Icon className={iconClass(active)} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
