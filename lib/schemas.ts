import { z } from "zod";

const coordinateSchema = z.object({
  crs: z.string(),
  longitude: z.number(),
  latitude: z.number(),
  sourceE: z.number().nullable(),
  sourceN: z.number().nullable(),
  sourceCrs: z.string(),
});

export const transactionSchema = z.object({
  id: z.number(),
  contractDate: z.string(),
  contractYear: z.number(),
  effectiveDate: z.string().nullable(),
  packageYear: z.number().nullable(),
  priceEur: z.number(),
  saleTypeCode: z.number().nullable(),
  saleType: z.string().nullable(),
  marketabilityCode: z.number().nullable(),
  marketability: z.string().nullable(),
  actType: z.string().nullable(),
  vatIncluded: z.string().nullable(),
  vatRate: z.string().nullable(),
  mainCategory: z.string(),
  analyticalUnit: z.string().nullable(),
  atomicity: z.string().nullable(),
  quality: z.enum(["A", "B", "C"]),
  qualityReason: z.string().nullable(),
  buildingPartCount: z.number(),
  parcelCount: z.number(),
  componentCount: z.number(),
  buildingPartTypes: z.array(z.string()),
  buildingPartGroups: z.array(z.string()),
  landTypes: z.array(z.string()),
  landGroups: z.array(z.string()),
  cadastralMunicipalities: z.array(z.string()),
  cadastralMunicipalityCodes: z.array(z.string()),
  settlements: z.array(z.string()),
  addresses: z.array(z.string()),
  parcels: z.array(z.string()),
  buildingParts: z.array(z.string()),
  allSharesFull: z.boolean(),
  reportedBuildingAreaM2: z.number().nullable(),
  soldBuildingAreaM2: z.number().nullable(),
  soldUsableAreaM2: z.number().nullable(),
  soldLandAreaM2: z.number().nullable(),
  analyticalAreaM2: z.number().nullable(),
  analyticalPriceEurM2: z.number().nullable(),
  oldestBuildYear: z.number().nullable(),
  newestBuildYear: z.number().nullable(),
  coordinate: coordinateSchema.nullable(),
  notes: z.string().nullable(),
});

export const transactionsSchema = z.array(transactionSchema);

export const componentMatchSchema = z.object({
  componentType: z.enum(["parcel", "buildingPart", "unknown"]),
  sourceIdentifier: z.string(),
  eid: z.string().nullable(),
  buildingEid: z.string().nullable(),
  cadastralMunicipalityCode: z.string().nullable(),
  soldShare: z.number().nullable(),
  matchStatus: z.enum(["exact", "unmatched", "ambiguous"]),
  matchReason: z.string(),
});

export const enrichedTransactionSchema = transactionSchema.extend({
  parcelEids: z.array(z.string()),
  buildingEids: z.array(z.string()),
  buildingPartEids: z.array(z.string()),
  currentPlannedUses: z.array(z.string()),
  currentBuildingYears: z.array(z.number()),
  currentRenovationYears: z.array(z.number()),
  componentMatches: z.array(componentMatchSchema),
  valuationCoverage: z.enum(["complete", "partial", "none"]),
  matchedValuationComponentCount: z.number(),
  totalValuationComponentCount: z.number(),
  valuationReviewRequired: z.boolean(),
  valuationReviewReasons: z.array(z.string()),
  transactionCurrentGeneralisedValueEur: z.number().nullable(),
  priceToCurrentGeneralisedValueRatio: z.number().nullable(),
});

export const enrichedTransactionsSchema = z.array(enrichedTransactionSchema);

export const parcelIndexSchema = z.object({
  eidParcel: z.string(),
  cadastralMunicipalityCode: z.string(),
  parcelNumber: z.string(),
  areaM2: z.number().nullable(),
  plannedUsePrimary: z.string().nullable(),
  generalisedValueTotalEur: z.number().nullable(),
});

export const buildingIndexSchema = z.object({
  eidBuilding: z.string(),
  cadastralMunicipalityCode: z.string(),
  buildingNumber: z.string(),
  buildingType: z.string().nullable(),
  yearBuilt: z.number().nullable(),
  partCount: z.number(),
});

export const rentalComponentSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  eidBuilding: z.string().nullable(),
  eidBuildingPart: z.string().nullable(),
  cadastralMunicipalityCode: z.string().nullable(),
  buildingNumber: z.string().nullable(),
  buildingPartNumber: z.string().nullable(),
  spaceTypeCode: z.string().nullable(),
  furnished: z.boolean().nullable(),
  microlocationCode: z.string().nullable(),
  areaM2: z.number().nullable(),
  usableAreaM2: z.number().nullable(),
  individualRentEur: z.number().nullable(),
  rentEurM2: z.number().nullable(),
  address: z.string().nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  matchStatus: z.enum(["exact", "unmatched", "ambiguous"]),
});

export const rentalSchema = z.object({
  id: z.string(),
  contractDate: z.string().nullable(),
  effectiveDate: z.string().nullable(),
  rentStartDate: z.string().nullable(),
  rentEndDate: z.string().nullable(),
  contractRentEur: z.number().nullable(),
  rentalTypeCode: z.string().nullable(),
  rentalType: z.string(),
  marketabilityCode: z.string().nullable(),
  marketability: z.string(),
  durationType: z.string(),
  durationMonths: z.number().nullable(),
  operatingCostsIncluded: z.boolean().nullable(),
  vatIncluded: z.boolean().nullable(),
  vatRate: z.number().nullable(),
  componentCount: z.number(),
  quality: z.literal("C"),
  qualityReason: z.string(),
  components: z.array(rentalComponentSchema),
});

export const rentalsSchema = z.array(rentalSchema);

export const metaSchema = z.object({
  datasetName: z.string(),
  description: z.string(),
  sourceFiles: z.array(z.string()),
  sourceCrs: z.string(),
  webCrs: z.string(),
  importantWarnings: z.array(z.string()),
  attribution: z.string(),
  gursDataAsOf: z.record(z.string(), z.string().nullable()).optional(),
  gursSourceFiles: z.array(z.string()).optional(),
  gursWms: z
    .object({
      endpoint: z.string(),
      layer: z.string(),
      advertisedCrs: z.array(z.string()),
      checkedAt: z.string(),
      webMercatorAvailable: z.boolean(),
    })
    .optional(),
});

export const summarySchema = z.object({
  generatedAt: z.string(),
  scope: z.string(),
  source: z.string(),
  transactionCount: z.number(),
  mappedTransactionCount: z.number(),
  byContractYear: z.record(z.string(), z.number()),
  byMainCategory: z.record(z.string(), z.number()),
  byQuality: z.record(z.string(), z.number()),
  byMarketability: z.record(z.string(), z.number()),
  price: z.object({
    minEur: z.number(),
    maxEur: z.number(),
  }),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type EnrichedTransaction = z.infer<typeof enrichedTransactionSchema>;
export type ParcelIndex = z.infer<typeof parcelIndexSchema>;
export type BuildingIndex = z.infer<typeof buildingIndexSchema>;
export type Rental = z.infer<typeof rentalSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type Summary = z.infer<typeof summarySchema>;
