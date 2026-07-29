import Link from "next/link";
import { notFound } from "next/navigation";
import { MapView } from "@/components/MapView";
import { MethodWarning } from "@/components/MethodWarning";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTransaction, transactions } from "@/lib/data";
import { compactList, formatDate, formatDecimal, formatEur, formatNumber } from "@/lib/format";
import type { EnrichedTransaction, Transaction } from "@/lib/schemas";

export function generateStaticParams() {
  return transactions.map((transaction) => ({ id: String(transaction.id) }));
}

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transaction = getTransaction(Number(id));
  if (!transaction) {
    notFound();
  }

  return (
    <PageShell
      title={`Posel ${transaction.id}`}
      subtitle={`${formatDate(transaction.contractDate)} · ${transaction.mainCategory} · ${formatEur(transaction.priceEur)}`}
    >
      <div className="space-y-4">
        <Link className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline" href="/posli">
          Nazaj na seznam poslov
        </Link>
        <MethodWarning />
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle>Osnovni podatki</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionGrid
                rows={[
                  ["ID posla", String(transaction.id)],
                  ["Datum pogodbe", formatDate(transaction.contractDate)],
                  ["Leto pogodbe", String(transaction.contractYear)],
                  ["Pogodbena cena", formatEur(transaction.priceEur)],
                  ["Vrsta posla", transaction.saleType ?? "ni podatka"],
                  ["Uradna tržnost GURS", transaction.marketability ?? "ni podatka"],
                  ["Interna kakovost", `${transaction.quality} - ${transaction.qualityReason ?? "brez opombe"}`],
                  ["Glavna kategorija", transaction.mainCategory],
                  ["Analitična enota", transaction.analyticalUnit ?? "ni podatka"],
                  ["Analitična cena", formatDecimal(transaction.analyticalPriceEurM2, " EUR/m2")],
                  ["Atomarnost", transaction.atomicity ?? "ni podatka"],
                  ["Vsi deleži polni", transaction.allSharesFull ? "da" : "ne"],
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Lokacija</CardTitle>
            </CardHeader>
            <CardContent>
              {transaction.coordinate ? (
                <div className="space-y-3">
                  <MapView rows={[transaction]} compact />
                  <p className="text-sm text-[var(--muted)]">
                    WGS84: {formatDecimal(transaction.coordinate.latitude)}, {formatDecimal(transaction.coordinate.longitude)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">Ta posel nima uporabne koordinate v spletnih podatkih.</p>
              )}
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <ComponentCard title="Parcele" values={transaction.parcels} />
          <ComponentCard title="Stavbe in deli stavb" values={transaction.buildingParts} />
          <ComponentCard title="Naslovi" values={transaction.addresses} />
          <ComponentCard title="Katastrske občine" values={transaction.cadastralMunicipalities} />
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Površine in sestavine</CardTitle>
          </CardHeader>
          <CardContent>
            <DefinitionGrid
              rows={[
                ["Število parcel", formatNumber(transaction.parcelCount)],
                ["Število delov stavb", formatNumber(transaction.buildingPartCount)],
                ["Število sestavin", formatNumber(transaction.componentCount)],
                ["Prodana uporabna površina", formatDecimal(transaction.soldUsableAreaM2, " m2")],
                ["Prodana površina zemljišč", formatDecimal(transaction.soldLandAreaM2, " m2")],
                ["Analitična površina", formatDecimal(transaction.analyticalAreaM2, " m2")],
                ["Najstarejše leto izgradnje", transaction.oldestBuildYear ? String(transaction.oldestBuildYear) : "ni podatka"],
                ["Najnovejše leto izgradnje", transaction.newestBuildYear ? String(transaction.newestBuildYear) : "ni podatka"],
              ]}
            />
          </CardContent>
        </Card>
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Trenutni katastrski podatki</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DefinitionGrid
                rows={[
                  ["Točno povezane parcele", formatNumber(transaction.parcelEids.length)],
                  ["Točno povezani deli stavb", formatNumber(transaction.buildingPartEids.length)],
                  ["Točno povezane stavbe", formatNumber(transaction.buildingEids.length)],
                  ["Neujemajoče sestavine", formatNumber(transaction.componentMatches.filter((item) => item.matchStatus !== "exact").length)],
                ]}
              />
              <EntityLinks transaction={transaction} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Trenutna posplošena vrednost</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DefinitionGrid
                rows={[
                  ["Pokritost", coverageLabel(transaction.valuationCoverage)],
                  ["Ovrednotene sestavine", `${transaction.matchedValuationComponentCount} od ${transaction.totalValuationComponentCount}`],
                  ["Ročni pregled", transaction.valuationReviewRequired ? "potreben" : "ni potreben"],
                  ["Skupna trenutna vrednost", formatEur(transaction.transactionCurrentGeneralisedValueEur)],
                  ["Cena / trenutna vrednost", formatDecimal(transaction.priceToCurrentGeneralisedValueRatio, " ×")],
                ]}
              />
              <p className="text-sm leading-6 text-[var(--muted)]">
                Trenutna posplošena vrednost ni nujno vrednost, ki je veljala na datum starejše prodaje. Primerjava je informativna in ne predstavlja uradnega časovnega indeksa GURS.
              </p>
              {transaction.valuationReviewRequired ? (
                <div className="rounded-md border border-[#ead7b7] bg-[#fff8e9] p-3 text-sm text-[#68420d]">
                  <p className="font-semibold">Razmerje ni izračunano zaradi podatkovnega neskladja.</p>
                  {transaction.valuationReviewReasons.map((reason) => <p key={reason} className="mt-1">{reason}</p>)}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </PageShell>
  );
}

function EntityLinks({ transaction }: { transaction: EnrichedTransaction }) {
  const links = transaction.componentMatches.filter((item) => item.matchStatus === "exact" && item.eid);
  if (!links.length) return <p className="text-sm text-[var(--muted)]">Nobena sestavina nima točnega ujemanja s trenutnim katastrom.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((item) => {
        const source = item.sourceIdentifier;
        const ko = item.cadastralMunicipalityCode;
        const href = item.componentType === "parcel" ? `/parcele?eid=${item.eid}&ko=${ko}` : item.buildingEid ? `/stavbe?eid=${item.buildingEid}&ko=${ko}` : "#";
        return <Link key={`${item.componentType}-${item.eid}`} href={href} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[#eef3ee]">{source}</Link>;
      })}
    </div>
  );
}

function coverageLabel(value: EnrichedTransaction["valuationCoverage"]) {
  return value === "complete" ? "popolna" : value === "partial" ? "delna" : "brez pokritosti";
}

function DefinitionGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border border-[var(--border)] p-3">
          <dt className="text-xs uppercase text-[var(--muted)]">{label}</dt>
          <dd className="mt-1 text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ComponentCard({ title, values }: { title: string; values: Transaction[keyof Pick<Transaction, "parcels" | "buildingParts" | "addresses" | "cadastralMunicipalities">] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{compactList(values)}</p>
      </CardContent>
    </Card>
  );
}
