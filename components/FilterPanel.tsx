"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { defaultFilters, type Filters } from "@/lib/filters";
import { filterOptions } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxField, Field, Input, Select } from "@/components/ui/field";
import { useFilterState } from "@/components/useFilterState";
import { cn } from "@/lib/utils";

const advancedKeys: Array<keyof Filters> = [
  "dateFrom", "dateTo", "analyticalUnit", "cadastralMunicipality", "quality", "marketability", "saleType",
  "priceFrom", "priceTo", "landAreaFrom", "landAreaTo", "usableAreaFrom", "usableAreaTo", "priceM2From", "priceM2To",
];

const priceOptions = [25000, 50000, 75000, 100000, 150000, 200000, 300000, 500000, 750000, 1000000];
const landAreaOptions = [100, 250, 500, 750, 1000, 2500, 5000, 10000, 25000];
const usableAreaOptions = [25, 50, 75, 100, 125, 150, 200, 300, 500];
const priceM2Options = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500];
const numberFormatter = new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 0 });

function optionList(values: Array<string | number>) {
  return values.map((value) => <option key={value} value={value}>{value}</option>);
}

function RangeSelect({
  fromKey,
  toKey,
  label,
  unit,
  options,
  filters,
  patchFilters,
}: {
  fromKey: keyof Pick<Filters, "priceFrom" | "landAreaFrom" | "usableAreaFrom" | "priceM2From">;
  toKey: keyof Pick<Filters, "priceTo" | "landAreaTo" | "usableAreaTo" | "priceM2To">;
  label: string;
  unit: string;
  options: number[];
  filters: Filters;
  patchFilters: (patch: Partial<Filters>) => void;
}) {
  return (
    <fieldset className="grid min-w-0 gap-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <Select aria-label={`${label} najmanj`} value={filters[fromKey]} onChange={(event) => patchFilters({ [fromKey]: event.target.value })}>
          <option value="">Najmanj</option>
          {options.map((value) => <option key={value} value={value}>od {numberFormatter.format(value)} {unit}</option>)}
        </Select>
        <Select aria-label={`${label} največ`} value={filters[toKey]} onChange={(event) => patchFilters({ [toKey]: event.target.value })}>
          <option value="">Največ</option>
          {options.map((value) => <option key={value} value={value}>do {numberFormatter.format(value)} {unit}</option>)}
        </Select>
      </div>
    </fieldset>
  );
}

