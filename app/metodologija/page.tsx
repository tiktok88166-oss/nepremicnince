import { BookOpen, Database, Scale, ShieldAlert } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/format";
import { getMethodologyOverview } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

export default async function MethodologyPage() {
  const data = await getMethodologyOverview().catch(() => ({ coverage: [], layerDates: [] }));
  const totals = data.coverage.reduce(
    (sum, row) => ({
      addresses: sum.addresses + Number(row.addresses ?? 0),
      parcels: sum.parcels + Number(row.parcels ?? 0),
      buildings: sum.buildings + Number(row.buildings ?? 0),
      parts: sum.parts + Number(row.building_parts ?? 0),
      sales: sum.sales + Number(row.sales ?? 0),
      rentals: sum.rentals + Number(row.rentals ?? 0),
    }),
    { addresses: 0, parcels: 0, buildings: 0, parts: 0, sales: 0, rentals: 0 },
  );

  const sections = [
    {
      title: "Vir in obseg",
      icon: Database,
      body: `Vir so javne evidence GURS za Mestno občino Ljubljana in občino Brezovica. Baza trenutno vsebuje ${formatNumber(totals.addresses)} hišnih naslovov, ${formatNumber(totals.parcels)} parcel in ${formatNumber(totals.sales)} prodajnih poslov.`,
    },
    {
      title: "Kataster in vrednotenje",
      icon: Database,
      body: "ETN sestavine so s trenutnim katastrom povezane po katastrskih identifikatorjih. Posplošene vrednosti so trenutno stanje evidence in niso zgodovinske vrednosti na datum prodaje.",
    },
    {
      title: "Indikativna ocena",
      icon: Scale,
      body: "Razpon temelji na najmanj štirih potrjenih enosestavinskih prodajah do 2 km. Upošteva ceno na m², podobnost površine, oddaljenost in starost posla. Ne gre za uradno cenitev.",
    },
    {
      title: "Zasebnost",
      icon: ShieldAlert,
      body: "Javni izhodi ne vsebujejo tabel oseb, lastnikov, imetnikov pravic, osebnih identifikatorjev ali upravnikov. Uvozni postopek uporablja izrecen seznam dovoljenih tabel in stolpcev.",
    },
    {
      title: "Cena posla",
      icon: Scale,
      body: "Pogodbena cena je cena celotnega pravnega posla. Pri mešanih poslih je ni dovoljeno samodejno razdeliti med parcele, stavbe ali dele stavb.",
    },
    {
      title: "Prostorske omejitve",
      icon: BookOpen,
      body: "OPN, OPPN, posebni režimi, zemljiška knjiga, GJI in širokopasovni sloji še niso vključeni. Aplikacija zato ne sklepa o možnosti gradnje, priključitve ali pravnem stanju.",
    },
  ];

  return (
    <PageShell title="Metodologija" subtitle="Viri, stanje podatkov, izračuni ter meje, znotraj katerih je rezultate varno razlagati.">
      <div className="space-y-5">
        <section className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardHeader className="flex flex-row items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef3ee] text-[var(--accent)]"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm leading-6 text-[var(--muted)]">{section.body}</p></CardContent>
              </Card>
            );
          })}
        </section>

        <Card>
          <CardHeader><CardTitle>Stanje podatkovne baze</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetaRow label="Podprti območji" value="Ljubljana in Brezovica" />
              <MetaRow label="Naslovi" value={formatNumber(totals.addresses)} />
              <MetaRow label="Parcele" value={formatNumber(totals.parcels)} />
              <MetaRow label="Stavbe" value={formatNumber(totals.buildings)} />
              <MetaRow label="Deli stavb" value={formatNumber(totals.parts)} />
              <MetaRow label="Prodaje / najemi" value={`${formatNumber(totals.sales)} / ${formatNumber(totals.rentals)}`} />
              {data.layerDates.map((row) => <MetaRow key={String(row.layer)} label={`Stanje · ${String(row.layer)}`} value={formatDate(row.source_updated_on ? String(row.source_updated_on) : null)} />)}
            </dl>
          </CardContent>
        </Card>

        <div className="border-l-[3px] border-[#c58a2c] bg-[#fff9ec] p-4 text-sm leading-6 text-[#6a4a17]">
          Osrednji iskalnik, poročila, analize in tržni zemljevid poizvedujejo po produkcijski podatkovni bazi Neon. Nekateri pomožni kataloški pogledi uporabljajo predpripravljene javne izseke. Rezultati so informativni in ne nadomeščajo cenitve, lokacijske informacije, zemljiškoknjižnega pregleda ali projektnih pogojev.
        </div>
        <p className="text-xs leading-5 text-[var(--muted)]">Vir ortofota: Geodetska uprava Republike Slovenije, državni ortofoto DOF050, licenca CC BY 4.0. Vir katastrskih, naslovnih, vrednostnih in tržnih podatkov: Geodetska uprava Republike Slovenije.</p>
      </div>
    </PageShell>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-[var(--border)] p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>;
}
