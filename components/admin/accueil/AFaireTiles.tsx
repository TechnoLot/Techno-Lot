import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatCount } from "@/lib/admin/format";

export type AFaireTile = {
  label: string;
  /** null = compte indisponible (affiché « — ») */
  count: number | null;
  hint: string;
  /** null = tuile non cliquable (rien à ouvrir) */
  href: string | null;
};

/**
 * « À faire aujourd'hui » : tuiles cliquables avec un grand chiffre.
 * La première est mise en avant (lime, texte encre).
 */
export default function AFaireTiles({ tiles }: { tiles: AFaireTile[] }) {
  return (
    <section aria-labelledby="a-faire-titre">
      <h2
        id="a-faire-titre"
        className="mb-3 font-display text-lg font-semibold tracking-tight text-[#0a0a0a]"
      >
        À faire aujourd&apos;hui
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t, i) => {
          const featured = i === 0;
          return (
            <li key={t.label}>
              <TileWrapper href={t.href} featured={featured}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-[40px] font-semibold leading-none tracking-tight tabular-nums text-[#0a0a0a] sm:text-[44px]">
                    {t.count === null ? "—" : formatCount(t.count)}
                  </span>
                  {t.href && (
                  <ArrowUpRight
                    className={`h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
                      featured ? "text-[#0a0a0a]" : "text-[#4f5a52]"
                    }`}
                    aria-hidden
                  />
                  )}
                </div>
                <div>
                  <p className="text-[15px] font-semibold leading-snug text-[#0a0a0a]">
                    {t.label}
                  </p>
                  <p
                    className={`mt-0.5 text-[13px] leading-snug ${
                      featured ? "text-[#0a0a0a]" : "text-[#4f5a52]"
                    }`}
                  >
                    {t.hint}
                  </p>
                </div>
              </TileWrapper>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TileWrapper({
  href,
  featured,
  children,
}: {
  href: string | null;
  featured: boolean;
  children: React.ReactNode;
}) {
  const base = `flex h-full min-h-[140px] flex-col justify-between gap-4 rounded-2xl border p-4 sm:p-5 ${
    featured ? "border-[#6bd63b] bg-[#6bd63b]" : "border-[#e3eadf] bg-white"
  }`;
  if (!href) return <div className={base}>{children}</div>;
  return (
    <Link
      href={href}
      className={`admin-focus group transition-colors ${base} ${
        featured ? "hover:border-[#5ec22f] hover:bg-[#62cc33]" : "hover:border-[#c9d6c3]"
      }`}
    >
      {children}
    </Link>
  );
}
