import { ArrowDownRight, ArrowUpRight, Building2, Euro, FileSearch, LandPlot } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { formatDecimal, formatEur, formatNumber } from "@/lib/format";
import { getMunicipalityComparison } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

export default async function ComparisonPage() {
  const comparison = await getMunicipalityComparison().catch(() => null);
  const ljubljana = comparison?.ljubljana;
  const brezovica = comparison?.brezovica;
  const years = [...new Set([...(ljubljana?.yearly ?? []), ...(brezovica?.yearly ?? [])].map((row) => Number(row.year)))].sort();

  return (
    <PageShell title="Primerjava občin" subtitle="Ljubljana in Brezovica po obsegu podatkov, prodajni aktivnosti in mediani pogodbene cene.">
      <div className="grid gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
        <ComparisonMetric icon={LandPlot} label="Parcele" ljubljana={ljubljana?.coverage?.parcels} brezovica={brezovica?.coverage?.parcels} />
        <ComparisonMetric icon={Building2} label="Stavbe" ljubljana={ljubljana?.coverage?.buildings} brezovica={brezovica?.coverage?.buildings} />
        <ComparisonMetric icon={FileSearch} label="Potrjene prodaje" ljubljana={ljubljana?.market?.confirmed_sales} brezovica={brezovica?.market?.confirmed_sales} />
        <ComparisonMetric icon={Euro} label="Mediana cene" ljubljana={ljubljana?.market?.median_price} brezovica={brezovica?.market?.median_price} currency />
      </div>

      <section className="mt-8" aria-labelledby="year-comparison-title">
        <h2 id="year-comparison-title" className="text-xl font-semibold sm:text-2xl">Prodajna aktivnost po letih</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Prikazani so samo posli, ki niso več v preverjanju.</p>
        <div className="mt-4 overflow-x-auto border-y border-[var(--border)] bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--surface-subtle)] text-xs text-[var(--muted)]"><tr><th className="px-4 py-3">Leto</th><th className="px-4 py-3">Ljubljana · prodaje</th><th className="px-4 py-3">Ljubljana · mediana</th><th className="px-4 py-3">Brezovica · prodaje</th><th className="px-4 py-3">Brezovica · mediana</th></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">{years.map((year) => {
              const lj = ljubljana?.yearly.find((row) => Number(row.year) === year);
              const br = brezovica?.yearly.find((row) => Number(row.year) === year);
              return <tr key={year}><th className="px-4 py-3 font-semibold">{year}</th><td className="px-4 py-3 tabular-nums">{lj ? formatNumber(Number(lj.sales)) : "-"}</td><td className="px-4 py-3 tabular-nums">{lj?.median_price ? formatEur(Number(lj.median_price)) : "-"}</td><td className="px-4 py-3 tabular-nums">{br ? formatNumber(Number(br.sales)) : "-"}</td><td className="px-4 py-3 tabular-nums">{br?.median_price ? formatEur(Number(br.median_price)) : "-"}</td></tr>;
            })}</tbody>
          </table>
          {!years.length ? <p className="p-8 text-center text-sm text-[var(--muted)]">Primerjava trenutno ni dosegljiva.</p> : null}
        </div>
      </section>

      <div className="mt-8 grid gap-4 border-y border-[var(--border)] py-5 text-sm leading-6 text-[var(--muted)] md:grid-cols-2">
        <p>Večje število poslov ne pomeni boljše donosnosti ali višje kakovosti trga. Ljubljana ima bistveno večji fond nepremičnin in drugačno sestavo poslov.</p>
        <p>Mediana pogodbene cene ni cena na kvadratni meter. Za presojo posamezne nepremičnine uporabite njeno poročilo in bližnje primerljive prodaje.</p>
      </div>
    </PageShell>
  );
}

function ComparisonMetric({ icon: Icon, label, ljubljana, brezovica, currency = false }: { icon: typeof LandPlot; label: string; ljubljana: unknown; brezovica: unknown; currency?: boolean }) {
  const lj = ljubljana == null ? null : Number(ljubljana);
  const br = brezovica == null ? null : Number(brezovica);
  const formatter = currency ? formatEur : formatNumber;
  const ratio = lj != null && br != null && br !== 0 ? lj / br : null;
  const DifferenceIcon = ratio != null && ratio < 1 ? ArrowDownRight : ArrowUpRight;
  return <div className="min-w-0 bg-white p-4 sm:p-5"><Icon aria-hidden="true" className="mb-3 h-5 w-5 text-[var(--accent)]" /><h2 className="text-sm font-semibold text-[var(--muted)]">{label}</h2><dl className="mt-3 space-y-2"><div className="flex items-baseline justify-between gap-2"><dt className="text-xs text-[var(--muted)]">Ljubljana</dt><dd className="text-lg font-semibold tabular-nums">{lj == null ? "-" : formatter(lj)}</dd></div><div className="flex items-baseline justify-between gap-2"><dt className="text-xs text-[var(--muted)]">Brezovica</dt><dd className="text-lg font-semibold tabular-nums">{br == null ? "-" : formatter(br)}</dd></div></dl>{ratio != null ? <p className="mt-3 flex items-center gap-1 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]"><DifferenceIcon aria-hidden="true" className="h-4 w-4" /> Razmerje {formatDecimal(ratio)}×</p> : null}</div>;
}
