"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

const BASE =
  "admin-focus inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-3 text-[13px] font-medium tabular-nums transition-colors";
const COURANTE = "bg-[#6bd63b] text-[#0a0a0a] font-semibold";
const AUTRE = "border border-admin-line bg-admin-card text-admin-ink hover:border-admin-line-strong";

/** Première, dernière, courante ±1 ; null marque un trou (« … »). */
function numeros(page: number, pageCount: number): (number | null)[] {
  const garder = new Set([1, pageCount, page - 1, page, page + 1]);
  const out: (number | null)[] = [];
  for (let n = 1; n <= pageCount; n++) {
    if (!garder.has(n)) continue;
    const prev = out[out.length - 1];
    if (typeof prev === "number" && n - prev > 1) out.push(null);
    out.push(n);
  }
  return out;
}

/**
 * Pagination : liens d'URL (paramètre `param`, retiré pour la page 1) ou,
 * avec `onChange`, boutons pilotés par l'état local.
 */
export default function Pagination({
  page,
  pageCount,
  param = "page",
  scroll = true,
  onChange,
  label = "Pagination",
}: {
  page: number;
  pageCount: number;
  param?: string;
  scroll?: boolean;
  onChange?: (page: number) => void;
  label?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (pageCount <= 1) return null;

  function href(n: number): string {
    const p = new URLSearchParams(params?.toString() ?? "");
    if (n <= 1) p.delete(param);
    else p.set(param, String(n));
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function cible(n: number, className: string, children: ReactNode, current = false) {
    const ariaCurrent = current ? ("page" as const) : undefined;
    if (onChange) {
      return (
        <button type="button" onClick={() => onChange(n)} className={className} aria-current={ariaCurrent}>
          {children}
        </button>
      );
    }
    return (
      <Link href={href(n)} scroll={scroll} className={className} aria-current={ariaCurrent}>
        {children}
      </Link>
    );
  }

  const precedent = (
    <>
      <ChevronLeft className="h-4 w-4" aria-hidden />
      <span className="sr-only sm:not-sr-only">Précédent</span>
    </>
  );
  const suivant = (
    <>
      <span className="sr-only sm:not-sr-only">Suivant</span>
      <ChevronRight className="h-4 w-4" aria-hidden />
    </>
  );

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        cible(page - 1, `${BASE} ${AUTRE}`, precedent)
      ) : (
        <span aria-disabled="true" className={`${BASE} ${AUTRE} opacity-40`}>
          {precedent}
        </span>
      )}

      <span className="text-[13px] text-admin-muted tabular-nums sm:hidden">
        Page {page} sur {pageCount}
      </span>

      <span className="hidden items-center gap-1.5 sm:flex">
        {numeros(page, pageCount).map((n, i) =>
          n === null ? (
            <span key={`trou-${i}`} aria-hidden className="px-1 text-[13px] text-admin-muted">
              …
            </span>
          ) : (
            <span key={n} className="contents">
              {cible(n, `${BASE} ${n === page ? COURANTE : AUTRE}`, n, n === page)}
            </span>
          ),
        )}
      </span>

      {page < pageCount ? (
        cible(page + 1, `${BASE} ${AUTRE}`, suivant)
      ) : (
        <span aria-disabled="true" className={`${BASE} ${AUTRE} opacity-40`}>
          {suivant}
        </span>
      )}
    </nav>
  );
}
