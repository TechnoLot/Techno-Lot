import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMetaInsights, pageSuivanteMeta } from "@/lib/ads/meta";

/**
 * F5 (revue check 26) : la pagination Meta ne suit `paging.next` que vers
 * https://graph.facebook.com ; le jeton passe dans l'en-tête Authorization,
 * jamais dans l'URL.
 */

const JETON = "jeton-de-test-meta-0123456789";
const PERIODE = { since: "2026-10-01", until: "2026-10-02" };

function ligne(adId: string) {
  return { ad_id: adId, date_start: "2026-10-01", impressions: "10", spend: "1.5" };
}

function reponse(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchSimule: ReturnType<typeof vi.fn>;
let avertissement: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("META_ACCESS_TOKEN", JETON);
  vi.stubEnv("META_AD_ACCOUNT_ID", "act_123456");
  fetchSimule = vi.fn();
  vi.stubGlobal("fetch", fetchSimule);
  avertissement = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  avertissement.mockRestore();
});

function appel(i: number): { url: string; init: RequestInit } {
  const [url, init] = fetchSimule.mock.calls[i] as [string, RequestInit];
  return { url, init };
}

describe("pageSuivanteMeta", () => {
  it("accepte https://graph.facebook.com et retire access_token", () => {
    const u = pageSuivanteMeta(
      "https://graph.facebook.com/v21.0/act_1/insights?after=abc&access_token=SECRET&limit=500",
    );
    expect(u).not.toBeNull();
    expect(u).not.toContain("access_token");
    expect(u).not.toContain("SECRET");
    expect(u).toContain("after=abc");
    expect(new URL(u!).hostname).toBe("graph.facebook.com");
  });

  it.each([
    "http://graph.facebook.com/v21.0/act_1/insights?after=abc",
    "https://evil.example/v21.0/act_1/insights",
    "https://graph.facebook.com.evil.example/x",
    "https://evilgraph.facebook.com/x",
    "https://GRAPH.facebook.com@evil.example/x",
    "https://user:pass@graph.facebook.com/x",
    "https://graph.facebook.com:8443/x",
    "//graph.facebook.com/x",
    "javascript:alert(1)",
    "pas une url",
    "",
  ])("refuse %s", (next) => {
    expect(pageSuivanteMeta(next)).toBeNull();
  });

  it("refuse une valeur qui n'est pas une chaîne", () => {
    expect(pageSuivanteMeta(undefined)).toBeNull();
    expect(pageSuivanteMeta(42)).toBeNull();
    expect(pageSuivanteMeta({ href: "https://graph.facebook.com/x" })).toBeNull();
  });

  it("accepte l'hôte en majuscules (normalisé par URL)", () => {
    expect(pageSuivanteMeta("https://GRAPH.FACEBOOK.COM/v21.0/x")).toBe(
      "https://graph.facebook.com/v21.0/x",
    );
  });
});

describe("fetchMetaInsights", () => {
  it("envoie le jeton dans l'en-tête Authorization, jamais dans l'URL", async () => {
    fetchSimule.mockResolvedValueOnce(reponse({ data: [ligne("a1")] }));
    const lignes = await fetchMetaInsights(PERIODE);
    expect(lignes).toHaveLength(1);
    expect(fetchSimule).toHaveBeenCalledTimes(1);
    const { url, init } = appel(0);
    expect(new URL(url).hostname).toBe("graph.facebook.com");
    expect(new URL(url).protocol).toBe("https:");
    expect(url).not.toContain("access_token");
    expect(url).not.toContain(JETON);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${JETON}`);
  });

  it("suit paging.next sur graph.facebook.com (sans access_token dans l'URL)", async () => {
    fetchSimule
      .mockResolvedValueOnce(
        reponse({
          data: [ligne("a1")],
          paging: {
            next: `https://graph.facebook.com/v21.0/act_123456/insights?after=p2&access_token=${JETON}`,
          },
        }),
      )
      .mockResolvedValueOnce(reponse({ data: [ligne("a2")] }));
    const lignes = await fetchMetaInsights(PERIODE);
    expect(lignes.map((l) => l.ad_id)).toEqual(["a1", "a2"]);
    expect(fetchSimule).toHaveBeenCalledTimes(2);
    const { url, init } = appel(1);
    expect(url).toContain("after=p2");
    expect(url).not.toContain(JETON);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${JETON}`);
    expect(avertissement).not.toHaveBeenCalled();
  });

  it("s'arrête proprement (sans appel ni jeton) si paging.next vise un autre hôte", async () => {
    fetchSimule.mockResolvedValueOnce(
      reponse({
        data: [ligne("a1")],
        paging: { next: "https://evil.example/collecte?after=p2&secret=x" },
      }),
    );
    const lignes = await fetchMetaInsights(PERIODE);
    expect(lignes.map((l) => l.ad_id)).toEqual(["a1"]);
    expect(fetchSimule).toHaveBeenCalledTimes(1);
    expect(avertissement).toHaveBeenCalledTimes(1);
    const message = String(avertissement.mock.calls[0]?.[0]);
    expect(message).toContain("Pagination arrêtée");
    expect(message).toContain("https://evil.example");
    expect(message).not.toContain("secret=x");
    expect(message).not.toContain(JETON);
  });

  it("s'arrête si paging.next est en http", async () => {
    fetchSimule.mockResolvedValueOnce(
      reponse({ data: [ligne("a1")], paging: { next: "http://graph.facebook.com/v21.0/x?after=p2" } }),
    );
    const lignes = await fetchMetaInsights(PERIODE);
    expect(lignes).toHaveLength(1);
    expect(fetchSimule).toHaveBeenCalledTimes(1);
    expect(avertissement).toHaveBeenCalledTimes(1);
  });

  it("sans paging.next : une seule requête, aucun avertissement", async () => {
    fetchSimule.mockResolvedValueOnce(reponse({ data: [] }));
    await expect(fetchMetaInsights(PERIODE)).resolves.toEqual([]);
    expect(fetchSimule).toHaveBeenCalledTimes(1);
    expect(avertissement).not.toHaveBeenCalled();
  });
});
