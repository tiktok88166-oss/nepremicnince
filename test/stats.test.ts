import { describe, expect, it } from "vitest";
import { analyticalPriceValues, countUniqueTransactions, median, percentile, totalValue } from "@/lib/stats";
import type { Transaction } from "@/lib/schemas";

describe("statistika", () => {
  it("izracuna mediano in percentile", () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(percentile([10, 20, 30, 40], 0.25)).toBe(17.5);
    expect(percentile([10, 20, 30, 40], 0.75)).toBe(32.5);
  });

  it("izloci null analiticne cene", () => {
    const rows = [
      transaction({ id: 1, analyticalPriceEurM2: null }),
      transaction({ id: 2, analyticalPriceEurM2: 100 }),
      transaction({ id: 3, analyticalPriceEurM2: 200 }),
    ];

    expect(analyticalPriceValues(rows)).toEqual([100, 200]);
    expect(median(analyticalPriceValues(rows))).toBe(150);
  });

  it("steje posle brez podvajanja in sesteva pogodbeno ceno samo enkrat na posel", () => {
    const rows = [transaction({ id: 1, priceEur: 100 }), transaction({ id: 1, priceEur: 100 }), transaction({ id: 2, priceEur: 50 })];

    expect(countUniqueTransactions(rows)).toBe(2);
    expect(totalValue([rows[0], rows[2]])).toBe(150);
  });
});

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    contractDate: "2025-01-01",
    contractYear: 2025,
    effectiveDate: null,
    packageYear: 2025,
    priceEur: 1,
    saleTypeCode: 1,
    saleType: "Prodaja",
    marketabilityCode: 2,
    marketability: "Tržen posel",
    actType: null,
    vatIncluded: null,
    vatRate: null,
    mainCategory: "STANOVANJE",
    analyticalUnit: "STANOVANJE",
    atomicity: "ENOSESTAVINSKI",
    quality: "A",
    qualityReason: null,
    buildingPartCount: 0,
    parcelCount: 0,
    componentCount: 1,
    buildingPartTypes: [],
    buildingPartGroups: [],
    landTypes: [],
    landGroups: [],
    cadastralMunicipalities: ["BREZOVICA"],
    cadastralMunicipalityCodes: ["1724"],
    settlements: ["Brezovica"],
    addresses: ["Naslov 1"],
    parcels: ["1/1"],
    buildingParts: [],
    allSharesFull: true,
    reportedBuildingAreaM2: null,
    soldBuildingAreaM2: null,
    soldUsableAreaM2: null,
    soldLandAreaM2: null,
    analyticalAreaM2: null,
    analyticalPriceEurM2: null,
    oldestBuildYear: null,
    newestBuildYear: null,
    coordinate: null,
    notes: null,
    ...overrides,
  };
}
