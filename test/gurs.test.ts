import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGursOrthoWmsUrl } from "@/lib/gurs";

describe("GURS ortofoto WMS", () => {
  it("uses the advertised EPSG:3794 projection and encoded layer", () => {
    const url = buildGursOrthoWmsUrl();
    expect(url).toContain("LAYERS=SI.GURS.ZPDZ%3ADOF050");
    expect(url).toContain("SRS=EPSG%3A3794");
    expect(url).toContain("BBOX={bbox-epsg-3794}");
    expect(url).toContain("VERSION=1.1.1");
  });

  it("keeps the GURS attribution in the methodology", () => {
    const methodology = readFileSync(join(process.cwd(), "app", "metodologija", "page.tsx"), "utf8");
    expect(methodology).toContain("Geodetska uprava Republike Slovenije, državni ortofoto DOF050");
  });
});

describe("public data privacy", () => {
  it("reports a passed forbidden-field scan", () => {
    const report = JSON.parse(readFileSync(join(process.cwd(), "public", "data", "quality", "data-quality-report.json"), "utf8"));
    expect(report.forbiddenPersonalFieldScan.status).toBe("passed");
    expect(report.forbiddenPersonalFieldScan.fieldsChecked).toBe(8);
  });

  it("keeps conflicting shares out of valuation ratios", () => {
    const transactions = JSON.parse(readFileSync(join(process.cwd(), "public", "data", "transactions-enriched.json"), "utf8"));
    const reviewRows = transactions.filter((transaction: { valuationReviewRequired: boolean }) => transaction.valuationReviewRequired);
    expect(reviewRows.length).toBeGreaterThan(0);
    for (const transaction of reviewRows) {
      expect(transaction.priceToCurrentGeneralisedValueRatio).toBeNull();
      expect(transaction.transactionCurrentGeneralisedValueEur).toBeNull();
      expect(transaction.valuationReviewReasons.length).toBeGreaterThan(0);
    }
  });

  it("limits web-geometry area changes and omits duplicate catalogs", () => {
    const report = JSON.parse(readFileSync(join(process.cwd(), "public", "data", "quality", "data-quality-report.json"), "utf8"));
    expect(report.geometrySimplification.maximumAreaDifferencePercent).toBeLessThanOrEqual(0.5);
    expect(report.geometrySimplification.fallbackToOriginalGeometryCount).toBeGreaterThan(0);
    expect(existsSync(join(process.cwd(), "public", "data", "catalog", "parcels.json"))).toBe(false);
    expect(existsSync(join(process.cwd(), "public", "data", "catalog", "buildings.json"))).toBe(false);
    expect(existsSync(join(process.cwd(), "public", "data", "catalog", "spaces.json"))).toBe(false);
  });

  it("does not interpolate source data into map HTML", () => {
    const mapView = readFileSync(join(process.cwd(), "components", "MapView.tsx"), "utf8");
    const orthoMap = readFileSync(join(process.cwd(), "components", "GursOrthoMap.tsx"), "utf8");
    expect(`${mapView}${orthoMap}`).not.toContain(".setHTML(");
    expect(`${mapView}${orthoMap}`).not.toContain("dangerouslySetInnerHTML");
  });
});
