"use client";

import { useMemo, useState } from "react";
import { DistributionCharts, YearCharts } from "@/components/Charts";
import { FilterPanel } from "@/components/FilterPanel";
import { KpiGrid } from "@/components/KpiGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { useFilterState } from "@/components/useFilterState";
import { filterOptions, rentals, transactions } from "@/lib/data";
import { filterTransactions, type Filters } from "@/lib/filters";
import { formatDecimal, formatEur, formatNumber } from "@/lib/format";
import { analyticalPriceValues, median, percentile, priceValues } from "@/lib/stats";

export function AnalysisClient() {
  const { filters } = useFilterState();
  const filtered = filterTransactions(transactions, filters);
  const [compareCategory, setCompareCategory] = useState(filterOptions.categories[0] ?? "");
  const compareFilters: Filters = useMemo(() => ({ ...filters, category: compareCategory }), [compareCategory, filters]);
  const compared = filterTransactions(transactions, compareFilters);

  return (
    <div className="space-y-4">
      <FilterPanel />
      <KpiGrid transactions={filtered} />
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Primerjava dveh filtrov</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={compareCategory} onChange={(event) => setCompareCategory(event.target.value)}>
              {filterOptions.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => setCompareCategory(filters.category || filterOptions.categories[0] || "")}>
              Poravnaj z osnovnim filtrom
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <StatsBox title="Trenutni filter" rows={filtered} />
          <StatsBox title={`Primerjava: ${compareCategory || "brez kategorije"}`} rows={compared} />
        </CardContent>
      </Card>
      <YearCharts transactions={filtered} />
      <DistributionCharts transactions={filtered} />
      <GursEnrichedAnalysis rows={filtered} />
    </div>
  );
}

function GursEnrichedAnalysis({ rows }: { rows: typeof transactions }) {
  const ratios = rows.map((row) => row.priceToCurrentGeneralisedValueRatio).filter((value): value is number => value != null);
  const plannedUses = new Map<string, typeof rows>();
  rows.forEach((row) => row.currentPlannedUses.forEach((use) => plannedUses.set(use, [...(plannedUses.get(use) ?? []), row])));
  const plannedRows = [...plannedUses.entries()].map(([use, deals]) => ({ use, count: deals.length, medianPrice: median(deals.map((deal) => deal.priceEur)) })).sort((a, b) => b.count - a.count).slice(0, 10);
  const buildDecades = new Map<string, number>();
  rows.forEach((row) => row.currentBuildingYears.forEach((year) => {
    const decade = `${Math.floor(year / 10) * 10}-${Math.floor(year / 10) * 10 + 9}`;
    buildDecades.set(decade, (buildDecades.get(decade) ?? 0) + 1);
  }));
  const rentalM2 = rentals.flatMap((rental) => rental.components.map((component) => component.rentEurM2)).filter((value): value is number => value != null);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Cena glede na trenutno posplošeno vrednost <span className="text-sm font-normal text-[var(--muted)]">n = {formatNumber(ratios.length)}</span></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-3xl font-semibold">{formatDecimal(median(ratios), " ×")}</p>
          <p className="text-sm leading-6 text-[var(--muted)]">Mediana je izračunana samo za posle s popolno pokritostjo vrednotenja. Primerjava uporablja trenutno, ne zgodovinsko posplošeno vrednost.</p>
          <dl className="grid grid-cols-3 gap-3 text-sm"><Stat label="P25" value={formatDecimal(percentile(ratios, 0.25), " ×")} /><Stat label="Mediana" value={formatDecimal(median(ratios), " ×")} /><Stat label="P75" value={formatDecimal(percentile(ratios, 0.75), " ×")} /></dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Najemnine na m2 <span className="text-sm font-normal text-[var(--muted)]">n = {formatNumber(rentalM2.length)}</span></CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{formatDecimal(median(rentalM2), " EUR/m2")}</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Informativno za čiste izračune po pravilih posamezne sestavine. Vsi trenutni najemni zapisi so še v preverjanju oziroma neopredeljeni.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Prodaje po trenutni namenski rabi</CardTitle></CardHeader>
        <CardContent><SimpleTable headers={["Raba", "Vzorec", "Mediana cene"]} rows={plannedRows.map((item) => [item.use, formatNumber(item.count), item.count < 3 ? "premalo podatkov" : formatEur(item.medianPrice)])} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Prodaje po desetletju izgradnje</CardTitle></CardHeader>
        <CardContent><SimpleTable headers={["Leto izgradnje", "Vzorec"]} rows={[...buildDecades.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([decade, count]) => [decade, formatNumber(count)])} /></CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="border-t border-[var(--border)] pt-2"><dt className="text-[var(--muted)]">{label}</dt><dd className="font-semibold">{value}</dd></div>;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead><tr className="border-b text-left">{headers.map((header) => <th key={header} className="py-2 pr-3">{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.join("|")} className="border-b">{row.map((cell, index) => <td key={`${cell}-${index}`} className="py-2 pr-3">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function StatsBox({ title, rows }: { title: string; rows: typeof transactions }) {
  const prices = priceValues(rows);
  const m2 = analyticalPriceValues(rows);
  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <h3 className="font-semibold">{title}</h3>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--muted)]">Vzorec</dt>
          <dd>{formatNumber(rows.length)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--muted)]">Mediana cene</dt>
          <dd>{formatEur(median(prices))}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--muted)]">25. percentil</dt>
          <dd>{formatEur(percentile(prices, 0.25))}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--muted)]">75. percentil</dt>
          <dd>{formatEur(percentile(prices, 0.75))}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--muted)]">Mediana EUR/m2</dt>
          <dd>
            {formatEur(median(m2))} <span className="text-[var(--muted)]">n = {formatNumber(m2.length)}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
