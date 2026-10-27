import type { Config } from "tailwindcss";
import defaultColors from "tailwindcss/colors";

/* ------------------------------------------------------------------ */
/* Site public (design ILR) : jetons branchés sur des variables CSS     */
/* définies dans app/site.css (.site-root). Un `data-theme="dark"` ou   */
/* `data-theme="green"` sur une section redéfinit ces variables : les   */
/* classes text-mist, text-moss, text-emerald, bg-surface, border-line… */
/* s'inversent automatiquement. L'admin n'utilise aucun de ces noms.    */
/* ------------------------------------------------------------------ */
const tl = (name: string) => `rgb(var(--tl-${name}) / <alpha-value>)`;
/** Couleurs dont l'opacité de base varie selon le thème (ex. surface translucide sur vert). */
const tlA = (name: string) =>
  `rgb(var(--tl-${name}) / calc(<alpha-value> * var(--tl-${name}-a, 1)))`;

const siteColors = {
  paper: tl("paper"),
  cream: tl("cream"),
  sand: { DEFAULT: tl("sand"), deep: tl("sand-deep") },
  forest: { DEFAULT: tl("forest"), deep: tl("forest-deep") },
  ink: tl("ink"),
  noir: tl("ink"),
  mist: tl("mist"),
  moss: tlA("moss"),
  // Les nuances Tailwind par défaut (emerald-400, lime-300…) restent disponibles.
  emerald: { ...defaultColors.emerald, DEFAULT: tl("emerald"), soft: tlA("emerald-soft") },
  lime: { ...defaultColors.lime, DEFAULT: tl("vivid") },
  vivid: { DEFAULT: tl("vivid"), deep: tl("vivid-deep") },
  surface: { DEFAULT: tlA("surface"), 2: tlA("surface-2") },
  line: { DEFAULT: tlA("line"), strong: tlA("line-strong") },
  // Chapitres de couleur Techno Lot (fixes) : vert « argent », vert moyen, menthe
  deep: tl("deep"),
  leaf: tl("leaf"),
  mint: tl("mint"),
  // Fond des boutons principaux (vert vif ; devient encre dans data-theme="green" et "lime")
  "gradient-accent": tl("cta"),
  // Teintes du dégradé du héros d'ILR, transposées sur la teinte du logo (fixes)
  hero: {
    deep: "rgb(26 76 3 / <alpha-value>)",
    mid: "rgb(33 98 4 / <alpha-value>)",
    soft: "rgb(43 127 5 / <alpha-value>)",
    base: "rgb(54 158 7 / <alpha-value>)",
    halo: "rgb(230 252 220 / <alpha-value>)",
    "halo-2": "rgb(206 247 187 / <alpha-value>)",
  },
};

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#060A14",
          900: "#0A0F1C",
          800: "#0F1628",
          700: "#16203A",
          600: "#1F2C4D",
        },
        accent: {
          DEFAULT: "#5ECB33",
          bright: "#8BE95F",
          emerald: "#34D399",
          cyan: "#22D3EE",
        },
        ...siteColors,
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(94, 203, 51, 0.35)",
        "glow-lg": "0 0 48px rgba(94, 203, 51, 0.45)",
        card: "0 8px 32px rgba(2, 6, 16, 0.45)",
        "admin-card":
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 32px -16px rgba(2,6,16,0.8)",
        "admin-pop":
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 64px -20px rgba(2,6,16,0.9)",
        // Site public (ILR)
        "site-glow": "0 10px 30px rgba(107, 214, 59, 0.22)",
        "site-glow-lg": "0 20px 60px rgba(107, 214, 59, 0.3)",
        "site-card":
          "0 1px 2px rgba(10, 10, 10, 0.04), 0 8px 28px rgba(10, 10, 10, 0.06)",
        "site-card-dark": "0 8px 30px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(120deg, #5ECB33, #34D399)",
      },
      animation: {
        marquee: "marquee 32s linear infinite",
        aurora: "aurora 14s ease-in-out infinite alternate",
        "fade-up": "fade-up 0.5s cubic-bezier(0.21, 0.47, 0.32, 0.98) both",
        "grow-x": "grow-x 0.8s cubic-bezier(0.21, 0.47, 0.32, 0.98) both",
        // Site public (ILR) — keyframes dans app/site.css
        blob: "blob 16s ease-in-out infinite",
        "blob-slow": "blob 24s ease-in-out infinite reverse",
        float: "float 5s ease-in-out infinite",
        "scroll-hint": "scroll-hint 1.8s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        sweep: "sweep 6s ease-in-out infinite",
        "rise-in": "riseIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      keyframes: {
        "grow-x": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        aurora: {
          "0%": { transform: "translate3d(-6%, -4%, 0) scale(1)" },
          "50%": { transform: "translate3d(5%, 6%, 0) scale(1.12)" },
          "100%": { transform: "translate3d(-3%, 4%, 0) scale(1.05)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
