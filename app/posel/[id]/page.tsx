import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleAlert, Euro, FileSearch, MapPin, Ruler } from "lucide-react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { formatDate, formatDecimal, formatEur, formatNumber } from "@/lib/format";
import { getSaleReport } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

export default async function SaleReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getSaleReport(decodeURIComponent(id)).catch(() => null);
  if (!report) notFound();
  const sale = report.sale as Record<string, unknown>;
  const municipality = sale.municipality_code === "008" ? "Brezovica" : "Ljubljana";

  return (
    <PageShell title={`Posel ${String(sale.transaction_id)}`} subtitle={`Evidentirani prodajni posel ETN · ${municipality}`}>
      <Link href={`/?municipality=${String(sale.municipality_code)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Nazaj na iskanje</Link>

      <dl className="mt-5 grid gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
        <SaleFact icon={Euro} label="Pogodbena cena" value={sale.price_eur == null ? "ni podatka" : formatEur(Number(sale.price_eur))} />
        <SaleFact icon={CalendarDays} label="Datum pogodbe" value={formatDate(sale.contract_date ? String(sale.contract_date) : null)} />
        <SaleFact icon={FileSearch} label="Vrsta posla" value={String(sale.sale_type ?? "ni podatka")} />
        <SaleFact icon={FileSearch} label="Status GURS" value={String(sale.marketability ?? "ni podatka")} />
        <SaleFact icon={FileSearch} label="Število sestavin" value={formatNumber(Number(sale.component_count ?? report.components.length))} />
        {sale.source_updated_on ? <SaleFact icon={CalendarDays} label="Stanje podatkov" value={formatDate(String(sale.source_updated_on))} /> : null}
      </dl>

      <section className="mt-8" aria-labelledby="sale-components-title">
        <div className="mb-4"><h2 id="sale-components-title" className="text-xl font-semibold sm:text-2xl">Sestavine posla</h2><p className="mt-1 text-sm text-[var(--muted)]">Nepremičnine, ki jih ETN povezuje s pogodbeno ceno.</p></div>
        <div className="grid gap-3 lg:grid-cols-2">
          {report.components.map((component) => {
            const row = component as Record<string, unknown>;
            const label = componentLabel(row);
            const href = row.property_eid ? `/nepremicnina/${String(row.property_route)}/${encodeURIComponent(String(row.property_eid))}` : null;
            return (
              <article key={String(row.id)} className="rounded-md border border-[var(--border)] bg-white p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[var(--muted)]">{row.component_type === "parcel" ? "Parcela" : "Del stavbe"}</p><h3 className="mt-1 font-semibold">{label}</h3></div>{href ? <Link href={href} className="text-sm font-semibold text-[var(--accent-strong)] hover:underline">Odpri profil</Link> : null}</div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 text-sm">
                  <div><dt className="flex items-center gap-1 text-xs text-[var(--muted)]"><MapPin aria-hidden="true" className="h-3.5 w-3.5" /> Lokacija</dt><dd className="mt-1 font-medium">{String(row.address ?? row.settlement ?? "ni podatka")}</dd></div>
                  <div><dt className="flex items-center gap-1 text-xs text-[var(--muted)]"><Ruler aria-hidden="true" className="h-3.5 w-3.5" /> Prodana površina</dt><dd className="mt-1 font-medium">{row.sold_area_m2 == null ? "ni podatka" : formatDecimal(Number(row.sold_area_m2), " m²")}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">Vrsta nepremičnine</dt><dd className="mt-1 font-medium">{String(row.property_type ?? "ni podatka")}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">Prodani delež</dt><dd className="mt-1 font-medium">{row.sold_share == null ? "ni podatka" : formatDecimal(Number(row.sold_share))}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-8 flex gap-3 border-l-[3px] border-[#c58a2c] bg-[#fff9ec] p-4 text-sm leading-6 text-[#6a4a17]"><CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><p>Pogodbena cena pripada celotnemu pravnemu poslu. Če je sestavin več, je aplikacija ne deli med posamezne nepremičnine. Katastrski podatki predstavljajo trenutno stanje in se lahko razlikujejo od stanja ob prodaji.</p></div>
    </PageShell>
  );
}

function componentLabel(row: Record<string, unknown>) {
  if (row.component_type === "parcel") return `${String(row.cadastral_municipality_code ?? "")}-${String(row.parcel_number ?? "")}`;
  return `${String(row.cadastral_municipality_code ?? "")}-${String(row.building_number ?? "")}-${String(row.building_part_number ?? "")}`;
}

function SaleFact({ icon: Icon, label, value }: { icon: typeof Euro; label: string; value: string }) {
  return <div className="bg-white p-4"><Icon aria-hidden="true" className="mb-3 h-5 w-5 text-[var(--accent)]" /><dt className="text-xs font-semibold text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>;
}
