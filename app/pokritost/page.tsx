import { PageShell } from "@/components/PageShell";
import { formatNumber } from "@/lib/format";
import { getCoverage } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  const rows = await getCoverage().catch(() => []);
  return (
    <PageShell title="Pokritost podatkov" subtitle="Pregled trenutno uvoženih javnih podatkov po občinah. Osebni in lastniški podatki niso del aplikacije.">
      <div className="overflow-x-auto border-y border-[var(--border)] bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--surface-subtle)] text-xs text-[var(--muted)]"><tr>{["Občina", "Naslovi", "Parcele", "Stavbe", "Deli stavb", "Prodaje", "Najemi"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => <tr key={String(row.code)}><th className="px-4 py-3 font-semibold">{String(row.name)}</th>{[row.addresses, row.parcels, row.buildings, row.building_parts, row.sales, row.rentals].map((value, index) => <td key={index} className="px-4 py-3 tabular-nums">{formatNumber(Number(value))}</td>)}</tr>)}
          </tbody>
        </table>
        {!rows.length ? <p className="p-8 text-center text-sm text-[var(--muted)]">Povezava z zbirko še ni na voljo.</p> : null}
      </div>
      <div className="mt-6 grid gap-4 text-sm leading-6 text-[var(--muted)] md:grid-cols-2">
        <p>Vključeni so naslovni register, osnovni podatki katastra, evidenca vrednotenja ter ETN kupoprodajni in najemni posli za občini Ljubljana in Brezovica.</p>
        <p>Posebni režimi, omejitve, gospodarska javna infrastruktura in optična omrežja so namenoma prestavljeni v naslednjo fazo.</p>
      </div>
    </PageShell>
  );
}
