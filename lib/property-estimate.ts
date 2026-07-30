export type ComparableReason = {
  tone: "positive" | "negative" | "neutral";
  text: string;
};

export type ComparableSource = {
  price_eur_m2: unknown;
  sold_area_m2: unknown;
  distance_m: unknown;
  contract_date: unknown;
};

export type AnalysedComparable<T extends ComparableSource = ComparableSource> = T & {
  score: number;
  ageYears: number | null;
  areaDifferencePercent: number | null;
  reasons: ComparableReason[];
};

export type MarketEstimate = {
  low: number;
  central: number;
  high: number;
  confidence: "nizka" | "srednja" | "visoka";
  sampleSize: number;
  medianDistanceM: number;
  recentShare: number;
};

export function analyseComparableSales<T extends ComparableSource>(
  rows: T[],
  targetArea: number | null,
  now = new Date(),
) {
  const area = targetArea != null && Number.isFinite(targetArea) && targetArea > 0 ? targetArea : null;
  const comparables = rows
    .map((row) => analyseComparable(row, area, now))
    .sort((a, b) => b.score - a.score || dateValue(b.contract_date) - dateValue(a.contract_date));

  const usable = comparables.filter((row) => numeric(row.price_eur_m2) > 0);
  if (area == null || usable.length < 4) return { comparables, estimate: null };

  const unitPrices = usable.map((row) => numeric(row.price_eur_m2)).sort((a, b) => a - b);
  const distances = usable.map((row) => numeric(row.distance_m)).filter((value) => value >= 0).sort((a, b) => a - b);
  const recent = usable.filter((row) => row.ageYears != null && row.ageYears <= 3).length;
  const medianDistanceM = distances.length ? quantile(distances, 0.5) : 2000;
  const recentShare = recent / usable.length;
  const confidence = usable.length >= 8 && medianDistanceM <= 750 && recentShare >= 0.6
    ? "visoka"
    : usable.length >= 5 && medianDistanceM <= 1400
      ? "srednja"
      : "nizka";

  const estimate: MarketEstimate = {
    low: roundToThousand(quantile(unitPrices, 0.25) * area),
    central: roundToThousand(quantile(unitPrices, 0.5) * area),
    high: roundToThousand(quantile(unitPrices, 0.75) * area),
    confidence,
    sampleSize: usable.length,
    medianDistanceM: Math.round(medianDistanceM),
    recentShare,
  };

  return { comparables, estimate };
}

function analyseComparable<T extends ComparableSource>(row: T, targetArea: number | null): AnalysedComparable<T>;
function analyseComparable<T extends ComparableSource>(row: T, targetArea: number | null, now: Date): AnalysedComparable<T>;
function analyseComparable<T extends ComparableSource>(row: T, targetArea: number | null, now = new Date()): AnalysedComparable<T> {
  const distance = numeric(row.distance_m);
  const soldArea = numeric(row.sold_area_m2);
  const ageYears = yearsSince(row.contract_date, now);
  const reasons: ComparableReason[] = [
    { tone: "positive", text: "Potrjen enosestavinski posel" },
  ];
  let score = 0;

  if (distance <= 500) {
    score += 35;
    reasons.push({ tone: "positive", text: `Oddaljenost samo ${Math.round(distance)} m` });
  } else if (distance <= 1000) {
    score += 25;
    reasons.push({ tone: "positive", text: `Oddaljenost ${Math.round(distance)} m` });
  } else if (distance <= 1500) {
    score += 15;
    reasons.push({ tone: "neutral", text: `Oddaljenost ${Math.round(distance)} m` });
  } else {
    score += 8;
    reasons.push({ tone: "negative", text: `Oddaljenost ${Math.round(distance)} m` });
  }

  let areaDifferencePercent: number | null = null;
  if (targetArea != null && soldArea > 0) {
    areaDifferencePercent = Math.abs(soldArea - targetArea) / targetArea * 100;
    if (areaDifferencePercent <= 10) {
      score += 35;
      reasons.push({ tone: "positive", text: "Zelo podobna površina" });
    } else if (areaDifferencePercent <= 25) {
      score += 26;
      reasons.push({ tone: "positive", text: `Površina odstopa za ${Math.round(areaDifferencePercent)} %` });
    } else {
      score += 15;
      reasons.push({ tone: "negative", text: `Površina odstopa za ${Math.round(areaDifferencePercent)} %` });
    }
  }

  if (ageYears == null) {
    reasons.push({ tone: "negative", text: "Datum prodaje ni znan" });
  } else if (ageYears <= 1) {
    score += 30;
    reasons.push({ tone: "positive", text: "Prodaja iz zadnjega leta" });
  } else if (ageYears <= 3) {
    score += 24;
    reasons.push({ tone: "positive", text: `Prodaja je stara ${Math.max(1, Math.round(ageYears))} leti` });
  } else if (ageYears <= 5) {
    score += 15;
    reasons.push({ tone: "neutral", text: `Prodaja je stara ${Math.round(ageYears)} leta` });
  } else {
    score += 6;
    reasons.push({ tone: "negative", text: `Prodaja je stara ${Math.round(ageYears)} let` });
  }

  return { ...row, score, ageYears, areaDifferencePercent, reasons };
}

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: unknown) {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function yearsSince(value: unknown, now: Date) {
  const parsed = new Date(String(value ?? ""));
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, (now.getTime() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function quantile(values: number[], percentile: number) {
  if (values.length === 1) return values[0];
  const position = (values.length - 1) * percentile;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return values[lower + 1] == null ? values[lower] : values[lower] + fraction * (values[lower + 1] - values[lower]);
}

function roundToThousand(value: number) {
  return Math.round(value / 1000) * 1000;
}
