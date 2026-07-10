import type { Config } from "tailwindcss";

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
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(94, 203, 51, 0.35)",
        "glow-lg": "0 0 48px rgba(94, 203, 51, 0.45)",
        card: "0 8px 32px rgba(2, 6, 16, 0.45)",
      },
      backgroundImage: {
        "accent-gradient":
          "linear-gradient(120deg, #5ECB33, #34D399, #22D3EE)",
      },
      animation: {
        marquee: "marquee 32s linear infinite",
        aurora: "aurora 14s ease-in-out infinite alternate",
      },
      keyframes: {
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
