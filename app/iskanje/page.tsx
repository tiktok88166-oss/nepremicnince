import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, ChevronDown, FileSearch, LandPlot, MapPin, ReceiptText, RotateCcw, Ruler, Search, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Field, Input, Select } from "@/components/ui/field";
import { formatDate, formatDecimal, formatEur, formatNumber } from "@/lib/format";
import { searchDatabase, type DatabaseEntityType, type DatabaseSearchFilters, type SearchMunicipality } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const entityOptions: Array<{ value: DatabaseEntityType; label: string }> = [
  { value: "address", label: "Naslovi" },
  { value: "parcel", label: "Parcele" },
  { value: "building", label: "Stavbe" },
  { value: "building-part", label: "Deli stavb" },
  { value: "sale", label: "Prodajni posli" },
  { value: "rental", label: "Najemni posli" },
];

const resultIcons: Record<DatabaseEntityType, LucideIcon> = {
  address: MapPin,
  parcel: LandPlot,
  building: Building2,
  "building-part": Building2,
  sale: ReceiptText,
  rental: FileSearch,
};

export default async function DatabaseSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const result = await searchDatabase(filters).catch(() => ({ rows: [], total: 0, page: filters.page, pageSize: 25 }));
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const advancedActive = [filters.minArea, filters.maxArea, filters.minValue, filters.maxValue, filters.yearFrom, filters.yearTo].some((value) => value != null) || filters.use !== "";

  return (
    <PageShell title="Iskanje po bazi" subtitle="Filtrirajte vse podprte naslove, katastrske zapise ter prodajne in najemne posle neposredno v podatkovni bazi.">
      <form className="rounded-md border border-[var(--border)] bg-white p-4 shadow-[0_4px_18px_rgba(27,45,38,0.06)] sm:p-5" action="/iskanje" method="get">
        <div className="mb-4 flex items-center gap-2"><SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-[var(--accent)]" /><h2 className="font-semibold">Filtri</h2></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field className="col-span-2 lg:col-span-1">Iskalni niz<Input name="q" defaultValue={filters.query} placeholder="Naslov, identifikator, raba ali ID posla" /></Field>
          <Field>Vrsta zapisa<Select name="type" defaultValue={filters.type}>{entityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
          <Field>Območje<Select name="municipality" defaultValue={filters.municipality}><option value="all">Vsa podprta območja</option><option value="061">Ljubljana</option><option value="008">Brezovica</option></Select></Field>
          <Field className="col-span-2 lg:col-span-1">Razvrsti<Select name="sort" defaultValue={filters.sort}><option value="relevance">Privzeto / ujemanje</option><option value="newest">Najnovejše</option><option value="value-desc">Cena: največja najprej</option><option value="value-asc">Cena: najmanjša najprej</option><option value="area-desc">Površina: največja najprej</option><option value="area-asc">Površina: najmanjša najprej</option></Select></Field>
        </div>
        <details className="group mt-4 border-y border-[var(--border)] py-1" open={advancedActive}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden"><span>Napredni filtri{advancedActive ? " · aktivni" : ""}</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
          <div className="grid grid-cols-2 gap-3 pb-3 lg:grid-cols-4">
            <Field>Najmanjša površina<Input name="minArea" type="number" min="0" inputMode="decimal" defaultValue={valueOrEmpty(filters.minArea)} placeholder="m²" /></Field>
            <Field>Največja površina<Input name="maxArea" type="number" min="0" inputMode="decimal" defaultValue={valueOrEmpty(filters.maxArea)} placeholder="m²" /></Field>
            <Field>Najmanjša cena / vrednost<Input name="minValue" type="number" min="0" inputMode="numeric" defaultValue={valueOrEmpty(filters.minValue)} placeholder="EUR" /></Field>
            <Field>Največja cena / vrednost<Input name="maxValue" type="number" min="0" inputMode="numeric" defaultValue={valueOrEmpty(filters.maxValue)} placeholder="EUR" /></Field>
            <Field>Leto od<Input name="yearFrom" type="number" min="1800" max="2100" inputMode="numeric" defaultValue={valueOrEmpty(filters.yearFrom)} /></Field>
            <Field>Leto do<Input name="yearTo" type="number" min="1800" max="2100" inputMode="numeric" defaultValue={valueOrEmpty(filters.yearTo)} /></Field>
            <Field className="col-span-2">Raba ali vrsta<Input name="use" defaultValue={filters.use} placeholder="npr. stanovanje" /></Field>
          </div>
        </details>
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2 sm:flex sm:justify-end">
          <Link href="/iskanje" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--surface-subtle)]"><RotateCcw aria-hidden="true" className="h-4 w-4" /> Ponastavi</Link>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]"><Search aria-hidden="true" className="h-4 w-4" /> Uporabi filtre</button>
        </div>
      </form>

      <section className="mt-7" aria-labelledby="database-results-title">
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="database-results-title" className="text-xl font-semibold">Rezultati</h2><p className="mt-1 text-sm text-[var(--muted)]">{formatNumber(result.total)} zapisov · stran {formatNumber(result.page)} od {formatNumber(pages)}</p></div></div>
        {result.rows.length ? (
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-md border border-[var(--border)] bg-white shadow-[0_4px_18px_rgba(27,45,38,0.05)]">
            {result.rows.map((source) => <DatabaseResult key={`${String(source.entity_type)}-${String(source.id)}`} row={source as Record<string, unknown>} />)}
          </div>
        ) : <div className="border-y border-[var(--border)] bg-white px-4 py-12 text-center"><Search aria-hidden="true" className="mx-auto h-7 w-7 text-[var(--muted)]" /><p className="mt-3 font-semibold">Ni zadetkov</p><p className="mt-1 text-sm text-[var(--muted)]">Spremenite vrsto zapisa ali razširite filtre.</p></div>}

        {pages > 1 ? (
          <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Strani rezultatov">
            {result.page > 1 ? <Link href={pageHref(filters, result.page - 1)} className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold hover:border-[var(--accent)]"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Prejšnja</Link> : <span />}
            {result.page < pages ? <Link href={pageHref(filters, result.page + 1)} className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold hover:border-[var(--accent)]">Naslednja <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link> : null}
          </nav>
        ) : null}
      </section>
    </PageShell>
  );
}

