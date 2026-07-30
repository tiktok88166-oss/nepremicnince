import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleAlert, Euro, FileSearch, MapPin, Ruler, type LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { formatDate, formatDecimal, formatEur, formatNumber } from "@/lib/format";
import { getRentalReport } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

export default async function RentalReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getRentalReport(decodeURIComponent(id)).catch(() => null);
  if (!report) notFound();
  const rental = report.rental as Record<string, unknown>;
  const municipality = rental.municipality_code === "008" ? "Brezovica" : "Ljubljana";

  return (
    <PageShell title={`Najem ${String(rental.transaction_id)}`} subtitle={`Evidentirani najemni posel ETN · ${municipality}`}>
      <Link href="/iskanje?type=rental" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Nazaj na iskanje</Link>
      <dl className="mt-5 grid gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
        <RentalFact icon={Euro} label="Mesečna najemnina" value={rental.rent_eur == null ? "ni podatka" : formatEur(Number(rental.rent_eur))} />
        <RentalFact icon={CalendarDays} label="Datum pogodbe" value={formatDate(rental.contract_date ? String(rental.contract_date) : null)} />
        <RentalFact icon={FileSearch} label="Vrsta najema" value={String(rental.rental_type ?? "ni podatka")} />
        <RentalFact icon={FileSearch} label="Status GURS" value={String(rental.marketability ?? "ni podatka")} />
        <RentalFact icon={CalendarDays} label="Trajanje" value={rental.duration_months == null ? "ni podatka" : `${formatNumber(Number(rental.duration_months))} mesecev`} />
        <RentalFact icon={FileSearch} label="Število sestavin" value={formatNumber(Number(rental.component_count ?? report.components.length))} />
      </dl>

      <section className="mt-8" aria-labelledby="rental-components-title">
        <div className="mb-4"><h2 id="rental-components-title" className="text-xl font-semibold sm:text-2xl">Predmeti najema</h2><p className="mt-1 text-sm text-[var(--muted)]">Deli stavb, povezani z evidentiranim najemnim poslom.</p></div>
        <div className="grid gap-3 lg:grid-cols-2">
          {report.components.map((component) => {
            const row = component as Record<string, unknown>;
            const title = `${String(row.cadastral_municipality_code ?? "")}-${String(row.building_number ?? "")}-${String(row.building_part_number ?? "")}`;
            const href = row.property_eid ? `/nepremicnina/building-part/${encodeURIComponent(String(row.property_eid))}` : null;
            return <article key={String(row.id)} className="rounded-md border border-[var(--border)] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[var(--muted)]">Del stavbe</p><h3 className="mt-1 font-semibold">{title}</h3></div>{href ? <Link href={href} className="text-sm font-semibold text-[var(--accent-strong)] hover:underline">Odpri profil</Link> : null}</div><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 text-sm"><div><dt className="flex items-center gap-1 text-xs text-[var(--muted)]"><MapPin aria-hidden="true" className="h-3.5 w-3.5" /> Lokacija</dt><dd className="mt-1 font-medium">{String(row.address ?? row.settlement ?? "ni podatka")}</dd></div><div><dt className="flex items-center gap-1 text-xs text-[var(--muted)]"><Ruler aria-hidden="true" className="h-3.5 w-3.5" /> Površina</dt><dd className="mt-1 font-medium">{row.area_m2 == null ? "ni podatka" : formatDecimal(Number(row.area_m2), " m²")}</dd></div><div><dt className="text-xs text-[var(--muted)]">Vrsta nepremičnine</dt><dd className="mt-1 font-medium">{String(row.property_type ?? "ni podatka")}</dd></div><div><dt className="text-xs text-[var(--muted)]">Najemnina na m²</dt><dd className="mt-1 font-medium">{row.rent_eur_m2 == null ? "ni podatka" : formatDecimal(Number(row.rent_eur_m2), " €/m²")}</dd></div></dl></article>;
          })}
        </div>
      </section>

      <div className="mt-8 flex gap-3 border-l-[3px] border-[#c58a2c] bg-[#fff9ec] p-4 text-sm leading-6 text-[#6a4a17]"><CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><p>Najemnina lahko pripada celotnemu poslu z več predmeti. Podatki so informativni in ne vključujejo obratovalnih stroškov, davkov, praznosti ali drugih pogojev najemne pogodbe.</p></div>
    </PageShell>
  );
}

function RentalFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="bg-white p-4"><Icon aria-hidden="true" className="mb-3 h-5 w-5 text-[var(--accent)]" /><dt className="text-xs font-semibold text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>;
}
