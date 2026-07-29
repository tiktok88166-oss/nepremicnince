import type { ReadonlyURLSearchParams } from "next/navigation";
import type { Transaction } from "@/lib/schemas";

export type Filters = {
  q: string;
  dateFrom: string;
  dateTo: string;
  year: string;
  category: string;
  analyticalUnit: string;
  cadastralMunicipality: string;
  settlement: string;
  quality: string;
  marketability: string;
  saleType: string;
  priceFrom: string;
  priceTo: string;
  landAreaFrom: string;
  landAreaTo: string;
  usableAreaFrom: string;
  usableAreaTo: string;
  priceM2From: string;
  priceM2To: string;
  onlyLocated: boolean;
  onlyFullShares: boolean;
};

export const defaultFilters: Filters = {
  q: "",
  dateFrom: "",
  dateTo: "",
  year: "",
  category: "",
  analyticalUnit: "",
  cadastralMunicipality: "",
  settlement: "",
  quality: "",
  marketability: "",
  saleType: "",
  priceFrom: "",
  priceTo: "",
  landAreaFrom: "",
  landAreaTo: "",
  usableAreaFrom: "",
  usableAreaTo: "",
  priceM2From: "",
  priceM2To: "",
  onlyLocated: false,
  onlyFullShares: false,
};

export const filterLabels: Record<keyof Filters, string> = {
  q: "Iskanje",
  dateFrom: "Datum od",
  dateTo: "Datum do",
  year: "Leto",
  category: "Kategorija",
  analyticalUnit: "Analitična enota",
  cadastralMunicipality: "Katastrska občina",
  settlement: "Naselje",
  quality: "Kakovost",
  marketability: "Tržnost",
  saleType: "Vrsta posla",
  priceFrom: "Cena od",
  priceTo: "Cena do",
  landAreaFrom: "Zemljišče od",
  landAreaTo: "Zemljišče do",
  usableAreaFrom: "Uporabna površina od",
  usableAreaTo: "Uporabna površina do",
  priceM2From: "EUR/m2 od",
  priceM2To: "EUR/m2 do",
  onlyLocated: "Samo z lokacijo",
  onlyFullShares: "Samo polni deleži",
};

const filterKeys = Object.keys(defaultFilters) as Array<keyof Filters>;

function numberValue(value: string) {
  const normalized = value.replace(",", ".");
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function contains(values: string[], expected: string) {
  return values.some((value) => value.toLocaleLowerCase("sl").includes(expected.toLocaleLowerCase("sl")));
}

function inRange(value: number | null, from: string, to: string) {
  const min = numberValue(from);
  const max = numberValue(to);
  if (min == null && max == null) {
    return true;
  }
  if (value == null) {
    return false;
  }
  return (min == null || value >= min) && (max == null || value <= max);
}

export function filtersFromSearchParams(searchParams: URLSearchParams | ReadonlyURLSearchParams): Filters {
  return filterKeys.reduce<Filters>((filters, key) => {
    if (key === "onlyLocated" || key === "onlyFullShares") {
      filters[key] = searchParams.get(key) === "1";
    } else {
      filters[key] = searchParams.get(key) ?? "";
    }
    return filters;
  }, { ...defaultFilters });
}

export function filtersToSearchParams(filters: Filters) {
  const params = new URLSearchParams();
  for (const key of filterKeys) {
    const value = filters[key];
    if (typeof value === "boolean") {
      if (value) {
        params.set(key, "1");
      }
    } else if (value) {
      params.set(key, value);
    }
  }
  return params;
}

export function withFilterSearch(pathname: string, filters: Filters) {
  const params = filtersToSearchParams(filters).toString();
  return params ? `${pathname}?${params}` : pathname;
}

export function filterTransactions<T extends Transaction>(transactions: T[], filters: Filters): T[] {
  const q = filters.q.trim().toLocaleLowerCase("sl");
  return transactions.filter((transaction) => {
    if (q) {
      const haystack = [
        String(transaction.id),
        transaction.contractDate,
        transaction.mainCategory,
        transaction.analyticalUnit ?? "",
        transaction.marketability ?? "",
        transaction.saleType ?? "",
        ...transaction.settlements,
        ...transaction.addresses,
        ...transaction.parcels,
        ...transaction.cadastralMunicipalities,
        ...transaction.buildingParts,
      ]
        .join(" ")
        .toLocaleLowerCase("sl");
      if (!haystack.includes(q)) {
        return false;
      }
    }

    if (filters.dateFrom && transaction.contractDate < filters.dateFrom) return false;
    if (filters.dateTo && transaction.contractDate > filters.dateTo) return false;
    if (filters.year && String(transaction.contractYear) !== filters.year) return false;
    if (filters.category && transaction.mainCategory !== filters.category) return false;
    if (filters.analyticalUnit && transaction.analyticalUnit !== filters.analyticalUnit) return false;
    if (filters.cadastralMunicipality && !contains(transaction.cadastralMunicipalities, filters.cadastralMunicipality)) return false;
    if (filters.settlement && !contains(transaction.settlements, filters.settlement)) return false;
    if (filters.quality && transaction.quality !== filters.quality) return false;
    if (filters.marketability && transaction.marketability !== filters.marketability) return false;
    if (filters.saleType && transaction.saleType !== filters.saleType) return false;
    if (!inRange(transaction.priceEur, filters.priceFrom, filters.priceTo)) return false;
    if (!inRange(transaction.soldLandAreaM2, filters.landAreaFrom, filters.landAreaTo)) return false;
    if (!inRange(transaction.soldUsableAreaM2, filters.usableAreaFrom, filters.usableAreaTo)) return false;
    if (!inRange(transaction.analyticalPriceEurM2, filters.priceM2From, filters.priceM2To)) return false;
    if (filters.onlyLocated && !transaction.coordinate) return false;
    if (filters.onlyFullShares && !transaction.allSharesFull) return false;

    return true;
  });
}
