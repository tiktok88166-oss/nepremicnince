export const eurFormatter = new Intl.NumberFormat("sl-SI", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const eurPreciseFormatter = new Intl.NumberFormat("sl-SI", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export const numberFormatter = new Intl.NumberFormat("sl-SI", {
  maximumFractionDigits: 0,
});

export const decimalFormatter = new Intl.NumberFormat("sl-SI", {
  maximumFractionDigits: 1,
});

export function formatEur(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "ni podatka";
  }
  return (Math.abs(value) < 100 ? eurPreciseFormatter : eurFormatter).format(value);
}

export function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "ni podatka";
  }
  return numberFormatter.format(value);
}

export function formatDecimal(value: number | null | undefined, suffix = "") {
  if (value == null || Number.isNaN(value)) {
    return "ni podatka";
  }
  return `${decimalFormatter.format(value)}${suffix}`;
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) {
    return "ni podatka";
  }
  if (typeof date === "string") {
    const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}. ${iso[2]}. ${iso[1]}`;
  }
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "ni podatka";
  return new Intl.DateTimeFormat("sl-SI", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parsed);
}

export function compactList(values: string[], empty = "ni podatka") {
  if (values.length === 0) {
    return empty;
  }
  return values.join(", ");
}
