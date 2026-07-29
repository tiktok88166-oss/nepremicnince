"use client";

import { RotateCcw, Search } from "lucide-react";
import { defaultFilters, type Filters } from "@/lib/filters";
import { filterOptions } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxField, Field, Input, Select } from "@/components/ui/field";
import { useFilterState } from "@/components/useFilterState";

function optionList(values: Array<string | number>) {
  return values.map((value) => (
    <option key={value} value={value}>
      {value}
    </option>
  ));
}

function NumberPair({
  fromKey,
  toKey,
  label,
  filters,
  patchFilters,
}: {
  fromKey: keyof Pick<Filters, "priceFrom" | "landAreaFrom" | "usableAreaFrom" | "priceM2From">;
  toKey: keyof Pick<Filters, "priceTo" | "landAreaTo" | "usableAreaTo" | "priceM2To">;
  label: string;
  filters: Filters;
  patchFilters: (patch: Partial<Filters>) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <Input
          inputMode="decimal"
          placeholder="od"
          value={filters[fromKey]}
          onChange={(event) => patchFilters({ [fromKey]: event.target.value })}
        />
        <Input
          inputMode="decimal"
          placeholder="do"
          value={filters[toKey]}
          onChange={(event) => patchFilters({ [toKey]: event.target.value })}
        />
      </div>
    </div>
  );
}

export function FilterPanel() {
  const { filters, patchFilters, setFilters } = useFilterState();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Filtri</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setFilters(defaultFilters)}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Ponastavi
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field className="md:col-span-2">
            <span>Iskanje</span>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-2.5 h-5 w-5 text-[var(--muted)]" />
              <Input
                className="pl-10"
                placeholder="ID, naslov, naselje, parcela, KO"
                value={filters.q}
                onChange={(event) => patchFilters({ q: event.target.value })}
              />
            </div>
          </Field>
          <Field>
            <span>Datum od</span>
            <Input type="date" value={filters.dateFrom} onChange={(event) => patchFilters({ dateFrom: event.target.value })} />
          </Field>
          <Field>
            <span>Datum do</span>
            <Input type="date" value={filters.dateTo} onChange={(event) => patchFilters({ dateTo: event.target.value })} />
          </Field>
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
            <span>Analitična enota</span>
            <Select
              value={filters.analyticalUnit}
              onChange={(event) => patchFilters({ analyticalUnit: event.target.value })}
            >
              <option value="">Vse enote</option>
              {optionList(filterOptions.analyticalUnits)}
            </Select>
          </Field>
          <Field>
            <span>Katastrska občina</span>
            <Select
              value={filters.cadastralMunicipality}
              onChange={(event) => patchFilters({ cadastralMunicipality: event.target.value })}
            >
              <option value="">Vse KO</option>
              {optionList(filterOptions.cadastralMunicipalities)}
            </Select>
          </Field>
          <Field>
            <span>Naselje</span>
            <Select value={filters.settlement} onChange={(event) => patchFilters({ settlement: event.target.value })}>
              <option value="">Vsa naselja</option>
              {optionList(filterOptions.settlements)}
            </Select>
          </Field>
          <Field>
            <span>Kakovost</span>
            <Select value={filters.quality} onChange={(event) => patchFilters({ quality: event.target.value })}>
              <option value="">A, B in C</option>
              {optionList(filterOptions.qualities)}
            </Select>
          </Field>
          <Field>
            <span>Tržnost GURS</span>
            <Select value={filters.marketability} onChange={(event) => patchFilters({ marketability: event.target.value })}>
              <option value="">Vse oznake</option>
              {optionList(filterOptions.marketabilities)}
            </Select>
          </Field>
          <Field>
            <span>Vrsta posla</span>
            <Select value={filters.saleType} onChange={(event) => patchFilters({ saleType: event.target.value })}>
              <option value="">Vse vrste</option>
              {optionList(filterOptions.saleTypes)}
            </Select>
          </Field>
          <NumberPair label="Cena EUR" fromKey="priceFrom" toKey="priceTo" filters={filters} patchFilters={patchFilters} />
          <NumberPair
            label="Zemljišče m2"
            fromKey="landAreaFrom"
            toKey="landAreaTo"
            filters={filters}
            patchFilters={patchFilters}
          />
          <NumberPair
            label="Uporabna površina m2"
            fromKey="usableAreaFrom"
            toKey="usableAreaTo"
            filters={filters}
            patchFilters={patchFilters}
          />
          <NumberPair label="Analitična cena EUR/m2" fromKey="priceM2From" toKey="priceM2To" filters={filters} patchFilters={patchFilters} />
          <div className="flex flex-col justify-end gap-3">
            <CheckboxField label="Samo posli z lokacijo" checked={filters.onlyLocated} onChange={(checked) => patchFilters({ onlyLocated: checked })} />
            <CheckboxField label="Samo polni deleži" checked={filters.onlyFullShares} onChange={(checked) => patchFilters({ onlyFullShares: checked })} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
