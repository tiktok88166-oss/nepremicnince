import Link from "next/link";
import { ArrowRight, Building2, Database, FileSearch, LandPlot } from "lucide-react";
import { PropertySearch } from "@/components/PropertySearch";
import { formatEur, formatNumber } from "@/lib/format";
import { getOverview, normalizeMunicipality } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ municipality?: string }> }) {
  const params = await searchParams;
  const municipality = normalizeMunicipality(params.municipality);
  const data = await getOverview(municipality).catch(() => null);
  const municipalityName = municipality === "061" ? "Ljubljana" : "Brezovica";
  const coverage = data?.coverage;
  const market = data?.market;

  return (
    <main>
      <section className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-9">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-2 text-sm font-semibold text-[var(--accent-strong)]">Prostorski pregled nepremičnin</p>
            <h1 className="text-3xl font-semibold tracking-normal sm:text-5xl">{municipalityName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">Javni podatki GURS o naslovih, parcelah, stavbah, vrednotenju ter prodajnih in najemnih poslih na enem mestu.</p>
          </div>
          <div className="inline-flex w-fit rounded-md border border-[var(--border)] bg-white p-1" aria-label="Izbira občine">
            <Link className={`rounded px-3 py-2 text-sm font-semibold ${municipality === "061" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`} href="/?municipality=061">Ljubljana</Link>
            <Link className={`rounded px-3 py-2 text-sm font-semibold ${municipality === "008" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`} href="/?municipality=008">Brezovica</Link>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] lg:grid-cols-4">
          <Metric icon={LandPlot} label="Parcele" value={coverage ? formatNumber(Number(coverage.parcels)) : "-"} />
          <Metric icon={Building2} label="Stavbe" value={coverage ? formatNumber(Number(coverage.buildings)) : "-"} />
          <Metric icon={FileSearch} label="Potrjene prodaje" value={market ? formatNumber(Number(market.confirmed_sales)) : "-"} />
          <Metric icon={Database} label="Mediana cene" value={market?.median_price ? formatEur(Number(market.median_price)) : "-"} />
        </div>
      </section>

      <PropertySearch initialMunicipality={municipality} />

      <section className="mx-auto max-w-7xl px-3 py-7 sm:px-4 sm:py-10">
        <div className="grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div><h2 className="text-xl font-semibold sm:text-2xl">Prodaje po letih</h2><p className="mt-1 text-sm text-[var(--muted)]">Posli v preverjanju niso vključeni.</p></div>
              <Link href={`/analiza?municipality=${municipality}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent-strong)]">Analize <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            </div>
            <div className="border-y border-[var(--border)] py-4">
              {data?.yearly?.length ? (
                <div className="space-y-2">
                  {data.yearly.slice(-8).map((row) => {
                    const maximum = Math.max(...data.yearly.map((item) => Number(item.sales)));
                    return <div key={String(row.year)} className="grid grid-cols-[3rem_1fr_4rem] items-center gap-2 text-sm"><span>{String(row.year)}</span><span className="h-5 bg-[var(--accent-soft)]"><span className="block h-full bg-[var(--accent)]" style={{ width: `${Math.max(2, Number(row.sales) / maximum * 100)}%` }} /></span><span className="text-right font-semibold">{formatNumber(Number(row.sales))}</span></div>;
                  })}
                </div>
              ) : <p className="py-8 text-center text-sm text-[var(--muted)]">Podatkovna baza še ni napolnjena.</p>}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">Pokritost</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Trenutni javni podatkovni sloji.</p>
            <dl className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)] text-sm">
              <CoverageRow label="Naslovi" value={coverage?.addresses} />
              <CoverageRow label="Parcele" value={coverage?.parcels} />
              <CoverageRow label="Stavbe" value={coverage?.buildings} />
              <CoverageRow label="Deli stavb" value={coverage?.building_parts} />
              <CoverageRow label="Prodaje" value={coverage?.sales} />
              <CoverageRow label="Najemi" value={coverage?.rentals} />
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof LandPlot; label: string; value: string }) {
  return <div className="min-w-0 bg-white p-4 sm:p-5"><Icon aria-hidden="true" className="mb-3 h-5 w-5 text-[var(--accent)]" /><p className="truncate text-xs font-semibold text-[var(--muted)] sm:text-sm">{label}</p><p className="mt-1 truncate text-xl font-semibold sm:text-2xl">{value}</p></div>;
}

function CoverageRow({ label, value }: { label: string; value: unknown }) {
  return <div className="flex justify-between gap-3 py-3"><dt className="text-[var(--muted)]">{label}</dt><dd className="font-semibold">{value == null ? "-" : formatNumber(Number(value))}</dd></div>;
}
