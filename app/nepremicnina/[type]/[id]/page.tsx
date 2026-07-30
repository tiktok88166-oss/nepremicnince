import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, CircleAlert, Euro, LandPlot, MapPin, Ruler } from "lucide-react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { formatDate, formatDecimal, formatEur, formatNumber } from "@/lib/format";
import { getPropertyReport, type PropertyType } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

const validTypes = new Set<PropertyType>(["address", "parcel", "building", "building-part"]);

export default async function PropertyReportPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type: rawType, id } = await params;
  if (!validTypes.has(rawType as PropertyType)) notFound();
  const report = await getPropertyReport(rawType as PropertyType, decodeURIComponent(id)).catch(() => null);
  if (!report) notFound();

  const property = report.property as Record<string, unknown>;
  const title = propertyTitle(rawType as PropertyType, property);
  const municipality = property.municipality_code === "008" ? "Brezovica" : "Ljubljana";

  return (
    <PageShell title={title} subtitle={`Poročilo za posamezno nepremičnino · ${municipality}`}>
      <Link href={`/?municipality=${String(property.municipality_code)}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Nazaj na iskanje</Link>

      <div className="grid gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
        {property.address ? <Fact icon={MapPin} label="Naslov" value={String(property.address)} /> : null}
        {property.area_m2 != null ? <Fact icon={Ruler} label="Površina" value={formatDecimal(Number(property.area_m2), " m²")} /> : null}
        {property.usable_area_m2 != null ? <Fact icon={Ruler} label="Uporabna površina" value={formatDecimal(Number(property.usable_area_m2), " m²")} /> : null}
        {property.generalised_value_eur != null ? <Fact icon={Euro} label="Posplošena vrednost" value={formatEur(Number(property.generalised_value_eur))} /> : null}
        {property.year_built != null ? <Fact icon={CalendarDays} label="Leto gradnje" value={formatNumber(Number(property.year_built))} /> : null}
        {property.planned_use ? <Fact icon={LandPlot} label="Namenska raba" value={String(property.planned_use)} /> : null}
        {property.actual_use ? <Fact icon={Building2} label="Dejanska raba" value={String(property.actual_use)} /> : null}
        {property.label ? <Fact icon={MapPin} label="Naslov" value={String(property.label)} /> : null}
      </div>

      <section className="mt-8" aria-labelledby="transactions-title">
        <div className="mb-4 flex items-end justify-between gap-3"><div><h2 id="transactions-title" className="text-xl font-semibold sm:text-2xl">Zgodovina poslov</h2><p className="mt-1 text-sm text-[var(--muted)]">Ujemanje temelji na katastrskih identifikatorjih iz ETN.</p></div><span className="text-sm font-semibold">{report.sales.length + report.rentals.length} zapisov</span></div>
        {report.sales.length || report.rentals.length ? (
          <div className="overflow-x-auto border-y border-[var(--border)] bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-xs text-[var(--muted)]"><tr><th className="px-4 py-3">Vrsta</th><th className="px-4 py-3">Datum</th><th className="px-4 py-3">Znesek</th><th className="px-4 py-3">Cena na m²</th><th className="px-4 py-3">Status GURS</th></tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {report.sales.map((row) => <TransactionRow key={String(row.source_key)} type="Prodaja" row={row as Record<string, unknown>} />)}
                {report.rentals.map((row) => <TransactionRow key={String(row.source_key)} type="Najem" row={row as Record<string, unknown>} />)}
              </tbody>
            </table>
          </div>
        ) : <div className="border-y border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">Za ta identifikator ni najdenih povezanih poslov.</div>}
      </section>

      {report.parts.length ? (
        <section className="mt-8" aria-labelledby="parts-title">
          <h2 id="parts-title" className="text-xl font-semibold sm:text-2xl">Povezani deli stavbe</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.parts.slice(0, 60).map((part) => <Link key={String(part.eid)} href={`/nepremicnina/building-part/${encodeURIComponent(String(part.eid))}`} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white p-3 hover:border-[var(--accent)]"><span className="min-w-0"><span className="block font-semibold">Del {String(part.part_number)}</span><span className="block truncate text-xs text-[var(--muted)]">{String(part.actual_use ?? "Raba ni navedena")}</span></span><span className="text-sm text-[var(--muted)]">{part.usable_area_m2 == null ? "" : formatDecimal(Number(part.usable_area_m2), " m²")}</span></Link>)}
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex gap-3 border-l-[3px] border-[#c58a2c] bg-[#fff9ec] p-4 text-sm leading-6 text-[#6a4a17]"><CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><p>Podatki so informativni. Posplošena vrednost je trenutna evidenčna vrednost in ni ocena tržne vrednosti na datum starejšega posla. Pogodbena cena lahko zajema več nepremičnin.</p></div>
    </PageShell>
  );
}

function propertyTitle(type: PropertyType, property: Record<string, unknown>) {
  if (type === "address") return String(property.label);
  if (type === "parcel") return `Parcela ${property.cadastral_municipality_code} ${property.parcel_number}`;
  if (type === "building") return `Stavba ${property.cadastral_municipality_code}-${property.building_number}`;
  return `Del stavbe ${property.cadastral_municipality_code}-${property.building_number}-${property.part_number}`;
}

function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div className="min-w-0 bg-white p-4"><Icon aria-hidden="true" className="mb-3 h-5 w-5 text-[var(--accent)]" /><dt className="text-xs font-semibold text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>;
}

function TransactionRow({ type, row }: { type: string; row: Record<string, unknown> }) {
  const amount = type === "Prodaja" ? row.price_eur : row.rent_eur;
  return <tr><th className="px-4 py-3 font-semibold">{type}</th><td className="px-4 py-3">{formatDate(row.contract_date ? String(row.contract_date) : null)}</td><td className="px-4 py-3 font-semibold tabular-nums">{amount == null ? "ni podatka" : formatEur(Number(amount))}</td><td className="px-4 py-3 tabular-nums">{row.rent_eur_m2 == null ? "-" : formatDecimal(Number(row.rent_eur_m2), " €/m²")}</td><td className="px-4 py-3 text-[var(--muted)]">{String(row.marketability ?? "ni podatka")}</td></tr>;
}
