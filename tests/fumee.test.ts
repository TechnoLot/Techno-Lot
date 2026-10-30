import { describe, expect, it } from "vitest";

// Test de fumée : prouve que `npm test` (vitest) fonctionne.
describe("fumée", () => {
  it("vitest tourne", () => {
    expect(1 + 1).toBe(2);
  });
});
