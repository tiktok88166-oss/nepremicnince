export const comparisonStorageKey = "nepremicnince:property-comparison";
export const comparisonEvent = "nepremicnince:comparison-changed";

export type PropertyComparisonItem = {
  id: string;
  title: string;
  href: string;
  kind: string;
  municipality: string;
  areaM2: number | null;
  generalisedValueEur: number | null;
  use: string | null;
  yearBuilt: number | null;
  estimateLow: number | null;
  estimateCentral: number | null;
  estimateHigh: number | null;
  confidence: string | null;
  comparableCount: number;
};

export function readComparisonItems(storage: Pick<Storage, "getItem">) {
  try {
    const value = JSON.parse(storage.getItem(comparisonStorageKey) ?? "[]");
    return Array.isArray(value) ? value.filter(isComparisonItem).slice(0, 4) : [];
  } catch {
    return [];
  }
}

function isComparisonItem(value: unknown): value is PropertyComparisonItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PropertyComparisonItem>;
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.href === "string";
}
