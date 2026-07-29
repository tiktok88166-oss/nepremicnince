import { describe, expect, it } from "vitest";
import { defaultFilters, filterTransactions, filtersFromSearchParams, filtersToSearchParams } from "@/lib/filters";
import { transactions } from "@/lib/data";

describe("filtri", () => {
  it("filtrira po letu, kategoriji in kakovosti", () => {
    const filtered = filterTransactions(transactions, {
      ...defaultFilters,
      year: "2025",
      category: "STAVBNO ZEMLJIŠČE",
      quality: "B",
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((row) => row.contractYear === 2025)).toBe(true);
    expect(filtered.every((row) => row.mainCategory === "STAVBNO ZEMLJIŠČE")).toBe(true);
    expect(filtered.every((row) => row.quality === "B")).toBe(true);
  });

  it("filtrira po iskanju in razponu cene", () => {
    const target = transactions.find((row) => row.parcels.length > 0);
    expect(target).toBeDefined();
    const filtered = filterTransactions(transactions, {
      ...defaultFilters,
      q: target?.parcels[0] ?? "",
      priceFrom: String((target?.priceEur ?? 0) - 1),
      priceTo: String((target?.priceEur ?? 0) + 1),
    });

    expect(filtered.some((row) => row.id === target?.id)).toBe(true);
  });

  it("ohrani filtre v URL parametrih", () => {
    const params = filtersToSearchParams({ ...defaultFilters, year: "2024", onlyLocated: true });
    const parsed = filtersFromSearchParams(params);

    expect(params.toString()).toContain("year=2024");
    expect(parsed.year).toBe("2024");
    expect(parsed.onlyLocated).toBe(true);
  });
});
