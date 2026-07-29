"use client";

import { FilterPanel } from "@/components/FilterPanel";
import { KpiGrid } from "@/components/KpiGrid";
import { MethodWarning } from "@/components/MethodWarning";
import { DistributionCharts, YearCharts } from "@/components/Charts";
import { useFilterState } from "@/components/useFilterState";
import { transactions } from "@/lib/data";
import { filterTransactions } from "@/lib/filters";

export function DashboardClient() {
  const { filters } = useFilterState();
  const filtered = filterTransactions(transactions, filters);

  return (
    <div className="space-y-4">
      <FilterPanel />
      <KpiGrid transactions={filtered} />
      <MethodWarning />
      <YearCharts transactions={filtered} />
      <DistributionCharts transactions={filtered} />
    </div>
  );
}
