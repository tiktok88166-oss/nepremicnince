import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { formatEur, formatNumber } from "@/lib/format";
import { getOverview, normalizeMunicipality } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ municipality?: string }> }) {
  const params = await searchParams;
  const municipality = normalizeMunicipality(params.municipality);
  const data = await getOverview(municipality).catch(() => null);
  const name = municipality === "061" ? "Ljubljana" : "Brezovica";

  return (
    <PageShell title={`Analize · ${name}`} subtitle="Časovni pregled potrjenih ETN prodaj ter porazdelitev po vrstah nepremičnin.">
      <div className="mb-6 inline-flex rounded-md border border-[var(--border)] bg-white p-1">
        <Link href="/analiza?municipality=061" className={`rounded px-3 py-2 text-sm font-semibold ${municipality === "061" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>Ljubljana</Link>
        <Link href="/analiza?municipality=008" className={`rounded px-3 py-2 text-sm font-semibold ${municipality === "008" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>Brezovica</Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <section aria-labelledby="years-title">
          <h2 id="years-title" className="text-xl font-semibold">Prodaje in mediana pogodbene cene</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Cena pripada poslu in lahko vključuje več sestavin.</p>
          <div className="mt-4 overflow-x-auto border-y border-[var(--border)] bg-white">
            <table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-[var(--surface-subtle)] text-xs text-[var(--muted)]"><tr><th className="px-4 py-3">Leto</th><th className="px-4 py-3">Potrjene prodaje</th><th className="px-4 py-3">Mediana</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{data?.yearly.map((row) => <tr key={String(row.year)}><th className="px-4 py-3 font-semibold">{String(row.year)}</th><td className="px-4 py-3 tabular-nums">{formatNumber(Number(row.sales))}</td><td className="px-4 py-3 tabular-nums">{row.median_price == null ? "-" : formatEur(Number(row.median_price))}</td></tr>)}</tbody></table>
            {!data?.yearly.length ? <p className="p-8 text-center text-sm text-[var(--muted)]">Baza še ni napolnjena.</p> : null}
          </div>
        </section>
        <section aria-labelledby="types-title">
          <h2 id="types-title" className="text-xl font-semibold">Vrste nepremičnin</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Število poslov po sestavinah ETN.</p>
          <ol className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white">
            {data?.categories.map((row, index) => <li key={String(row.name)} className="flex items-center gap-3 px-3 py-3 text-sm"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]">{index + 1}</span><span className="min-w-0 flex-1 truncate">{String(row.name)}</span><span className="font-semibold tabular-nums">{formatNumber(Number(row.value))}</span></li>)}
          </ol>
        </section>
      </div>
      <div className="mt-8 border-l-[3px] border-[var(--accent)] pl-4 text-sm leading-6 text-[var(--muted)]">Posli z oznako »V preverjanju« so privzeto izključeni. Starejše in novejše mediane niso neposredna cenovna primerjava brez upoštevanja vrste, lokacije, površine in sestave posla.</div>
    </PageShell>
  );
}
