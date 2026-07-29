import metaJson from "@/public/data/meta.json";
import summaryJson from "@/public/data/summary.json";
import rentalsJson from "@/public/data/rentals.json";
import transactionsJson from "@/public/data/transactions-enriched.json";
import {
  enrichedTransactionsSchema,
  metaSchema,
  rentalsSchema,
  summarySchema,
  type EnrichedTransaction,
} from "@/lib/schemas";

export const transactions = enrichedTransactionsSchema.parse(transactionsJson);
export const rentals = rentalsSchema.parse(rentalsJson);
export const summary = summarySchema.parse(summaryJson);
export const meta = metaSchema.parse(metaJson);

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b, "sl"),
  );
}

export const filterOptions = {
  years: [...new Set(transactions.map((item) => item.contractYear))].sort((a, b) => a - b),
  categories: uniqueSorted(transactions.map((item) => item.mainCategory)),
  analyticalUnits: uniqueSorted(transactions.map((item) => item.analyticalUnit)),
  cadastralMunicipalities: uniqueSorted(transactions.flatMap((item) => item.cadastralMunicipalities)),
  settlements: uniqueSorted(transactions.flatMap((item) => item.settlements)),
  qualities: uniqueSorted(transactions.map((item) => item.quality)),
  marketabilities: uniqueSorted(transactions.map((item) => item.marketability)),
  saleTypes: uniqueSorted(transactions.map((item) => item.saleType)),
};

export function getTransaction(id: number): EnrichedTransaction | undefined {
  return transactions.find((transaction) => transaction.id === id);
}
