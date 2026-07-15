"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, LayoutDashboard, Package, Plus } from "lucide-react";
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
        const active =
          href === "/admin"
            ? pathname === "/admin"
            : pathname === href || pathname.startsWith(href + "/");
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
