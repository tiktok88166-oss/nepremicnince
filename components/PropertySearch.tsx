"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, LandPlot, LoaderCircle, MapPin, Search } from "lucide-react";
import type { MunicipalityCode, PropertyType } from "@/lib/property-repository";
import { Select } from "@/components/ui/field";

type Result = { type: PropertyType; id: string; label: string; detail: string | null };

const icons = {
  address: MapPin,
  parcel: LandPlot,
  building: Building2,
  "building-part": Building2,
};

export function PropertySearch({ initialMunicipality = "061" }: { initialMunicipality?: MunicipalityCode }) {
  const [municipality, setMunicipality] = useState<MunicipalityCode>(initialMunicipality);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Vnesite naslov, parcelo ali identifikator stavbe.");
  const controller = useRef<AbortController | null>(null);

  async function runSearch(term = query) {
    const normalized = term.trim();
    if (normalized.length < 2) {
      setResults([]);
      setMessage("Vnesite vsaj dva znaka.");
      return;
    }
    controller.current?.abort();
    controller.current = new AbortController();
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}&municipality=${municipality}`, {
        signal: controller.current.signal,
      });
      const payload = await response.json();
      setResults(payload.results ?? []);
      setMessage(response.ok ? "Ni zadetkov. Poskusite z drugim zapisom." : payload.error);
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage("Iskanje trenutno ni dosegljivo.");
    } finally {
      setLoading(false);
    }
  }

  function changeMunicipality(next: MunicipalityCode) {
    setMunicipality(next);
    setResults([]);
    setMessage("Vnesite naslov, parcelo ali identifikator stavbe.");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void runSearch();
  }

  return (
    <section aria-labelledby="property-search-title" className="border-y border-[var(--border)] bg-white">
      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-7">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 id="property-search-title" className="text-xl font-semibold sm:text-2xl">Poiščite nepremičnino</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Naslov, številka parcele, stavbe ali dela stavbe.</p>
          </div>
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)] sm:w-48">
            Občina
            <Select value={municipality} onChange={(event) => changeMunicipality(event.target.value as MunicipalityCode)}>
              <option value="061">Ljubljana</option>
              <option value="008">Brezovica</option>
            </Select>
          </label>
        </div>
        <form onSubmit={submit} className="flex min-w-0 gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Iskalni niz</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 w-full min-w-0 rounded-md border border-[var(--border)] bg-white pl-10 pr-3 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[#28694f26]"
              placeholder="npr. Slovenska cesta 1 ali 1723-45/2"
              autoComplete="street-address"
            />
          </label>
          <button type="submit" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60" disabled={loading}>
            {loading ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Search aria-hidden="true" className="h-5 w-5" />}
            <span className="hidden sm:inline">Poišči</span>
          </button>
        </form>
        <div className="mt-4" aria-live="polite">
          {results.length ? (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {results.map((result) => {
                const Icon = icons[result.type];
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <Link href={`/nepremicnina/${result.type}/${encodeURIComponent(result.id)}`} className="flex min-h-16 items-center gap-3 px-1 py-3 hover:bg-[var(--surface-subtle)] sm:px-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold sm:text-base">{result.label}</span>
                        {result.detail ? <span className="block truncate text-xs text-[var(--muted)] sm:text-sm">{result.detail}</span> : null}
                      </span>
                      <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p className="py-3 text-sm text-[var(--muted)]">{message}</p>}
        </div>
      </div>
    </section>
  );
}
