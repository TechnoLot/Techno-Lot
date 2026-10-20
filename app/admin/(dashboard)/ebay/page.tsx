import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Description eBay — Admin",
  robots: { index: false, follow: false },
};

const embedSrc = "/admin/ebay/embed";

export default function EbayDescriptionPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
            Description eBay
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Colle tes photos, choisis le type et l&apos;état, puis copie le HTML
            dans l&apos;onglet HTML de la description eBay.
          </p>
        </div>
        <a
          href={embedSrc}
          target="_blank"
          rel="noopener"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-accent/40 hover:text-accent-bright"
        >
          Ouvrir en plein écran ↗
        </a>
      </header>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-night-950 shadow-card">
        <iframe
          src={embedSrc}
          title="Créateur de description eBay Techno Lot"
          allow="clipboard-write"
          className="block h-[calc(100vh-11rem)] w-full border-0"
        />
      </div>
    </div>
  );
}
