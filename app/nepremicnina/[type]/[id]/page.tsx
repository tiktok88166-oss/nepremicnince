import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleMinus,
  Clock3,
  Euro,
  LandPlot,
  MapPin,
  Minus,
  Plus,
  Ruler,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ReportActions } from "@/components/ReportActions";
import { formatDate, formatDecimal, formatEur, formatNumber } from "@/lib/format";
import type { PropertyComparisonItem } from "@/lib/property-comparison";
import type { ComparableReason, MarketEstimate } from "@/lib/property-estimate";
import { getPropertyReport, type PropertyType } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

const validTypes = new Set<PropertyType>(["address", "parcel", "building", "building-part"]);

export default async function PropertyReportPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type: rawType, id } = await params;
  if (!validTypes.has(rawType as PropertyType)) notFound();
  const type = rawType as PropertyType;
  const report = await getPropertyReport(type, decodeURIComponent(id)).catch(() => null);
  if (!report) notFound();

  const property = report.property as Record<string, unknown>;
  const title = propertyTitle(type, property);
  const municipality = property.municipality_code === "008" ? "Brezovica" : "Ljubljana";
  const area = numberOrNull(property.usable_area_m2 ?? property.area_m2);
  const value = numberOrNull(property.generalised_value_eur);
  const estimate = report.estimate as MarketEstimate | null;
  const comparison: PropertyComparisonItem = {
    id: `${type}:${id}`,
    title,
    href: `/nepremicnina/${type}/${encodeURIComponent(id)}`,
    kind: propertyKind(type),
    municipality,
    areaM2: area,
    generalisedValueEur: value,
    use: stringOrNull(property.actual_use ?? property.planned_use),
    yearBuilt: numberOrNull(property.year_built),
    estimateLow: estimate?.low ?? null,
    estimateCentral: estimate?.central ?? null,
    estimateHigh: estimate?.high ?? null,
    confidence: estimate?.confidence ?? null,
    comparableCount: report.comparables.length,
  };

  return (
    <PageShell title={title} subtitle={`Pregled posamezne nepremičnine · ${municipality}`}>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Link href={`/?municipality=${String(property.municipality_code)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Nazaj na iskanje</Link>
        <ReportActions reportId={`${type}:${id}`} title={title} comparison={comparison} />
      </div>

      <DecisionSummary property={property} type={type} estimate={estimate} comparableCount={report.comparables.length} />

      <dl className="mt-5 grid gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
        {property.address ? <Fact icon={MapPin} label="Naslov" value={String(property.address)} /> : null}
        {property.label ? <Fact icon={MapPin} label="Naslov" value={String(property.label)} /> : null}
        {property.area_m2 != null ? <Fact icon={Ruler} label="Površina" value={formatDecimal(Number(property.area_m2), " m²")} /> : null}
        {property.usable_area_m2 != null ? <Fact icon={Ruler} label="Uporabna površina" value={formatDecimal(Number(property.usable_area_m2), " m²")} /> : null}
        {property.generalised_value_eur != null ? <Fact icon={Euro} label="Posplošena vrednost GURS" value={formatEur(Number(property.generalised_value_eur))} /> : null}
        {property.year_built != null ? <Fact icon={CalendarDays} label="Leto gradnje" value={formatNumber(Number(property.year_built))} /> : null}
        {property.planned_use ? <Fact icon={LandPlot} label="Namenska raba" value={String(property.planned_use)} /> : null}
        {property.actual_use ? <Fact icon={Building2} label="Dejanska raba" value={String(property.actual_use)} /> : null}
        {property.floor_count != null ? <Fact icon={Building2} label="Število etaž" value={formatNumber(Number(property.floor_count))} /> : null}
        {property.apartment_count != null ? <Fact icon={Building2} label="Stanovanja" value={formatNumber(Number(property.apartment_count))} /> : null}
        {property.facade_renovation_year != null ? <Fact icon={CalendarDays} label="Obnova fasade" value={formatNumber(Number(property.facade_renovation_year))} /> : null}
        {property.roof_renovation_year != null ? <Fact icon={CalendarDays} label="Obnova strehe" value={formatNumber(Number(property.roof_renovation_year))} /> : null}
        {property.window_renovation_year != null ? <Fact icon={CalendarDays} label="Obnova oken" value={formatNumber(Number(property.window_renovation_year))} /> : null}
        {property.installation_renovation_year != null ? <Fact icon={CalendarDays} label="Obnova instalacij" value={formatNumber(Number(property.installation_renovation_year))} /> : null}
        {property.source_updated_on ? <Fact icon={Clock3} label="Stanje katastrskih podatkov" value={formatDate(String(property.source_updated_on))} /> : null}
      </dl>

      <EstimatePanel estimate={estimate} comparableCount={report.comparables.length} type={type} generalisedValue={value} />

      <section className="mt-8" aria-labelledby="scope-title">
        <h2 id="scope-title" className="text-xl font-semibold sm:text-2xl">Obseg tega pregleda</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Razlika med manjkajočim podatkom in slojem, ki sploh še ni vključen.</p>
        <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {availability(type, property).map((item) => <AvailabilityItem key={item.label} {...item} />)}
        </div>
      </section>

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
          <div className="mt-4 grid max-h-[34rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {report.parts.slice(0, 60).map((part) => <Link key={String(part.eid)} href={`/nepremicnina/building-part/${encodeURIComponent(String(part.eid))}`} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white p-3 hover:border-[var(--accent)]"><span className="min-w-0"><span className="block font-semibold">Del {String(part.part_number)}</span><span className="block truncate text-xs text-[var(--muted)]">{String(part.actual_use ?? "Raba ni navedena")}</span></span><span className="text-sm text-[var(--muted)]">{part.usable_area_m2 == null ? "" : formatDecimal(Number(part.usable_area_m2), " m²")}</span></Link>)}
          </div>
        </section>
      ) : null}

      {report.comparables.length ? (
        <section className="mt-8" aria-labelledby="comparables-title">
          <div className="mb-4"><h2 id="comparables-title" className="text-xl font-semibold sm:text-2xl">Primerljive prodaje v bližini</h2><p className="mt-1 text-sm text-[var(--muted)]">Potrjeni enosestavinski posli do 2 km. Razvrščeni so po podobnosti površine, oddaljenosti in starosti.</p></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {report.comparables.map((row) => <ComparableCard key={String(row.source_key)} row={row as Record<string, unknown>} />)}
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex gap-3 border-l-[3px] border-[#c58a2c] bg-[#fff9ec] p-4 text-sm leading-6 text-[#6a4a17]"><CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><p>Podatki so informativni. Statistična ocena, ročna presoja uporabnika in trenutna posplošena vrednost GURS so različni podatki. Nobeden od prikazov ne nadomešča cenitve ali pravnega in prostorskega pregleda.</p></div>
    </PageShell>
  );
}

function DecisionSummary({ property, type, estimate, comparableCount }: { property: Record<string, unknown>; type: PropertyType; estimate: MarketEstimate | null; comparableCount: number }) {
  const area = numberOrNull(property.usable_area_m2 ?? property.area_m2);
  return (
    <section className="border-y border-[var(--border)] bg-white px-4 py-5 sm:px-5" aria-labelledby="decision-summary-title">
      <div className="flex gap-3"><TrendingUp aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" /><div><h2 id="decision-summary-title" className="font-semibold">Povzetek za odločanje</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{propertyKind(type)}{area == null ? "" : ` meri ${formatDecimal(area, " m²")}`}. Najdenih je {formatNumber(comparableCount)} bližnjih potrjenih prodaj. {estimate ? <>Indikativni tržni razpon je <strong className="text-[var(--foreground)]">{formatEur(estimate.low)}–{formatEur(estimate.high)}</strong>, stopnja zaupanja pa {estimate.confidence}.</> : <>Za varen statistični razpon ni dovolj primerljivih poslov ali ni znana uporabna površina.</>} Prostorski režimi, GJI in pravno stanje niso vključeni.</p></div></div>
    </section>
  );
}

function EstimatePanel({ estimate, comparableCount, type, generalisedValue }: { estimate: MarketEstimate | null; comparableCount: number; type: PropertyType; generalisedValue: number | null }) {
  return (
    <section className="mt-8 border-y border-[var(--border)] bg-white px-4 py-5 sm:px-5" aria-labelledby="estimate-title">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h2 id="estimate-title" className="text-xl font-semibold sm:text-2xl">Indikativna tržna ocena</h2><p className="mt-1 text-sm text-[var(--muted)]">Statistični pogled na potrjene prodaje, ločen od posplošene vrednosti GURS.</p></div>{estimate ? <p className="text-sm font-semibold">Zaupanje: <span className="text-[var(--accent-strong)]">{estimate.confidence}</span></p> : null}</div>
      {estimate ? (
        <dl className="mt-5 grid gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          <EstimateFact label="Spodnja meja" value={formatEur(estimate.low)} />
          <EstimateFact label="Osrednja ocena" value={formatEur(estimate.central)} strong />
          <EstimateFact label="Zgornja meja" value={formatEur(estimate.high)} />
          <EstimateFact label="Vzorec" value={`n = ${formatNumber(estimate.sampleSize)}`} />
        </dl>
      ) : <p className="mt-5 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm leading-6 text-[var(--muted)]">Ocena se prikaže za parcelo ali del stavbe z znano površino in najmanj štirimi uporabnimi primerljivimi prodajami. Trenutno je na voljo {formatNumber(comparableCount)} primerjav za zapis vrste »{propertyKind(type).toLocaleLowerCase("sl")}«.</p>}
      <div className="mt-4 grid gap-3 text-xs leading-5 text-[var(--muted)] sm:grid-cols-2"><p><strong className="text-[var(--foreground)]">Statistična ocena:</strong> kvartilni razpon cen na m², pomnožen s površino iz evidence.</p><p><strong className="text-[var(--foreground)]">Posplošena vrednost GURS:</strong> {generalisedValue == null ? "za ta zapis ni navedena" : formatEur(generalisedValue)}. Ni združena s statistično oceno.</p></div>
    </section>
  );
}

function ComparableCard({ row }: { row: Record<string, unknown> }) {
  const reasons = (row.reasons ?? []) as ComparableReason[];
  return (
    <article className="rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[var(--muted)]">{formatDate(row.contract_date ? String(row.contract_date) : null)} · {formatNumber(Number(row.distance_m))} m</p><h3 className="mt-1 font-semibold">{String(row.property_type ?? "Vrsta ni navedena")}</h3></div><span className="text-sm font-semibold tabular-nums text-[var(--accent-strong)]">{formatNumber(Number(row.score))}/100</span></div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-[var(--border)] py-3 text-sm"><div><dt className="text-xs text-[var(--muted)]">Površina</dt><dd className="mt-1 font-semibold tabular-nums">{formatDecimal(Number(row.sold_area_m2), " m²")}</dd></div><div><dt className="text-xs text-[var(--muted)]">Cena</dt><dd className="mt-1 font-semibold tabular-nums">{formatEur(Number(row.price_eur))}</dd></div><div><dt className="text-xs text-[var(--muted)]">Cena/m²</dt><dd className="mt-1 font-semibold tabular-nums">{formatEur(Number(row.price_eur_m2))}</dd></div></dl>
      <ul className="mt-3 space-y-1.5 text-xs leading-5">{reasons.map((reason) => <li key={reason.text} className="flex gap-2"><ReasonIcon tone={reason.tone} /><span className={reason.tone === "negative" ? "text-[#8c4a22]" : "text-[var(--muted)]"}>{reason.text}</span></li>)}</ul>
    </article>
  );
}

function ReasonIcon({ tone }: { tone: ComparableReason["tone"] }) {
  if (tone === "positive") return <Plus aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />;
  if (tone === "negative") return <Minus aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a45f25]" />;
  return <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />;
}

function availability(type: PropertyType, property: Record<string, unknown>) {
  const useAvailable = Boolean(property.actual_use ?? property.planned_use);
  return [
    { label: "Kataster in osnovni podatki", status: "included" as const, detail: "Vključeno" },
    { label: "Prodajni in najemni posli ETN", status: "included" as const, detail: "Vključeno, če obstaja točno ujemanje" },
    { label: "Posplošena vrednost GURS", status: property.generalised_value_eur == null ? "missing" as const : "included" as const, detail: property.generalised_value_eur == null ? "Za zapis ni podatka" : "Vključeno" },
    { label: type === "parcel" ? "Namenska raba" : "Dejanska raba", status: useAvailable ? "included" as const : "missing" as const, detail: useAvailable ? "Vključeno" : "Za zapis ni podatka" },
    { label: "OPN, OPPN in prostorski režimi", status: "unavailable" as const, detail: "Sloji še niso vključeni" },
    { label: "GJI, dostop, optika in pravno stanje", status: "unavailable" as const, detail: "Sloji še niso vključeni" },
  ];
}

function AvailabilityItem({ label, status, detail }: ReturnType<typeof availability>[number]) {
  const Icon = status === "included" ? CheckCircle2 : status === "missing" ? CircleAlert : CircleMinus;
  const color = status === "included" ? "text-[var(--accent)]" : status === "missing" ? "text-[#a46710]" : "text-[var(--muted)]";
  return <div className="flex gap-3 bg-white p-4"><Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} /><div><h3 className="text-sm font-semibold">{label}</h3><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div></div>;
}

function propertyTitle(type: PropertyType, property: Record<string, unknown>) {
  if (type === "address") return String(property.label);
  if (type === "parcel") return `Parcela ${property.cadastral_municipality_code} ${property.parcel_number}`;
  if (type === "building") return `Stavba ${property.cadastral_municipality_code}-${property.building_number}`;
  return `Del stavbe ${property.cadastral_municipality_code}-${property.building_number}-${property.part_number}`;
}

function propertyKind(type: PropertyType) {
  if (type === "address") return "Naslov";
  if (type === "parcel") return "Parcela";
  if (type === "building") return "Stavba";
  return "Del stavbe";
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="min-w-0 bg-white p-4"><Icon aria-hidden="true" className="mb-3 h-5 w-5 text-[var(--accent)]" /><dt className="text-xs font-semibold text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>;
}

function EstimateFact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="bg-white p-4"><dt className="text-xs font-semibold text-[var(--muted)]">{label}</dt><dd className={`mt-1 tabular-nums ${strong ? "text-xl font-semibold text-[var(--accent-strong)]" : "font-semibold"}`}>{value}</dd></div>;
}

function TransactionRow({ type, row }: { type: string; row: Record<string, unknown> }) {
  const amount = type === "Prodaja" ? row.price_eur : row.rent_eur;
  const unitPrice = type === "Prodaja" ? row.price_eur_m2 : row.rent_eur_m2;
  return <tr><th className="px-4 py-3 font-semibold">{type}</th><td className="px-4 py-3">{formatDate(row.contract_date ? String(row.contract_date) : null)}</td><td className="px-4 py-3 font-semibold tabular-nums">{amount == null ? "ni podatka" : formatEur(Number(amount))}</td><td className="px-4 py-3 tabular-nums">{unitPrice == null ? "-" : formatDecimal(Number(unitPrice), " €/m²")}</td><td className="px-4 py-3 text-[var(--muted)]">{String(row.marketability ?? "ni podatka")}</td></tr>;
}

function numberOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringOrNull(value: unknown) {
  return value == null || value === "" ? null : String(value);
}
