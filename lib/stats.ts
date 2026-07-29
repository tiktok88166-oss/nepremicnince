import type { Transaction } from "@/lib/schemas";

export type DistributionPoint = {
  key: string;
  count: number;
};

export type YearPoint = {
  year: number;
  count: number;
  medianPrice: number | null;
  medianPriceM2: number | null;
  samplePriceM2: number;
};

export function median(values: number[]) {
  return percentile(values, 0.5);
}

export function percentile(values: number[], fraction: number) {
  const cleanValues = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (cleanValues.length === 0) {
    return null;
  }
  if (fraction <= 0) {
    return cleanValues[0] ?? null;
  }
  if (fraction >= 1) {
    return cleanValues[cleanValues.length - 1] ?? null;
  }
  const index = (cleanValues.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  const lowerValue = cleanValues[lower];
  const upperValue = cleanValues[upper];
  if (lowerValue == null || upperValue == null) {
    return null;
  }
  return lowerValue + (upperValue - lowerValue) * weight;
}

export function priceValues(transactions: Transaction[]) {
  return transactions.map((transaction) => transaction.priceEur).filter((value) => Number.isFinite(value));
}

export function analyticalPriceValues(transactions: Transaction[]) {
  return transactions
    .map((transaction) => transaction.analyticalPriceEurM2)
    .filter((value): value is number => value != null && Number.isFinite(value));
}

export function totalValue(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => sum + transaction.priceEur, 0);
}

export function distributionBy(transactions: Transaction[], getKeys: (transaction: Transaction) => string[]) {
  const counts = new Map<string, number>();
  for (const transaction of transactions) {
    const keys = getKeys(transaction);
    const safeKeys = keys.length > 0 ? keys : ["Ni podatka"];
    for (const key of safeKeys) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function yearlySeries(transactions: Transaction[]): YearPoint[] {
  const years = [...new Set(transactions.map((transaction) => transaction.contractYear))].sort((a, b) => a - b);
  return years.map((year) => {
    const rows = transactions.filter((transaction) => transaction.contractYear === year);
    const m2Values = analyticalPriceValues(rows);
    return {
      year,
      count: rows.length,
      medianPrice: median(priceValues(rows)),
      medianPriceM2: median(m2Values),
      samplePriceM2: m2Values.length,
    };
  });
}

export function monthlySeries(transactions: Transaction[]) {
  const counts = new Map<string, number>();
  for (const transaction of transactions) {
    const month = transaction.contractDate.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export function countUniqueTransactions(transactions: Transaction[]) {
  return new Set(transactions.map((transaction) => transaction.id)).size;
}
