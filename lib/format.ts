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

export function formatDate(date: string | null | undefined) {
  if (!date) {
    return "ni podatka";
  }
  const [year, month, day] = date.split("-");
  return `${day}. ${month}. ${year}`;
}

export function compactList(values: string[], empty = "ni podatka") {
  if (values.length === 0) {
    return empty;
  }
  return values.join(", ");
}
