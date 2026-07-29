"use client";

import { FilterPanel } from "@/components/FilterPanel";
import { MapView } from "@/components/MapView";
import { useFilterState } from "@/components/useFilterState";
import { transactions } from "@/lib/data";
import { filterTransactions } from "@/lib/filters";

export function MapClient() {
  const { filters } = useFilterState();
  const filtered = filterTransactions(transactions, filters);

  return (
    <div className="space-y-4">
      <FilterPanel />
      <MapView rows={filtered} />
    </div>
  );
}
