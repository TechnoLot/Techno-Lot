import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculatrice de lot — Admin",
  robots: { index: false, follow: false },
};

export default function CalculatricePage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
            Calculatrice de lot
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Estime la valeur d'un lot, calcule l'offre à payer et envoie le
            devis au client.
          </p>
        </div>
        <a
          href="/admin/calculatrice/embed"
          target="_blank"
          rel="noopener"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-accent/40 hover:text-accent-bright"
        >
          Ouvrir en plein écran ↗
        </a>
      </header>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-night-950 shadow-card">
        <iframe
          src="/admin/calculatrice/embed"
          title="Calculatrice de lot TechnoLot"
          className="block h-[calc(100vh-11rem)] w-full border-0"
        />
      </div>
    </div>
  );
}
