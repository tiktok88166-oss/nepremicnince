import type { Transaction } from "@/lib/schemas";

function escapeCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function transactionsToCsv(transactions: Transaction[]) {
  const columns = [
    ["id", "ID"],
    ["contractDate", "Datum pogodbe"],
    ["priceEur", "Pogodbena cena EUR"],
    ["mainCategory", "Glavna kategorija"],
    ["analyticalUnit", "Analitična enota"],
    ["quality", "Kakovost"],
    ["marketability", "Tržnost"],
    ["settlements", "Naselja"],
    ["addresses", "Naslovi"],
    ["parcels", "Parcele"],
  ] as const;

  const header = columns.map(([, label]) => escapeCell(label)).join(";");
  const rows = transactions.map((transaction) =>
    columns
      .map(([key]) => {
        const value = transaction[key];
        return escapeCell(Array.isArray(value) ? value.join(", ") : value);
      })
      .join(";"),
  );
  return [header, ...rows].join("\n");
}