function DatabaseResult({ row }: { row: Record<string, unknown> }) {
  const type = row.entity_type as DatabaseEntityType;
  const Icon = resultIcons[type];
  const municipality = row.municipality_code === "008" ? "Brezovica" : "Ljubljana";
  const href = resultHref(type, String(row.id));
  return (
    <Link href={href} className="group grid min-h-24 grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-3 py-4 hover:bg-[var(--surface-subtle)] sm:grid-cols-[3rem_1fr_auto] sm:px-4">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)] sm:h-12 sm:w-12"><Icon aria-hidden="true" className="h-5 w-5" /></span>
      <span className="min-w-0"><span className="block text-xs font-semibold text-[var(--blue)]">{entityLabel(type)} · {municipality}</span><span className="mt-0.5 block truncate font-semibold group-hover:text-[var(--accent-strong)]">{String(row.title)}</span>{row.detail ? <span className="mt-1 block truncate text-xs text-[var(--muted)] sm:text-sm">{String(row.detail)}</span> : null}<span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">{row.area_m2 != null ? <span className="inline-flex items-center gap-1"><Ruler aria-hidden="true" className="h-3.5 w-3.5" />{formatDecimal(Number(row.area_m2), " m²")}</span> : null}{row.record_date ? <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />{formatDate(String(row.record_date))}</span> : null}</span></span>
      <span className="flex shrink-0 items-center gap-2">{row.value_eur != null ? <span className="hidden text-right sm:block"><span className="block text-xs text-[var(--muted)]">{type === "rental" ? "Najemnina" : type === "sale" ? "Cena" : "Vrednost"}</span><span className="font-semibold tabular-nums">{formatEur(Number(row.value_eur))}</span></span> : null}<ArrowRight aria-hidden="true" className="h-5 w-5 text-[var(--muted)]" /></span>
    </Link>
  );
}

function parseFilters(params: SearchParams): DatabaseSearchFilters {
  const typeValue = single(params.type);
  const type = entityOptions.some((option) => option.value === typeValue) ? typeValue as DatabaseEntityType : "parcel";
  const municipalityValue = single(params.municipality);
  const municipality: SearchMunicipality = municipalityValue === "008" || municipalityValue === "061" ? municipalityValue : "all";
  const sortValue = single(params.sort);
  const sorts: DatabaseSearchFilters["sort"][] = ["relevance", "newest", "value-desc", "value-asc", "area-desc", "area-asc"];
  return {
    type,
    municipality,
    query: single(params.q).slice(0, 100),
    minArea: positiveNumber(params.minArea),
    maxArea: positiveNumber(params.maxArea),
    minValue: positiveNumber(params.minValue),
    maxValue: positiveNumber(params.maxValue),
    yearFrom: boundedYear(params.yearFrom),
    yearTo: boundedYear(params.yearTo),
    use: single(params.use).slice(0, 80),
    sort: sorts.includes(sortValue as DatabaseSearchFilters["sort"]) ? sortValue as DatabaseSearchFilters["sort"] : "relevance",
    page: Math.max(1, Math.floor(Number(single(params.page)) || 1)),
  };
}

function pageHref(filters: DatabaseSearchFilters, page: number) {
  const params = new URLSearchParams({ type: filters.type, municipality: filters.municipality, sort: filters.sort, page: String(page) });
  if (filters.query) params.set("q", filters.query);
  if (filters.use) params.set("use", filters.use);
  for (const key of ["minArea", "maxArea", "minValue", "maxValue", "yearFrom", "yearTo"] as const) if (filters[key] != null) params.set(key, String(filters[key]));
  return `/iskanje?${params.toString()}`;
}

function resultHref(type: DatabaseEntityType, id: string) {
  if (type === "sale") return `/posel/${encodeURIComponent(id)}`;
  if (type === "rental") return `/najem/${encodeURIComponent(id)}`;
  return `/nepremicnina/${type}/${encodeURIComponent(id)}`;
}

function entityLabel(type: DatabaseEntityType) {
  return entityOptions.find((option) => option.value === type)?.label ?? type;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positiveNumber(value: string | string[] | undefined) {
  const parsed = Number(single(value));
  return Number.isFinite(parsed) && parsed >= 0 && single(value) !== "" ? parsed : null;
}

function boundedYear(value: string | string[] | undefined) {
  const parsed = Math.floor(Number(single(value)));
  return Number.isFinite(parsed) && parsed >= 1800 && parsed <= 2100 ? parsed : null;
}

function valueOrEmpty(value: number | null) {
  return value == null ? "" : String(value);
}
