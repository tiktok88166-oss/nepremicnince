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
      bar: "bg-[var(--accent)]",
      iconStyle: "bg-[var(--accent-soft)] text-[var(--accent)]",
    },
    {
      label: "Skupna pogodbena vrednost",
      value: formatEur(totalValue(transactions)),
      detail: "seštevek poslov brez podvajanja",
      icon: WalletCards,
      bar: "bg-[var(--blue)]",
      iconStyle: "bg-[#e6eff4] text-[var(--blue)]",
    },
    {
      label: "Mediana cene",
      value: formatEur(median(priceValues(transactions))),
      detail: `n = ${formatNumber(transactions.length)}`,
      icon: MapPinned,
      bar: "bg-[var(--amber)]",
      iconStyle: "bg-[#f8eedc] text-[var(--amber)]",
    },
    {
      label: "Mediana EUR/m2",
      value: formatEur(median(m2Values)),
      detail: `n = ${formatNumber(m2Values.length)}, null izločeni`,
      icon: Ruler,
      bar: "bg-[#7b506f]",
      iconStyle: "bg-[#f1e9ef] text-[#7b506f]",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ključni kazalniki">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="relative overflow-hidden">
            <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[3px] ${item.bar}`} />
            <CardContent className="flex min-h-32 items-start gap-3 pt-5">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${item.iconStyle}`}>
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--muted)]">{item.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{item.value}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{item.detail}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
