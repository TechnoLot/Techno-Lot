import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const racine = dirname(fileURLToPath(import.meta.url));

// Tests unitaires (logique pure, côté serveur). `npm test` = `vitest run`.
export default defineConfig({
  // tsconfig garde « jsx: preserve » (Next compile le JSX) : les tests qui
  // importent un composant .tsx (ex. JsonLd, check 27) ont besoin du runtime React.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      // Même alias que tsconfig.json (« @/lib/... »).
      "@": racine,
      // Le vrai paquet lève une erreur hors des React Server Components.
      "server-only": join(racine, "tests", "vide.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
