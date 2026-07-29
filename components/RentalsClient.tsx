"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxField } from "@/components/ui/field";
import { formatDate, formatDecimal, formatEur, formatNumber } from "@/lib/format";
import type { Rental } from "@/lib/schemas";

const excludedStatuses = new Set(["4", "5"]);

export function RentalsClient({ rows }: { rows: Rental[] }) {
  const [includeTemporary, setIncludeTemporary] = useState(false);
  const marketRows = useMemo(() => rows.filter((row) => !excludedStatuses.has(row.marketabilityCode ?? "")), [rows]);
  const visibleRows = includeTemporary ? rows : marketRows;
  const cleanRentValues = visibleRows.flatMap((row) => row.components.map((component) => component.rentEurM2)).filter((value): value is number => value != null);

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-[#ead7b7] bg-[#fff8e9] p-4 text-sm text-[#68420d]">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Začasni podatki</p>
            <p className="mt-1">Najemni podatki za leto 2026 so še v preverjanju oziroma neopredeljeni. Rezultati niso dokončna uradna statistika tržnih najemnin.</p>
          </div>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Vsi prejeti posli" value={formatNumber(rows.length)} />
        <Metric label="Dokončni tržni posli" value={formatNumber(marketRows.length)} />
        <Metric label="Uporabne cene na m2" value={formatNumber(cleanRentValues.length)} />
        <Metric label="Prikazane sestavine" value={formatNumber(visibleRows.reduce((sum, row) => sum + row.componentCount, 0))} />
      </section>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Najemni posli n = {formatNumber(visibleRows.length)}</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted)]">Glavni KPI privzeto izključuje začasne in netržne zapise.</p>
          </div>
          <CheckboxField label="Prikaži tudi začasne in netržne posle" checked={includeTemporary} onChange={setIncludeTemporary} />
        </CardHeader>
        <CardContent>
          {visibleRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">V zbirki še ni dokončno potrjenih tržnih najemov. Za pregled prejetih zapisov vključite zgornji filter.</p>
          ) : (
            <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[940px] border-collapse text-sm">
                <thead><tr className="border-b text-left"><th className="px-3 py-2">ID</th><th>Datum</th><th>Najemnina</th><th>Vrsta</th><th>Status</th><th>Trajanje</th><th>Sestavine</th><th>Stroški</th><th>DDV</th></tr></thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="border-b align-top">
                      <td className="px-3 py-3 font-medium">{row.id}</td>
                      <td className="py-3">{row.contractDate ? formatDate(row.contractDate) : "ni podatka"}</td>
                      <td className="py-3">{formatEur(row.contractRentEur)}</td>
                      <td className="py-3">{row.rentalType}</td>
                      <td className="py-3"><span className="rounded bg-[#fff1d9] px-2 py-1 text-xs font-medium text-[#70460e]">{row.marketability}</span></td>
                      <td className="py-3">{row.durationType}</td>
                      <td className="py-3">
                        <details>
                          <summary className="cursor-pointer font-medium text-[var(--accent)]">{formatNumber(row.componentCount)} zapisov</summary>
                          <div className="mt-2 space-y-2 text-xs text-[var(--muted)]">
                            {row.components.map((component) => (
                              <div key={component.id} className="border-l-2 border-[var(--border)] pl-2">
                                <p className="font-medium text-[var(--foreground)]">{component.address ?? `Stavba ${component.buildingNumber}, del ${component.buildingPartNumber}`}</p>
                                <p>{formatDecimal(component.areaM2, " m2")} · {formatDecimal(component.rentEurM2, " EUR/m2")} · ujemanje {component.matchStatus}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                      <td className="py-3">{yesNo(row.operatingCostsIncluded)}</td>
                      <td className="py-3">{yesNo(row.vatIncluded)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="-mx-4 divide-y divide-[var(--border)] md:hidden">
              {visibleRows.map((row) => (
                <article key={row.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{formatEur(row.contractRentEur)}</p>
                    <p className="text-xs text-[var(--muted)]">{row.contractDate ? formatDate(row.contractDate) : "Datum ni naveden"}</p>
                  </div>
                  <p className="mt-1 text-sm font-medium">{row.rentalType}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{row.marketability} · {row.durationType}</p>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer font-medium text-[var(--accent)]">{formatNumber(row.componentCount)} sestavin</summary>
                    <div className="mt-2 space-y-2 text-xs text-[var(--muted)]">
                      {row.components.map((component) => (
                        <div key={component.id} className="border-l-2 border-[var(--border)] pl-2">
                          <p className="font-medium text-[var(--foreground)]">{component.address ?? `Stavba ${component.buildingNumber}, del ${component.buildingPartNumber}`}</p>
                          <p>{formatDecimal(component.areaM2, " m²")} · {formatDecimal(component.rentEurM2, " EUR/m²")}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                </article>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="flex min-h-28 items-center gap-3 p-4"><Building2 aria-hidden="true" className="h-5 w-5 text-[var(--accent)]" /><div><p className="text-xs uppercase text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div></CardContent></Card>;
}

function yesNo(value: boolean | null) {
  return value == null ? "ni podatka" : value ? "vključeno" : "ni vključeno";
}
