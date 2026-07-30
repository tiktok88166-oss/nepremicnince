"use client";

import Link from "next/link";
import { GitCompareArrows, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDecimal, formatEur, formatNumber } from "@/lib/format";
import { comparisonEvent, comparisonStorageKey, readComparisonItems, type PropertyComparisonItem } from "@/lib/property-comparison";

export function PropertyComparisonClient() {
  const [items, setItems] = useState<PropertyComparisonItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => setItems(readComparisonItems(localStorage));
    const initialLoad = window.setTimeout(() => {
      load();
      setReady(true);
    }, 0);
    window.addEventListener("storage", load);
    window.addEventListener(comparisonEvent, load);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("storage", load);
      window.removeEventListener(comparisonEvent, load);
    };
  }, []);

  function save(next: PropertyComparisonItem[]) {
    localStorage.setItem(comparisonStorageKey, JSON.stringify(next));
    setItems(next);
    window.dispatchEvent(new Event(comparisonEvent));
  }

  if (!ready) return <div className="min-h-48" />;

  if (!items.length) {
    return (
      <section className="border-y border-[var(--border)] bg-white py-12 text-center">
        <GitCompareArrows aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--accent)]" />
        <h2 className="mt-4 text-xl font-semibold">Primerjava je prazna</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">V poročilu posamezne nepremičnine izberite »Dodaj v primerjavo«. Hkrati lahko primerjate največ štiri zapise.</p>
        <Link href="/" className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"><Search aria-hidden="true" className="h-4 w-4" /> Poišči nepremičnino</Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="comparison-table-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div><h2 id="comparison-table-title" className="text-xl font-semibold">Izbrane nepremičnine</h2><p className="mt-1 text-sm text-[var(--muted)]">{items.length} od največ 4</p></div>
        <button type="button" onClick={() => save([])} className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold hover:border-[#b83e45] hover:text-[#9f3038]"><Trash2 aria-hidden="true" className="h-4 w-4" /> Počisti</button>
      </div>
      <div className="overflow-x-auto border-y border-[var(--border)] bg-white">
        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
          <thead className="bg-[var(--surface-subtle)] align-top">
            <tr>
              <th className="w-44 px-4 py-4 text-xs text-[var(--muted)]">Lastnost</th>
              {items.map((item) => (
                <th key={item.id} className="min-w-48 px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={item.href} className="font-semibold text-[var(--accent-strong)] hover:underline">{item.title}</Link>
                    <button type="button" onClick={() => save(items.filter((candidate) => candidate.id !== item.id))} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-white" aria-label={`Odstrani ${item.title}`} title="Odstrani"><X aria-hidden="true" className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-1 text-xs font-normal text-[var(--muted)]">{item.kind} · {item.municipality}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            <ComparisonRow label="Površina" items={items} render={(item) => item.areaM2 == null ? "-" : formatDecimal(item.areaM2, " m²")} />
            <ComparisonRow label="Posplošena vrednost GURS" items={items} render={(item) => item.generalisedValueEur == null ? "-" : formatEur(item.generalisedValueEur)} />
            <ComparisonRow label="Indikativni razpon" items={items} render={(item) => item.estimateLow == null || item.estimateHigh == null ? "Ni dovolj podatkov" : `${formatEur(item.estimateLow)}–${formatEur(item.estimateHigh)}`} />
            <ComparisonRow label="Osrednja ocena" items={items} render={(item) => item.estimateCentral == null ? "-" : formatEur(item.estimateCentral)} strong />
            <ComparisonRow label="Zaupanje / vzorec" items={items} render={(item) => item.confidence ? `${item.confidence} · n = ${formatNumber(item.comparableCount)}` : `brez ocene · n = ${formatNumber(item.comparableCount)}`} />
            <ComparisonRow label="Evidentirana raba" items={items} render={(item) => item.use ?? "-"} />
            <ComparisonRow label="Leto gradnje" items={items} render={(item) => item.yearBuilt == null ? "-" : formatNumber(item.yearBuilt)} />
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Primerjava ne vključuje lastništva, zemljiškoknjižnega stanja, OPN/OPPN, posebnih režimov ali možnosti priključitve na infrastrukturo.</p>
    </section>
  );
}

function ComparisonRow({ label, items, render, strong = false }: { label: string; items: PropertyComparisonItem[]; render: (item: PropertyComparisonItem) => string; strong?: boolean }) {
  return <tr><th className="px-4 py-3 font-medium text-[var(--muted)]">{label}</th>{items.map((item) => <td key={item.id} className={`break-words px-4 py-3 tabular-nums ${strong ? "font-semibold" : ""}`}>{render(item)}</td>)}</tr>;
}
