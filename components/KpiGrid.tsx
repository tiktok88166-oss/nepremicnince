import { Building2, MapPinned, Ruler, WalletCards } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEur, formatNumber } from "@/lib/format";
import { analyticalPriceValues, median, priceValues, totalValue } from "@/lib/stats";
import type { Transaction } from "@/lib/schemas";

export function KpiGrid({ transactions }: { transactions: Transaction[] }) {
  const m2Values = analyticalPriceValues(transactions);
  const mapped = transactions.filter((transaction) => transaction.coordinate).length;
  const items = [
    {
      label: "Posli v vzorcu",
      value: formatNumber(transactions.length),
      detail: `${formatNumber(mapped)} z lokacijo`,
      icon: Building2,
    },
    {
      label: "Skupna pogodbena vrednost",
      value: formatEur(totalValue(transactions)),
      detail: "seštevek poslov brez podvajanja",
      icon: WalletCards,
    },
    {
      label: "Mediana cene",
      value: formatEur(median(priceValues(transactions))),
      detail: `n = ${formatNumber(transactions.length)}`,
      icon: MapPinned,
    },
    {
      label: "Mediana EUR/m2",
      value: formatEur(median(m2Values)),
      detail: `n = ${formatNumber(m2Values.length)}, null izločeni`,
      icon: Ruler,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ključni kazalniki">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eef3ee] text-[var(--accent)]">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-[var(--muted)]">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{item.detail}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
