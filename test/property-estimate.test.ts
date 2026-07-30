import { describe, expect, it } from "vitest";
import { analyseComparableSales, type ComparableSource } from "@/lib/property-estimate";

const now = new Date("2026-07-30T12:00:00Z");

describe("indikativna ocena nepremicnine", () => {
  it("izracuna kvartilni razpon in stopnjo zaupanja", () => {
    const rows = [1000, 1100, 1200, 1300, 1400, 1500].map((price, index) => comparable({
      price_eur_m2: price,
      sold_area_m2: 95 + index,
      distance_m: 200 + index * 100,
      contract_date: `202${5 - (index % 2)}-01-15`,
    }));

    const result = analyseComparableSales(rows, 100, now);

    expect(result.estimate).toMatchObject({ low: 113000, central: 125000, high: 138000, confidence: "srednja", sampleSize: 6 });
    expect(result.comparables[0].reasons.some((reason) => reason.text === "Zelo podobna površina")).toBe(true);
  });

  it("ne prikaze ocene pri premajhnem vzorcu", () => {
    const rows = [1000, 1100, 1200].map((price) => comparable({ price_eur_m2: price }));
    expect(analyseComparableSales(rows, 80, now).estimate).toBeNull();
  });

  it("novejso in blizjo prodajo razvrsti visje", () => {
    const result = analyseComparableSales([
      comparable({ distance_m: 1900, contract_date: "2018-01-01" }),
      comparable({ distance_m: 250, contract_date: "2026-01-01" }),
    ], 100, now);

    expect(result.comparables[0].distance_m).toBe(250);
    expect(result.comparables[0].score).toBeGreaterThan(result.comparables[1].score);
  });
});

function comparable(overrides: Partial<ComparableSource> = {}): ComparableSource {
  return {
    price_eur_m2: 1200,
    sold_area_m2: 100,
    distance_m: 500,
    contract_date: "2025-01-01",
    ...overrides,
  };
}
