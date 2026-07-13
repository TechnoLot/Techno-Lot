"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/lots", label: "Lots", icon: Package },
  { href: "/admin/lots/nouveau", label: "Nouveau lot", icon: Plus },
];

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Navigation admin">
      {items.map(({ href, label, icon: Icon }) => {
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
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent/15 text-accent-bright"
                : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <Icon
              className={`h-4 w-4 transition-colors ${
                active ? "text-accent" : "text-slate-500 group-hover:text-slate-300"
              }`}
              aria-hidden
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
