/**
 * Fond de hero animé : halos de couleur flous (GPU-friendly, transform only)
 * + grille technique subtile. Les animations sont neutralisées par la règle
 * globale prefers-reduced-motion.
 */
export default function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Grille technique */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
        }}
      />
      {/* Halos animés — uniquement le vert du logo, en douceur */}
      <div
        className="aurora-blob animate-aurora bg-accent/15"
        style={{ width: 520, height: 520, top: "-15%", left: "8%" }}
      />
      <div
        className="aurora-blob animate-aurora bg-accent/10"
        style={{
          width: 460,
          height: 460,
          top: "10%",
          right: "0%",
          animationDelay: "-7s",
        }}
      />
      <div
        className="aurora-blob animate-aurora bg-accent-emerald/10"
        style={{
          width: 380,
          height: 380,
          bottom: "-25%",
          left: "35%",
          animationDelay: "-3.5s",
        }}
      />
    </div>
  );
}
