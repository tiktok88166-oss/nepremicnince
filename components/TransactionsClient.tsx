"use client";

import { FilterPanel } from "@/components/FilterPanel";
import { TransactionsTable } from "@/components/TransactionsTable";
import { useFilterState } from "@/components/useFilterState";
import { transactions } from "@/lib/data";
import { filterTransactions } from "@/lib/filters";

export function TransactionsClient() {
  const { filters } = useFilterState();
  const filtered = filterTransactions(transactions, filters);

  return (
    <div className="space-y-4">
      <FilterPanel />
      <TransactionsTable rows={filtered} filters={filters} />
    </div>
  );
}
