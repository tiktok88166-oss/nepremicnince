import { BookOpen, Database, Scale, ShieldAlert } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { meta, summary } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";

const sections = [
  {
    title: "Vir in obseg",
    icon: Database,
    body: `Vir podatkov je GURS ETN. Pripravljeni nabor obsega ${formatNumber(summary.transactionCount)} kupoprodajnih poslov za občino Brezovica, od tega ${formatNumber(summary.mappedTransactionCount)} z lokacijo.`,
  },
  {
    title: "Kataster in vrednotenje",
    icon: Database,
    body: "ETN sestavine so s trenutnim katastrom povezane samo po točnih identifikatorjih. Posplošene vrednosti so trenutno stanje evidence in niso zgodovinske vrednosti na datum prodaje.",
  },
  {
    title: "Zasebnost",
    icon: ShieldAlert,
    body: "Javni izhodi ne vsebujejo tabel oseb, lastnikov, imetnikov pravic, osebnih naslovov ali osebnih identifikatorjev. ETL ob zaznavi prepovedanega polja konča z napako.",
  },
  {
    title: "Cena posla",
    icon: Scale,
    body: "Pogodbena cena je cena celotnega pravnega posla. Pri mešanih poslih je ni dovoljeno avtomatsko razdeliti med parcele, stavbe ali dele stavb.",
  },
  {
    title: "Kakovost in tržnost",
    icon: ShieldAlert,
    body: "Tržnost je uradna oznaka GURS. Kakovost A/B/C je interna analitična razvrstitev, namenjena filtriranju in presoji uporabnosti posla v tej aplikaciji.",
  },
  {
    title: "Statistika",
    icon: BookOpen,
    body: "Glavni kazalnik je mediana, ne aritmetično povprečje. Pri vsakem agregatu je pomembna velikost vzorca. Analitična cena EUR/m2 je prikazana samo za posle, kjer je polje izračunano.",
  },
];

export default function MethodologyPage() {
  return (
    <PageShell title="Metodologija" subtitle="Omejitve podatkov, razlaga kazalnikov in navedba vira za javne podatke GURS ETN.">
      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardHeader className="flex flex-row items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef3ee] text-[var(--accent)]">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-[var(--muted)]">{section.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Metapodatki</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <MetaRow label="Nabor" value={meta.datasetName} />
              <MetaRow label="Opis" value={meta.description} />
              <MetaRow label="Stanje podatkov" value={formatDate(summary.generatedAt)} />
              <MetaRow label="Obseg" value={summary.scope} />
              <MetaRow label="Izvorni koordinatni sistem" value={meta.sourceCrs} />
              <MetaRow label="Spletni koordinatni sistem" value={meta.webCrs} />
              <MetaRow label="Izvorne datoteke" value={meta.sourceFiles.join(", ")} />
              <MetaRow label="Navedba vira" value={meta.attribution} />
              <MetaRow label="Kataster parcel" value={meta.gursDataAsOf?.parcels ?? "ni podatka"} />
              <MetaRow label="Kataster stavb" value={meta.gursDataAsOf?.buildings ?? "ni podatka"} />
              <MetaRow label="Evidenca vrednotenja" value={meta.gursDataAsOf?.valuation ?? "ni podatka"} />
              <MetaRow label="Najemni posli" value={meta.gursDataAsOf?.rentals ?? "ni podatka"} />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pomembna opozorila</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm leading-6 text-[var(--muted)]">
              {meta.importantWarnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
              <li>• Podatki zadnjih let so lahko začasni in se lahko spremenijo z novimi objavami ETN.</li>
              <li>• Aplikacija ne uporablja produkcijske baze; bere statične datoteke iz `public/data`.</li>
              <li>• Vir ortofota: Geodetska uprava Republike Slovenije, državni ortofoto DOF050, licenca CC BY 4.0.</li>
              <li>• Uradni WMS za DOF050 podpira EPSG:3794; ortofoto prikaz zato uporablja namenski zemljevid v izvorni projekciji.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] p-3">
      <dt className="text-xs uppercase text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