export function FilterPanel() {
  const { filters, patchFilters, setFilters } = useFilterState();
  const initialAdvanced = advancedKeys.some((key) => Boolean(filters[key]));
  const [advancedOpen, setAdvancedOpen] = useState(initialAdvanced);
  const [searchValue, setSearchValue] = useState(filters.q);
  const advancedCount = advancedKeys.filter((key) => Boolean(filters[key])).length;
  const activeCount = useMemo(() => Object.keys(defaultFilters).filter((key) => Boolean(filters[key as keyof Filters])).length, [filters]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    patchFilters({ q: searchValue.trim() });
  }

  function resetFilters() {
    setSearchValue("");
    setAdvancedOpen(false);
    setFilters(defaultFilters);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Filtri{activeCount ? ` (${activeCount})` : ""}</CardTitle>
        <Button variant="ghost" size="sm" onClick={resetFilters} disabled={activeCount === 0 && !searchValue}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Ponastavi
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <form className="grid min-w-0 gap-1.5 md:col-span-2" onSubmit={submitSearch}>
            <span className="text-sm font-medium">Iskanje</span>
            <div className="flex min-w-0 gap-2">
              <div className="relative min-w-0 flex-1">
                <Search aria-hidden="true" className="absolute left-3 top-2.5 h-5 w-5 text-[var(--muted)]" />
                <Input className="pl-10" placeholder="ID, naslov, naselje, parcela, KO" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} />
              </div>
              <Button type="submit" aria-label="Išči">Išči</Button>
            </div>
          </form>
          <Field>
            <span>Leto</span>
            <Select value={filters.year} onChange={(event) => patchFilters({ year: event.target.value })}>
              <option value="">Vsa leta</option>
              {optionList(filterOptions.years)}
            </Select>
          </Field>
          <Field>
            <span>Kategorija</span>
            <Select value={filters.category} onChange={(event) => patchFilters({ category: event.target.value })}>
              <option value="">Vse kategorije</option>
              {optionList(filterOptions.categories)}
            </Select>
          </Field>
          <Field>
            <span>Naselje</span>
            <Select value={filters.settlement} onChange={(event) => patchFilters({ settlement: event.target.value })}>
              <option value="">Vsa naselja</option>
              {optionList(filterOptions.settlements)}
            </Select>
          </Field>
          <div className="flex flex-col justify-end gap-3 pb-1 md:flex-row md:items-center xl:flex-col xl:items-start">
            <CheckboxField label="Samo posli z lokacijo" checked={filters.onlyLocated} onChange={(checked) => patchFilters({ onlyLocated: checked })} />
            <CheckboxField label="Samo polni deleži" checked={filters.onlyFullShares} onChange={(checked) => patchFilters({ onlyFullShares: checked })} />
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full justify-between sm:w-auto"
          aria-expanded={advancedOpen}
          aria-controls="advanced-filters"
          onClick={() => setAdvancedOpen((current) => !current)}
        >
          <span className="inline-flex items-center gap-2"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" />Več filtrov{advancedCount ? ` (${advancedCount})` : ""}</span>
          <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
        </Button>

        {advancedOpen ? (
          <div id="advanced-filters" className="grid gap-3 border-t border-[var(--border)] pt-4 md:grid-cols-2 xl:grid-cols-4">
            <Field><span>Datum od</span><Input type="date" value={filters.dateFrom} onChange={(event) => patchFilters({ dateFrom: event.target.value })} /></Field>
            <Field><span>Datum do</span><Input type="date" value={filters.dateTo} onChange={(event) => patchFilters({ dateTo: event.target.value })} /></Field>
            <Field><span>Analitična enota</span><Select value={filters.analyticalUnit} onChange={(event) => patchFilters({ analyticalUnit: event.target.value })}><option value="">Vse enote</option>{optionList(filterOptions.analyticalUnits)}</Select></Field>
            <Field><span>Katastrska občina</span><Select value={filters.cadastralMunicipality} onChange={(event) => patchFilters({ cadastralMunicipality: event.target.value })}><option value="">Vse KO</option>{optionList(filterOptions.cadastralMunicipalities)}</Select></Field>
            <Field><span>Kakovost</span><Select value={filters.quality} onChange={(event) => patchFilters({ quality: event.target.value })}><option value="">A, B in C</option>{optionList(filterOptions.qualities)}</Select></Field>
            <Field><span>Tržnost GURS</span><Select value={filters.marketability} onChange={(event) => patchFilters({ marketability: event.target.value })}><option value="">Vse oznake</option>{optionList(filterOptions.marketabilities)}</Select></Field>
            <Field><span>Vrsta posla</span><Select value={filters.saleType} onChange={(event) => patchFilters({ saleType: event.target.value })}><option value="">Vse vrste</option>{optionList(filterOptions.saleTypes)}</Select></Field>
            <RangeSelect label="Cena" unit="EUR" fromKey="priceFrom" toKey="priceTo" options={priceOptions} filters={filters} patchFilters={patchFilters} />
            <RangeSelect label="Zemljišče" unit="m²" fromKey="landAreaFrom" toKey="landAreaTo" options={landAreaOptions} filters={filters} patchFilters={patchFilters} />
            <RangeSelect label="Uporabna površina" unit="m²" fromKey="usableAreaFrom" toKey="usableAreaTo" options={usableAreaOptions} filters={filters} patchFilters={patchFilters} />
            <RangeSelect label="Analitična cena" unit="EUR/m²" fromKey="priceM2From" toKey="priceM2To" options={priceM2Options} filters={filters} patchFilters={patchFilters} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
