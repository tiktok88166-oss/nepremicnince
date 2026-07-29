"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronRight, ExternalLink, LandPlot, Search } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { buildingPartsSchema, buildingsSchema, booleanLabel, parcelsSchema, type Building, type BuildingPart, type Parcel } from "@/lib/gurs";
import { buildingIndexSchema, parcelIndexSchema, type BuildingIndex, type ParcelIndex } from "@/lib/schemas";
import { formatDecimal, formatEur, formatNumber } from "@/lib/format";
import { fetchJson } from "@/lib/map-data";

type CatalogKind = "parcels" | "buildings";

export function CatalogClient({ kind }: { kind: CatalogKind }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [rows, setRows] = useState<Array<ParcelIndex | BuildingIndex>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Parcel | Building | null>(null);
  const [parts, setParts] = useState<BuildingPart[]>([]);
  const selectedEid = searchParams.get("eid");
  const selectedKo = searchParams.get("ko");
  const pageSize = 50;

  useEffect(() => {
    let active = true;
    const source = kind === "parcels" ? "/data/catalog/parcels-index.json" : "/data/catalog/buildings-index.json";
    fetchJson<unknown>(source)
      .then((payload) => {
        const parsed = kind === "parcels" ? z.array(parcelIndexSchema).parse(payload) : z.array(buildingIndexSchema).parse(payload);
        if (active) setRows(parsed);
      })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Kataloga ni bilo mogoče naložiti."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [kind]);

  useEffect(() => {
    if (!selectedEid || !selectedKo) {
      return;
    }
    let active = true;
    const source = `/data/catalog/${kind}/${selectedKo}.json`;
    fetchJson<unknown>(source)
      .then((payload) => {
        const parsed = kind === "parcels" ? parcelsSchema.parse(payload) : buildingsSchema.parse(payload);
        const selected = parsed.find((item) =>
          kind === "parcels" ? "eidParcel" in item && item.eidParcel === selectedEid : "eidBuilding" in item && item.eidBuilding === selectedEid,
        );
        if (active) setDetail(selected ?? null);
      })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Podrobnosti ni bilo mogoče naložiti."));
    if (kind === "buildings") {
      fetchJson<unknown>("/data/catalog/building-parts.json")
        .then((payload) => {
          const parsed = buildingPartsSchema.parse(payload);
          if (active) setParts(parsed.filter((item) => item.eidBuilding === selectedEid));
        })
        .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Delov stavbe ni bilo mogoče naložiti."));
    }
    return () => {
      active = false;
    };
  }, [kind, selectedEid, selectedKo]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("sl");
    if (!needle) return rows;
    return rows.filter((row) => JSON.stringify(row).toLocaleLowerCase("sl").includes(needle));
  }, [query, rows]);
  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  function openDetail(row: ParcelIndex | BuildingIndex) {
    setDetail(null);
    setParts([]);
    const params = new URLSearchParams(searchParams.toString());
    params.set("eid", kind === "parcels" ? (row as ParcelIndex).eidParcel : (row as BuildingIndex).eidBuilding);
    params.set("ko", row.cadastralMunicipalityCode);
    if (query) params.set("q", query);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-md border border-[#d9a4a4] bg-[#fff1f1] px-3 py-2 text-sm text-[#7a2525]">{error}</p> : null}
      {selectedEid && detail && "eidParcel" in detail && detail.eidParcel === selectedEid ? <ParcelDetail parcel={detail} /> : null}
      {selectedEid && detail && "eidBuilding" in detail && detail.eidBuilding === selectedEid ? <BuildingDetail building={detail} parts={parts} /> : null}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>{kind === "parcels" ? "Kataster parcel" : "Kataster stavb"}</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {loading ? "Nalagam katalog ..." : `${formatNumber(filtered.length)} zadetkov`}
            </p>
          </div>
          <Field className="w-full sm:max-w-sm">
            <span>Iskanje</span>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-[#75827b]" />
              <input
                className="h-11 w-full rounded-md border border-[var(--border)] bg-white pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[#8a9690] hover:border-[#b8c6bc] focus:border-[var(--accent)] focus:ring-2 focus:ring-[#28694f26]"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder={kind === "parcels" ? "Parcelna številka, EID, raba" : "Številka stavbe, EID, tip"}
              />
            </div>
          </Field>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[#46554d]">
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-3 py-2">KO</th>
                  <th className="px-3 py-2">Številka</th>
                  <th className="px-3 py-2">{kind === "parcels" ? "Površina" : "Tip"}</th>
                  <th className="px-3 py-2">{kind === "parcels" ? "Glavna namenska raba" : "Leto izgradnje"}</th>
                  <th className="px-3 py-2">{kind === "parcels" ? "Posplošena vrednost" : "Deli stavbe"}</th>
                  <th className="w-12 px-3 py-2"><span className="sr-only">Podrobnosti</span></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const parcel = kind === "parcels" ? (row as ParcelIndex) : null;
                  const building = kind === "buildings" ? (row as BuildingIndex) : null;
                  return (
                    <tr key={parcel?.eidParcel ?? building?.eidBuilding} className="border-b border-[var(--border)] transition-colors hover:bg-[#f0f5f1]">
                      <td className="px-3 py-2">{row.cadastralMunicipalityCode}</td>
                      <td className="px-3 py-2 font-medium">{parcel?.parcelNumber ?? building?.buildingNumber}</td>
                      <td className="px-3 py-2">{parcel ? formatDecimal(parcel.areaM2, " m2") : building?.buildingType ?? "ni podatka"}</td>
                      <td className="px-3 py-2">{parcel ? parcel.plannedUsePrimary ?? "ni podatka" : building?.yearBuilt ?? "ni podatka"}</td>
                      <td className="px-3 py-2">{parcel ? formatEur(parcel.generalisedValueTotalEur) : formatNumber(building?.partCount ?? 0)}</td>
                      <td className="px-3 py-2">
                        <Button size="icon" variant="ghost" onClick={() => openDetail(row)} aria-label="Odpri podrobnosti">
                          <ExternalLink aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="-mx-4 divide-y divide-[var(--border)] sm:hidden">
            {pageRows.map((row) => {
              const parcel = kind === "parcels" ? (row as ParcelIndex) : null;
              const building = kind === "buildings" ? (row as BuildingIndex) : null;
              return (
                <button
                  type="button"
                  key={parcel?.eidParcel ?? building?.eidBuilding}
                  className="group grid w-full grid-cols-[1fr_auto] gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#f0f5f1] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
                  onClick={() => openDetail(row)}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-[var(--accent-strong)]">{row.cadastralMunicipalityCode}/{parcel?.parcelNumber ?? building?.buildingNumber}</span>
                    <span className="mt-1 block truncate text-sm">{parcel ? parcel.plannedUsePrimary ?? "Raba ni navedena" : building?.buildingType ?? "Tip ni naveden"}</span>
                    <span className="mt-0.5 block text-sm text-[var(--muted)]">
                      {parcel ? `${formatDecimal(parcel.areaM2, " m²")} · ${formatEur(parcel.generalisedValueTotalEur)}` : `Leto ${building?.yearBuilt ?? "ni podatka"} · ${formatNumber(building?.partCount ?? 0)} delov`}
                    </span>
                  </span>
                  <span className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#edf2ee] text-[var(--muted)] transition-colors group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]">
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span>Stran {page + 1} od {pageCount}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Nazaj</Button>
              <Button variant="secondary" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>Naprej</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ParcelDetail({ parcel }: { parcel: Parcel }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <LandPlot aria-hidden="true" className="h-5 w-5 text-[var(--accent)]" />
        <CardTitle>Parcela {parcel.cadastralMunicipalityCode}/{parcel.parcelNumber}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <DefinitionGrid rows={[
          ["EID parcele", parcel.eidParcel], ["Površina", formatDecimal(parcel.areaM2, " m2")],
          ["Boniteta", parcel.boniteta == null ? "ni podatka" : String(parcel.boniteta)],
          ["Status", parcel.administrativeStatus ?? "ni podatka"],
          ["Trenutna posplošena vrednost", formatEur(parcel.generalisedValueTotalEur)],
          ["Modeli vrednotenja", formatNumber(parcel.valuationModelCount)],
        ]} />
        <UseList title="Namenska raba" rows={parcel.plannedUses.map((use) => `${use.name}: ${formatDecimal(use.sharePercent, " %")}`)} />
        <UseList title="Dejanska raba" rows={parcel.actualUses.map((use) => `${use.name} (${use.sourceType}): ${formatDecimal(use.sharePercent, " %")}`)} />
      </CardContent>
    </Card>
  );
}

function BuildingDetail({ building, parts }: { building: Building; parts: BuildingPart[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Building2 aria-hidden="true" className="h-5 w-5 text-[var(--accent)]" />
        <CardTitle>Stavba {building.cadastralMunicipalityCode}/{building.buildingNumber}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <DefinitionGrid rows={[
          ["EID stavbe", building.eidBuilding], ["Tip", building.buildingType ?? "ni podatka"],
          ["Leto izgradnje", building.yearBuilt?.toString() ?? "ni podatka"], ["Obnova strehe", building.roofRenovationYear?.toString() ?? "ni podatka"],
          ["Obnova fasade", building.facadeRenovationYear?.toString() ?? "ni podatka"], ["Konstrukcija", building.construction ?? "ni podatka"],
          ["Etaže", building.floorCount?.toString() ?? "ni podatka"], ["Bruto tlorisna površina", formatDecimal(building.grossFloorAreaM2, " m2")],
          ["Elektrika", booleanLabel(building.hasElectricity)], ["Vodovod", booleanLabel(building.hasWater)],
          ["Kanalizacija", booleanLabel(building.hasSewer)], ["Plin", booleanLabel(building.hasGas)],
        ]} />
        <div>
          <h3 className="mb-2 text-sm font-semibold">Deli stavbe n = {formatNumber(parts.length)}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead><tr className="border-b text-left"><th className="py-2">Del</th><th>Raba</th><th>Površina</th><th>Uporabna</th><th>Vrednost</th></tr></thead>
              <tbody>{parts.map((part) => <tr key={part.eidBuildingPart} className="border-b"><td className="py-2">{part.partNumber}</td><td>{part.actualUse ?? "ni podatka"}</td><td>{formatDecimal(part.areaM2, " m2")}</td><td>{formatDecimal(part.usableAreaM2, " m2")}</td><td>{formatEur(part.generalisedValueEur)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DefinitionGrid({ rows }: { rows: Array<[string, string]> }) {
  return <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([label, value]) => <div key={label} className="border-b border-[var(--border)] pb-2"><dt className="text-xs uppercase text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>;
}

function UseList({ title, rows }: { title: string; rows: string[] }) {
  return <div><h3 className="mb-2 text-sm font-semibold">{title}</h3>{rows.length ? <ul className="space-y-1 text-sm text-[var(--muted)]">{rows.map((row) => <li key={row}>{row}</li>)}</ul> : <p className="text-sm text-[var(--muted)]">Ni podatka.</p>}</div>;
}
