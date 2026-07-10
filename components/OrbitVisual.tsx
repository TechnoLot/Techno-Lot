import {
  Cpu,
  HardDrive,
  Leaf,
  Monitor,
  Recycle,
  Server,
  Smartphone,
} from "lucide-react";

const chip =
  "flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-night-800/90 shadow-card backdrop-blur-md";

/**
 * Visuel orbital : icônes d'équipements en rotation autour du symbole
 * de l'économie circulaire. Animations CSS pures (GPU), neutralisées
 * par prefers-reduced-motion.
 */
export default function OrbitVisual() {
  return (
    <div className="glass relative flex aspect-square items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(94,203,51,0.14), transparent 60%)",
        }}
        aria-hidden
      />

      {/* Centre : économie circulaire */}
      <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-accent/10 shadow-glow ring-1 ring-accent/40">
        <Recycle className="h-12 w-12 text-accent" strokeWidth={1.4} aria-hidden />
      </div>

      {/* Anneau intérieur */}
      <div
        className="orbit-spin absolute h-[56%] w-[56%] rounded-full border border-white/10"
        aria-hidden
      >
        {[
          { Icon: Leaf, style: { top: "0%", left: "50%" } },
          { Icon: Cpu, style: { top: "75%", left: "93.3%" } },
          { Icon: Smartphone, style: { top: "75%", left: "6.7%" } },
        ].map(({ Icon, style }, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={style}
          >
            <div className={`orbit-item ${chip}`}>
              <Icon className="h-5 w-5 text-accent" />
            </div>
          </div>
        ))}
      </div>

      {/* Anneau extérieur */}
      <div
        className="orbit-spin-reverse absolute h-[86%] w-[86%] rounded-full border border-white/5"
        aria-hidden
      >
        {[
          { Icon: Server, style: { top: "25%", left: "93.3%" } },
          { Icon: Monitor, style: { top: "100%", left: "50%" } },
          { Icon: HardDrive, style: { top: "25%", left: "6.7%" } },
        ].map(({ Icon, style }, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={style}
          >
            <div className={`orbit-item ${chip}`}>
              <Icon className="h-5 w-5 text-accent-bright" />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-7 left-8 right-8 z-10 text-center">
        <p className="font-display text-lg font-semibold text-white">
          Économie circulaire
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Prolonger la vie du matériel, réduire les déchets électroniques.
        </p>
      </div>
    </div>
  );
}
